import {
  Injectable,
  Logger,
  OnModuleDestroy,
  PayloadTooLargeException,
} from '@nestjs/common';
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from 'y-protocols/awareness';
import * as Y from 'yjs';
import {
  BOARD_DOC_FIRST_PAGE_ID,
  BOARD_DOC_META,
  BOARD_DOC_META_LANGUAGE,
  BOARD_DOC_PAGES,
  BOARD_IDLE_UNLOAD_MS,
  BOARD_MAX_DOC_BYTES,
  BOARD_MAX_UPDATE_BYTES,
  BOARD_SAVE_DEBOUNCE_MS,
  BOARD_SAVE_MAX_WAIT_MS,
  BOARD_SOCKET_EVENTS,
  BOARD_STARTER_CODE,
  boardDocCodeKey,
} from '../constants/board-socket.constants';
import {
  BOARD_RETENTION_DAYS,
  BoardLanguage,
} from '../constants/board.constants';
import type { Board } from '../entities';
import { BoardDocumentsRepository } from '../repositories/board-documents.repository';

/** Sends an event to everyone in a board, optionally leaving one socket out. */
export type BoardBroadcast = (
  boardId: string,
  event: string,
  payload: unknown,
  exceptSocketId?: string,
) => void;

export interface RoomSnapshot {
  state: Uint8Array;
  awareness: Uint8Array;
}

interface LiveRoom {
  boardId: string;
  doc: Y.Doc;
  awareness: Awareness;
  sockets: Set<string>;
  /** The awareness client ids each socket speaks for, cleared when it leaves. */
  clients: Map<string, Set<number>>;
  /** Encoded size at the last load or save plus every update since: an upper bound. */
  bytes: number;
  dirtySince: number | null;
  saveTimer?: ReturnType<typeof setTimeout>;
  unloadTimer?: ReturnType<typeof setTimeout>;
}

/**
 * The live side of every open board: one Yjs document and one awareness per
 * room, held in memory while anyone is in it and written to Postgres as it
 * changes. Updates from one socket are applied here and relayed to the rest.
 *
 * Rooms live in this process, so the API must run as a single instance (as
 * it does today) or gain sticky sessions and a shared adapter first.
 */
@Injectable()
export class BoardRoomsService implements OnModuleDestroy {
  private readonly logger = new Logger(BoardRoomsService.name);
  private readonly rooms = new Map<string, LiveRoom>();
  private readonly loading = new Map<string, Promise<LiveRoom>>();
  private broadcast: BoardBroadcast = () => undefined;

  constructor(private readonly documents: BoardDocumentsRepository) {}

  /** The gateway hands over its emitter once the socket server exists. */
  setBroadcast(broadcast: BoardBroadcast): void {
    this.broadcast = broadcast;
  }

  /** Adds a socket to the room and returns what it needs to catch up. */
  async join(board: Board, socketId: string): Promise<RoomSnapshot> {
    const room = await this.room(board);
    clearTimeout(room.unloadTimer);
    room.unloadTimer = undefined;
    room.sockets.add(socketId);
    return {
      state: Y.encodeStateAsUpdate(room.doc),
      awareness: encodeAwarenessUpdate(room.awareness, [
        ...room.awareness.getStates().keys(),
      ]),
    };
  }

  /** Applies a document update from a socket that has joined the room. */
  applyUpdate(boardId: string, socketId: string, update: Uint8Array): void {
    const room = this.joined(boardId, socketId);
    if (!room) return;
    if (
      update.byteLength > BOARD_MAX_UPDATE_BYTES ||
      room.bytes + update.byteLength > BOARD_MAX_DOC_BYTES
    ) {
      throw new PayloadTooLargeException(
        'This board is too large to save more changes. Clear the whiteboard or remove unused code.',
      );
    }
    room.bytes += update.byteLength;
    Y.applyUpdate(room.doc, update, socketId);
  }

  applyAwareness(boardId: string, socketId: string, update: Uint8Array): void {
    const room = this.joined(boardId, socketId);
    if (!room || update.byteLength > BOARD_MAX_UPDATE_BYTES) return;
    applyAwarenessUpdate(room.awareness, update, socketId);
  }

  /** Takes a socket out: its cursors vanish for everyone, and an empty room saves and unloads. */
  async leave(boardId: string, socketId: string): Promise<void> {
    const room = this.rooms.get(boardId);
    if (!room || !room.sockets.delete(socketId)) return;

    const clients = room.clients.get(socketId);
    room.clients.delete(socketId);
    if (clients?.size) {
      removeAwarenessStates(room.awareness, [...clients], socketId);
    }

    if (room.sockets.size === 0) {
      await this.save(room);
      room.unloadTimer = setTimeout(
        () => this.unload(room),
        BOARD_IDLE_UNLOAD_MS,
      );
    }
  }

  /**
   * Closes an expired room without saving it: tells everyone in it, then
   * drops it from memory so nothing writes it back after it's deleted. Waits
   * for a load in progress, so a room can't reappear behind the sweep.
   */
  async evict(boardId: string): Promise<void> {
    await this.loading.get(boardId)?.catch(() => undefined);
    const room = this.rooms.get(boardId);
    if (!room) return;
    this.rooms.delete(boardId);
    this.dispose(room);
    this.broadcast(boardId, BOARD_SOCKET_EVENTS.EXPIRED, {
      message: `This room has expired. Rooms are deleted ${BOARD_RETENTION_DAYS} days after they're made.`,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.rooms.values()].map((room) => this.save(room)));
    for (const room of this.rooms.values()) this.dispose(room);
  }

  private joined(boardId: string, socketId: string): LiveRoom | undefined {
    const room = this.rooms.get(boardId);
    return room?.sockets.has(socketId) ? room : undefined;
  }

  /** The live room, loading it once even when several people open it at the same moment. */
  private room(board: Board): Promise<LiveRoom> {
    const live = this.rooms.get(board.id);
    if (live) return Promise.resolve(live);

    let pending = this.loading.get(board.id);
    if (!pending) {
      pending = this.load(board).finally(() => this.loading.delete(board.id));
      this.loading.set(board.id, pending);
    }
    return pending;
  }

  private async load(board: Board): Promise<LiveRoom> {
    const doc = new Y.Doc();
    const stored = await this.documents.load(board.id);
    if (stored) {
      Y.applyUpdate(doc, stored);
    } else {
      seed(doc, board.language);
    }

    const awareness = new Awareness(doc);
    // The server holds others' presence; it has none of its own.
    awareness.setLocalState(null);

    const room: LiveRoom = {
      boardId: board.id,
      doc,
      awareness,
      sockets: new Set(),
      clients: new Map(),
      bytes: Y.encodeStateAsUpdate(doc).byteLength,
      dirtySince: stored ? null : Date.now(),
    };

    doc.on('update', (update: Uint8Array, origin: unknown) => {
      this.broadcast(
        room.boardId,
        BOARD_SOCKET_EVENTS.UPDATE,
        update,
        typeof origin === 'string' ? origin : undefined,
      );
      this.scheduleSave(room);
    });

    awareness.on(
      'update',
      (
        changes: { added: number[]; updated: number[]; removed: number[] },
        origin: unknown,
      ) => {
        const socketId = typeof origin === 'string' ? origin : undefined;
        if (socketId && room.sockets.has(socketId)) {
          const owned = room.clients.get(socketId) ?? new Set<number>();
          changes.added.forEach((id) => owned.add(id));
          changes.removed.forEach((id) => owned.delete(id));
          room.clients.set(socketId, owned);
        }
        const changed = [
          ...changes.added,
          ...changes.updated,
          ...changes.removed,
        ];
        this.broadcast(
          room.boardId,
          BOARD_SOCKET_EVENTS.AWARENESS,
          encodeAwarenessUpdate(awareness, changed),
          socketId,
        );
      },
    );

    this.rooms.set(board.id, room);
    if (!stored) this.scheduleSave(room);
    return room;
  }

  /** Saves after a pause in typing, but never leaves edits unsaved for longer than the max wait. */
  private scheduleSave(room: LiveRoom): void {
    const now = Date.now();
    room.dirtySince ??= now;
    clearTimeout(room.saveTimer);
    const wait = Math.min(
      BOARD_SAVE_DEBOUNCE_MS,
      Math.max(0, room.dirtySince + BOARD_SAVE_MAX_WAIT_MS - now),
    );
    room.saveTimer = setTimeout(() => void this.save(room), wait);
  }

  private async save(room: LiveRoom): Promise<void> {
    clearTimeout(room.saveTimer);
    room.saveTimer = undefined;
    if (room.dirtySince === null) return;

    const state = Y.encodeStateAsUpdate(room.doc);
    room.dirtySince = null;
    try {
      await this.documents.save(room.boardId, state);
      room.bytes = state.byteLength;
    } catch (error: unknown) {
      this.logger.error(
        `Saving board ${room.boardId} failed: ${(error as Error).message}`,
      );
      // Keep the edits marked unsaved so the next change, or leaving, retries.
      room.dirtySince ??= Date.now();
    }
  }

  private unload(room: LiveRoom): void {
    if (room.sockets.size > 0 || room.dirtySince !== null) return;
    this.dispose(room);
    this.rooms.delete(room.boardId);
  }

  private dispose(room: LiveRoom): void {
    clearTimeout(room.saveTimer);
    clearTimeout(room.unloadTimer);
    room.awareness.destroy();
    room.doc.destroy();
  }
}

/**
 * A new room opens in its chosen language with a starter file for every
 * language and one blank whiteboard page.
 */
function seed(doc: Y.Doc, language: BoardLanguage): void {
  doc.transact(() => {
    doc.getMap(BOARD_DOC_META).set(BOARD_DOC_META_LANGUAGE, language);
    doc.getArray(BOARD_DOC_PAGES).push([{ id: BOARD_DOC_FIRST_PAGE_ID }]);
    for (const lang of Object.values(BoardLanguage)) {
      doc.getText(boardDocCodeKey(lang)).insert(0, BOARD_STARTER_CODE[lang]);
    }
  });
}
