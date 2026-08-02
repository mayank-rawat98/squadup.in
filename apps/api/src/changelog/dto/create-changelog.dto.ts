import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const CHANGE_TYPES = [
  'feature',
  'fix',
  'improvement',
  'deprecation',
] as const;
export type ChangeType = (typeof CHANGE_TYPES)[number];

export const RELEASE_TYPES = ['major', 'minor', 'patch'] as const;
export type ReleaseType = (typeof RELEASE_TYPES)[number];

export class ChangeItemDto {
  @ApiProperty({
    description: 'Type of change',
    enum: CHANGE_TYPES,
    example: 'feature',
  })
  @IsEnum(CHANGE_TYPES)
  type!: ChangeType;

  @ApiProperty({
    description: 'Description of the change',
    example: 'New drag-and-drop editor with React-based rendering engine.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  text!: string;
}

export class CreateChangelogDto {
  @ApiProperty({ description: 'Version string', example: 'v1.0.0' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  version!: string;

  @ApiProperty({
    description: 'Release date (ISO 8601)',
    example: '2025-12-25',
  })
  @IsDateString()
  date!: string;

  @ApiProperty({ description: 'Release title', example: 'Public Launch' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty({
    description: 'Release description',
    example: 'Squadup is now open to the public!',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiPropertyOptional({
    description:
      'Release type. When omitted it is derived from the legacy isMajor flag.',
    enum: RELEASE_TYPES,
    example: 'major',
  })
  @IsOptional()
  @IsEnum(RELEASE_TYPES)
  releaseType?: ReleaseType;

  @ApiProperty({ description: 'List of changes', type: [ChangeItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChangeItemDto)
  changes!: ChangeItemDto[];

  @ApiPropertyOptional({
    description:
      'Whether this is a major release. Derived from releaseType; kept for backward compatibility.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isMajor?: boolean;
}
