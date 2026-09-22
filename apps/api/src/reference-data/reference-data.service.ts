import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Currency } from './entities/currency.entity';
import { Timezone } from './entities/timezone.entity';
import { Language } from './entities/language.entity';
import {
  CreateCurrencyDto,
  CreateLanguageDto,
  CreateTimezoneDto,
  UpdateCurrencyDto,
  UpdateLanguageDto,
  UpdateTimezoneDto,
} from './dto/reference-data.dto';

@Injectable()
export class ReferenceDataService {
  constructor(
    @InjectRepository(Currency)
    private readonly currencyRepo: Repository<Currency>,
    @InjectRepository(Timezone)
    private readonly timezoneRepo: Repository<Timezone>,
    @InjectRepository(Language)
    private readonly languageRepo: Repository<Language>,
  ) {}

  // ── Currencies ────────────────────────────────────────────────
  listCurrencies(includeInactive = false) {
    return this.currencyRepo.find({
      where: includeInactive ? {} : { isActive: true },
      order: { code: 'ASC' },
    });
  }

  async createCurrency(dto: CreateCurrencyDto) {
    const code = dto.code.toUpperCase();
    const existing = await this.currencyRepo.findOne({ where: { code } });
    if (existing) {
      throw new ConflictException(`Currency ${code} already exists`);
    }
    return this.currencyRepo.save(this.currencyRepo.create({ ...dto, code }));
  }

  async updateCurrency(id: string, dto: UpdateCurrencyDto) {
    const row = await this.currencyRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Currency not found');
    Object.assign(row, dto);
    return this.currencyRepo.save(row);
  }

  async deleteCurrency(id: string) {
    const res = await this.currencyRepo.delete(id);
    if (!res.affected) throw new NotFoundException('Currency not found');
  }

  async assertCurrencyExists(code: string) {
    const exists = await this.currencyRepo.findOne({
      where: { code: code.toUpperCase(), isActive: true },
    });
    if (!exists)
      throw new BadRequestException(`Currency '${code}' is not supported`);
  }

  // ── Timezones ─────────────────────────────────────────────────
  listTimezones(includeInactive = false) {
    return this.timezoneRepo.find({
      where: includeInactive ? {} : { isActive: true },
      order: { code: 'ASC' },
    });
  }

  async createTimezone(dto: CreateTimezoneDto) {
    const existing = await this.timezoneRepo.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Timezone ${dto.code} already exists`);
    }
    return this.timezoneRepo.save(this.timezoneRepo.create(dto));
  }

  async updateTimezone(id: string, dto: UpdateTimezoneDto) {
    const row = await this.timezoneRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Timezone not found');
    Object.assign(row, dto);
    return this.timezoneRepo.save(row);
  }

  async deleteTimezone(id: string) {
    const res = await this.timezoneRepo.delete(id);
    if (!res.affected) throw new NotFoundException('Timezone not found');
  }

  async assertTimezoneExists(code: string) {
    const exists = await this.timezoneRepo.findOne({
      where: { code, isActive: true },
    });
    if (!exists)
      throw new BadRequestException(`Timezone '${code}' is not supported`);
  }

  // ── Languages ─────────────────────────────────────────────────
  listLanguages(includeInactive = false) {
    return this.languageRepo.find({
      where: includeInactive ? {} : { isActive: true },
      order: { code: 'ASC' },
    });
  }

  async createLanguage(dto: CreateLanguageDto) {
    const existing = await this.languageRepo.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Language ${dto.code} already exists`);
    }
    return this.languageRepo.save(this.languageRepo.create(dto));
  }

  async updateLanguage(id: string, dto: UpdateLanguageDto) {
    const row = await this.languageRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Language not found');
    Object.assign(row, dto);
    return this.languageRepo.save(row);
  }

  async deleteLanguage(id: string) {
    const res = await this.languageRepo.delete(id);
    if (!res.affected) throw new NotFoundException('Language not found');
  }

  async assertLanguageExists(code: string) {
    const exists = await this.languageRepo.findOne({
      where: { code, isActive: true },
    });
    if (!exists)
      throw new BadRequestException(`Language '${code}' is not supported`);
  }
}
