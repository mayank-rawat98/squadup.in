import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import {
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MAX_LIMIT,
  SEARCH_MIN_QUERY_LENGTH,
  SEARCH_RESULT_TYPE,
} from '../constants/search.constants';

export class QuerySearchDto {
  @ApiProperty({
    description: `What to search for. At least ${SEARCH_MIN_QUERY_LENGTH} characters.`,
    example: 'squad',
    minLength: SEARCH_MIN_QUERY_LENGTH,
  })
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(SEARCH_MIN_QUERY_LENGTH)
  q!: string;

  @ApiPropertyOptional({
    description: 'Max hits per type.',
    default: SEARCH_DEFAULT_LIMIT,
    minimum: 1,
    maximum: SEARCH_MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(SEARCH_MAX_LIMIT)
  limit?: number;

  @ApiPropertyOptional({
    description:
      'Restrict the search to these types. Omit to search everything the ' +
      'caller can see.',
    enum: SEARCH_RESULT_TYPE,
    isArray: true,
    example: [SEARCH_RESULT_TYPE.BLOG],
  })
  @IsOptional()
  // Accepts ?types=blog&types=squad and ?types=blog,squad.
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map((v) => v.trim());
    return value;
  })
  @IsArray()
  @IsEnum(SEARCH_RESULT_TYPE, { each: true })
  types?: SEARCH_RESULT_TYPE[];
}
