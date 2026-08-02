import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { PasskeyRepository } from '../passkey.repository';
import { TwoFactorRecoveryService } from './two-factor-recovery.service';
import { SettingsRepository } from '../settings.repository';
import { RedisService } from '../../redis/redis.service';
import { UsersService } from '../../users/users.service';
import {
  PASSKEY_CHALLENGE_TTL_SECONDS,
  PASSKEY_REDIS_KEYS,
} from '../constants/two-factor.constants';
import {
  TwoFactorPreference,
  type UserSettings,
} from '../entities/user-settings.entity';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class TwoFactorPasskeyService {
  private readonly rpId: string;
  private readonly rpName: string;
  private readonly expectedOrigin: string;

  constructor(
    private readonly passkeyRepo: PasskeyRepository,
    private readonly recovery: TwoFactorRecoveryService,
    private readonly settingsRepo: SettingsRepository,
    private readonly redisService: RedisService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {
    this.rpId = this.configService.get<string>('RP_ID') || 'localhost';
    this.rpName = this.configService.get<string>('RP_NAME') || 'Squadup';
    this.expectedOrigin =
      this.configService.get<string>('CLIENT_URL') || 'http://localhost:3001';
  }

  async getRegistrationOptions(userId: string) {
    const user = await this.usersService.getUser(userId);
    const existing = await this.passkeyRepo.findByUserId(userId);
    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpId,
      userName: user.email,
      attestationType: 'none',
      excludeCredentials: existing.map((c) => ({
        id: c.credentialId,
        transports: (c.transports ?? undefined) as
          | AuthenticatorTransportFuture[]
          | undefined,
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });
    await this.redisService.setRecordEx(
      PASSKEY_REDIS_KEYS.REG_CHALLENGE(userId),
      options.challenge,
      PASSKEY_CHALLENGE_TTL_SECONDS,
    );
    return options;
  }

  async verifyRegistration(
    userId: string,
    response: RegistrationResponseJSON,
    nickname: string,
  ) {
    const expectedChallenge = await this.redisService.getRecord<string>(
      PASSKEY_REDIS_KEYS.REG_CHALLENGE(userId),
    );
    if (!expectedChallenge) {
      throw new BadRequestException('Passkey challenge expired. Try again.');
    }
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.expectedOrigin,
      expectedRPID: this.rpId,
      requireUserVerification: false,
    });
    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException(
        'Passkey registration could not be verified.',
      );
    }
    await this.redisService.deleteRecord(
      PASSKEY_REDIS_KEYS.REG_CHALLENGE(userId),
    );

    const { credential, credentialDeviceType, credentialBackedUp } =
      verification.registrationInfo;

    const saved = await this.passkeyRepo.create({
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
      transports: response.response.transports ?? null,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      nickname: nickname?.trim() || 'Passkey',
    });

    // First passkey → flag enabled + provision account recovery codes if none.
    await this.settingsRepo.upsert(userId, {
      twoFactor: {
        passkey: { enabled: true, preference: TwoFactorPreference.PASSKEY },
      },
    });
    const recoveryCodes = await this.recovery.provisionIfAbsent(userId);

    return {
      credential: {
        id: saved.id,
        nickname: saved.nickname,
        deviceType: saved.deviceType,
        backedUp: saved.backedUp,
        createdAt: saved.createdAt,
      },
      recoveryCodes,
    };
  }

  async listCredentials(userId: string) {
    const creds = await this.passkeyRepo.findByUserId(userId);
    return creds.map((c) => ({
      id: c.id,
      nickname: c.nickname,
      deviceType: c.deviceType,
      backedUp: c.backedUp,
      lastUsedAt: c.lastUsedAt,
      createdAt: c.createdAt,
    }));
  }

  async rename(userId: string, id: string, nickname: string) {
    await this.passkeyRepo.rename(id, userId, nickname.trim() || 'Passkey');
  }

  async remove(userId: string, id: string) {
    const deleted = await this.passkeyRepo.deleteById(id, userId);
    if (!deleted) throw new BadRequestException('Passkey not found.');
    const remaining = await this.passkeyRepo.countByUserId(userId);
    if (remaining === 0) {
      await this.settingsRepo.update(userId, {
        twoFactor: {
          passkey: { enabled: false, preference: TwoFactorPreference.PASSKEY },
        },
      } as QueryDeepPartialEntity<UserSettings>);
    }
  }

  async getAuthenticationOptions(userId: string) {
    const creds = await this.passkeyRepo.findByUserId(userId);
    if (creds.length === 0) {
      throw new BadRequestException('No passkeys registered.');
    }
    const options = await generateAuthenticationOptions({
      rpID: this.rpId,
      userVerification: 'preferred',
      allowCredentials: creds.map((c) => ({
        id: c.credentialId,
        transports: (c.transports ?? undefined) as
          | AuthenticatorTransportFuture[]
          | undefined,
      })),
    });
    await this.redisService.setRecordEx(
      PASSKEY_REDIS_KEYS.AUTH_CHALLENGE(userId),
      options.challenge,
      PASSKEY_CHALLENGE_TTL_SECONDS,
    );
    return options;
  }

  async verifyAuthentication(
    userId: string,
    response: AuthenticationResponseJSON,
  ): Promise<boolean> {
    const expectedChallenge = await this.redisService.getRecord<string>(
      PASSKEY_REDIS_KEYS.AUTH_CHALLENGE(userId),
    );
    if (!expectedChallenge) {
      throw new BadRequestException('Passkey challenge expired. Try again.');
    }
    const cred = await this.passkeyRepo.findByCredentialId(response.id);
    if (!cred || cred.userId !== userId) {
      throw new BadRequestException('Unknown passkey.');
    }
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.expectedOrigin,
      expectedRPID: this.rpId,
      requireUserVerification: false,
      credential: {
        id: cred.credentialId,
        publicKey: new Uint8Array(cred.publicKey),
        counter: cred.counter,
        transports: (cred.transports ?? undefined) as
          | AuthenticatorTransportFuture[]
          | undefined,
      },
    });
    await this.redisService.deleteRecord(
      PASSKEY_REDIS_KEYS.AUTH_CHALLENGE(userId),
    );
    if (!verification.verified) return false;

    const { newCounter } = verification.authenticationInfo;
    // Clone detection: counter must never go backwards. (Backed-up/synced
    // passkeys may legitimately report 0 — only reject a true regression.)
    if (newCounter !== 0 && newCounter < cred.counter) {
      throw new BadRequestException('Passkey counter regression detected.');
    }
    await this.passkeyRepo.updateCounter(cred.id, newCounter, new Date());
    return true;
  }
}
