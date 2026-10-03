import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { SANDBOX_MAX_PER_USER } from './constants/sandbox.constants';
import type { Sandbox } from './entities/sandbox.entity';
import { SandboxesRepository } from './sandboxes.repository';
import { SandboxesService } from './sandboxes.service';

const FILES = { '/src/App.tsx': 'export default function App() {}' };

const sandbox = (patch: Partial<Sandbox> = {}): Sandbox =>
  ({
    id: 's1',
    ownerId: 'u1',
    name: 'Todo app',
    files: FILES,
    createdAt: new Date('2026-10-01T10:00:00Z'),
    updatedAt: new Date('2026-10-02T10:00:00Z'),
    ...patch,
  }) as Sandbox;

describe('SandboxesService', () => {
  let repo: jest.Mocked<
    Pick<
      SandboxesRepository,
      'create' | 'findOwned' | 'countOwned' | 'listOwned' | 'save' | 'delete'
    >
  >;
  let service: SandboxesService;

  beforeEach(() => {
    repo = {
      create: jest.fn(async (data) => sandbox(data)),
      findOwned: jest.fn().mockResolvedValue(sandbox()),
      countOwned: jest.fn().mockResolvedValue(0),
      listOwned: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      save: jest.fn(async (current, changes) => ({ ...current, ...changes })),
      delete: jest.fn().mockResolvedValue(true),
    };
    service = new SandboxesService(repo as unknown as SandboxesRepository);
  });

  describe('create', () => {
    it('saves the files for the caller', async () => {
      await service.create('u1', { name: 'Todo app', files: FILES });

      expect(repo.create).toHaveBeenCalledWith({
        ownerId: 'u1',
        name: 'Todo app',
        files: FILES,
      });
    });

    it('refuses invalid files before touching the database', async () => {
      await expect(
        service.create('u1', { name: 'Todo app', files: {} }),
      ).rejects.toThrow(
        new BadRequestException('A project needs at least one file.'),
      );
      expect(repo.countOwned).not.toHaveBeenCalled();
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('refuses once the caller has the most sandboxes allowed', async () => {
      repo.countOwned.mockResolvedValue(SANDBOX_MAX_PER_USER);

      await expect(
        service.create('u1', { name: 'Todo app', files: FILES }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.create).not.toHaveBeenCalled();
    });
  });

  describe('listForOwner', () => {
    it('defaults to the first page of 20 and counts the pages', async () => {
      repo.listOwned.mockResolvedValue({ items: [sandbox()], total: 41 });

      const result = await service.listForOwner('u1', {});

      expect(repo.listOwned).toHaveBeenCalledWith('u1', 1, 20);
      expect(result).toEqual({
        items: [sandbox()],
        total: 41,
        page: 1,
        limit: 20,
        totalPages: 3,
      });
    });
  });

  describe('get', () => {
    it('looks the sandbox up with its owner', async () => {
      await expect(service.get('u1', 's1')).resolves.toEqual(sandbox());
      expect(repo.findOwned).toHaveBeenCalledWith('s1', 'u1');
    });

    it("answers 404 for someone else's or a missing sandbox", async () => {
      repo.findOwned.mockResolvedValue(null);

      await expect(service.get('u2', 's1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('renames without touching the files', async () => {
      await service.update('u1', 's1', { name: 'Kanban' });

      expect(repo.save).toHaveBeenCalledWith(sandbox(), { name: 'Kanban' });
    });

    it('replaces the files', async () => {
      const files = { '/src/App.tsx': 'export default () => null' };

      await service.update('u1', 's1', { files });

      expect(repo.save).toHaveBeenCalledWith(sandbox(), { files });
    });

    it('refuses an empty change', async () => {
      await expect(service.update('u1', 's1', {})).rejects.toThrow(
        new BadRequestException('Send a new name, the project files, or both.'),
      );
    });

    it('refuses invalid files', async () => {
      await expect(
        service.update('u1', 's1', { files: { 'App.tsx': '' } }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it("answers 404 for someone else's sandbox", async () => {
      repo.findOwned.mockResolvedValue(null);

      await expect(
        service.update('u2', 's1', { name: 'Mine now' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it("deletes only the caller's sandbox", async () => {
      await service.delete('u1', 's1');

      expect(repo.delete).toHaveBeenCalledWith('s1', 'u1');
    });

    it('answers 404 when nothing was deleted', async () => {
      repo.delete.mockResolvedValue(false);

      await expect(service.delete('u2', 's1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
