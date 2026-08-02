// apps/api/src/users/users.repository.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOneOptions,
  FindOptionsRelations,
  MoreThanOrEqual,
  QueryDeepPartialEntity,
  Repository,
} from 'typeorm';
import { QueryParamDto } from './dto/query-param-dto';
import { AccountStatus, User } from './entities/user.entity';

export interface FindAllOptions {
  take?: number;
  skip?: number;
  search?: string; // simple email/company/fullName search
  order?: { [key: string]: 'ASC' | 'DESC' };
}

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  create(data: Partial<User>) {
    return this.repo.create(data);
  }

  async save(user: User) {
    return await this.repo.save(user);
  }

  async findById(id: string) {
    return this.repo.findOne({
      where: { id },
    });
  }

  /**
   * Like {@link findById} but also returns soft-deleted (deactivated) users.
   * Admin-only — lets the ops dashboard open a closed account's detail.
   */
  async findByIdWithDeleted(id: string) {
    return this.repo.findOne({
      where: { id },
      withDeleted: true,
    });
  }

  async findByEmail(email: string) {
    return this.repo.findOne({
      where: { email },
    });
  }

  async phoneExists(phone: string, excludeUserId?: string): Promise<boolean> {
    const qb = this.repo
      .createQueryBuilder('user')
      .where('user.phone = :phone', { phone });
    if (excludeUserId) {
      qb.andWhere('user.id != :excludeUserId', { excludeUserId });
    }
    return qb.getExists();
  }

  async exists(options: FindOneOptions<User>) {
    const exists = await this.repo.exists(options);
    return exists;
  }

  // magicLoginToken is select:false, so it must be explicitly added.
  async findByMagicLoginToken(token: string) {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.magicLoginToken')
      .where('user.magicLoginToken = :token', { token })
      .getOne();
  }

  async findByEmailWithPassword(email: string) {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();
  }

  /**
   * @param restrictIds When provided, the result is restricted to these user
   * IDs (used by admin filters that resolve IDs from another table, e.g. by
   * subscription plan). An empty array short-circuits to an empty page.
   */
  async findAll(
    filters: Partial<User>,
    queryParam: QueryParamDto,
    restrictIds?: string[] | null,
    includeDeleted = false,
  ) {
    if (restrictIds && restrictIds.length === 0) {
      const limit = queryParam.limit || 10;
      const page = queryParam.page || 1;
      return { items: [], total: 0, page, limit, totalPages: 0 };
    }

    const qb = this.repo.createQueryBuilder('user');

    // Admin views opt in to soft-deleted (deactivated) accounts. Applied before
    // the count clone so the total includes them too.
    if (includeDeleted) {
      qb.withDeleted();
    }

    if (restrictIds && restrictIds.length > 0) {
      qb.andWhere('user.id IN (:...restrictIds)', { restrictIds });
    }

    // clone the query for counting
    const countQb = qb.clone().select('user.id').distinct(true);

    // Search using query param (searches across multiple fields)
    if (queryParam.query) {
      const q = `%${queryParam.query}%`;
      qb.andWhere(
        '(user.email ILIKE :q OR user.companyName ILIKE :q OR user.fullName ILIKE :q)',
        { q },
      );
    }

    // Dynamically apply all filters from QueryUserDto
    const validColumns = this.repo.metadata.columns.map(
      (col) => col.propertyName,
    );
    Object.entries(filters).forEach(([key, value]) => {
      if (!validColumns.includes(key)) {
        throw new BadRequestException(`Invalid filter field: ${key}`);
      }
      if (value !== undefined && value !== null && value !== '') {
        // Check if value is a string - use ILIKE for partial matching
        if (typeof value === 'string') {
          qb.andWhere(`user.${key} ILIKE :${key}`, { [key]: `%${value}%` });
        } else {
          // For non-string values (boolean, number), use exact match
          qb.andWhere(`user.${key} = :${key}`, { [key]: value });
        }
      }
    });

    // Sorting
    const allowedSortFields = ['createdAt', 'email', 'fullName', 'companyName'];
    if (queryParam.sortby && !allowedSortFields.includes(queryParam.sortby)) {
      throw new BadRequestException(`Invalid sort field: ${queryParam.sortby}`);
    }
    if (queryParam.sortby) {
      const order = queryParam.sort === 'asc' ? 'ASC' : 'DESC';
      qb.addOrderBy(`user.${queryParam.sortby}`, order);
    } else {
      qb.addOrderBy('user.createdAt', 'DESC');
    }

    // Pagination
    const limit = queryParam.limit || 10;
    const page = queryParam.page || 1;
    const skip = (page - 1) * limit;

    qb.skip(skip).take(limit);

    const [items, total] = await Promise.all([
      qb.getMany(),
      countQb.getCount(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateUser(id: string, partial: Partial<User>) {
    await this.repo.update({ id }, partial as QueryDeepPartialEntity<User>);
    return this.findById(id);
  }

  async updateUserForDeactivation(id: string, partial: Partial<User>) {
    return await this.repo.update(
      { id },
      partial as QueryDeepPartialEntity<User>,
    );
  }

  /**
   * Update account-status fields by id and return the (possibly soft-deleted)
   * user. `repo.update` doesn't apply the soft-delete filter, so this also works
   * on legacy closed accounts; the refetch uses withDeleted to match.
   */
  async setAccountStatus(id: string, partial: Partial<User>) {
    await this.repo.update({ id }, partial as QueryDeepPartialEntity<User>);
    return this.findByIdWithDeleted(id);
  }

  async softDelete(id: string) {
    return this.repo.softDelete({ id });
  }

  async isEmailTaken(email: string) {
    const count = await this.repo.count({ where: { email } });
    return count > 0;
  }

  async getPopulatedUser(
    id: string,
    relations: FindOptionsRelations<User> = { settings: true },
  ) {
    return this.repo.findOne({ where: { id }, relations });
  }

  async updatePassword(password: string, email: string) {
    const res = await this.repo
      .createQueryBuilder()
      .update(User)
      .set({ password })
      .where('LOWER(email) = LOWER(:email)', { email })
      .returning('*')
      .execute();
    return res.raw && res.raw[0] ? res.raw[0] : null;
  }
  delete(id: string) {
    return this.repo.delete({ id });
  }
  async findByIds(ids: string[]) {
    if (ids.length === 0) return [];
    return this.repo
      .createQueryBuilder('user')
      .select(['user.id', 'user.fullName', 'user.email'])
      .where('user.id IN (:...ids)', { ids })
      .getMany();
  }

  // ── Admin aggregate counts ─────────────────────────────────────────────

  countAll(): Promise<number> {
    // Include deactivated (soft-deleted) accounts so the admin total matches the
    // list, which also surfaces them.
    return this.repo.count({ withDeleted: true });
  }

  countByAccountStatus(status: AccountStatus): Promise<number> {
    return this.repo.count({ where: { accountStatus: status } });
  }

  countCreatedSince(since: Date): Promise<number> {
    return this.repo.count({ where: { createdAt: MoreThanOrEqual(since) } });
  }
}
