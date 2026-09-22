import { IsIP, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ManualBlockIpDto {
  @IsIP()
  ip!: string;

  @IsInt()
  @Min(60)
  duration!: number; // seconds

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateBlockDurationDto {
  @IsInt()
  @Min(60)
  duration!: number; // seconds — new total TTL
}
