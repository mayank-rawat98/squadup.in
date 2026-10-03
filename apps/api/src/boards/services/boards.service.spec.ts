import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { BoardLanguage, BoardRole } from '../constants/board.constants';
import type { Board, BoardMember } from '../entities';
import { BoardsRepository } from '../repositories/boards.repository';
import { BoardsService } from './boards.service';

const board = (patch: Partial<Board> = {}): Board =>
  ({
    id: 'b1',
    code: 'K7Q2M',
    name: 'Two-sum warmup',
    language: BoardLanguage.CPP,
    seats: 8,
    hostId: 'host',
    closedAt: null,
    createdAt: new Date('2026-10-01T10:00:00Z'),
    ...patch,
  }) as Board;

const membership = (patch: Partial<BoardMember> = {}): BoardMember =>
  ({
    id: 'm1',
    boardId: 'b1',
    userId: 'u1',
    role: BoardRole.MEMBER,
    joinedAt: new Date('2026-10-01T10:05:00Z'),
    ...patch,
  }) as BoardMember;

describe('BoardsService', () => {
  let repo: jest.Mocked<
    Pick<
      BoardsRepository,
      | 'findByCode'
      | 'codeExists'
      | 'createWithHost'
      | 'findMembership'
      | 'addMember'
      | 'listMembers'
      | 'listForUser'
    >
  >;
  let service: BoardsService;

  beforeEach(() => {
    repo = {
      findByCode: jest.fn().mockResolvedValue(board()),
      codeExists: jest.fn().mockResolvedValue(false),
      createWithHost: jest.fn(async (data) => board(data)),
      findMembership: jest.fn().mockResolvedValue(membership()),
      addMember: jest.fn().mockResolvedValue('added'),
      listMembers: jest.fn().mockResolvedValue([membership()]),
      listForUser: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };
    service = new BoardsService(repo as unknown as BoardsRepository);
  });

  describe('create', () => {
    const dto = {
      name: 'Two-sum warmup',
      language: BoardLanguage.PYTHON,
      seats: 4,
    };

    it('creates the board with the caller as host and opens it', async () => {
      const result = await service.create('host', dto);

      expect(repo.createWithHost).toHaveBeenCalledWith({
        code: expect.stringMatching(/^[A-Z2-9]{5}$/),
        name: 'Two-sum warmup',
        language: BoardLanguage.PYTHON,
        seats: 4,
        hostId: 'host',
      });
      expect(result.members).toEqual([membership()]);
    });

    it('draws another code when the first is taken', async () => {
      repo.codeExists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      await service.create('host', dto);

      expect(repo.codeExists).toHaveBeenCalledTimes(2);
      expect(repo.createWithHost).toHaveBeenCalledTimes(1);
    });

    it('gives up after five taken codes instead of looping', async () => {
      repo.codeExists.mockResolvedValue(true);

      await expect(service.create('host', dto)).rejects.toThrow(
        ServiceUnavailableException,
      );
      expect(repo.codeExists).toHaveBeenCalledTimes(5);
      expect(repo.createWithHost).not.toHaveBeenCalled();
    });
  });

  describe('join', () => {
    it('returns 404 when no room has the code', async () => {
      repo.findByCode.mockResolvedValue(null);

      await expect(service.join('u1', 'ZZZZZ')).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.addMember).not.toHaveBeenCalled();
    });

    it('returns 409 when every seat is taken', async () => {
      repo.addMember.mockResolvedValue('full');

      await expect(service.join('u1', 'K7Q2M')).rejects.toThrow(
        new ConflictException('This room is full: all 8 seats are taken.'),
      );
    });

    it('opens the room for someone who is already in it', async () => {
      repo.addMember.mockResolvedValue('already-member');

      const result = await service.join('u1', 'K7Q2M');

      expect(result.board.code).toBe('K7Q2M');
      expect(result.membership).toEqual(membership());
    });
  });

  describe('requireMember', () => {
    it('refuses someone who has not joined', async () => {
      repo.findMembership.mockResolvedValue(null);

      await expect(service.requireMember('u2', 'K7Q2M')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('answers a missing room the same way, so codes cannot be probed', async () => {
      repo.findByCode.mockResolvedValue(null);

      await expect(service.requireMember('u1', 'ZZZZZ')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('listForUser', () => {
    it('defaults to the first page of 20', async () => {
      repo.listForUser.mockResolvedValue({ items: [], total: 41 });

      const result = await service.listForUser('u1', {});

      expect(repo.listForUser).toHaveBeenCalledWith('u1', 1, 20);
      expect(result).toMatchObject({ page: 1, limit: 20, totalPages: 3 });
    });
  });
});
