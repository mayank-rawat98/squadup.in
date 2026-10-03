import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BoardRole } from '../constants/board.constants';
import { Board, BoardMember } from '../entities';

export type AddMemberResult = 'added' | 'already-member' | 'full';

export type NewBoard = Pick<
  Board,
  'code' | 'name' | 'language' | 'seats' | 'hostId'
>;

/** The user columns a board shows for its members; never the whole account. */
const MEMBER_USER_COLUMNS = [
  'user.id',
  'user.fullName',
  'user.username',
  'user.avatarUrl',
];

/** Boards and their memberships. */
@Injectable()
export class BoardsRepository {
  constructor(
    @InjectRepository(Board)
    private readonly boards: Repository<Board>,
    @InjectRepository(BoardMember)
    private readonly members: Repository<BoardMember>,
  ) {}

  findByCode(code: string): Promise<Board | null> {
    return this.boards.findOne({ where: { code } });
  }

  codeExists(code: string): Promise<boolean> {
    return this.boards.exists({ where: { code } });
  }

  /** Creates the board and seats its host, both or neither. */
  createWithHost(data: NewBoard): Promise<Board> {
    return this.boards.manager.transaction(async (em) => {
      const board = await em.save(em.create(Board, data));
      await em.insert(BoardMember, {
        boardId: board.id,
        userId: data.hostId,
        role: BoardRole.HOST,
      });
      return board;
    });
  }

  findMembership(boardId: string, userId: string) {
    return this.members.findOne({ where: { boardId, userId } });
  }

  /**
   * Seats a new member unless the room is full. The board row is locked for
   * the check, so two people racing for the last seat can't both get it.
   */
  addMember(board: Board, userId: string): Promise<AddMemberResult> {
    return this.boards.manager.transaction(async (em) => {
      await em
        .createQueryBuilder(Board, 'board')
        .setLock('pessimistic_write')
        .where('board.id = :id', { id: board.id })
        .getOne();

      const existing = await em.findOne(BoardMember, {
        where: { boardId: board.id, userId },
      });
      if (existing) return 'already-member';

      const taken = await em.count(BoardMember, {
        where: { boardId: board.id },
      });
      if (taken >= board.seats) return 'full';

      await em.insert(BoardMember, {
        boardId: board.id,
        userId,
        role: BoardRole.MEMBER,
      });
      return 'added';
    });
  }

  /** Everyone in the board, host first by join order, with their public fields. */
  listMembers(boardId: string): Promise<BoardMember[]> {
    return this.members
      .createQueryBuilder('member')
      .innerJoin('member.user', 'user')
      .addSelect(MEMBER_USER_COLUMNS)
      .where('member.boardId = :boardId', { boardId })
      .orderBy('member.joinedAt', 'ASC')
      .getMany();
  }

  /** The boards a user has joined, most recently joined first. */
  async listForUser(userId: string, page: number, limit: number) {
    const [items, total] = await this.members
      .createQueryBuilder('member')
      .innerJoinAndSelect('member.board', 'board')
      .where('member.userId = :userId', { userId })
      .orderBy('member.joinedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { items, total };
  }
}
