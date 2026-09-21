import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { BlogCategory, BlogStatus } from '../entities/blog-post.entity';

/**
 * List filters shared by the "Blog Management" table (all statuses) and the
 * "All Published Blogs" table (status pinned to PUBLISHED by the FE).
 */
export class ListBlogsDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Search title / author / tags' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ enum: BlogStatus })
  @IsOptional()
  @IsEnum(BlogStatus)
  status?: BlogStatus;

  @ApiPropertyOptional({ enum: BlogCategory })
  @IsOptional()
  @IsEnum(BlogCategory)
  category?: BlogCategory;
}
