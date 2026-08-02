import { ObjectLiteral, Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { QueryParamDto } from '../common/dto/query-param.dto';

export async function findAllWithPagination<T extends ObjectLiteral>(
  repo: Repository<T>,
  filters: Record<string, unknown>,
  queryParam: QueryParamDto,
  allowedFilterColumns: Set<string>,
  allowedSortColumns: Set<string>,
  alias: string,
) {
  const qb = repo.createQueryBuilder(alias);

  Object.entries(filters).forEach(([key, value]) => {
    if (!allowedFilterColumns.has(key)) {
      return;
    }
    if (value === undefined || value === null || value === '') {
      return;
    }

    const columnRef = `${alias}.${key}`;
    const paramKey = `filter_${key}`;

    if (key === 'ownerId') {
      qb.andWhere(`${columnRef} = :${paramKey}`, { [paramKey]: value });
    } else if (typeof value === 'string') {
      qb.andWhere(`${columnRef} ILIKE :${paramKey}`, {
        [paramKey]: `%${value}%`,
      });
    } else {
      qb.andWhere(`${columnRef} = :${paramKey}`, { [paramKey]: value });
    }
  });

  const countQb = qb.clone().select(`${alias}.id`).distinct(true);

  if (queryParam.sortby) {
    if (!allowedSortColumns.has(queryParam.sortby)) {
      throw new BadRequestException(`Invalid sort field: ${queryParam.sortby}`);
    }
    const order = queryParam.sort === 'asc' ? 'ASC' : 'DESC';
    qb.addOrderBy(`${alias}.${queryParam.sortby}`, order);
  } else {
    qb.addOrderBy(`${alias}.createdAt`, 'DESC');
  }

  const limit = Math.min(Math.max(queryParam.limit || 10, 1), 100);
  const page = Math.max(queryParam.page || 1, 1);
  const skip = (page - 1) * limit;

  qb.skip(skip).take(limit);

  const [items, total] = await Promise.all([qb.getMany(), countQb.getCount()]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
