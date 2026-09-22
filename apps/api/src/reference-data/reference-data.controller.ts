import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReferenceDataService } from './reference-data.service';
import { DateFormat } from '../settings/entities/user-settings.entity';

@ApiTags('reference-data')
@Controller({ path: 'reference', version: '1' })
export class ReferenceDataController {
  constructor(private readonly service: ReferenceDataService) {}

  @Get('currencies')
  async currencies() {
    const data = await this.service.listCurrencies();
    return { success: true, data };
  }

  @Get('timezones')
  async timezones() {
    const data = await this.service.listTimezones();
    return { success: true, data };
  }

  @Get('languages')
  async languages() {
    const data = await this.service.listLanguages();
    return { success: true, data };
  }

  @Get('date-formats')
  dateFormats() {
    return {
      success: true,
      data: Object.values(DateFormat).map((code) => ({ code, label: code })),
    };
  }
}
