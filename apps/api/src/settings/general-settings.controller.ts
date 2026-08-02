import { Body, Controller, Get, Patch, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { GeneralSettingsService } from './services/general-settings.service';
import { UpdateGeneralSettingsDto } from './dto/general-settings.dto';

@ApiTags('settings/general')
@ApiBearerAuth('JWT-auth')
@Controller({ path: 'settings/general', version: '1' })
export class GeneralSettingsController {
  constructor(private readonly service: GeneralSettingsService) {}

  @Get()
  async get(@Request() req: ExpressRequest) {
    const data = await this.service.get(req.user.id);
    return { success: true, data };
  }

  @Patch()
  async update(
    @Request() req: ExpressRequest,
    @Body() dto: UpdateGeneralSettingsDto,
  ) {
    const data = await this.service.update(req.user.id, dto);
    return { success: true, data, message: 'General settings updated' };
  }
}
