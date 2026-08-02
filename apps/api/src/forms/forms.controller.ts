import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StaffGuard } from '../staff/guards/staff.guard';
import { Public } from '../decorators/guards.decorator';
import {
  FormRateLimit,
  PublicRateLimit,
} from '../decorators/throttler.decorator';
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
import { QueryParamDto } from './dto/query-param-dto';
import {
  UpdateCareerForm,
  UpdateContactUsForm,
  UpdateGrievanceFormDto,
} from './dto/update-forms.dto';
import { FormsService } from './forms.service';
import * as FormsSwagger from './swagger/forms.swagger';

@ApiTags('Forms')
@Controller({
  path: 'forms',
  version: '1',
})
@UseGuards(StaffGuard)
@PublicRateLimit()
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Post('contact-us')
  @Public()
  @FormRateLimit()
  @ApiOperation(FormsSwagger.createContactUsOperation)
  @ApiBody(FormsSwagger.createContactUsBody)
  @ApiResponse(FormsSwagger.formCreatedResponse)
  async createContactUsForm(@Body() formData: CreateContactUsFormDto) {
    await this.formsService.createContactUsForm(formData);
    return {
      success: true,
      data: null,
      message: 'Form submitted successfully',
    };
  }

  @Post('grievance')
  @Public()
  @FormRateLimit()
  @ApiOperation(FormsSwagger.createGrievanceOperation)
  @ApiBody(FormsSwagger.createGrievanceBody)
  @ApiResponse(FormsSwagger.formCreatedResponse)
  async createGrievanceForm(@Body() formData: CreateGrievanceFormDto) {
    await this.formsService.createGrievanceForm(formData);
    return {
      success: true,
      data: null,
      message: 'Form submitted successfully',
    };
  }

  @Post('newsletter')
  @Public()
  @FormRateLimit()
  @ApiOperation(FormsSwagger.createNewsletterOperation)
  @ApiBody(FormsSwagger.createNewsletterBody)
  @ApiResponse(FormsSwagger.formCreatedResponse)
  async createNewsletterForm(@Body() formData: CreateNewsletterFormDto) {
    await this.formsService.createNewsletterForm(formData);
    return {
      success: true,
      data: null,
      message: 'Form submitted successfully',
    };
  }

  @Post('career')
  @Public()
  @FormRateLimit()
  @ApiOperation(FormsSwagger.createCareerOperation)
  @ApiBody(FormsSwagger.createCareerBody)
  @ApiResponse(FormsSwagger.formCreatedResponse)
  async createCareerForm(@Body() formData: CreateCareerFormDto) {
    await this.formsService.createCareerForm(formData);
    return {
      success: true,
      data: null,
      message: 'Form submitted successfully',
    };
  }

  @Post('all/contact-us')
  @ApiOperation(FormsSwagger.getAllContactUsOperation)
  @ApiQuery(FormsSwagger.limitQuery)
  @ApiQuery(FormsSwagger.pageQuery)
  @ApiQuery(FormsSwagger.sortQuery)
  @ApiQuery(FormsSwagger.sortByQuery)
  @ApiQuery(FormsSwagger.getAllContactUsStatusQuery)
  @ApiQuery(FormsSwagger.getAllContactUsTypeQuery)
  @ApiResponse(FormsSwagger.getAllContactUsResponse)
  async findAllContactUsForms(
    @Query() query: QueryParamDto,
    @Body() filters: QueryContactUsFormDto,
  ) {
    const forms = await this.formsService.findAllContactUs(filters, query);
    return {
      success: true,
      data: {
        currentPage: forms.page,
        itemsPerPage: forms.limit,
        totalItems: forms.total,
        totalPages: forms.totalPages,
        forms: forms.items,
      },
      message: 'Forms fetched successfully',
    };
  }

  @Post('all/grievance')
  @ApiOperation(FormsSwagger.getAllGrievanceOperation)
  @ApiQuery(FormsSwagger.limitQuery)
  @ApiQuery(FormsSwagger.pageQuery)
  @ApiQuery(FormsSwagger.sortQuery)
  @ApiQuery(FormsSwagger.sortByQuery)
  @ApiQuery(FormsSwagger.getAllGrievanceStatusQuery)
  @ApiQuery(FormsSwagger.getAllGrievancePriorityQuery)
  @ApiQuery(FormsSwagger.getAllGrievanceTypeQuery)
  @ApiResponse(FormsSwagger.getAllGrievanceResponse)
  async findAllGrievanceForms(
    @Query() query: QueryParamDto,
    @Body() filters: QueryGrievanceFormDto,
  ) {
    const forms = await this.formsService.findAllGrievances(filters, query);
    return {
      success: true,
      data: {
        currentPage: forms.page,
        itemsPerPage: forms.limit,
        totalItems: forms.total,
        totalPages: forms.totalPages,
        forms: forms.items,
      },
      message: 'Forms fetched successfully',
    };
  }

  @Post('all/newsletter')
  @ApiOperation(FormsSwagger.getAllNewsletterOperation)
  @ApiQuery(FormsSwagger.limitQuery)
  @ApiQuery(FormsSwagger.pageQuery)
  @ApiQuery(FormsSwagger.sortQuery)
  @ApiQuery(FormsSwagger.sortByQuery)
  @ApiQuery(FormsSwagger.getAllNewsletterSubscribedQuery)
  @ApiResponse(FormsSwagger.getAllNewsletterResponse)
  async findAllNewsletterForms(
    @Query() query: QueryParamDto,
    @Body() filters: QueryNewsletterFormDto,
  ) {
    const forms = await this.formsService.findAllNewsletters(filters, query);
    return {
      success: true,
      data: {
        currentPage: forms.page,
        itemsPerPage: forms.limit,
        totalItems: forms.total,
        totalPages: forms.totalPages,
        forms: forms.items,
      },
      message: 'Forms fetched successfully',
    };
  }

  @Post('all/career')
  @ApiOperation(FormsSwagger.getAllCareerOperation)
  @ApiQuery(FormsSwagger.limitQuery)
  @ApiQuery(FormsSwagger.pageQuery)
  @ApiQuery(FormsSwagger.sortQuery)
  @ApiQuery(FormsSwagger.sortByQuery)
  @ApiQuery(FormsSwagger.getAllCareerStatusQuery)
  @ApiResponse(FormsSwagger.getAllCareerResponse)
  async findAllCareerForms(
    @Query() query: QueryParamDto,
    @Body() filters: QueryCareerForm,
  ) {
    const forms = await this.formsService.findAllCareers(filters, query);
    return {
      success: true,
      data: {
        currentPage: forms.page,
        itemsPerPage: forms.limit,
        totalItems: forms.total,
        totalPages: forms.totalPages,
        forms: forms.items,
      },
      message: 'Forms fetched successfully',
    };
  }

  @Get('contact-us/:ticketId')
  @ApiOperation(FormsSwagger.getContactUsByIdOperation)
  @ApiParam(FormsSwagger.getContactUsByIdParam)
  @ApiResponse(FormsSwagger.getContactUsByIdResponse)
  async findContactUsFormById(@Param('ticketId') ticketId: string) {
    const form = await this.formsService.findContactUsByTicketId(ticketId);
    return {
      success: true,
      data: form,
      message: 'Form fetched successfully',
    };
  }

  @Get('grievance/:ticketId')
  @ApiOperation(FormsSwagger.getGrievanceByIdOperation)
  @ApiParam(FormsSwagger.getGrievanceByIdParam)
  @ApiResponse(FormsSwagger.getGrievanceByIdResponse)
  async findGrievanceFormById(@Param('ticketId') ticketId: string) {
    const form = await this.formsService.findGrievanceByTicketId(ticketId);
    return {
      success: true,
      data: form,
      message: 'Form fetched successfully',
    };
  }

  @Get('newsletter/:id')
  @ApiOperation(FormsSwagger.getNewsletterByIdOperation)
  @ApiParam(FormsSwagger.getNewsletterByIdParam)
  @ApiResponse(FormsSwagger.getNewsletterByIdResponse)
  async findNewsletterFormById(@Param('id') id: string) {
    const form = await this.formsService.findNewsletterById(id);
    return {
      success: true,
      data: form,
      message: 'Form fetched successfully',
    };
  }

  @Get('career/:ticketId')
  @ApiOperation(FormsSwagger.getCareerByIdOperation)
  @ApiParam(FormsSwagger.getCareerByIdParam)
  @ApiResponse(FormsSwagger.getCareerByIdResponse)
  async findCareerFormById(@Param('ticketId') ticketId: string) {
    const form = await this.formsService.findCareerFormByTicketId(ticketId);
    return {
      success: true,
      data: form,
      message: 'Form fetched successfully',
    };
  }

  @Patch('contact-us/:ticketId')
  @ApiOperation(FormsSwagger.updateContactUsOperation)
  @ApiParam(FormsSwagger.updateContactUsParam)
  @ApiBody(FormsSwagger.updateContactUsBody)
  @ApiResponse(FormsSwagger.formUpdatedResponse)
  async contactUsFormUpdates(
    @Param('ticketId') ticketId: string,
    @Body() updates: UpdateContactUsForm,
  ) {
    await this.formsService.updateContactUsForm(ticketId, updates);
    return {
      success: true,
      data: null,
      message: 'Form updated successfully',
    };
  }

  @Patch('grievance/:ticketId')
  @ApiOperation(FormsSwagger.updateGrievanceOperation)
  @ApiParam(FormsSwagger.updateGrievanceParam)
  @ApiBody(FormsSwagger.updateGrievanceBody)
  @ApiResponse(FormsSwagger.formUpdatedResponse)
  async grievanceFormUpdates(
    @Param('ticketId') ticketId: string,
    @Body() updates: UpdateGrievanceFormDto,
  ) {
    await this.formsService.updateGrievanceForm(ticketId, updates);
    return {
      success: true,
      data: null,
      message: 'Form updated successfully',
    };
  }

  @Patch('career/:ticketId')
  @ApiOperation(FormsSwagger.updateCareerOperation)
  @ApiParam(FormsSwagger.updateCareerParam)
  @ApiBody(FormsSwagger.updateCareerBody)
  @ApiResponse(FormsSwagger.formUpdatedResponse)
  async careerFormUpdates(
    @Param('ticketId') ticketId: string,
    @Body() updates: UpdateCareerForm,
  ) {
    await this.formsService.updateCareerForm(ticketId, updates);
    return {
      success: true,
      data: null,
      message: 'Form updated successfully',
    };
  }

  @Patch('newsletter/unsubscribe')
  @Public()
  @ApiOperation(FormsSwagger.unsubscribeNewsletterOperation)
  @ApiBody(FormsSwagger.unsubscribeNewsletterBody)
  @ApiResponse(FormsSwagger.unsubscribeNewsletterResponse)
  async unsubscribeNewsletter(@Body('token') token: string) {
    await this.formsService.unsubscribeNewsletter(token);
    return {
      success: true,
      data: null,
      message: 'Unsubscribed successfully',
    };
  }
}
