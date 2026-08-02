import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class ChannelPreferencesDto {
  @IsOptional()
  @IsBoolean()
  inApp?: boolean;

  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @IsOptional()
  @IsBoolean()
  sms?: boolean;
}

class QuietHoursDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;
}

class EmailBatchingDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsEnum(['immediate', 'hourly', 'daily', 'weekly'])
  frequency?: 'immediate' | 'hourly' | 'daily' | 'weekly';
}

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelPreferencesDto)
  channels?: ChannelPreferencesDto;

  @IsOptional()
  @IsObject()
  categories?: Record<
    string,
    { enabled: boolean; channels?: { inApp?: boolean; email?: boolean } }
  >;

  @IsOptional()
  @ValidateNested()
  @Type(() => QuietHoursDto)
  quietHours?: QuietHoursDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmailBatchingDto)
  emailBatching?: EmailBatchingDto;

  @IsOptional()
  @IsString({ each: true })
  unsubscribedCategories?: string[];
}
