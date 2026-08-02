import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormsService } from './forms.service';
import { FormsController } from './forms.controller';
import { FormsRepository } from './forms.repository';
import { ContactUs } from './entities/contactUs.entity';
import { Grievance } from './entities/grievance.entity';
import { Newsletter } from './entities/newsletter.entity';
import { Career } from './entities/career.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([ContactUs, Grievance, Newsletter, Career]),
  ],
  controllers: [FormsController],
  providers: [FormsService, FormsRepository],
  exports: [FormsService, FormsRepository],
})
export class FormsModule {}
