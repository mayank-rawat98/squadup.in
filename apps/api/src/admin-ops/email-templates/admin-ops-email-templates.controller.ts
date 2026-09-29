import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  SensitiveRateLimit,
  UserRateLimit,
} from '../../decorators/throttler.decorator';
import { CurrentStaff } from '../../staff/decorators/staff.decorator';
import { Staff } from '../../staff/entities/staff.entity';
import { StaffGuard } from '../../staff/guards/staff.guard';
import { AdminOpsEmailTemplatesService } from './admin-ops-email-templates.service';
import {
  EmailTemplateParamsDto,
  UpdateEmailTemplateDto,
} from './dto/email-template.dto';
import {
  GetEmailTemplateDocs,
  ListEmailTemplatesDocs,
  TestSendEmailTemplateDocs,
  UpdateEmailTemplateDocs,
} from './swagger/admin-ops-email-templates.swagger';

/**
 * Ops Email templates: where staff point each application email at the mailtr
 * template that renders it. This table is the only place a templateId is set.
 *
 * The list is catalogue-driven rather than table-driven: it returns every email
 * the app can send, including ones with no templateId yet, so gaps are visible
 * instead of silently missing. Emails can't be created here, only configured.
 */
@Controller({ version: '1', path: 'admin-ops/email-templates' })
@ApiTags('admin-ops')
@UseGuards(StaffGuard)
@UserRateLimit()
export class AdminOpsEmailTemplatesController {
  constructor(private readonly service: AdminOpsEmailTemplatesService) {}

  @Get()
  @ListEmailTemplatesDocs
  async list() {
    return {
      success: true,
      data: await this.service.list(),
      message: 'Email templates fetched successfully',
    };
  }

  @Get(':audience/:emailType')
  @GetEmailTemplateDocs
  async get(@Param() params: EmailTemplateParamsDto) {
    return {
      success: true,
      data: await this.service.get(params.emailType, params.audience),
      message: 'Email template fetched successfully',
    };
  }

  @Put(':audience/:emailType')
  @UpdateEmailTemplateDocs
  async update(
    @Param() params: EmailTemplateParamsDto,
    @Body() dto: UpdateEmailTemplateDto,
    @CurrentStaff() staff: Staff,
  ) {
    return {
      success: true,
      data: await this.service.update(
        params.emailType,
        params.audience,
        {
          ...(dto.templateId !== undefined
            ? { templateId: dto.templateId }
            : {}),
          ...(dto.fromEmail !== undefined ? { fromEmail: dto.fromEmail } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
        staff,
      ),
      message: 'Email template updated successfully',
    };
  }

  @Post(':audience/:emailType/test-send')
  @HttpCode(HttpStatus.OK)
  @SensitiveRateLimit()
  @TestSendEmailTemplateDocs
  async testSend(
    @Param() params: EmailTemplateParamsDto,
    @CurrentStaff() staff: Staff,
  ) {
    const result = await this.service.testSend(
      params.emailType,
      params.audience,
      staff,
    );
    return {
      success: true,
      data: result,
      message: `Test email sent to ${result.to}`,
    };
  }
}
