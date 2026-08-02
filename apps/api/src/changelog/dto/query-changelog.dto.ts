import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum ChangelogSortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export enum ChangelogSortBy {
  DATE = 'date',
  CREATED_AT = 'createdAt',
  VERSION = 'version',
}

export class QueryChangelogDto {
  @ApiPropertyOptional({
    description: 'Page number (starts from 1)',
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit = 20;

  @ApiPropertyOptional({ description: 'Filter by version (partial match)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ChangelogSortBy, default: ChangelogSortBy.DATE })
  @IsOptional()
  @IsEnum(ChangelogSortBy)
  sortBy: ChangelogSortBy = ChangelogSortBy.DATE;

  @ApiPropertyOptional({
    enum: ChangelogSortOrder,
    default: ChangelogSortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(ChangelogSortOrder)
  sortOrder: ChangelogSortOrder = ChangelogSortOrder.DESC;
}
