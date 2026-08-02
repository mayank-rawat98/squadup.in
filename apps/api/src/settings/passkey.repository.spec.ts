import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PasskeyRepository } from './passkey.repository';
import { PasskeyCredential } from './entities/passkey-credential.entity';

describe('PasskeyRepository', () => {
  const repoMock = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };
  let repository: PasskeyRepository;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        PasskeyRepository,
        { provide: getRepositoryToken(PasskeyCredential), useValue: repoMock },
      ],
    }).compile();
    repository = mod.get(PasskeyRepository);
  });

  it('deleteById returns true when a row is removed', async () => {
    repoMock.delete.mockResolvedValue({ affected: 1 });
    await expect(repository.deleteById('c1', 'u1')).resolves.toBe(true);
    expect(repoMock.delete).toHaveBeenCalledWith({ id: 'c1', userId: 'u1' });
  });

  it('deleteById returns false when nothing matches', async () => {
    repoMock.delete.mockResolvedValue({ affected: 0 });
    await expect(repository.deleteById('c1', 'u1')).resolves.toBe(false);
  });

  it('create persists via repo.create + repo.save', async () => {
    const entity = { id: 'p1' } as PasskeyCredential;
    repoMock.create.mockReturnValue(entity);
    repoMock.save.mockResolvedValue(entity);
    await expect(repository.create({ userId: 'u1' })).resolves.toBe(entity);
    expect(repoMock.save).toHaveBeenCalledWith(entity);
  });
});
