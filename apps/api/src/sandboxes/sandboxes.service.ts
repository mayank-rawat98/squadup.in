import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  SANDBOX_MAX_PER_USER,
  SANDBOXES_PAGE_SIZE,
} from './constants/sandbox.constants';
import type {
  CreateSandboxDto,
  ListSandboxesDto,
  UpdateSandboxDto,
} from './dto';
import type { Sandbox } from './entities/sandbox.entity';
import { SandboxesRepository } from './sandboxes.repository';
import { findSandboxFilesProblem } from './utils/sandbox-files';

const NOT_FOUND_MESSAGE =
  'We couldn’t find that sandbox. It may have been deleted.';

/** A person's React sandboxes. Only the owner can see or change one. */
@Injectable()
export class SandboxesService {
  constructor(private readonly sandboxes: SandboxesRepository) {}

  async create(ownerId: string, dto: CreateSandboxDto): Promise<Sandbox> {
    assertValidFiles(dto.files);
    const owned = await this.sandboxes.countOwned(ownerId);
    if (owned >= SANDBOX_MAX_PER_USER) {
      throw new ConflictException(
        `You have ${SANDBOX_MAX_PER_USER} sandboxes, the most you can keep. Delete one to start another.`,
      );
    }
    return this.sandboxes.create({
      ownerId,
      name: dto.name,
      files: dto.files,
    });
  }

  async listForOwner(ownerId: string, query: ListSandboxesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? SANDBOXES_PAGE_SIZE;
    const { items, total } = await this.sandboxes.listOwned(
      ownerId,
      page,
      limit,
    );
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Someone else's sandbox and a missing one look the same, so ids can't be
   * probed.
   */
  async get(ownerId: string, id: string): Promise<Sandbox> {
    const sandbox = await this.sandboxes.findOwned(id, ownerId);
    if (!sandbox) throw new NotFoundException(NOT_FOUND_MESSAGE);
    return sandbox;
  }

  async update(
    ownerId: string,
    id: string,
    dto: UpdateSandboxDto,
  ): Promise<Sandbox> {
    if (dto.name === undefined && dto.files === undefined) {
      throw new BadRequestException(
        'Send a new name, the project files, or both.',
      );
    }
    if (dto.files !== undefined) assertValidFiles(dto.files);
    const sandbox = await this.get(ownerId, id);
    return this.sandboxes.save(sandbox, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.files !== undefined && { files: dto.files }),
    });
  }

  async delete(ownerId: string, id: string): Promise<void> {
    const deleted = await this.sandboxes.delete(id, ownerId);
    if (!deleted) throw new NotFoundException(NOT_FOUND_MESSAGE);
  }
}

function assertValidFiles(files: unknown): void {
  const problem = findSandboxFilesProblem(files);
  if (problem) throw new BadRequestException(problem);
}
