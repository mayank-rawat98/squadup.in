import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BoardMessage } from '../entities';

const AUTHOR_COLUMNS = [
  'author.id',
  'author.fullName',
  'author.username',
  'author.avatarUrl',
];

/** A board's chat history. */
@Injectable()
export class BoardMessagesRepository {
  constructor(
    @InjectRepository(BoardMessage)
    private readonly messages: Repository<BoardMessage>,
  ) {}

  /** Stores a message and returns it with its author, ready to broadcast. */
  async create(
    boardId: string,
    authorId: string,
    body: string,
  ): Promise<BoardMessage> {
    const { identifiers } = await this.messages.insert({
      boardId,
      authorId,
      body,
    });
    return this.messages
      .createQueryBuilder('message')
      .innerJoin('message.author', 'author')
      .addSelect(AUTHOR_COLUMNS)
      .where('message.id = :id', { id: identifiers[0].id as string })
      .getOneOrFail();
  }

  /** One page of history, newest first. */
  async listPage(boardId: string, page: number, limit: number) {
    const [items, total] = await this.messages
      .createQueryBuilder('message')
      .innerJoin('message.author', 'author')
      .addSelect(AUTHOR_COLUMNS)
      .where('message.boardId = :boardId', { boardId })
      .orderBy('message.createdAt', 'DESC')
      .addOrderBy('message.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { items, total };
  }
}
