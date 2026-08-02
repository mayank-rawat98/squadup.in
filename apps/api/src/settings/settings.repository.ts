import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { UserSettings } from './entities/user-settings.entity';

@Injectable()
export class SettingsRepository {
  constructor(
    @InjectRepository(UserSettings)
    private readonly repo: Repository<UserSettings>,
  ) {}

  /** Find settings row for a user (without secret columns). */
  async findByUserId(userId: string): Promise<UserSettings | null> {
    return this.repo.findOne({ where: { userId } });
  }

  /** Find settings with the authenticator secret and backup codes included. */
  async findByUserIdWithSecrets(userId: string): Promise<UserSettings | null> {
    return this.repo
      .createQueryBuilder('s')
      .addSelect('s.twoFactor.authenticator.secret')
      .addSelect('s.twoFactor.authenticator.backupCodes')
      .where('s.userId = :userId', { userId })
      .getOne();
  }

  /** Upsert a settings row – creates if absent, merges if present. */
  async upsert(
    userId: string,
    partial: DeepPartial<UserSettings>,
  ): Promise<UserSettings> {
    let settings = await this.findByUserId(userId);
    if (!settings) {
      settings = this.repo.create({ userId, ...partial });
    } else {
      this.repo.merge(settings, partial);
    }
    return this.repo.save(settings);
  }

  /** Update specific fields on an existing settings row. */
  async update(
    userId: string,
    partial: QueryDeepPartialEntity<UserSettings>,
  ): Promise<void> {
    await this.repo.update({ userId }, partial);
  }

  /** Save backup codes (expects already-hashed array). */
  async saveBackupCodes(userId: string, hashedCodes: string[]): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(UserSettings)
      .set({
        twoFactor: { authenticator: { backupCodes: hashedCodes } },
      } as QueryDeepPartialEntity<UserSettings>)
      .where('userId = :userId', { userId })
      .execute();
  }

  /** Retrieve backup codes (hashed). */
  async getBackupCodes(userId: string): Promise<string[] | null> {
    const row = await this.repo
      .createQueryBuilder('s')
      .addSelect('s.twoFactor.authenticator.backupCodes')
      .where('s.userId = :userId', { userId })
      .getOne();
    return row?.twoFactor?.authenticator?.backupCodes ?? null;
  }

  /** Retrieve account-level recovery codes (hashed). */
  async getRecoveryCodes(userId: string): Promise<string[] | null> {
    const row = await this.repo
      .createQueryBuilder('s')
      .addSelect('s.twoFactor.recovery.backupCodes')
      .where('s.userId = :userId', { userId })
      .getOne();
    return row?.twoFactor?.recovery?.backupCodes ?? null;
  }

  /** Save account-level recovery codes (expects already-hashed array). */
  async saveRecoveryCodes(
    userId: string,
    hashedCodes: string[],
  ): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(UserSettings)
      .set({
        twoFactor: { recovery: { backupCodes: hashedCodes } },
      } as QueryDeepPartialEntity<UserSettings>)
      .where('userId = :userId', { userId })
      .execute();
  }
}
