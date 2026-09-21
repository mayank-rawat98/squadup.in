import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserTourState } from './entities/user-tour-state.entity';

@Injectable()
export class TourRepository {
  constructor(
    @InjectRepository(UserTourState)
    private readonly repo: Repository<UserTourState>,
  ) {}

  findByUserId(userId: string): Promise<UserTourState | null> {
    return this.repo.findOne({ where: { userId } });
  }

  /**
   * Find the user's tour row, creating a default one if it doesn't exist.
   *
   * Concurrency-safe: two simultaneous first-access requests would otherwise
   * both find nothing and both INSERT, tripping the UNIQUE(userId) constraint
   * and 500-ing the loser. We insert-or-ignore atomically, then read the
   * now-guaranteed-present row.
   */
  async findOrCreate(userId: string): Promise<UserTourState> {
    const existing = await this.findByUserId(userId);
    if (existing) return existing;

    await this.repo
      .createQueryBuilder()
      .insert()
      .into(UserTourState)
      .values({
        userId,
        pages: {},
        hasSeenIntroModal: false,
        hasOptedOutOfTours: false,
      })
      .orIgnore() // ON CONFLICT DO NOTHING — loser of the race no-ops
      .execute();

    // Row now exists (created by us or by the concurrent request).
    return this.repo.findOneOrFail({ where: { userId } });
  }

  save(state: UserTourState): Promise<UserTourState> {
    return this.repo.save(state);
  }
}
