import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sandbox } from './entities/sandbox.entity';

export type NewSandbox = Pick<Sandbox, 'ownerId' | 'name' | 'files'>;
export type SandboxChanges = Partial<Pick<Sandbox, 'name' | 'files'>>;

/** The columns a list shows; the files stay out until a sandbox is opened. */
const SUMMARY_COLUMNS = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Sandboxes, always looked up with their owner so no query can cross accounts. */
@Injectable()
export class SandboxesRepository {
  constructor(
    @InjectRepository(Sandbox)
    private readonly sandboxes: Repository<Sandbox>,
  ) {}

  create(data: NewSandbox): Promise<Sandbox> {
    return this.sandboxes.save(this.sandboxes.create(data));
  }

  findOwned(id: string, ownerId: string): Promise<Sandbox | null> {
    return this.sandboxes.findOne({ where: { id, ownerId } });
  }

  countOwned(ownerId: string): Promise<number> {
    return this.sandboxes.count({ where: { ownerId } });
  }

  /** A person's sandboxes, most recently saved first, without their files. */
  async listOwned(ownerId: string, page: number, limit: number) {
    const [items, total] = await this.sandboxes.findAndCount({
      select: SUMMARY_COLUMNS,
      where: { ownerId },
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }

  save(sandbox: Sandbox, changes: SandboxChanges): Promise<Sandbox> {
    return this.sandboxes.save(this.sandboxes.merge(sandbox, changes));
  }

  async delete(id: string, ownerId: string): Promise<boolean> {
    const result = await this.sandboxes.delete({ id, ownerId });
    return (result.affected ?? 0) > 0;
  }
}
