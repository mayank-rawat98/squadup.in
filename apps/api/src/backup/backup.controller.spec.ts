import { Test } from '@nestjs/testing';
import { BackupController } from './backup.controller';
import { BackupService } from './backup.service';
import { BackupTypeEnum } from './constants/backup.constants';
import { PermissionsGuard } from '../common/guards/auth.guard';

describe('BackupController', () => {
  let controller: BackupController;
  let service: jest.Mocked<BackupService>;

  beforeEach(async () => {
    service = {
      listBackups: jest.fn(),
      restoreBackup: jest.fn(),
      triggerManualBackup: jest.fn(),
    } as unknown as jest.Mocked<BackupService>;

    const module = await Test.createTestingModule({
      controllers: [BackupController],
      providers: [
        {
          provide: BackupService,
          useValue: service,
        },
      ],
    })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BackupController>(BackupController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listBackups', () => {
    it('should return backup list', async () => {
      const mockBackups = { postgres: ['backup1.gz'], minio: ['backup2.gz'] };
      service.listBackups.mockResolvedValue(mockBackups);

      const result = await controller.listBackups();

      expect(result).toEqual({
        success: true,
        data: { backups: mockBackups },
        message: 'Backup list retrieved successfully',
      });
      expect(service.listBackups).toHaveBeenCalled();
    });
  });

  describe('restoreBackup', () => {
    it('should initiate restore', async () => {
      const type = BackupTypeEnum.POSTGRES;
      const date = '2023-10-27';
      service.restoreBackup.mockResolvedValue({
        success: true,
        message: 'Restore completed successfully',
        logs: 'logs',
      });

      const result = await controller.restoreBackup(type, date);

      expect(result).toEqual({
        success: true,
        data: null,
        message: `Restore completed successfully for date ${date}`,
      });
      expect(service.restoreBackup).toHaveBeenCalledWith(type, date);
    });
  });

  describe('triggerManualBackup', () => {
    it('should trigger manual backup', async () => {
      service.triggerManualBackup.mockResolvedValue({
        success: true,
        logs: 'logs',
      });

      const result = await controller.triggerManualBackup();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Manual backup triggered successfully');
      expect(service.triggerManualBackup).toHaveBeenCalled();
    });
  });
});
