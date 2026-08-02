import { Test } from '@nestjs/testing';
import { TwoFactorRecoveryService } from './two-factor-recovery.service';
import { SettingsRepository } from '../settings.repository';

describe('TwoFactorRecoveryService', () => {
  const settingsRepo = {
    getRecoveryCodes: jest.fn(),
    saveRecoveryCodes: jest.fn(),
    getBackupCodes: jest.fn(),
  };
  let service: TwoFactorRecoveryService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        TwoFactorRecoveryService,
        { provide: SettingsRepository, useValue: settingsRepo },
      ],
    }).compile();
    service = mod.get(TwoFactorRecoveryService);
  });

  it('provisionIfAbsent returns codes and saves when none exist', async () => {
    settingsRepo.getRecoveryCodes.mockResolvedValue(null);
    settingsRepo.getBackupCodes.mockResolvedValue(null);
    const codes = await service.provisionIfAbsent('u1');
    expect(codes).toHaveLength(8);
    expect(settingsRepo.saveRecoveryCodes).toHaveBeenCalledTimes(1);
  });

  it('provisionIfAbsent returns null when codes already exist', async () => {
    settingsRepo.getRecoveryCodes.mockResolvedValue(['abc']);
    const codes = await service.provisionIfAbsent('u1');
    expect(codes).toBeNull();
    expect(settingsRepo.saveRecoveryCodes).not.toHaveBeenCalled();
  });

  it('migrates legacy authenticator codes on first read', async () => {
    settingsRepo.getRecoveryCodes.mockResolvedValue(null);
    settingsRepo.getBackupCodes.mockResolvedValue(['legacyhash']);
    await expect(service.hasCodes('u1')).resolves.toBe(true);
    expect(settingsRepo.saveRecoveryCodes).toHaveBeenCalledWith('u1', [
      'legacyhash',
    ]);
  });
});
