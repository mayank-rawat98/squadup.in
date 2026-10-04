import { PayloadTooLargeException } from '@nestjs/common';
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from 'y-protocols/awareness';
import * as Y from 'yjs';
import {
  BOARD_IDLE_UNLOAD_MS,
  BOARD_SAVE_DEBOUNCE_MS,
  BOARD_SAVE_MAX_WAIT_MS,
  BOARD_SOCKET_EVENTS,
  BOARD_STARTER_CODE,
} from '../constants/board-socket.constants';
import { BoardLanguage } from '../constants/board.constants';
import type { Board } from '../entities';
import { BoardDocumentsRepository } from '../repositories/board-documents.repository';
import { BoardSandboxDocumentsRepository } from '../repositories/board-sandbox-documents.repository';
import { encodeSandboxDoc } from '../utils/sandbox-doc';
import { BoardRoomsService } from './board-rooms.service';

const board = { id: 'b1', language: BoardLanguage.PYTHON } as Board;

/** A client doc that has caught up with the room, so its edits apply cleanly. */
function clientDoc(state: Uint8Array): Y.Doc {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, state);
  return doc;
}

function editUpdate(doc: Y.Doc, edit: (doc: Y.Doc) => void): Uint8Array {
  const before = Y.encodeStateVector(doc);
  edit(doc);
  return Y.encodeStateAsUpdate(doc, before);
}

type DocStore = jest.Mocked<Pick<BoardDocumentsRepository, 'load' | 'save'>>;

const docStore = (): DocStore => ({
  load: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(undefined),
});

describe('BoardRoomsService', () => {
  let documents: DocStore;
  let sandboxDocuments: DocStore;
  let broadcast: jest.Mock;
  let service: BoardRoomsService;

  /** Opens the code document, which always opens because it is seeded. */
  async function openCode(socketId: string) {
    const snapshot = await service.join('code', board, socketId);
    if (!snapshot) throw new Error('the code document did not open');
    return snapshot;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    documents = docStore();
    sandboxDocuments = docStore();
    broadcast = jest.fn();
    service = new BoardRoomsService(
      documents as unknown as BoardDocumentsRepository,
      sandboxDocuments as unknown as BoardSandboxDocumentsRepository,
    );
    service.setBroadcast(broadcast);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    jest.useRealTimers();
  });

  it('seeds a new room with its language and a starter file per language', async () => {
    const { state } = await openCode('s1');
    const doc = clientDoc(state);

    expect(doc.getMap('meta').get('language')).toBe('python');
    expect(doc.getText('code:python').toString()).toBe(
      BOARD_STARTER_CODE[BoardLanguage.PYTHON],
    );
    expect(doc.getText('code:java').toString()).toBe(
      BOARD_STARTER_CODE[BoardLanguage.JAVA],
    );
    expect(doc.getArray('pages').toArray()).toEqual([{ id: 'main' }]);
  });

  describe('evict', () => {
    it('tells the room it expired and drops it without saving', async () => {
      await service.join('code', board, 's1');
      await jest.advanceTimersByTimeAsync(BOARD_SAVE_DEBOUNCE_MS);
      documents.save.mockClear();
      broadcast.mockClear();

      await service.evict('b1');
      await jest.advanceTimersByTimeAsync(BOARD_SAVE_MAX_WAIT_MS);

      expect(broadcast).toHaveBeenCalledWith(
        'b1',
        'code',
        BOARD_SOCKET_EVENTS.EXPIRED,
        {
          message:
            "This room has expired. Rooms are deleted 7 days after they're made.",
        },
      );
      expect(documents.save).not.toHaveBeenCalled();
    });

    it('loads the room from storage again if it is opened after eviction', async () => {
      await service.join('code', board, 's1');
      await service.evict('b1');

      await service.join('code', board, 's2');

      expect(documents.load).toHaveBeenCalledTimes(2);
    });

    it('does nothing for a room that is not open', async () => {
      await service.evict('b1');

      expect(broadcast).not.toHaveBeenCalled();
    });
  });

  it('restores a stored room instead of seeding it', async () => {
    const stored = new Y.Doc();
    stored.getText('code:python').insert(0, 'print(42)');
    documents.load.mockResolvedValue(Y.encodeStateAsUpdate(stored));

    const { state } = await openCode('s1');

    expect(clientDoc(state).getText('code:python').toString()).toBe(
      'print(42)',
    );
    expect(clientDoc(state).getText('code:java').toString()).toBe('');
  });

  it('loads a room once when two people open it at the same moment', async () => {
    await Promise.all([
      service.join('code', board, 's1'),
      service.join('code', board, 's2'),
    ]);

    expect(documents.load).toHaveBeenCalledTimes(1);
  });

  it('relays an edit to everyone else in the room and saves after a pause', async () => {
    const { state } = await openCode('s1');
    await jest.advanceTimersByTimeAsync(BOARD_SAVE_DEBOUNCE_MS); // the seed save
    documents.save.mockClear();
    const update = editUpdate(clientDoc(state), (d) =>
      d.getText('code:python').insert(0, '# two sum\n'),
    );

    service.applyUpdate('code', 'b1', 's1', update);

    expect(broadcast).toHaveBeenCalledWith(
      'b1',
      'code',
      BOARD_SOCKET_EVENTS.UPDATE,
      expect.any(Uint8Array),
      's1',
    );
    expect(documents.save).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(BOARD_SAVE_DEBOUNCE_MS);
    expect(documents.save).toHaveBeenCalledTimes(1);
    const saved = clientDoc(documents.save.mock.calls[0][1]);
    expect(saved.getText('code:python').toString()).toMatch(/^# two sum\n/);
  });

  it('saves during non-stop typing at least every max wait', async () => {
    const { state } = await openCode('s1');
    await jest.advanceTimersByTimeAsync(BOARD_SAVE_DEBOUNCE_MS);
    documents.save.mockClear();
    const doc = clientDoc(state);

    const keystrokes = BOARD_SAVE_MAX_WAIT_MS / 500;
    for (let i = 0; i < keystrokes; i++) {
      service.applyUpdate(
        'code',
        'b1',
        's1',
        editUpdate(doc, (d) => d.getText('code:python').insert(0, 'x')),
      );
      await jest.advanceTimersByTimeAsync(500);
    }

    expect(documents.save).toHaveBeenCalledTimes(1);
  });

  it('ignores updates from a socket that has not opened the room', async () => {
    await service.join('code', board, 's1');
    broadcast.mockClear();

    service.applyUpdate('code', 'b1', 'intruder', new Uint8Array([0, 0]));

    expect(broadcast).not.toHaveBeenCalled();
  });

  it('refuses an update larger than any real edit', async () => {
    await service.join('code', board, 's1');

    expect(() =>
      service.applyUpdate('code', 'b1', 's1', new Uint8Array(256 * 1024 + 1)),
    ).toThrow(PayloadTooLargeException);
  });

  it("clears a leaving socket's cursor for everyone else", async () => {
    await service.join('code', board, 's1');
    await service.join('code', board, 's2');
    const peer = new Awareness(new Y.Doc());
    peer.setLocalState({ user: { name: 'Diya' } });
    service.applyAwareness(
      'code',
      'b1',
      's2',
      encodeAwarenessUpdate(peer, [peer.clientID]),
    );
    broadcast.mockClear();

    await service.leave('code', 'b1', 's2');

    const [boardId, kind, event, payload, except] = broadcast.mock.calls[0];
    expect([boardId, kind, event, except]).toEqual([
      'b1',
      'code',
      BOARD_SOCKET_EVENTS.AWARENESS,
      's2',
    ]);
    const observer = new Awareness(new Y.Doc());
    observer.setLocalState(null);
    applyAwarenessUpdate(observer, payload as Uint8Array, 'test');
    expect(observer.getStates().has(peer.clientID)).toBe(false);
    peer.destroy();
    observer.destroy();
  });

  it('saves when the last person leaves and unloads the room after a while', async () => {
    const { state } = await openCode('s1');
    service.applyUpdate(
      'code',
      'b1',
      's1',
      editUpdate(clientDoc(state), (d) =>
        d.getText('code:python').insert(0, 'x'),
      ),
    );

    await service.leave('code', 'b1', 's1');
    expect(documents.save).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(BOARD_IDLE_UNLOAD_MS);
    await service.join('code', board, 's1');
    expect(documents.load).toHaveBeenCalledTimes(2);
  });

  it('keeps edits marked unsaved when the database write fails', async () => {
    documents.save.mockRejectedValueOnce(new Error('db down'));
    await service.join('code', board, 's1');

    await service.leave('code', 'b1', 's1');
    await service.join('code', board, 's1');
    await service.leave('code', 'b1', 's1');

    expect(documents.save).toHaveBeenCalledTimes(2);
  });

  describe('the React project', () => {
    it('does not open, or stay loaded, before anyone starts it', async () => {
      await expect(service.join('sandbox', board, 's1')).resolves.toBeNull();
      await expect(service.join('sandbox', board, 's1')).resolves.toBeNull();

      expect(sandboxDocuments.load).toHaveBeenCalledTimes(2);
      expect(sandboxDocuments.save).not.toHaveBeenCalled();
    });

    it('relays project edits on its own events and saves them to its own table', async () => {
      sandboxDocuments.load.mockResolvedValue(
        encodeSandboxDoc({ '/src/App.tsx': 'export default 1;' }),
      );
      const snapshot = await service.join('sandbox', board, 's1');
      if (!snapshot) throw new Error('the project did not open');
      const doc = clientDoc(snapshot.state);
      expect(doc.getMap<Y.Text>('files').get('/src/App.tsx')?.toString()).toBe(
        'export default 1;',
      );

      service.applyUpdate(
        'sandbox',
        'b1',
        's1',
        editUpdate(doc, (d) =>
          d.getMap<Y.Text>('files').get('/src/App.tsx')?.insert(0, '// hi\n'),
        ),
      );
      await jest.advanceTimersByTimeAsync(BOARD_SAVE_DEBOUNCE_MS);

      expect(broadcast).toHaveBeenCalledWith(
        'b1',
        'sandbox',
        BOARD_SOCKET_EVENTS.SANDBOX_UPDATE,
        expect.any(Uint8Array),
        's1',
      );
      expect(sandboxDocuments.save).toHaveBeenCalledTimes(1);
      expect(documents.save).not.toHaveBeenCalled();
    });

    it('ignores project edits from a socket that only opened the code', async () => {
      sandboxDocuments.load.mockResolvedValue(
        encodeSandboxDoc({ '/a.ts': '' }),
      );
      await service.join('sandbox', board, 's1');
      await openCode('s2');
      broadcast.mockClear();

      service.applyUpdate('sandbox', 'b1', 's2', new Uint8Array([0, 0]));

      expect(broadcast).not.toHaveBeenCalled();
    });

    it('is evicted with the room, which hears it expired once', async () => {
      sandboxDocuments.load.mockResolvedValue(
        encodeSandboxDoc({ '/a.ts': '' }),
      );
      await openCode('s1');
      await service.join('sandbox', board, 's1');
      broadcast.mockClear();

      await service.evict('b1');
      await service.join('sandbox', board, 's1');

      expect(
        broadcast.mock.calls.filter(
          ([, , event]) => event === BOARD_SOCKET_EVENTS.EXPIRED,
        ),
      ).toHaveLength(1);
      expect(sandboxDocuments.load).toHaveBeenCalledTimes(2);
    });
  });

  it('tells the whole room about things that are not document changes', () => {
    service.notify('b1', BOARD_SOCKET_EVENTS.SANDBOX_READY, {});

    expect(broadcast).toHaveBeenCalledWith(
      'b1',
      'code',
      BOARD_SOCKET_EVENTS.SANDBOX_READY,
      {},
    );
  });
});
