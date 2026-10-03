import { BadRequestException, Injectable } from '@nestjs/common';
import {
  BOARD_MESSAGE_MAX_LENGTH,
  BOARD_MESSAGES_PAGE_SIZE,
} from '../constants/board.constants';
import type { ListBoardPageDto } from '../dto';
import type { BoardMessage } from '../entities';
import { BoardMessagesRepository } from '../repositories/board-messages.repository';

/** A board's chat. Callers check membership first (BoardsService.requireMember). */
@Injectable()
export class BoardChatService {
  constructor(private readonly messages: BoardMessagesRepository) {}

  async history(boardId: string, query: ListBoardPageDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? BOARD_MESSAGES_PAGE_SIZE;
    const { items, total } = await this.messages.listPage(boardId, page, limit);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Stores a message after trimming it; empty or over-long messages are refused. */
  async post(
    boardId: string,
    authorId: string,
    body: unknown,
  ): Promise<BoardMessage> {
    const text = typeof body === 'string' ? body.trim() : '';
    if (!text) {
      throw new BadRequestException('Type a message before sending.');
    }
    if (text.length > BOARD_MESSAGE_MAX_LENGTH) {
      throw new BadRequestException(
        `Messages can be up to ${BOARD_MESSAGE_MAX_LENGTH} characters.`,
      );
    }
    return this.messages.create(boardId, authorId, text);
  }
}
