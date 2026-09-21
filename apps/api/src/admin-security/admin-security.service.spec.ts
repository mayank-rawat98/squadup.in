import { Test, TestingModule } from '@nestjs/testing';
import { AdminSecurityService, HardBlockEntry } from './admin-security.service';
import {
  IP_STRIKE_PREFIX,
  MAX_STRIKES,
  BLOCK_DURATION_MS,
  RATE_LIMIT_CONFIG_KEY,
  HARD_BLOCKED_IPS_SET,
  HARD_BLOCK_PREFIX,
} from '../rate-limiter/constants/rate-limiter.constants';

// ── Helpers ─────────────────────────────────────────────────────────────────

const NOW_SEC = 1_700_000_000;
const NOW_MS = NOW_SEC * 1000;

const makeEntry = (
  overrides: Partial<HardBlockEntry> = {},
): HardBlockEntry => ({
  ip: '1.2.3.4',
  blockedAt: NOW_SEC,
  blockDuration: 3600,
  expiresAt: NOW_SEC + 3600,
  userAgent: 'test-agent',
  strikes: 4,
  ...overrides,
});

// ── Redis mock ───────────────────────────────────────────────────────────────

const redisMock = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  pTTL: jest.fn(),
  pExpire: jest.fn(),
  exists: jest.fn(),
  sMembers: jest.fn(),
  sAdd: jest.fn(),
  sRem: jest.fn(),
};

describe('AdminSecurityService', () => {
  let service: AdminSecurityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminSecurityService,
        { provide: 'REDIS_CLIENT', useValue: redisMock },
      ],
    }).compile();

    service = module.get<AdminSecurityService>(AdminSecurityService);
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(NOW_MS);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── getRateLimitConfig ──────────────────────────────────────────────────

  describe('getRateLimitConfig', () => {
    it('should return config from Redis when present', async () => {
      redisMock.get.mockResolvedValue(
        JSON.stringify({ strikesCount: 6, hardBlockDuration: 7200 }),
      );
      const config = await service.getRateLimitConfig();
      expect(config).toEqual({ strikesCount: 6, hardBlockDuration: 7200 });
    });

    it('should return defaults when Redis key is missing', async () => {
      redisMock.get.mockResolvedValue(null);
      const config = await service.getRateLimitConfig();
      expect(config).toEqual({
        strikesCount: MAX_STRIKES,
        hardBlockDuration: BLOCK_DURATION_MS / 1000,
      });
    });

    it('should return defaults when Redis value is corrupt JSON', async () => {
      redisMock.get.mockResolvedValue('{corrupt');
      const config = await service.getRateLimitConfig();
      expect(config).toEqual({
        strikesCount: MAX_STRIKES,
        hardBlockDuration: BLOCK_DURATION_MS / 1000,
      });
    });
  });

  // ─── updateRateLimitConfig ───────────────────────────────────────────────

  describe('updateRateLimitConfig', () => {
    it('should merge partial update with current config and persist', async () => {
      redisMock.get.mockResolvedValue(
        JSON.stringify({ strikesCount: 4, hardBlockDuration: 43200 }),
      );
      redisMock.set.mockResolvedValue('OK');

      const result = await service.updateRateLimitConfig({ strikesCount: 8 });

      expect(result).toEqual({ strikesCount: 8, hardBlockDuration: 43200 });
      expect(redisMock.set).toHaveBeenCalledWith(
        RATE_LIMIT_CONFIG_KEY,
        JSON.stringify({ strikesCount: 8, hardBlockDuration: 43200 }),
      );
    });
  });

  // ─── getHardBlockedIps ───────────────────────────────────────────────────

  describe('getHardBlockedIps', () => {
    it('should return empty array when SET is empty', async () => {
      redisMock.sMembers.mockResolvedValue([]);
      const result = await service.getHardBlockedIps();
      expect(result).toEqual([]);
    });

    it('should return entries in parallel and prune stale IPs', async () => {
      const entry = makeEntry();
      redisMock.sMembers.mockResolvedValue(['1.2.3.4', '5.6.7.8']);

      // 1.2.3.4 exists; 5.6.7.8 has expired
      redisMock.get
        .mockResolvedValueOnce(JSON.stringify(entry))
        .mockResolvedValueOnce(null);
      redisMock.pTTL.mockResolvedValue(3_600_000);

      const result = await service.getHardBlockedIps();

      expect(result).toHaveLength(1);
      expect(result[0].ip).toBe('1.2.3.4');
      // stale IP should be pruned
      expect(redisMock.sRem).toHaveBeenCalledWith(HARD_BLOCKED_IPS_SET, [
        '5.6.7.8',
      ]);
    });
  });

  // ─── getHardBlockEntry ───────────────────────────────────────────────────

  describe('getHardBlockEntry', () => {
    it('should return null when key is missing', async () => {
      redisMock.get.mockResolvedValue(null);
      const result = await service.getHardBlockEntry('1.2.3.4');
      expect(result).toBeNull();
    });

    it('should return entry with ttl populated', async () => {
      const entry = makeEntry();
      redisMock.get.mockResolvedValue(JSON.stringify(entry));
      redisMock.pTTL.mockResolvedValue(3_600_000);

      const result = await service.getHardBlockEntry('1.2.3.4');

      expect(result).not.toBeNull();
      expect(result!.ip).toBe('1.2.3.4');
      expect(result!.ttl).toBe(3600);
    });
  });

  // ─── manualBlockIp ──────────────────────────────────────────────────────

  describe('manualBlockIp', () => {
    beforeEach(() => {
      redisMock.set.mockResolvedValue('OK');
      redisMock.sAdd.mockResolvedValue(1);
    });

    it('should store metadata with expiresAt and legacy key', async () => {
      const result = await service.manualBlockIp('1.2.3.4', 7200, 'Suspicious');

      // metadata key
      expect(redisMock.set).toHaveBeenCalledWith(
        `${HARD_BLOCK_PREFIX}:1.2.3.4`,
        expect.stringContaining('"expiresAt"'),
        { PX: 7_200_000 },
      );
      // legacy guard key
      expect(redisMock.set).toHaveBeenCalledWith(
        `${IP_STRIKE_PREFIX}:1.2.3.4:blocked`,
        '1',
        { PX: 7_200_000 },
      );
      expect(redisMock.sAdd).toHaveBeenCalledWith(
        HARD_BLOCKED_IPS_SET,
        '1.2.3.4',
      );
      expect(result.expiresAt).toBe(NOW_SEC + 7200);
      expect(result.reason).toBe('Suspicious');
      expect(result.ttl).toBe(7200);
    });
  });

  // ─── removeIpBlock ──────────────────────────────────────────────────────

  describe('removeIpBlock', () => {
    it('should delete all related keys and remove from index', async () => {
      redisMock.del.mockResolvedValue(1);
      redisMock.sRem.mockResolvedValue(1);

      await service.removeIpBlock('1.2.3.4');

      expect(redisMock.del).toHaveBeenCalledWith(
        `${HARD_BLOCK_PREFIX}:1.2.3.4`,
      );
      expect(redisMock.del).toHaveBeenCalledWith(
        `${IP_STRIKE_PREFIX}:1.2.3.4:blocked`,
      );
      expect(redisMock.del).toHaveBeenCalledWith(
        `${IP_STRIKE_PREFIX}:1.2.3.4:count`,
      );
      expect(redisMock.sRem).toHaveBeenCalledWith(
        HARD_BLOCKED_IPS_SET,
        '1.2.3.4',
      );
    });
  });

  // ─── updateBlockDuration ────────────────────────────────────────────────

  describe('updateBlockDuration', () => {
    it('should return null when no entry exists', async () => {
      redisMock.get.mockResolvedValue(null);
      const result = await service.updateBlockDuration('1.2.3.4', 3600);
      expect(result).toBeNull();
    });

    it('should update expiresAt from now when extending TTL', async () => {
      const entry = makeEntry({
        blockDuration: 3600,
        expiresAt: NOW_SEC + 3600,
      });
      redisMock.get.mockResolvedValue(JSON.stringify(entry));
      redisMock.pTTL.mockResolvedValue(1_800_000); // 30 min remaining
      redisMock.set.mockResolvedValue('OK');
      redisMock.pExpire.mockResolvedValue(1);

      const result = await service.updateBlockDuration('1.2.3.4', 7200);

      expect(result).not.toBeNull();
      // expiresAt = NOW_SEC + 7200 (new TTL from now)
      expect(result!.expiresAt).toBe(NOW_SEC + 7200);
      expect(result!.blockDuration).toBe(7200);
      expect(result!.ttl).toBe(7200);

      // Metadata key updated
      expect(redisMock.set).toHaveBeenCalledWith(
        `${HARD_BLOCK_PREFIX}:1.2.3.4`,
        expect.any(String),
        { PX: 7_200_000 },
      );
      // Legacy key TTL updated
      expect(redisMock.pExpire).toHaveBeenCalledWith(
        `${IP_STRIKE_PREFIX}:1.2.3.4:blocked`,
        7_200_000,
      );
    });
  });

  // ─── pruneExpiredBlockIndex ──────────────────────────────────────────────

  describe('pruneExpiredBlockIndex', () => {
    it('should skip when SET is empty', async () => {
      redisMock.sMembers.mockResolvedValue([]);
      await service.pruneExpiredBlockIndex();
      expect(redisMock.exists).not.toHaveBeenCalled();
    });

    it('should remove only expired IPs from the index', async () => {
      redisMock.sMembers.mockResolvedValue(['1.2.3.4', '5.6.7.8', '9.9.9.9']);
      // 1.2.3.4 still exists; others expired
      redisMock.exists
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      redisMock.sRem.mockResolvedValue(2);

      await service.pruneExpiredBlockIndex();

      expect(redisMock.sRem).toHaveBeenCalledWith(HARD_BLOCKED_IPS_SET, [
        '5.6.7.8',
        '9.9.9.9',
      ]);
    });

    it('should not call sRem when all IPs are still active', async () => {
      redisMock.sMembers.mockResolvedValue(['1.2.3.4']);
      redisMock.exists.mockResolvedValue(1);

      await service.pruneExpiredBlockIndex();

      expect(redisMock.sRem).not.toHaveBeenCalled();
    });
  });
});
