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

describe('BoardRoomsService', () => {
  let documents: jest.Mocked<Pick<BoardDocumentsRepository, 'load' | 'save'>>;
  let broadcast: jest.Mock;
  let service: BoardRoomsService;

  beforeEach(() => {
    jest.useFakeTimers();
    documents = {
      load: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockResolvedValue(undefined),
    };
    broadcast = jest.fn();
    service = new BoardRoomsService(
      documents as unknown as BoardDocumentsRepository,
    );
    service.setBroadcast(broadcast);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    jest.useRealTimers();
  });

  it('seeds a new room with its language and a starter file per language', async () => {
    const { state } = await service.join(board, 's1');
    const doc = clientDoc(state);

    expect(doc.getMap('meta').get('language')).toBe('python');
    expect(doc.getText('code:python').toString()).toBe(
      BOARD_STARTER_CODE[BoardLanguage.PYTHON],
    );
    expect(doc.getText('code:java').toString()).toBe(
      BOARD_STARTER_CODE[BoardLanguage.JAVA],
    );
  });

  it('restores a stored room instead of seeding it', async () => {
    const stored = new Y.Doc();
    stored.getText('code:python').insert(0, 'print(42)');
    documents.load.mockResolvedValue(Y.encodeStateAsUpdate(stored));

    const { state } = await service.join(board, 's1');

    expect(clientDoc(state).getText('code:python').toString()).toBe(
      'print(42)',
    );
    expect(clientDoc(state).getText('code:java').toString()).toBe('');
  });

  it('loads a room once when two people open it at the same moment', async () => {
    await Promise.all([service.join(board, 's1'), service.join(board, 's2')]);

    expect(documents.load).toHaveBeenCalledTimes(1);
  });

  it('relays an edit to everyone else in the room and saves after a pause', async () => {
    const { state } = await service.join(board, 's1');
    await jest.advanceTimersByTimeAsync(BOARD_SAVE_DEBOUNCE_MS); // the seed save
    documents.save.mockClear();
    const update = editUpdate(clientDoc(state), (d) =>
      d.getText('code:python').insert(0, '# two sum\n'),
    );

    service.applyUpdate('b1', 's1', update);

    expect(broadcast).toHaveBeenCalledWith(
      'b1',
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
    const { state } = await service.join(board, 's1');
    await jest.advanceTimersByTimeAsync(BOARD_SAVE_DEBOUNCE_MS);
    documents.save.mockClear();
    const doc = clientDoc(state);

    const keystrokes = BOARD_SAVE_MAX_WAIT_MS / 500;
    for (let i = 0; i < keystrokes; i++) {
      service.applyUpdate(
        'b1',
        's1',
        editUpdate(doc, (d) => d.getText('code:python').insert(0, 'x')),
      );
      await jest.advanceTimersByTimeAsync(500);
    }

    expect(documents.save).toHaveBeenCalledTimes(1);
  });

  it('ignores updates from a socket that has not opened the room', async () => {
    await service.join(board, 's1');
    broadcast.mockClear();

    service.applyUpdate('b1', 'intruder', new Uint8Array([0, 0]));

    expect(broadcast).not.toHaveBeenCalled();
  });

  it('refuses an update larger than any real edit', async () => {
    await service.join(board, 's1');

    expect(() =>
      service.applyUpdate('b1', 's1', new Uint8Array(256 * 1024 + 1)),
    ).toThrow(PayloadTooLargeException);
  });

  it("clears a leaving socket's cursor for everyone else", async () => {
    await service.join(board, 's1');
    await service.join(board, 's2');
    const peer = new Awareness(new Y.Doc());
    peer.setLocalState({ user: { name: 'Diya' } });
    service.applyAwareness(
      'b1',
      's2',
      encodeAwarenessUpdate(peer, [peer.clientID]),
    );
    broadcast.mockClear();

    await service.leave('b1', 's2');

    const [boardId, event, payload, except] = broadcast.mock.calls[0];
    expect([boardId, event, except]).toEqual([
      'b1',
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
    const { state } = await service.join(board, 's1');
    service.applyUpdate(
      'b1',
      's1',
      editUpdate(clientDoc(state), (d) =>
        d.getText('code:python').insert(0, 'x'),
      ),
    );

    await service.leave('b1', 's1');
    expect(documents.save).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(BOARD_IDLE_UNLOAD_MS);
    await service.join(board, 's1');
    expect(documents.load).toHaveBeenCalledTimes(2);
  });

  it('keeps edits marked unsaved when the database write fails', async () => {
    documents.save.mockRejectedValueOnce(new Error('db down'));
    await service.join(board, 's1');

    await service.leave('b1', 's1');
    await service.join(board, 's1');
    await service.leave('b1', 's1');

    expect(documents.save).toHaveBeenCalledTimes(2);
  });
});
