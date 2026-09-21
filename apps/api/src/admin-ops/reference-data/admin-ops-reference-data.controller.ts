import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRateLimit } from '../../decorators/throttler.decorator';
import { ReferenceDataService } from '../../reference-data/reference-data.service';
import { StaffGuard } from '../../staff/guards/staff.guard';
import {
  CreateCurrencyDto,
  CreateLanguageDto,
  CreateTimezoneDto,
  UpdateCurrencyDto,
  UpdateLanguageDto,
  UpdateTimezoneDto,
} from '../../reference-data/dto/reference-data.dto';

/**
 * Admin-ops Reference Data: maintain the currency, timezone and language lists
 * users choose from. Deactivating an entry hides it from the public lists and
 * stops new settings saves from choosing it, without breaking users who
 * already have it set.
 */
@Controller({ version: '1', path: 'admin-ops/reference' })
@ApiTags('admin-ops')
@UseGuards(StaffGuard)
@UserRateLimit()
export class AdminOpsReferenceDataController {
  constructor(private readonly service: ReferenceDataService) {}

  // ── Currencies ────────────────────────────────────────────────
  @Get('currencies')
  async listCurrencies(@Query('includeInactive') includeInactive?: string) {
    const data = await this.service.listCurrencies(includeInactive === 'true');
    return { success: true, data };
  }

  @Post('currencies')
  @HttpCode(HttpStatus.CREATED)
  async createCurrency(@Body() dto: CreateCurrencyDto) {
    const data = await this.service.createCurrency(dto);
    return { success: true, data };
  }

  @Patch('currencies/:id')
  async updateCurrency(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCurrencyDto,
  ) {
    const data = await this.service.updateCurrency(id, dto);
    return { success: true, data };
  }

  @Delete('currencies/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCurrency(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.deleteCurrency(id);
  }

  // ── Timezones ─────────────────────────────────────────────────
  @Get('timezones')
  async listTimezones(@Query('includeInactive') includeInactive?: string) {
    const data = await this.service.listTimezones(includeInactive === 'true');
    return { success: true, data };
  }

  @Post('timezones')
  @HttpCode(HttpStatus.CREATED)
  async createTimezone(@Body() dto: CreateTimezoneDto) {
    const data = await this.service.createTimezone(dto);
    return { success: true, data };
  }

  @Patch('timezones/:id')
  async updateTimezone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTimezoneDto,
  ) {
    const data = await this.service.updateTimezone(id, dto);
    return { success: true, data };
  }

  @Delete('timezones/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTimezone(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.deleteTimezone(id);
  }

  // ── Languages ─────────────────────────────────────────────────
  @Get('languages')
  async listLanguages(@Query('includeInactive') includeInactive?: string) {
    const data = await this.service.listLanguages(includeInactive === 'true');
    return { success: true, data };
  }

  @Post('languages')
  @HttpCode(HttpStatus.CREATED)
  async createLanguage(@Body() dto: CreateLanguageDto) {
    const data = await this.service.createLanguage(dto);
    return { success: true, data };
  }

  @Patch('languages/:id')
  async updateLanguage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLanguageDto,
  ) {
    const data = await this.service.updateLanguage(id, dto);
    return { success: true, data };
  }

  @Delete('languages/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLanguage(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.deleteLanguage(id);
  }
}
