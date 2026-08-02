import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

// Define your sort order enum (if not already defined)
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryParamDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page!: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  lean!: boolean;

  @IsOptional()
  @IsString()
  query!: string;

  @IsOptional()
  @IsEnum(SortOrder)
  sort!: SortOrder;
  @IsOptional()
  @IsString()
  sortby!: string;
}
