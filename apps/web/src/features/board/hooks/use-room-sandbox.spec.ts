import { act, renderHook, waitFor } from '@testing-library/react';
import * as Y from 'yjs';
import { BOARD_SOCKET_EVENTS } from '../constants/board.constant';
import type { BoardSocket } from './use-board-connection';
import { useRoomSandbox } from './use-room-sandbox';

type Handler = (...args: unknown[]) => void;

/** Enough of a Socket.IO client to drive the hook: events in, emits and acks out. */
function fakeSocket(ack: (event: string) => unknown) {
  const handlers = new Map<string, Set<Handler>>();
  const emit = jest.fn();
  const socket = {
    connected: true,
    on: (event: string, handler: Handler) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)?.add(handler);
    },
    off: (event: string, handler: Handler) =>
      handlers.get(event)?.delete(handler),
    emit,
    timeout: () => ({
      emitWithAck: (event: string) => Promise.resolve(ack(event)),
    }),
  };
  const fire = (event: string, ...args: unknown[]) =>
    handlers.get(event)?.forEach((handler) => handler(...args));
  const listening = () =>
    [...handlers.values()].reduce((count, set) => count + set.size, 0);
  return { socket: socket as unknown as BoardSocket, emit, fire, listening };
}

function projectState(files: Record<string, string>): ArrayBuffer {
  const doc = new Y.Doc();
  const map = doc.getMap<Y.Text>('files');
  for (const [path, code] of Object.entries(files)) {
    map.set(path, new Y.Text(code));
  }
  const update = Y.encodeStateAsUpdate(doc);
  return update.buffer.slice(
    update.byteOffset,
    update.byteOffset + update.byteLength,
  ) as ArrayBuffer;
}

const EMPTY_AWARENESS = new Uint8Array([0]).buffer;

describe('useRoomSandbox', () => {
  it('says the project has not started, then opens it when the room hears it is ready', async () => {
    let ready = false;
    const { socket, fire } = fakeSocket(() =>
      ready
        ? {
            ok: true,
            ready: true,
            state: projectState({ '/src/App.tsx': 'app' }),
            awareness: EMPTY_AWARENESS,
          }
        : { ok: true, ready: false },
    );

    const { result } = renderHook(() => useRoomSandbox(socket, 'K7Q2M'));
    await waitFor(() => expect(result.current?.status).toBe('not-started'));

    ready = true;
    act(() => fire(BOARD_SOCKET_EVENTS.sandboxReady));

    await waitFor(() => expect(result.current?.status).toBe('live'));
    expect(
      result.current?.doc
        .getMap<Y.Text>('files')
        .get('/src/App.tsx')
        ?.toString(),
    ).toBe('app');
  });

  it('shows why the project was refused', async () => {
    const { socket } = fakeSocket(() => ({
      ok: false,
      message: 'This experimental feature is not enabled for your account.',
    }));

    const { result } = renderHook(() => useRoomSandbox(socket, 'K7Q2M'));

    await waitFor(() => expect(result.current?.status).toBe('refused'));
    expect(result.current?.error).toBe(
      'This experimental feature is not enabled for your account.',
    );
  });

  it("sends your edits up and applies everyone else's without echoing them", async () => {
    const { socket, emit, fire } = fakeSocket(() => ({
      ok: true,
      ready: true,
      state: projectState({ '/src/App.tsx': 'app' }),
      awareness: EMPTY_AWARENESS,
    }));
    const { result } = renderHook(() => useRoomSandbox(socket, 'K7Q2M'));
    await waitFor(() => expect(result.current?.status).toBe('live'));
    const doc = result.current?.doc as Y.Doc;
    const text = doc.getMap<Y.Text>('files').get('/src/App.tsx') as Y.Text;
    emit.mockClear();

    act(() => text.insert(0, 'my '));
    expect(emit).toHaveBeenCalledWith(BOARD_SOCKET_EVENTS.sandboxUpdate, {
      code: 'K7Q2M',
      update: expect.any(Uint8Array),
    });

    emit.mockClear();
    const peer = new Y.Doc();
    Y.applyUpdate(peer, Y.encodeStateAsUpdate(doc));
    const before = Y.encodeStateVector(peer);
    peer.getMap<Y.Text>('files').get('/src/App.tsx')?.insert(0, '// ');
    act(() =>
      fire(
        BOARD_SOCKET_EVENTS.sandboxUpdate,
        Y.encodeStateAsUpdate(peer, before),
      ),
    );

    expect(text.toString()).toBe('// my app');
    expect(emit).not.toHaveBeenCalledWith(
      BOARD_SOCKET_EVENTS.sandboxUpdate,
      expect.anything(),
    );
  });

  it('leaves the project and stops listening when the tab closes', async () => {
    const { socket, emit, listening } = fakeSocket(() => ({
      ok: true,
      ready: true,
      state: projectState({ '/a.ts': '' }),
      awareness: EMPTY_AWARENESS,
    }));
    const { result, unmount } = renderHook(() =>
      useRoomSandbox(socket, 'K7Q2M'),
    );
    await waitFor(() => expect(result.current?.status).toBe('live'));

    unmount();

    expect(emit).toHaveBeenCalledWith(BOARD_SOCKET_EVENTS.sandboxLeave, {
      code: 'K7Q2M',
    });
    expect(listening()).toBe(0);
  });
});
