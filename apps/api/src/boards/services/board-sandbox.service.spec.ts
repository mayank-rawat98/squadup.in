import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import * as Y from 'yjs';
import type { SandboxesService } from '../../sandboxes/sandboxes.service';
import { BOARD_SOCKET_EVENTS } from '../constants/board-socket.constants';
import type { BoardSandboxDocumentsRepository } from '../repositories/board-sandbox-documents.repository';
import type { BoardRoomsService } from './board-rooms.service';
import { BoardSandboxService } from './board-sandbox.service';
import type { BoardsService } from './boards.service';

const SANDBOX_ID = '7f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b';

describe('BoardSandboxService', () => {
  let boards: { requireMember: jest.Mock };
  let sandboxes: { get: jest.Mock };
  let documents: { createIfAbsent: jest.Mock };
  let rooms: { notify: jest.Mock };
  let service: BoardSandboxService;

  beforeEach(() => {
    boards = {
      requireMember: jest.fn().mockResolvedValue({ board: { id: 'b1' } }),
    };
    sandboxes = {
      get: jest.fn().mockResolvedValue({
        files: { '/src/App.tsx': 'export default function App() {}' },
      }),
    };
    documents = { createIfAbsent: jest.fn().mockResolvedValue(true) };
    rooms = { notify: jest.fn() };
    service = new BoardSandboxService(
      boards as unknown as BoardsService,
      sandboxes as unknown as SandboxesService,
      documents as unknown as BoardSandboxDocumentsRepository,
      rooms as unknown as BoardRoomsService,
    );
  });

  /** The files a stored first state holds. */
  function storedFiles(): Record<string, string> {
    const doc = new Y.Doc();
    Y.applyUpdate(doc, documents.createIfAbsent.mock.calls[0][1]);
    return Object.fromEntries(
      [...doc.getMap<Y.Text>('files').entries()].map(([path, text]) => [
        path,
        text.toString(),
      ]),
    );
  }

  it('starts the project from the template files and tells the room', async () => {
    await service.start('u1', 'K7Q2M', {
      files: { '/index.html': '<div id="root"></div>' },
    });

    expect(boards.requireMember).toHaveBeenCalledWith('u1', 'K7Q2M');
    expect(storedFiles()).toEqual({ '/index.html': '<div id="root"></div>' });
    expect(rooms.notify).toHaveBeenCalledWith(
      'b1',
      BOARD_SOCKET_EVENTS.SANDBOX_READY,
      {},
    );
  });

  it("starts the project as a copy of the member's own sandbox", async () => {
    await service.start('u1', 'K7Q2M', { sandboxId: SANDBOX_ID });

    expect(sandboxes.get).toHaveBeenCalledWith('u1', SANDBOX_ID);
    expect(storedFiles()).toEqual({
      '/src/App.tsx': 'export default function App() {}',
    });
  });

  it("refuses someone else's sandbox the way the sandboxes API does", async () => {
    sandboxes.get.mockRejectedValue(new NotFoundException('not found'));

    await expect(
      service.start('u1', 'K7Q2M', { sandboxId: SANDBOX_ID }),
    ).rejects.toThrow(NotFoundException);
    expect(documents.createIfAbsent).not.toHaveBeenCalled();
  });

  it('refuses a second start without touching the project', async () => {
    documents.createIfAbsent.mockResolvedValue(false);

    await expect(
      service.start('u1', 'K7Q2M', { files: { '/a.ts': '' } }),
    ).rejects.toThrow(
      new ConflictException(
        'Someone in this room already started a React project. Open it to join in.',
      ),
    );
    expect(rooms.notify).not.toHaveBeenCalled();
  });

  it('asks for exactly one starting point', async () => {
    await expect(service.start('u1', 'K7Q2M', {})).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      service.start('u1', 'K7Q2M', {
        sandboxId: SANDBOX_ID,
        files: { '/a.ts': '' },
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuses files the sandbox API would not save', async () => {
    await expect(
      service.start('u1', 'K7Q2M', { files: { '../etc/passwd': 'x' } }),
    ).rejects.toThrow(BadRequestException);
    expect(documents.createIfAbsent).not.toHaveBeenCalled();
  });

  it('checks membership before anything else', async () => {
    boards.requireMember.mockRejectedValue(new Error('not a member'));

    await expect(
      service.start('u1', 'K7Q2M', { files: { '/a.ts': '' } }),
    ).rejects.toThrow('not a member');
    expect(sandboxes.get).not.toHaveBeenCalled();
  });
});
