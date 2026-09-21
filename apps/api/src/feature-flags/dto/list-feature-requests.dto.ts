import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { FeatureRequestStatus } from '../feature-flags.constants';

export class ListFeatureRequestsDto {
  @IsOptional()
  @IsEnum(FeatureRequestStatus)
  status?: FeatureRequestStatus;

  @IsOptional()
  @IsString()
  featureKey?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
