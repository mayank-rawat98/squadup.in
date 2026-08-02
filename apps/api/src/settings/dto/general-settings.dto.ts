import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { DateFormat } from '../entities/user-settings.entity';

export class UpdateGeneralSettingsDto {
  @IsOptional()
  @IsString()
  @Length(2, 8)
  currency?: string;

  @IsOptional()
  @IsString()
  @Length(2, 64)
  timezone?: string;

  @IsOptional()
  @IsEnum(DateFormat)
  dateFormat?: DateFormat;

  @IsOptional()
  @IsString()
  @Length(2, 16)
  language?: string;
}
