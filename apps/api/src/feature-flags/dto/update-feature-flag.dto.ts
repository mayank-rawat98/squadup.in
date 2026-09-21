import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateFeatureFlagDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isExperimental?: boolean;

  @IsOptional()
  @IsBoolean()
  rolloutToAll?: boolean;
}
