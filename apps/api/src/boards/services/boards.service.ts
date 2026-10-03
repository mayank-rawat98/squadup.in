import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { BOARD_CODE_MAX_ATTEMPTS } from '../constants/board.constants';
import type { CreateBoardDto, ListBoardPageDto } from '../dto';
import type { Board, BoardMember } from '../entities';
import { BoardsRepository } from '../repositories/boards.repository';
import { generateBoardCode } from '../utils/board-code';

export interface BoardAccess {
  board: Board;
  membership: BoardMember;
}

const BOARDS_PAGE_SIZE = 20;

/** Creating, joining and opening boards. Membership is the access rule. */
@Injectable()
export class BoardsService {
  constructor(private readonly boards: BoardsRepository) {}

  async create(userId: string, dto: CreateBoardDto) {
    const code = await this.freeCode();
    const board = await this.boards.createWithHost({
      code,
      name: dto.name,
      language: dto.language,
      seats: dto.seats,
      hostId: userId,
    });
    return this.open(userId, board.code);
  }

  /** Joins by room code. Joining a room you're already in just opens it. */
  async join(userId: string, code: string) {
    const board = await this.boards.findByCode(code);
    if (!board) {
      throw new NotFoundException(
        'No room has that ID. Ask whoever invited you to check it.',
      );
    }
    const result = await this.boards.addMember(board, userId);
    if (result === 'full') {
      throw new ConflictException(
        `This room is full: all ${board.seats} seats are taken.`,
      );
    }
    return this.open(userId, code);
  }

  /** The board and everyone in it, for a member. */
  async open(userId: string, code: string) {
    const access = await this.requireMember(userId, code);
    const members = await this.boards.listMembers(access.board.id);
    return { ...access, members };
  }

  async listForUser(userId: string, query: ListBoardPageDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? BOARDS_PAGE_SIZE;
    const { items, total } = await this.boards.listForUser(userId, page, limit);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * The gate every board read and realtime event goes through. Not being a
   * member and the room not existing look the same, so codes can't be probed
   * here; joining is the one place that says a code is wrong.
   */
  async requireMember(userId: string, code: string): Promise<BoardAccess> {
    const board = await this.boards.findByCode(code);
    const membership = board
      ? await this.boards.findMembership(board.id, userId)
      : null;
    if (!board || !membership) {
      throw new ForbiddenException(
        "You're not in this room. Join it with its room ID first.",
      );
    }
    return { board, membership };
  }

  private async freeCode(): Promise<string> {
    for (let attempt = 0; attempt < BOARD_CODE_MAX_ATTEMPTS; attempt++) {
      const code = generateBoardCode();
      if (!(await this.boards.codeExists(code))) return code;
    }
    throw new ServiceUnavailableException(
      "We couldn't create the room just now. Please try again.",
    );
  }
}
