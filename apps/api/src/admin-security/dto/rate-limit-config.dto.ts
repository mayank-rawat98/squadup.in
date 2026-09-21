import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateRateLimitConfigDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  strikesCount?: number;

  @IsOptional()
  @IsInt()
  @Min(60)
  hardBlockDuration?: number; // seconds
}
