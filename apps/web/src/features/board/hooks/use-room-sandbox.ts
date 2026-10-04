'use client';

import { useEffect, useState } from 'react';
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from 'y-protocols/awareness';
import * as Y from 'yjs';
import { BOARD_SOCKET_EVENTS } from '../constants/board.constant';
import type { BoardSocket } from './use-board-connection';

/*
 * The room's React project: a second Yjs document and awareness, synced over
 * the room's existing socket on the `sandbox:*` events. It follows the same
 * rules as useBoardConnection: reopen on every (re)connect, merge the
 * server's state in, and send up whatever was typed while offline.
 *
 * Before anyone starts the project the server answers `ready: false`; the
 * room hears `sandbox:ready` when someone does, and every open tab opens it.
 */

export type RoomSandboxStatus =
  | 'connecting'
  | 'not-started'
  | 'live'
  | 'refused';

export interface RoomSandboxConnection {
  status: RoomSandboxStatus;
  /** Why the project refused to open, when it did. */
  error: string | null;
  doc: Y.Doc;
  awareness: Awareness;
}

type OpenAck =
  | { ok: true; ready: false }
  | { ok: true; ready: true; state: ArrayBuffer; awareness: ArrayBuffer }
  | { ok: false; message: string };

const REMOTE = 'remote';
const OPEN_TIMEOUT_MS = 10_000;
/** An empty Yjs update is two bytes; anything longer carries edits. */
const EMPTY_UPDATE_BYTES = 2;

export function useRoomSandbox(
  socket: BoardSocket | undefined,
  code: string,
): RoomSandboxConnection | null {
  const [connection, setConnection] = useState<RoomSandboxConnection | null>(
    null,
  );

  useEffect(() => {
    if (!socket) return;
    const doc = new Y.Doc();
    const awareness = new Awareness(doc);
    let open = false;
    let disposed = false;

    const publish = (patch: Partial<RoomSandboxConnection>) => {
      if (disposed) return;
      setConnection((current) => ({
        status: 'connecting',
        error: null,
        doc,
        awareness,
        ...current,
        ...patch,
      }));
    };
    publish({});

    const sendUpdate = (update: Uint8Array, origin: unknown) => {
      if (open && origin !== REMOTE) {
        socket.emit(BOARD_SOCKET_EVENTS.sandboxUpdate, { code, update });
      }
    };
    const sendAwareness = (
      changes: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown,
    ) => {
      if (!open || origin === REMOTE) return;
      socket.emit(BOARD_SOCKET_EVENTS.sandboxAwareness, {
        code,
        update: encodeAwarenessUpdate(awareness, [
          ...changes.added,
          ...changes.updated,
          ...changes.removed,
        ]),
      });
    };
    doc.on('update', sendUpdate);
    awareness.on('update', sendAwareness);

    const onUpdate = (update: ArrayBuffer) =>
      Y.applyUpdate(doc, new Uint8Array(update), REMOTE);
    const onAwareness = (update: ArrayBuffer) =>
      applyAwarenessUpdate(awareness, new Uint8Array(update), REMOTE);

    const openProject = async () => {
      let ack: OpenAck;
      try {
        ack = await socket
          .timeout(OPEN_TIMEOUT_MS)
          .emitWithAck(BOARD_SOCKET_EVENTS.sandboxOpen, { code });
      } catch {
        publish({ status: 'connecting' });
        return;
      }
      if (disposed) return;
      if (!ack.ok) {
        publish({ status: 'refused', error: ack.message });
        return;
      }
      if (!ack.ready) {
        publish({ status: 'not-started', error: null });
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
        socket.emit(BOARD_SOCKET_EVENTS.sandboxUpdate, {
          code,
          update: missing,
        });
      }
      if (awareness.getLocalState() !== null) {
        socket.emit(BOARD_SOCKET_EVENTS.sandboxAwareness, {
          code,
          update: encodeAwarenessUpdate(awareness, [doc.clientID]),
        });
      }
      publish({ status: 'live', error: null });
    };

    const onConnect = () => void openProject();
    const onDisconnect = () => {
      open = false;
      const others = [...awareness.getStates().keys()].filter(
        (id) => id !== doc.clientID,
      );
      removeAwarenessStates(awareness, others, REMOTE);
      setConnection((current) =>
        current && current.status === 'live'
          ? { ...current, status: 'connecting' }
          : current,
      );
    };

    socket.on(BOARD_SOCKET_EVENTS.sandboxUpdate, onUpdate);
    socket.on(BOARD_SOCKET_EVENTS.sandboxAwareness, onAwareness);
    socket.on(BOARD_SOCKET_EVENTS.sandboxReady, onConnect);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) void openProject();

    return () => {
      disposed = true;
      if (open) socket.emit(BOARD_SOCKET_EVENTS.sandboxLeave, { code });
      doc.off('update', sendUpdate);
      awareness.off('update', sendAwareness);
      socket.off(BOARD_SOCKET_EVENTS.sandboxUpdate, onUpdate);
      socket.off(BOARD_SOCKET_EVENTS.sandboxAwareness, onAwareness);
      socket.off(BOARD_SOCKET_EVENTS.sandboxReady, onConnect);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      awareness.destroy();
      doc.destroy();
      setConnection(null);
    };
  }, [socket, code]);

  return connection;
}
