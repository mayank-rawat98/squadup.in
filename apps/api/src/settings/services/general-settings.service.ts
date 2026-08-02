import { Injectable } from '@nestjs/common';
import { SettingsRepository } from '../settings.repository';
import { UpdateGeneralSettingsDto } from '../dto/general-settings.dto';
import { DateFormat } from '../entities/user-settings.entity';

export interface GeneralSettings {
  currency: string;
  timezone: string;
  dateFormat: DateFormat;
  language: string;
}

@Injectable()
export class GeneralSettingsService {
  private static readonly DEFAULTS: GeneralSettings = {
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    dateFormat: DateFormat.MM_DD_YYYY,
    language: 'en',
  };

  constructor(private readonly settingsRepo: SettingsRepository) {}

  async get(userId: string): Promise<GeneralSettings> {
    const settings = await this.settingsRepo.findByUserId(userId);
    if (!settings) return { ...GeneralSettingsService.DEFAULTS };
    return {
      currency: settings.currency,
      timezone: settings.timezone,
      dateFormat: settings.dateFormat,
      language: settings.language,
    };
  }

  async update(
    userId: string,
    dto: UpdateGeneralSettingsDto,
  ): Promise<GeneralSettings> {
    const patch: Partial<GeneralSettings> = {};
    if (dto.currency) patch.currency = dto.currency.toUpperCase();
    if (dto.timezone) patch.timezone = dto.timezone;
    if (dto.dateFormat) patch.dateFormat = dto.dateFormat;
    if (dto.language) patch.language = dto.language;

    await this.settingsRepo.upsert(userId, patch);
    return this.get(userId);
  }
}
