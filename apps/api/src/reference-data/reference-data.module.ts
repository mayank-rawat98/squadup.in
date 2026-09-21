import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Currency } from './entities/currency.entity';
import { Timezone } from './entities/timezone.entity';
import { Language } from './entities/language.entity';
import { ReferenceDataService } from './reference-data.service';
import { ReferenceDataController } from './reference-data.controller';

/**
 * Currencies, timezones and languages a user may pick in their settings.
 * Reads are public; editing the lists is exposed to the ops dashboard by the
 * staff-guarded admin-ops reference-data controller. @Global so settings can
 * validate against the lists without importing this module.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Currency, Timezone, Language])],
  controllers: [ReferenceDataController],
  providers: [ReferenceDataService],
  exports: [ReferenceDataService],
})
export class ReferenceDataModule {}
