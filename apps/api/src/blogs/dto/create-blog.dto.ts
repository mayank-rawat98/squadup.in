import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { BlogCategory, BlogStatus } from '../entities/blog-post.entity';

/**
 * Status the post should be saved with. Mirrors the three ops actions:
 * "Save as Draft", "Schedule", "Publish".
 */
export enum BlogSaveStatus {
  DRAFT = BlogStatus.DRAFT,
  SCHEDULED = BlogStatus.SCHEDULED,
  PUBLISHED = BlogStatus.PUBLISHED,
}

export class CreateBlogDto {
  @ApiProperty({ example: 'How to Draft a Winning Squad' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title!: string;

  @ApiProperty({ example: 'Rahul Rai' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  author!: string;

  @ApiProperty({ enum: BlogCategory })
  @IsEnum(BlogCategory)
  category!: BlogCategory;

  @ApiPropertyOptional({ type: [String], example: ['squads', 'strategy'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 'A short summary shown in previews.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @ApiPropertyOptional({ description: 'Rendered HTML body.' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.squadup.in/blog-assets/ab12cd34.webp',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  coverImageUrl?: string;

  @ApiPropertyOptional({ enum: BlogSaveStatus, default: BlogSaveStatus.DRAFT })
  @IsOptional()
  @IsEnum(BlogSaveStatus)
  status?: BlogSaveStatus;

  /** Required (and must be in the future) when status is SCHEDULED. */
  @ApiPropertyOptional({ example: '2026-05-08T09:00:00.000Z' })
  @ValidateIf((o: CreateBlogDto) => o.status === BlogSaveStatus.SCHEDULED)
  @Type(() => String)
  @IsDateString()
  scheduledAt?: string;
}
