import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

/**
 * Focused unit tests for UsersService.registerUser — specifically the signup
 * consent persistence: `acceptedTerms` (transient flag) must be recorded as the
 * `acceptedTermsAt` timestamp (proof of consent) and never stored as a column.
 */
describe('UsersService.registerUser', () => {
  let service: UsersService;
  let userRepository: { create: jest.Mock; save: jest.Mock };

  beforeEach(() => {
    userRepository = {
      create: jest.fn((data) => data),
      save: jest.fn(async (user) => user),
    };

    service = new UsersService(
      userRepository as unknown as UsersRepository,
      {} as never, // fingerprintUtil
      {} as never, // auditsService
      {} as never, // minioService
      {} as never, // redisService
      {} as never, // mailerService
      {} as never, // otpTokenService
    );
  });

  it('records acceptedTermsAt and does not persist the transient acceptedTerms flag', async () => {
    const result = await service.registerUser({
      email: 'user@example.com',
      password: 'password123',
      acceptedTerms: true,
    });

    const createdWith = userRepository.create.mock.calls[0][0];
    expect(createdWith).toMatchObject({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(createdWith.acceptedTermsAt).toBeInstanceOf(Date);
    // The boolean flag is transient — only the timestamp is stored.
    expect(createdWith.acceptedTerms).toBeUndefined();
    expect(userRepository.save).toHaveBeenCalledWith(result);
    expect(result.acceptedTermsAt).toBeInstanceOf(Date);
  });
});
