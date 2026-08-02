import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMAIL_TYPE_ENUM } from '../mailer/constants/mailer.constants';
import { MailerService } from '../mailer/mailer.service';
import { QueryParamDto } from '../users/dto/query-param-dto';
import { generateTicketId } from '../utils/utils';
import {
  CreateCareerFormDto,
  QueryCareerForm,
} from './dto/create-career-form.dto';
import {
  CreateContactUsFormDto,
  QueryContactUsFormDto,
} from './dto/create-contactus-form.dto';
import {
  CreateGrievanceFormDto,
  QueryGrievanceFormDto,
} from './dto/create-grievance-form.dto';
import {
  CreateNewsletterFormDto,
  QueryNewsletterFormDto,
} from './dto/create-newsletter-form.dto';
import {
  UpdateCareerForm,
  UpdateContactUsForm,
  UpdateGrievanceFormDto,
} from './dto/update-forms.dto';
import { Career, CareerStatus } from './entities/career.entity';
import { ContactStatus, ContactUs } from './entities/contactUs.entity';
import { Grievance, GrievanceStatus } from './entities/grievance.entity';
import { FormsRepository } from './forms.repository';
import { Newsletter } from './entities/newsletter.entity';
import { AuditsService } from '../audits/audits.service';
import { AUDIT_ACTIONS, AUDIT_RESOURCE } from '../audits/constants';

@Injectable()
export class FormsService {
  private readonly adminEmail: string;
  private readonly clientUrl: string;
  constructor(
    private readonly formsRepository: FormsRepository,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly auditsService: AuditsService,
  ) {
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
    const clientUrl = this.configService.get<string>('CLIENT_URL');
    if (!adminEmail || !clientUrl) {
      throw new BadRequestException('Admin email or client url not configured');
    }
    this.adminEmail = adminEmail;
    this.clientUrl = clientUrl;
  }

  async generateUniqueToken<T>(
    prefix: string,
    createFunction: (ticketId: string) => Promise<T | null>,
  ): Promise<string> {
    let ticketId = '';
    let maxAttempts = 3;
    while (maxAttempts > 0) {
      ticketId = generateTicketId(prefix);
      const existingRecord = await createFunction(ticketId);
      if (!existingRecord) {
        return ticketId;
      }
      maxAttempts--;
    }
    throw new BadRequestException(
      'Failed to generate unique token/ID after multiple attempts',
    );
  }

  async createContactUsForm(data: CreateContactUsFormDto) {
    const form = this.formsRepository.createContactUsForm(data);
    const ticketId = await this.generateUniqueToken<ContactUs>(
      'CTC',
      async (ticketId: string) =>
        this.formsRepository.findContactUsByTicketId(ticketId),
    );
    form.ticketId = ticketId;
    const saved = await this.formsRepository.saveContactUsForm(form);
    const createdAtFormatted = saved.createdAt
      ? saved.createdAt.toLocaleString()
      : '';
    const rawPayload = JSON.stringify(data);

    const userEmailData = {
      fullName: `${saved.firstName} ${saved.lastName}`.trim(),
      email: saved.email,
      company: saved.company ?? '',
      inquiryType: saved.inquiryType,
      message: saved.message,
      createdAtFormatted,
      ticketId: saved.ticketId,
    };

    const adminEmailData = {
      ...userEmailData,
      rawPayload,
    };
    const url = `${this.clientUrl}/auth/login?redirect=/dashboard/contact-us/${saved.ticketId}`;
    await Promise.all([
      this.mailerService.notifyUserByEmail({
        recipient: saved.email || data.email,
        emailType: EMAIL_TYPE_ENUM.CONTACT_US,
        emailData: { ...userEmailData, adminEmail: this.adminEmail },
      }),
      this.mailerService.notifyAdminByEmail({
        recipient: this.adminEmail,
        emailType: EMAIL_TYPE_ENUM.CONTACT_US,
        emailData: {
          ...adminEmailData,
          userEmail: saved.email || data.email,
          dashboardUrl: url,
        },
      }),
    ]);

    this.auditsService
      .logUserAction(
        'ANONYMOUS',
        AUDIT_ACTIONS.FORM.CONTACT_US_SUBMITTED,
        AUDIT_RESOURCE.FORM,
        saved.ticketId,
        { userEmail: saved.email, resourceName: saved.ticketId },
      )
      .catch(() => {
        /* noop */
      });
  }

  async createGrievanceForm(data: CreateGrievanceFormDto) {
    const form = this.formsRepository.createGrievanceForm(data);
    const ticketId = await this.generateUniqueToken<Grievance>(
      'GRV',
      async (ticketId: string) =>
        this.formsRepository.findGrievanceByTicketId(ticketId),
    );
    form.ticketId = ticketId;
    const saved = await this.formsRepository.saveGrievanceForm(form);

    const createdAtFormatted = saved.createdAt
      ? saved.createdAt.toLocaleString()
      : '';

    const userEmailData = {
      ticketId: saved.ticketId,
      fullName: saved.fullName,
      email: saved.email,
      subject: saved.subject,
      description: saved.description,
      grievanceType: saved.grievanceType,
      createdAtFormatted,
    };
    const url = `${this.clientUrl}/auth/login?redirect=/dashboard/grievance/${saved.ticketId}`;
    await Promise.all([
      this.mailerService.notifyUserByEmail({
        recipient: saved.email || data.email,
        emailType: EMAIL_TYPE_ENUM.GRIEVANCE,
        emailData: { ...userEmailData, adminEmail: this.adminEmail },
      }),
      this.mailerService.notifyAdminByEmail({
        recipient: this.adminEmail,
        emailType: EMAIL_TYPE_ENUM.GRIEVANCE,
        emailData: {
          ...userEmailData,
          dashboardUrl: url,
        },
      }),
    ]);

    this.auditsService
      .logUserAction(
        'ANONYMOUS',
        AUDIT_ACTIONS.FORM.GRIEVANCE_SUBMITTED,
        AUDIT_RESOURCE.FORM,
        saved.ticketId,
        { userEmail: saved.email, resourceName: saved.ticketId },
      )
      .catch(() => {
        /* noop */
      });
  }

  async createNewsletterForm(data: CreateNewsletterFormDto) {
    const newsletterForm = await this.formsRepository.findNewsletterByEmail(
      data.email,
    );
    const unsubscribeToken = await this.generateUniqueToken<Newsletter>(
      'NL',
      async (token: string) =>
        this.formsRepository.findNewsletterByUnsubscribeToken(token),
    );
    if (newsletterForm) {
      if (newsletterForm.subscribed) {
        throw new BadRequestException(
          'Email is already subscribed to the newsletter',
        );
      } else {
        newsletterForm.unsubscribeToken = unsubscribeToken;
        newsletterForm.subscribed = true;
        newsletterForm.unsubscribedAt = null;
        Object.assign(newsletterForm, data);
        await this.formsRepository.saveNewsletterForm(newsletterForm);

        const createdAtFormatted = newsletterForm.createdAt
          ? newsletterForm.createdAt.toLocaleString()
          : '';
        const unsubscribeUrl = `${this.clientUrl}/unsubscribe-newsletter?token=${unsubscribeToken}`;
        const userEmailData = {
          name: newsletterForm.name,
          email: newsletterForm.email,
          subscribed: newsletterForm.subscribed,
          source: newsletterForm.source,
          consentGiven: newsletterForm.consentGiven,
          tags: newsletterForm.tags,
          unsubscribeToken,
          unsubscribeUrl,
          createdAtFormatted,
        };

        await this.mailerService.notifyUserByEmail({
          recipient: newsletterForm.email || data.email,
          emailType: EMAIL_TYPE_ENUM.NEWSLETTER,
          emailData: { ...userEmailData, adminEmail: this.adminEmail },
        });
        return;
      }
    }
    const form = this.formsRepository.createNewsletterForm(data);
    form.unsubscribeToken = unsubscribeToken;
    await this.formsRepository.saveNewsletterForm(form);
    const createdAtFormatted = form.createdAt
      ? form.createdAt.toLocaleString()
      : '';
    const unsubscribeUrl = `${this.clientUrl}/unsubscribe-newsletter?token=${unsubscribeToken}`;
    const userEmailData = {
      name: form.name,
      email: form.email,
      subscribed: form.subscribed,
      source: form.source,
      consentGiven: form.consentGiven,
      tags: form.tags,
      unsubscribeToken,
      unsubscribeUrl,
      createdAtFormatted,
    };

    await this.mailerService.notifyUserByEmail({
      recipient: form.email || data.email,
      emailType: EMAIL_TYPE_ENUM.NEWSLETTER,
      emailData: { ...userEmailData, adminEmail: this.adminEmail },
    });

    this.auditsService
      .logUserAction(
        'ANONYMOUS',
        AUDIT_ACTIONS.FORM.NEWSLETTER_SUBSCRIBED,
        AUDIT_RESOURCE.FORM,
        form.id,
        { userEmail: form.email, resourceName: 'newsletter' },
      )
      .catch(() => {
        /* noop */
      });
  }

  async createCareerForm(data: CreateCareerFormDto) {
    const form = await this.formsRepository.createCareerForm(data);
    const ticketId = await this.generateUniqueToken<Career>(
      'CR',
      async (ticketId: string) =>
        this.formsRepository.findCareerByTicketId(ticketId),
    );
    form.ticketId = ticketId;
    await this.formsRepository.saveCareerForm(form);
    const userEmailData = {
      fullName: form.fullName,
      email: form.email,
      message: form.description,
      ticketId: form.ticketId,
      socialLinks: form.socialLinks,
      createdAtFormatted: form.createdAt ? form.createdAt.toLocaleString() : '',
    };
    const url = `${this.clientUrl}/auth/login?redirect=/dashboard/career/${form.ticketId}`;
    await Promise.all([
      this.mailerService.notifyUserByEmail({
        recipient: form.email,
        emailType: EMAIL_TYPE_ENUM.CAREER,
        emailData: userEmailData,
      }),
      this.mailerService.notifyAdminByEmail({
        recipient: this.adminEmail,
        emailType: EMAIL_TYPE_ENUM.CAREER,
        emailData: { ...userEmailData, dashboardUrl: url },
      }),
    ]);

    this.auditsService
      .logUserAction(
        'ANONYMOUS',
        AUDIT_ACTIONS.FORM.CAREER_SUBMITTED,
        AUDIT_RESOURCE.FORM,
        form.ticketId,
        { userEmail: form.email, resourceName: form.ticketId },
      )
      .catch(() => {
        /* noop */
      });
  }

  async findAllContactUs(
    filters: QueryContactUsFormDto,
    queryParam: QueryParamDto,
  ) {
    return await this.formsRepository.findAllContactUs(filters, queryParam);
  }

  async findAllGrievances(
    filters: QueryGrievanceFormDto,
    queryParam: QueryParamDto,
  ) {
    return await this.formsRepository.findAllGrievances(filters, queryParam);
  }

  async findAllNewsletters(
    filters: QueryNewsletterFormDto,
    queryParam: QueryParamDto,
  ) {
    return await this.formsRepository.findAllNewsletters(filters, queryParam);
  }

  async findAllCareers(filters: QueryCareerForm, queryParam: QueryParamDto) {
    return await this.formsRepository.findAllCareerForms(filters, queryParam);
  }
  async findContactUsByTicketId(ticketId: string) {
    const form = await this.formsRepository.findContactUsByTicketId(ticketId);
    if (!form) {
      throw new NotFoundException('Form not found');
    }
    return form;
  }

  async findGrievanceByTicketId(ticketId: string) {
    const form = await this.formsRepository.findGrievanceByTicketId(ticketId);
    if (!form) {
      throw new NotFoundException('Form not found');
    }
    return form;
  }

  async findNewsletterById(id: string) {
    const form = await this.formsRepository.findNewsletterById(id);
    if (!form) {
      throw new NotFoundException('Form not found');
    }
    return form;
  }

  async findCareerFormByTicketId(ticketId: string) {
    const form = await this.formsRepository.findCareerByTicketId(ticketId);
    if (!form) {
      throw new NotFoundException('Form not found');
    }
    return form;
  }

  async updateContactUsForm(ticketId: string, data: UpdateContactUsForm) {
    const form = await this.formsRepository.findContactUsByTicketId(ticketId);
    if (!form) {
      throw new NotFoundException('Form not found');
    }
    if (form.status === ContactStatus.RESOLVED) {
      throw new BadRequestException('Query already resolved');
    }
    await this.mailerService.sendFollowUpEmailsToUser({
      recipient: form.email,
      emailType: data.status,
      data: {
        formType: 'Contact Us',
        status: data.status,
        ticketId: form.ticketId,
        inquiryType: form.inquiryType,
        assignedTo: data.assignedTo ?? 'manager',
        name: `${form.firstName} ${form.lastName}`.trim(),
        summary: data.summary ?? '',
      },
    });
    Object.assign(form, data);
    const result = await this.formsRepository.saveContactUsForm(form);

    this.auditsService
      .logUserAction(
        'ADMIN',
        AUDIT_ACTIONS.FORM.CONTACT_US_UPDATED,
        AUDIT_RESOURCE.FORM,
        ticketId,
        {
          changesAfter: data as unknown as Record<string, unknown>,
          resourceName: ticketId,
        },
      )
      .catch(() => {
        /* noop */
      });

    return result;
  }

  async updateGrievanceForm(ticketId: string, data: UpdateGrievanceFormDto) {
    const form = await this.formsRepository.findGrievanceByTicketId(ticketId);
    if (!form) {
      throw new NotFoundException('Form not found');
    }
    if (form.status === GrievanceStatus.RESOLVED) {
      throw new BadRequestException('Query already resolved');
    }
    await this.mailerService.sendFollowUpEmailsToUser({
      recipient: form.email,
      emailType: data.status,
      data: {
        formType: 'Grievance',
        status: data.status,
        ticketId: form.ticketId,
        grievanceType: form.grievanceType,
        assignedTo: data.assignedTo ?? 'manager',
        name: form.fullName,
        summary: data.summary ?? '',
      },
    });
    Object.assign(form, data);
    const result = await this.formsRepository.saveGrievanceForm(form);

    this.auditsService
      .logUserAction(
        'ADMIN',
        AUDIT_ACTIONS.FORM.GRIEVANCE_UPDATED,
        AUDIT_RESOURCE.FORM,
        ticketId,
        {
          changesAfter: data as unknown as Record<string, unknown>,
          resourceName: ticketId,
        },
      )
      .catch(() => {
        /* noop */
      });

    return result;
  }

  async updateCareerForm(ticketId: string, data: UpdateCareerForm) {
    const form = await this.formsRepository.findCareerByTicketId(ticketId);
    if (!form) {
      throw new NotFoundException('Form not found');
    }
    if (form.status === CareerStatus.RESOLVED) {
      throw new BadRequestException('Query already resolved');
    }
    await this.mailerService.sendFollowUpEmailsToUser({
      recipient: form.email,
      emailType: data.status,
      data: {
        formType: 'Career',
        status: data.status,
        ticketId: form.ticketId,
        assignedTo: data.assignedTo ?? 'manager',
        name: form.fullName ?? 'user',
        summary: data.summary ?? '',
      },
    });
    Object.assign(form, data);
    const result = await this.formsRepository.saveCareerForm(form);

    this.auditsService
      .logUserAction(
        'ADMIN',
        AUDIT_ACTIONS.FORM.CAREER_UPDATED,
        AUDIT_RESOURCE.FORM,
        ticketId,
        {
          changesAfter: data as unknown as Record<string, unknown>,
          resourceName: ticketId,
        },
      )
      .catch(() => {
        /* noop */
      });

    return result;
  }

  async unsubscribeNewsletter(token: string) {
    const form =
      await this.formsRepository.findNewsletterByUnsubscribeToken(token);
    if (!form) {
      throw new NotFoundException('Please provide a valid token');
    }
    if (form.subscribed === false) {
      throw new BadRequestException('Newsletter already unsubscribed');
    }
    const url = `${this.clientUrl}/auth/login?redirect=/newsletters/${form.id}`;
    await this.mailerService.notifyUserByEmail({
      recipient: form.email,
      emailType: EMAIL_TYPE_ENUM.UNSUBSCRIBE_NEWSLETTER,
      emailData: {
        name: form.name,
        resubscribeUrl: url,
      },
    });
    form.subscribed = false;
    form.unsubscribedAt = new Date();
    const result = await this.formsRepository.saveNewsletterForm(form);

    this.auditsService
      .logUserAction(
        'ANONYMOUS',
        AUDIT_ACTIONS.FORM.NEWSLETTER_UNSUBSCRIBED,
        AUDIT_RESOURCE.FORM,
        form.id,
        { userEmail: form.email, resourceName: 'newsletter' },
      )
      .catch(() => {
        /* noop */
      });

    return result;
  }

}
