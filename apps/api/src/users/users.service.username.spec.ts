import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AccountStatus, type User } from './entities/user.entity';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

const user = (patch: Partial<User>): User =>
  ({
    id: 'u1',
    email: 'asha@example.com',
    username: 'asha_v',
    fullName: 'Asha Verma',
    avatarUrl: 'https://cdn.example.com/a.png',
    phone: '+911234567890',
    accountStatus: AccountStatus.HOLD,
    createdAt: new Date('2026-09-01T00:00:00Z'),
    ...patch,
  }) as User;

describe('UsersService usernames', () => {
  let repository: jest.Mocked<
    Pick<UsersRepository, 'findByUsername' | 'updateUser'>
  >;
  let service: UsersService;

  beforeEach(() => {
    repository = {
      findByUsername: jest.fn().mockResolvedValue(null),
      updateUser: jest.fn(async (id, patch) => user({ id, ...patch })),
    };
    service = new UsersService(
      repository as unknown as UsersRepository,
      {} as never, // mailerService
      {} as never, // fingerprintUtil
      { logUserAction: jest.fn() } as never, // auditsService
      {} as never, // minioService
      {} as never, // redisService
      {} as never, // otpTokenService
    );
  });

  describe('checkUsernameAvailability', () => {
    it('is available when no one has it', async () => {
      await expect(
        service.checkUsernameAvailability('u1', 'new_name'),
      ).resolves.toEqual({
        username: 'new_name',
        available: true,
        reason: null,
      });
    });

    it("counts the user's own username as available", async () => {
      repository.findByUsername.mockResolvedValue(user({ id: 'u1' }));
      await expect(
        service.checkUsernameAvailability('u1', 'asha_v'),
      ).resolves.toMatchObject({ available: true, reason: null });
    });

    it('is taken when another account has it', async () => {
      repository.findByUsername.mockResolvedValue(user({ id: 'someone-else' }));
      await expect(
        service.checkUsernameAvailability('u1', 'asha_v'),
      ).resolves.toMatchObject({ available: false, reason: 'taken' });
    });

    it('is reserved for names the platform keeps', async () => {
      await expect(
        service.checkUsernameAvailability('u1', 'admin'),
      ).resolves.toMatchObject({ available: false, reason: 'reserved' });
      expect(repository.findByUsername).not.toHaveBeenCalled();
    });
  });

  describe('updateUser with a username', () => {
    it('saves a free username', async () => {
      await service.updateUser('u1', { username: 'new_name' });
      expect(repository.updateUser).toHaveBeenCalledWith('u1', {
        username: 'new_name',
      });
    });

    it('rejects a reserved username with 400', async () => {
      await expect(
        service.updateUser('u1', { username: 'settings' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.updateUser).not.toHaveBeenCalled();
    });

    it("rejects someone else's username with 409", async () => {
      repository.findByUsername.mockResolvedValue(user({ id: 'someone-else' }));
      await expect(
        service.updateUser('u1', { username: 'asha_v' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repository.updateUser).not.toHaveBeenCalled();
    });

    it('does not look up usernames when none is being changed', async () => {
      await service.updateUser('u1', { fullName: 'Asha' });
      expect(repository.findByUsername).not.toHaveBeenCalled();
    });
  });

  describe('getPublicProfile', () => {
    it('returns only the public fields', async () => {
      repository.findByUsername.mockResolvedValue(user({}));
      await expect(service.getPublicProfile('asha_v')).resolves.toEqual({
        username: 'asha_v',
        fullName: 'Asha Verma',
        avatarUrl: 'https://cdn.example.com/a.png',
        joinedAt: new Date('2026-09-01T00:00:00Z'),
      });
    });

    it('returns 404 for an unknown username', async () => {
      await expect(service.getPublicProfile('nobody')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it.each([AccountStatus.SUSPENDED, AccountStatus.CLOSED])(
      'returns 404 for a %s account',
      async (accountStatus) => {
        repository.findByUsername.mockResolvedValue(user({ accountStatus }));
        await expect(service.getPublicProfile('asha_v')).rejects.toBeInstanceOf(
          NotFoundException,
        );
      },
    );
  });
});
