import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailTemplateRepository } from './email-template.repository';
import { EmailTemplateService } from './email-template.service';
import { EmailTemplate } from './entities/email-template.entity';
import { MailerService } from './mailer.service';
import { MailtrClient } from './mailtr.client';

/**
 * Global because outbound email is cross-cutting — auth, users, forms,
 * settings, notifications and admin-ops all send mail, and none of them should
 * need to import a transport module to do it.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([EmailTemplate])],
  providers: [
    MailerService,
    MailtrClient,
    EmailTemplateService,
    EmailTemplateRepository,
  ],
  exports: [MailerService, EmailTemplateService],
})
export class MailerModule {}
