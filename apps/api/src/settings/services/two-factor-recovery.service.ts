import { Injectable } from '@nestjs/common';
import { SettingsRepository } from '../settings.repository';
import {
  BACKUP_CODE_COUNT,
  BACKUP_CODE_LENGTH,
} from '../constants/two-factor.constants';
import {
  generateRandomCode,
  sha256,
  timingSafeCompare,
} from '../../utils/crypto.util';

/**
 * Account-level 2FA recovery codes. Decoupled from any single method so a
 * passkey (or any factor) can be a user's sole 2FA and still be recoverable.
 * On first read, migrates any legacy authenticator-owned codes into the
 * account-level store.
 */
@Injectable()
export class TwoFactorRecoveryService {
  constructor(private readonly settingsRepo: SettingsRepository) {}

  private generate(): string[] {
    return Array.from({ length: BACKUP_CODE_COUNT }, () =>
      generateRandomCode(BACKUP_CODE_LENGTH),
    );
  }

  private async resolveExisting(userId: string): Promise<string[] | null> {
    const account = await this.settingsRepo.getRecoveryCodes(userId);
    if (account && account.length) return account;
    // Lazy migration: promote legacy authenticator codes if present.
    const legacy = await this.settingsRepo.getBackupCodes(userId);
    if (legacy && legacy.length) {
      await this.settingsRepo.saveRecoveryCodes(userId, legacy);
      return legacy;
    }
    return null;
  }

  async hasCodes(userId: string): Promise<boolean> {
    return (await this.resolveExisting(userId)) !== null;
  }

  /**
   * Generate + store hashed codes only if none exist yet. Returns the plain
   * codes when freshly generated, else null.
   */
  async provisionIfAbsent(userId: string): Promise<string[] | null> {
    if (await this.resolveExisting(userId)) return null;
    const plain = this.generate();
    await this.settingsRepo.saveRecoveryCodes(userId, plain.map(sha256));
    return plain;
  }

  /** Always generate a new set, invalidating any previous codes. */
  async regenerate(userId: string): Promise<string[]> {
    const plain = this.generate();
    await this.settingsRepo.saveRecoveryCodes(userId, plain.map(sha256));
    return plain;
  }

  /** Verify a single recovery code (one-time use). */
  async verifyAndConsume(userId: string, code: string): Promise<boolean> {
    const hashed = await this.resolveExisting(userId);
    if (!hashed || !hashed.length) return false;
    const inputHash = sha256(code);
    const idx = hashed.findIndex((h) => timingSafeCompare(h, inputHash));
    if (idx === -1) return false;
    await this.settingsRepo.saveRecoveryCodes(
      userId,
      hashed.filter((_, i) => i !== idx),
    );
    return true;
  }
}
