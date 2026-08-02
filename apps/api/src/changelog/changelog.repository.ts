import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Changelog } from './entities/changelog.entity';
import {
  ChangelogSortOrder,
  QueryChangelogDto,
} from './dto/query-changelog.dto';

@Injectable()
export class ChangelogRepository {
  constructor(
    @InjectRepository(Changelog)
    private readonly repo: Repository<Changelog>,
  ) {}

  async create(data: Partial<Changelog>): Promise<Changelog> {
    const entry = this.repo.create(data);
    return this.repo.save(entry);
  }

  async findAll(
    query: QueryChangelogDto,
  ): Promise<{ items: Changelog[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      search,
      sortBy = 'date',
      sortOrder = ChangelogSortOrder.DESC,
    } = query;

    const qb = this.repo.createQueryBuilder('changelog');

    if (search) {
      qb.andWhere(
        '(changelog.version ILIKE :search OR changelog.title ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.orderBy(`changelog.${sortBy}`, sortOrder);
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async findOne(id: string): Promise<Changelog | null> {
    return this.repo.findOne({ where: { id } });
  }

  async update(id: string, data: Partial<Changelog>): Promise<Changelog> {
    await this.repo.update({ id }, data);
    const updated = await this.findOne(id);
    if (!updated) {
      throw new NotFoundException(`Changelog entry with id ${id} not found`);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    const result = await this.repo.delete({ id });
    if (result.affected === 0) {
      throw new NotFoundException(`Changelog entry with id ${id} not found`);
    }
  }

  async existsByVersion(version: string, excludeId?: string): Promise<boolean> {
    const qb = this.repo
      .createQueryBuilder('changelog')
      .where('changelog.version = :version', { version });

    if (excludeId) {
      qb.andWhere('changelog.id != :excludeId', { excludeId });
    }

    return (await qb.getCount()) > 0;
  }
}
