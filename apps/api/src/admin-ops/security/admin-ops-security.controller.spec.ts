import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StaffGuard } from '../../staff/guards/staff.guard';
import { AdminOpsSecurityController } from './admin-ops-security.controller';
import { AdminSecurityService } from '../../admin-security/admin-security.service';
import type { HardBlockEntry, RateLimitConfig } from '../../admin-security/admin-security.service';
import { IpParam } from '../../admin-security/dto/ip-param.dto';

// ── Helpers ─────────────────────────────────────────────────────────────────

const NOW_SEC = 1_700_000_000;

const makeConfig = (): RateLimitConfig => ({
  strikesCount: 4,
  hardBlockDuration: 43200,
});

const makeEntry = (
  overrides: Partial<HardBlockEntry> = {},
): HardBlockEntry => ({
  ip: '1.2.3.4',
  blockedAt: NOW_SEC,
  blockDuration: 3600,
  expiresAt: NOW_SEC + 3600,
  userAgent: 'test-agent',
  strikes: 4,
  ttl: 3600,
  ...overrides,
});

describe('AdminOpsSecurityController', () => {
  let controller: AdminOpsSecurityController;
  let service: jest.Mocked<AdminSecurityService>;

  const mockService = {
    getRateLimitConfig: jest.fn(),
    updateRateLimitConfig: jest.fn(),
    getHardBlockedIps: jest.fn(),
    manualBlockIp: jest.fn(),
    removeIpBlock: jest.fn(),
    updateBlockDuration: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminOpsSecurityController],
      providers: [{ provide: AdminSecurityService, useValue: mockService }],
    })
      .overrideGuard(StaffGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminOpsSecurityController>(AdminOpsSecurityController);
    service = module.get(AdminSecurityService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── getRateLimitConfig ─────────────────────────────────────────────────

  describe('getRateLimitConfig', () => {
    it('should return config wrapped in success envelope', async () => {
      const config = makeConfig();
      mockService.getRateLimitConfig.mockResolvedValue(config);

      const result = await controller.getRateLimitConfig();

      expect(result).toEqual({ success: true, data: config });
      expect(service.getRateLimitConfig).toHaveBeenCalledTimes(1);
    });
  });

  // ─── updateRateLimitConfig ──────────────────────────────────────────────

  describe('updateRateLimitConfig', () => {
    it('should update and return merged config', async () => {
      const updated = { ...makeConfig(), strikesCount: 8 };
      mockService.updateRateLimitConfig.mockResolvedValue(updated);

      const result = await controller.updateRateLimitConfig({
        strikesCount: 8,
      });

      expect(service.updateRateLimitConfig).toHaveBeenCalledWith({
        strikesCount: 8,
      });
      expect(result).toEqual({ success: true, data: updated });
    });
  });

  // ─── getIpBlocks ────────────────────────────────────────────────────────

  describe('getIpBlocks', () => {
    it('should return list of blocked IPs', async () => {
      const blocks = [makeEntry(), makeEntry({ ip: '5.6.7.8' })];
      mockService.getHardBlockedIps.mockResolvedValue(blocks);

      const result = await controller.getIpBlocks();

      expect(result).toEqual({ success: true, data: blocks });
    });

    it('should return empty array when no blocks exist', async () => {
      mockService.getHardBlockedIps.mockResolvedValue([]);

      const result = await controller.getIpBlocks();

      expect(result.data).toEqual([]);
    });
  });

  // ─── manualBlockIp ──────────────────────────────────────────────────────

  describe('manualBlockIp', () => {
    it('should create block and return entry', async () => {
      const entry = makeEntry({ reason: 'Suspicious' });
      mockService.manualBlockIp.mockResolvedValue(entry);

      const result = await controller.manualBlockIp({
        ip: '1.2.3.4',
        duration: 3600,
        reason: 'Suspicious',
      });

      expect(service.manualBlockIp).toHaveBeenCalledWith(
        '1.2.3.4',
        3600,
        'Suspicious',
      );
      expect(result).toEqual({ success: true, data: entry });
    });
  });

  // ─── removeIpBlock ──────────────────────────────────────────────────────

  describe('removeIpBlock', () => {
    it('should remove block and return success', async () => {
      mockService.removeIpBlock.mockResolvedValue(undefined);

      const result = await controller.removeIpBlock(
        Object.assign(new IpParam(), { ip: '1.2.3.4' }),
      );

      expect(service.removeIpBlock).toHaveBeenCalledWith('1.2.3.4');
      expect(result).toEqual({ success: true, data: null });
    });
  });

  // ─── updateBlockDuration ────────────────────────────────────────────────

  describe('updateBlockDuration', () => {
    it('should update TTL and return updated entry', async () => {
      const updated = makeEntry({
        blockDuration: 7200,
        expiresAt: NOW_SEC + 7200,
        ttl: 7200,
      });
      mockService.updateBlockDuration.mockResolvedValue(updated);

      const result = await controller.updateBlockDuration(
        Object.assign(new IpParam(), { ip: '1.2.3.4' }),
        { duration: 7200 },
      );

      expect(service.updateBlockDuration).toHaveBeenCalledWith('1.2.3.4', 7200);
      expect(result).toEqual({ success: true, data: updated });
    });

    it('should throw NotFoundException when IP is not blocked', async () => {
      mockService.updateBlockDuration.mockResolvedValue(null);

      await expect(
        controller.updateBlockDuration(
          Object.assign(new IpParam(), { ip: '9.9.9.9' }),
          { duration: 3600 },
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
