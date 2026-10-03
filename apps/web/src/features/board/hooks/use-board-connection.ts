'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from 'y-protocols/awareness';
import * as Y from 'yjs';
import { getApiBaseUrl } from '@/lib/api/api.constants';
import { getAccessToken } from '@/lib/auth';
import { BOARD_SOCKET_EVENTS } from '../constants/board.constant';
import { boardsSocketUrl } from '../utils/socket-url';

/*
 * One live room: a Yjs document and awareness kept in step with the
 * `/boards` gateway. Local edits go up as Yjs updates; everyone else's come
 * down and are applied with the REMOTE origin, so they aren't sent back.
 *
 * On every (re)connect the room is opened again: the server's state is
 * merged in, and anything typed while offline goes up as the difference, so
 * a dropped connection loses nothing. As with notifications, `auth` is a
 * function so a reconnect presents the current access token, and a socket
 * the server dropped (an expired token) retries after a pause.
 */

export type BoardConnectionStatus =
  | 'connecting'
  | 'live'
  | 'reconnecting'
  | 'refused';

export interface BoardConnection {
  status: BoardConnectionStatus;
  /** Why the room refused to open, when it did. */
  error: string | null;
  doc: Y.Doc;
  awareness: Awareness;
  socket: BoardSocket;
}

export type BoardSocket = ReturnType<typeof io>;

type OpenAck =
  | { ok: true; state: ArrayBuffer; awareness: ArrayBuffer }
  | { ok: false; message: string };

const REMOTE = 'remote';
const OPEN_TIMEOUT_MS = 10_000;
const SERVER_DISCONNECT_RETRY_MS = 30_000;
/** An empty Yjs update is two bytes; anything longer carries edits. */
const EMPTY_UPDATE_BYTES = 2;

export function useBoardConnection(code: string): BoardConnection | null {
  const [connection, setConnection] = useState<BoardConnection | null>(null);

  useEffect(() => {
    const doc = new Y.Doc();
    const awareness = new Awareness(doc);
    const socket = io(boardsSocketUrl(getApiBaseUrl()), {
      auth: (send) => send({ token: getAccessToken() }),
      transports: ['websocket', 'polling'],
    });
    let open = false;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const publish = (patch: Partial<BoardConnection>) =>
      setConnection((current) => ({
        status: 'connecting',
        error: null,
        doc,
        awareness,
        socket,
        ...current,
        ...patch,
      }));
    publish({});

    const sendUpdate = (update: Uint8Array, origin: unknown) => {
      if (open && origin !== REMOTE) {
        socket.emit(BOARD_SOCKET_EVENTS.update, { code, update });
      }
    };
    const sendAwareness = (
      changes: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown,
    ) => {
      if (!open || origin === REMOTE) return;
      const changed = [
        ...changes.added,
        ...changes.updated,
        ...changes.removed,
      ];
      socket.emit(BOARD_SOCKET_EVENTS.awareness, {
        code,
        update: encodeAwarenessUpdate(awareness, changed),
      });
    };
    doc.on('update', sendUpdate);
    awareness.on('update', sendAwareness);

    socket.on(BOARD_SOCKET_EVENTS.update, (update: ArrayBuffer) =>
      Y.applyUpdate(doc, new Uint8Array(update), REMOTE),
    );
    socket.on(BOARD_SOCKET_EVENTS.awareness, (update: ArrayBuffer) =>
      applyAwarenessUpdate(awareness, new Uint8Array(update), REMOTE),
    );
    // The room reached its retention limit and is being deleted: stop, and
    // don't reconnect to a room that no longer exists.
    socket.on(BOARD_SOCKET_EVENTS.expired, (body: { message?: unknown }) => {
      open = false;
      publish({
        status: 'refused',
        error:
          typeof body?.message === 'string'
            ? body.message
            : 'This room has expired.',
      });
      socket.disconnect();
    });

    socket.on('connect', async () => {
      let ack: OpenAck;
      try {
        ack = await socket
          .timeout(OPEN_TIMEOUT_MS)
          .emitWithAck(BOARD_SOCKET_EVENTS.open, { code });
      } catch {
        publish({ status: 'reconnecting' });
        return;
      }
      if (!ack.ok) {
        publish({ status: 'refused', error: ack.message });
        socket.disconnect();
        return;
      }

      const serverState = new Uint8Array(ack.state);
      Y.applyUpdate(doc, serverState, REMOTE);
      applyAwarenessUpdate(awareness, new Uint8Array(ack.awareness), REMOTE);
      open = true;

      const missing = Y.encodeStateAsUpdate(
        doc,
        Y.encodeStateVectorFromUpdate(serverState),
      );
      if (missing.byteLength > EMPTY_UPDATE_BYTES) {
        socket.emit(BOARD_SOCKET_EVENTS.update, { code, update: missing });
      }
      if (awareness.getLocalState() !== null) {
        socket.emit(BOARD_SOCKET_EVENTS.awareness, {
          code,
          update: encodeAwarenessUpdate(awareness, [doc.clientID]),
        });
      }
      publish({ status: 'live', error: null });
    });

    socket.on('disconnect', (reason) => {
      open = false;
      // Everyone else's cursors are stale until the room is reopened.
      const others = [...awareness.getStates().keys()].filter(
        (id) => id !== doc.clientID,
      );
      removeAwarenessStates(awareness, others, REMOTE);
      setConnection((current) =>
        current?.status === 'refused'
          ? current
          : current && { ...current, status: 'reconnecting' },
      );
      if (reason === 'io server disconnect') {
        clearTimeout(retry);
        retry = setTimeout(() => socket.connect(), SERVER_DISCONNECT_RETRY_MS);
      }
    });

    // The gateway refused the handshake (usually an expired token). Socket.IO
    // won't retry that by itself; by the time this fires again the API
    // client has normally refreshed the token.
    socket.on('connect_error', () => {
      publish({ status: 'reconnecting' });
      if (!socket.active) {
        clearTimeout(retry);
        retry = setTimeout(() => socket.connect(), SERVER_DISCONNECT_RETRY_MS);
      }
    });

    return () => {
      clearTimeout(retry);
      doc.off('update', sendUpdate);
      awareness.off('update', sendAwareness);
      socket.removeAllListeners();
      socket.disconnect();
      awareness.destroy();
      doc.destroy();
      setConnection(null);
    };
  }, [code]);

  return connection;
}
