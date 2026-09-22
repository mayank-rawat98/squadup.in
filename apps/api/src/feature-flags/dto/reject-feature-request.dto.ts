import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectFeatureRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
