import { HttpException, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { JwtAppService } from '../../auth/services/jwt.service';
import { allowedOrigins } from '../../config';
import { FEATURE_FLAGS } from '../../feature-flags/feature-flags.constants';
import { FeatureFlagsService } from '../../feature-flags/services/feature-flags.service';
import { RedisService } from '../../redis/redis.service';
import { toBoardMessage } from '../boards.presenter';
import {
  BOARD_CHAT_BURST,
  BOARD_CHAT_WINDOW_MS,
  BOARD_SOCKET_EVENTS,
  BOARDS_NAMESPACE,
  type BoardDocKind,
} from '../constants/board-socket.constants';
import { BOARD_CODE_PATTERN } from '../constants/board.constants';
import { BoardChatService } from '../services/board-chat.service';
import { BoardRoomsService } from '../services/board-rooms.service';
import { BoardsService } from '../services/boards.service';
import { normalizeBoardCode } from '../utils/board-code';

/** What a handler answers through the Socket.IO acknowledgement. */
export type BoardAck<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; message: string };

interface BoardSocketData {
  userId: string;
  /** room code → board id, for the rooms this socket has opened */
  boards: Map<string, string>;
  /** room code → board id, for the rooms whose React project it has open */
  sandboxes: Map<string, string>;
  /** send times of recent chat messages, for the flood guard */
  chatSentAt: number[];
}

type BoardSocket = Socket & { data: BoardSocketData };

/** The Socket.IO room for one of a board's documents. Chat rides on `code`. */
const roomOf = (boardId: string, kind: BoardDocKind = 'code') =>
  kind === 'code' ? `board:${boardId}` : `board:${boardId}:${kind}`;

const FALLBACK_ERROR = 'Something went wrong. Please try again.';

/**
 * The realtime side of the coding board: the shared documents, presence and
 * chat. Every socket authenticates with its access token on connect, and
 * every room it opens is checked against membership and the feature flags,
 * the same rules as the REST routes. The flags are checked when a document
 * is opened, so turning one off reaches people at their next reconnect.
 */
@WebSocketGateway({
  namespace: BOARDS_NAMESPACE,
  cors: { origin: allowedOrigins, credentials: true },
  transports: ['websocket', 'polling'],
})
export class BoardsGateway implements OnGatewayInit, OnGatewayDisconnect {
  private readonly logger = new Logger(BoardsGateway.name);

  constructor(
    private readonly jwt: JwtAppService,
    private readonly redis: RedisService,
    private readonly boards: BoardsService,
    private readonly chat: BoardChatService,
    private readonly rooms: BoardRoomsService,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  afterInit(server: Namespace): void {
    // Authenticate in middleware, before the connection is accepted: a client
    // sends board:open as soon as it connects, so checking later in
    // handleConnection would race its first message. A refused socket gets
    // connect_error with the reason.
    server.use((socket, next) => {
      this.authenticate(socket as BoardSocket).then(
        () => next(),
        (error: unknown) => {
          this.logger.warn(`Board socket rejected: ${errorText(error)}`);
          next(new Error('Sign in again to open this room.'));
        },
      );
    });
    this.rooms.setBroadcast((boardId, kind, event, payload, exceptSocketId) => {
      const target = server.to(roomOf(boardId, kind));
      (exceptSocketId ? target.except(exceptSocketId) : target).emit(
        event,
        payload,
      );
    });
  }

  /** Throws unless the handshake carries a live access token for a device still signed in. */
  async authenticate(client: BoardSocket): Promise<void> {
    const token: unknown = client.handshake.auth?.token;
    if (typeof token !== 'string' || !token) {
      throw new Error('no token');
    }
    const claims = await this.jwt.verifyAccessToken(token);
    // A device signed out elsewhere must not keep a live board open.
    if (!claims.sub || (await this.redis.isDeviceBlacklisted(claims.did))) {
      throw new Error('signed out');
    }
    client.data = {
      userId: claims.sub,
      boards: new Map(),
      sandboxes: new Map(),
      chatSentAt: [],
    };
  }

  async handleDisconnect(client: BoardSocket): Promise<void> {
    const open = (kind: BoardDocKind, boards?: Map<string, string>) =>
      [...(boards?.values() ?? [])].map((id) =>
        this.rooms.leave(kind, id, client.id),
      );
    await Promise.all([
      ...open('code', client.data?.boards),
      ...open('sandbox', client.data?.sandboxes),
    ]);
  }

  @SubscribeMessage(BOARD_SOCKET_EVENTS.OPEN)
  async open(
    @ConnectedSocket() client: BoardSocket,
    @MessageBody() body: unknown,
  ): Promise<BoardAck<{ state: Uint8Array; awareness: Uint8Array }>> {
    return this.answer(async () => {
      const code = readCode(body);
      await this.requireFeatures(client, FEATURE_FLAGS.CODING_BOARD);
      const { board } = await this.boards.requireMember(
        client.data.userId,
        code,
      );
      await client.join(roomOf(board.id));
      client.data.boards.set(code, board.id);
      const snapshot = await this.rooms.join('code', board, client.id);
      // The code document is seeded on first open, so it always opens.
      if (!snapshot) throw new Error(`board ${board.id} did not open`);
      return snapshot;
    });
  }

  @SubscribeMessage(BOARD_SOCKET_EVENTS.LEAVE)
  async leave(
    @ConnectedSocket() client: BoardSocket,
    @MessageBody() body: unknown,
  ): Promise<BoardAck> {
    return this.answer(async () => {
      const code = readCode(body);
      const boardId = client.data.boards.get(code);
      if (!boardId) return {};
      client.data.boards.delete(code);
      await client.leave(roomOf(boardId));
      await this.rooms.leave('code', boardId, client.id);
      return {};
    });
  }

  /**
   * Opens the room's React project. Before anyone starts it the answer is
   * `ready: false`; the room hears `sandbox:ready` when someone does.
   */
  @SubscribeMessage(BOARD_SOCKET_EVENTS.SANDBOX_OPEN)
  async openSandbox(
    @ConnectedSocket() client: BoardSocket,
    @MessageBody() body: unknown,
  ): Promise<
    BoardAck<
      | { ready: false }
      | { ready: true; state: Uint8Array; awareness: Uint8Array }
    >
  > {
    return this.answer(async () => {
      const code = readCode(body);
      await this.requireFeatures(
        client,
        FEATURE_FLAGS.CODING_BOARD,
        FEATURE_FLAGS.REACT_SANDBOX,
      );
      const { board } = await this.boards.requireMember(
        client.data.userId,
        code,
      );
      const room = roomOf(board.id, 'sandbox');
      await client.join(room);
      const snapshot = await this.rooms.join('sandbox', board, client.id);
      if (!snapshot) {
        await client.leave(room);
        return { ready: false as const };
      }
      client.data.sandboxes.set(code, board.id);
      return { ready: true as const, ...snapshot };
    });
  }

  @SubscribeMessage(BOARD_SOCKET_EVENTS.SANDBOX_LEAVE)
  async leaveSandbox(
    @ConnectedSocket() client: BoardSocket,
    @MessageBody() body: unknown,
  ): Promise<BoardAck> {
    return this.answer(async () => {
      const code = readCode(body);
      const boardId = client.data.sandboxes.get(code);
      if (!boardId) return {};
      client.data.sandboxes.delete(code);
      await client.leave(roomOf(boardId, 'sandbox'));
      await this.rooms.leave('sandbox', boardId, client.id);
      return {};
    });
  }

  @SubscribeMessage(BOARD_SOCKET_EVENTS.UPDATE)
  update(
    @ConnectedSocket() client: BoardSocket,
    @MessageBody() body: unknown,
  ): void {
    this.relayUpdate('code', client, body);
  }

  @SubscribeMessage(BOARD_SOCKET_EVENTS.AWARENESS)
  awareness(
    @ConnectedSocket() client: BoardSocket,
    @MessageBody() body: unknown,
  ): void {
    this.relayAwareness('code', client, body);
  }

  @SubscribeMessage(BOARD_SOCKET_EVENTS.SANDBOX_UPDATE)
  sandboxUpdate(
    @ConnectedSocket() client: BoardSocket,
    @MessageBody() body: unknown,
  ): void {
    this.relayUpdate('sandbox', client, body);
  }

  @SubscribeMessage(BOARD_SOCKET_EVENTS.SANDBOX_AWARENESS)
  sandboxAwareness(
    @ConnectedSocket() client: BoardSocket,
    @MessageBody() body: unknown,
  ): void {
    this.relayAwareness('sandbox', client, body);
  }

  @SubscribeMessage(BOARD_SOCKET_EVENTS.CHAT_SEND)
  async sendChat(
    @ConnectedSocket() client: BoardSocket,
    @MessageBody() body: unknown,
  ): Promise<BoardAck<{ message: ReturnType<typeof toBoardMessage> }>> {
    return this.answer(async () => {
      const boardId = client.data.boards.get(readCode(body));
      if (!boardId) {
        throw new HttpException('Open the room before sending messages.', 403);
      }
      if (!this.allowChat(client.data)) {
        throw new HttpException(
          "You're sending messages too quickly. Wait a few seconds and try again.",
          429,
        );
      }
      const text = (body as { body?: unknown }).body;
      const stored = await this.chat.post(boardId, client.data.userId, text);
      const message = toBoardMessage(stored);
      client.nsp
        .to(roomOf(boardId))
        .emit(BOARD_SOCKET_EVENTS.CHAT_MESSAGE, message);
      return { message };
    });
  }

  private relayUpdate(
    kind: BoardDocKind,
    client: BoardSocket,
    body: unknown,
  ): void {
    const target = this.target(kind, client, body);
    if (!target) return;
    try {
      this.rooms.applyUpdate(kind, target.boardId, client.id, target.bytes);
    } catch (error: unknown) {
      client.emit('exception', { message: messageOf(error) });
    }
  }

  private relayAwareness(
    kind: BoardDocKind,
    client: BoardSocket,
    body: unknown,
  ): void {
    const target = this.target(kind, client, body);
    if (target) {
      this.rooms.applyAwareness(kind, target.boardId, client.id, target.bytes);
    }
  }

  /** The board and binary payload of an update, if the socket has opened that document. */
  private target(kind: BoardDocKind, client: BoardSocket, body: unknown) {
    const code = normalizeBoardCode((body as { code?: unknown })?.code);
    const opened =
      kind === 'code' ? client.data?.boards : client.data?.sandboxes;
    const boardId = typeof code === 'string' ? opened?.get(code) : undefined;
    const bytes = toBytes((body as { update?: unknown })?.update);
    return boardId && bytes ? { boardId, bytes } : null;
  }

  /** Throws the flag's refusal, which the ack shows, unless every flag reaches this user. */
  private async requireFeatures(
    client: BoardSocket,
    ...featureKeys: string[]
  ): Promise<void> {
    for (const featureKey of featureKeys) {
      await this.featureFlags.assertFeatureAccess(
        client.data.userId,
        featureKey,
      );
    }
  }

  private allowChat(data: BoardSocketData): boolean {
    const now = Date.now();
    data.chatSentAt = data.chatSentAt.filter(
      (at) => now - at < BOARD_CHAT_WINDOW_MS,
    );
    if (data.chatSentAt.length >= BOARD_CHAT_BURST) return false;
    data.chatSentAt.push(now);
    return true;
  }

  /** Runs a handler and turns its result or failure into an ack the client can show. */
  private async answer<T extends object>(
    run: () => Promise<T>,
  ): Promise<BoardAck<T>> {
    try {
      return { ok: true, ...(await run()) };
    } catch (error: unknown) {
      if (!(error instanceof HttpException)) {
        this.logger.error(
          `Board socket handler failed: ${errorText(error)}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
      return { ok: false, message: messageOf(error) };
    }
  }
}

function readCode(body: unknown): string {
  const code = normalizeBoardCode((body as { code?: unknown } | null)?.code);
  if (typeof code !== 'string' || !BOARD_CODE_PATTERN.test(code)) {
    throw new HttpException(
      'Room IDs have 5 letters and numbers. Check the ID and try again.',
      400,
    );
  }
  return code;
}

/** Socket.IO delivers binary as a Buffer in Node; anything else is not an update. */
function toBytes(value: unknown): Uint8Array | null {
  if (value instanceof Uint8Array) return new Uint8Array(value);
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return null;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function messageOf(error: unknown): string {
  if (error instanceof HttpException) {
    const response = error.getResponse();
    const message =
      typeof response === 'string'
        ? response
        : (response as { message?: unknown }).message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message) && typeof message[0] === 'string') {
      return message[0];
    }
  }
  return FALLBACK_ERROR;
}
