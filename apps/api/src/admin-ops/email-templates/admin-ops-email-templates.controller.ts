import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EmailTemplateService } from '../../mailer/email-template.service';
import { StaffGuard } from '../../staff/guards/staff.guard';
import { SetEmailTemplateDto } from './dto/set-email-template.dto';

/**
 * Admin-ops Email Templates tab — where an operator points each application
 * email at the mailtr template that renders it.
 *
 * The listing is catalogue-driven rather than table-driven: it returns every
 * email the app can send, including ones with no templateId yet, so gaps are
 * visible instead of silently missing.
 */
@Controller({ version: '1', path: 'admin-ops/email-templates' })
@ApiTags('admin-ops')
@UseGuards(StaffGuard)
export class AdminOpsEmailTemplatesController {
  constructor(private readonly emailTemplateService: EmailTemplateService) {}

  @Get()
  async list() {
    return {
      success: true,
      data: await this.emailTemplateService.listForAdmin(),
      message: 'Email templates fetched successfully',
    };
  }

  @Put()
  async setTemplate(@Body() dto: SetEmailTemplateDto) {
    const saved = await this.emailTemplateService.setTemplate(
      dto.emailType,
      dto.audience,
      {
        ...(dto.templateId !== undefined ? { templateId: dto.templateId } : {}),
        ...(dto.fromEmail !== undefined ? { fromEmail: dto.fromEmail } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    );
    return {
      success: true,
      data: saved,
      message: 'Email template updated successfully',
    };
  }

  /**
   * Create rows for any catalogue entry that has none. Safe to re-run; used
   * after deploying a release that introduced a new email type.
   */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  async sync() {
    return {
      success: true,
      data: await this.emailTemplateService.syncCatalogue(),
      message: 'Email template catalogue synced successfully',
    };
  }
}
