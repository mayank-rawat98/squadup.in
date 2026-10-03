import { HttpException, Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { JwtAppService } from '../../auth/services/jwt.service';
import { allowedOrigins } from '../../config';
import { RedisService } from '../../redis/redis.service';
import { toBoardMessage } from '../boards.presenter';
import {
  BOARD_CHAT_BURST,
  BOARD_CHAT_WINDOW_MS,
  BOARD_SOCKET_EVENTS,
  BOARDS_NAMESPACE,
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
  /** send times of recent chat messages, for the flood guard */
  chatSentAt: number[];
}

type BoardSocket = Socket & { data: BoardSocketData };

const roomOf = (boardId: string) => `board:${boardId}`;

const FALLBACK_ERROR = 'Something went wrong. Please try again.';

/**
 * The realtime side of the coding board: the shared document, presence and
 * chat. Every socket authenticates with its access token on connect, and
 * every room it opens is checked against membership, the same rule as the
 * REST routes.
 */
@WebSocketGateway({
  namespace: BOARDS_NAMESPACE,
  cors: { origin: allowedOrigins, credentials: true },
  transports: ['websocket', 'polling'],
})
export class BoardsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(BoardsGateway.name);

  constructor(
    private readonly jwt: JwtAppService,
    private readonly redis: RedisService,
    private readonly boards: BoardsService,
    private readonly chat: BoardChatService,
    private readonly rooms: BoardRoomsService,
  ) {}

  afterInit(server: Namespace): void {
    this.rooms.setBroadcast((boardId, event, payload, exceptSocketId) => {
      const target = server.to(roomOf(boardId));
      (exceptSocketId ? target.except(exceptSocketId) : target).emit(
        event,
        payload,
      );
    });
  }

  async handleConnection(client: BoardSocket): Promise<void> {
    try {
      const token: unknown = client.handshake.auth?.token;
      if (typeof token !== 'string' || !token) {
        client.disconnect();
        return;
      }
      const claims = await this.jwt.verifyAccessToken(token);
      // A device signed out elsewhere must not keep a live board open.
      if (!claims.sub || (await this.redis.isDeviceBlacklisted(claims.did))) {
        client.disconnect();
        return;
      }
      client.data = { userId: claims.sub, boards: new Map(), chatSentAt: [] };
    } catch (error: unknown) {
      this.logger.warn(`Board socket rejected: ${(error as Error).message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: BoardSocket): Promise<void> {
    const boardIds = [...(client.data?.boards?.values() ?? [])];
    await Promise.all(boardIds.map((id) => this.rooms.leave(id, client.id)));
  }

  @SubscribeMessage(BOARD_SOCKET_EVENTS.OPEN)
  async open(
    @ConnectedSocket() client: BoardSocket,
    @MessageBody() body: unknown,
  ): Promise<BoardAck<{ state: Uint8Array; awareness: Uint8Array }>> {
    return this.answer(async () => {
      const code = readCode(body);
      const { board } = await this.boards.requireMember(
        client.data.userId,
        code,
      );
      await client.join(roomOf(board.id));
      client.data.boards.set(code, board.id);
      return this.rooms.join(board, client.id);
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
      await this.rooms.leave(boardId, client.id);
      return {};
    });
  }

  @SubscribeMessage(BOARD_SOCKET_EVENTS.UPDATE)
  update(
    @ConnectedSocket() client: BoardSocket,
    @MessageBody() body: unknown,
  ): void {
    const target = this.target(client, body);
    if (!target) return;
    try {
      this.rooms.applyUpdate(target.boardId, client.id, target.bytes);
    } catch (error: unknown) {
      client.emit('exception', { message: messageOf(error) });
    }
  }

  @SubscribeMessage(BOARD_SOCKET_EVENTS.AWARENESS)
  awareness(
    @ConnectedSocket() client: BoardSocket,
    @MessageBody() body: unknown,
  ): void {
    const target = this.target(client, body);
    if (target) {
      this.rooms.applyAwareness(target.boardId, client.id, target.bytes);
    }
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

  /** The board and binary payload of an update, if the socket has opened that board. */
  private target(client: BoardSocket, body: unknown) {
    const code = normalizeBoardCode((body as { code?: unknown })?.code);
    const boardId =
      typeof code === 'string' ? client.data?.boards?.get(code) : undefined;
    const bytes = toBytes((body as { update?: unknown })?.update);
    return boardId && bytes ? { boardId, bytes } : null;
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
        this.logger.error(`Board socket handler failed: ${messageOf(error)}`);
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
