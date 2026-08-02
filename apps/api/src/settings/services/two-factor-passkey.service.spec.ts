import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { TwoFactorPasskeyService } from './two-factor-passkey.service';
import { PasskeyRepository } from '../passkey.repository';
import { TwoFactorRecoveryService } from './two-factor-recovery.service';
import { SettingsRepository } from '../settings.repository';
import { RedisService } from '../../redis/redis.service';
import { UsersService } from '../../users/users.service';
import * as swa from '@simplewebauthn/server';

jest.mock('@simplewebauthn/server');

describe('TwoFactorPasskeyService', () => {
  const passkeyRepo = {
    findByUserId: jest.fn(),
    findByCredentialId: jest.fn(),
    updateCounter: jest.fn(),
    create: jest.fn(),
    countByUserId: jest.fn(),
  };
  const recovery = { provisionIfAbsent: jest.fn() };
  const settingsRepo = { upsert: jest.fn(), update: jest.fn() };
  const redis = {
    getRecord: jest.fn(),
    setRecordEx: jest.fn(),
    deleteRecord: jest.fn(),
  };
  const users = { getUser: jest.fn() };
  const config = { get: jest.fn().mockReturnValue('localhost') };
  let service: TwoFactorPasskeyService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        TwoFactorPasskeyService,
        { provide: PasskeyRepository, useValue: passkeyRepo },
        { provide: TwoFactorRecoveryService, useValue: recovery },
        { provide: SettingsRepository, useValue: settingsRepo },
        { provide: RedisService, useValue: redis },
        { provide: UsersService, useValue: users },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = mod.get(TwoFactorPasskeyService);
  });

  it('verifyAuthentication rejects a regressed counter (clone detection)', async () => {
    redis.getRecord.mockResolvedValue('challenge');
    passkeyRepo.findByCredentialId.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      credentialId: 'cred',
      publicKey: Buffer.from([1]),
      counter: 10,
      transports: [],
    });
    (swa.verifyAuthenticationResponse as jest.Mock).mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 5 },
    });
    await expect(
      service.verifyAuthentication('u1', { id: 'cred' } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(passkeyRepo.updateCounter).not.toHaveBeenCalled();
  });

  it('verifyAuthentication accepts and bumps counter on success', async () => {
    redis.getRecord.mockResolvedValue('challenge');
    passkeyRepo.findByCredentialId.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      credentialId: 'cred',
      publicKey: Buffer.from([1]),
      counter: 3,
      transports: [],
    });
    (swa.verifyAuthenticationResponse as jest.Mock).mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 4 },
    });
    await expect(
      service.verifyAuthentication('u1', { id: 'cred' } as never),
    ).resolves.toBe(true);
    expect(passkeyRepo.updateCounter).toHaveBeenCalledWith(
      'p1',
      4,
      expect.any(Date),
    );
  });

  it('verifyAuthentication throws when the challenge expired', async () => {
    redis.getRecord.mockResolvedValue(null);
    await expect(
      service.verifyAuthentication('u1', { id: 'cred' } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
