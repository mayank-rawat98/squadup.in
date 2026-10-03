import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BOARD_EXPIRY_BATCH_SIZE } from '../constants/board.constants';
import { BoardsRepository } from '../repositories/boards.repository';
import { BoardRoomsService } from './board-rooms.service';

/**
 * Deletes rooms past their `expiresAt`, with their document, members and
 * chat (the foreign keys cascade). Open rooms are closed first, so nobody
 * keeps editing a room that no longer exists and nothing saves it back.
 */
@Injectable()
export class BoardExpiryService {
  private readonly logger = new Logger(BoardExpiryService.name);

  constructor(
    private readonly boards: BoardsRepository,
    private readonly rooms: BoardRoomsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sweep(): Promise<void> {
    try {
      const deleted = await this.deleteExpired(new Date());
      if (deleted > 0) this.logger.log(`Deleted ${deleted} expired board(s)`);
    } catch (error: unknown) {
      this.logger.error(
        `Deleting expired boards failed: ${(error as Error).message}`,
      );
    }
  }

  /** Deletes every board expired at `now`, a batch at a time; returns how many. */
  async deleteExpired(now: Date): Promise<number> {
    let deleted = 0;
    for (;;) {
      const ids = await this.boards.findExpiredIds(
        now,
        BOARD_EXPIRY_BATCH_SIZE,
      );
      if (ids.length === 0) return deleted;
      for (const id of ids) await this.rooms.evict(id);
      await this.boards.deleteByIds(ids);
      deleted += ids.length;
      if (ids.length < BOARD_EXPIRY_BATCH_SIZE) return deleted;
    }
  }
}
