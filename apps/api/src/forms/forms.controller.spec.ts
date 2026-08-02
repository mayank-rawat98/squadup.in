import { Test, TestingModule } from '@nestjs/testing';
import { FormsController } from './forms.controller';
import { FormsService } from './forms.service';
import { CreateContactUsFormDto } from './dto/create-contactus-form.dto';
import { QueryParamDto, SortOrder } from './dto/query-param-dto';
import { PermissionsGuard } from '../common/guards/auth.guard';
import { InquiryType } from './entities/contactUs.entity';
import { CreateGrievanceFormDto } from './dto/create-grievance-form.dto';
import { GrievanceType } from './entities/grievance.entity';

// Mock FormsService
const mockFormsService = {
  createContactUsForm: jest.fn(),
  findAllContactUs: jest.fn(),
  findContactUsByTicketId: jest.fn(),
  updateContactUsForm: jest.fn(),
  createGrievanceForm: jest.fn(),
  findAllGrievances: jest.fn(),
  findGrievanceByTicketId: jest.fn(),
  updateGrievanceForm: jest.fn(),
  createNewsletterForm: jest.fn(),
  findAllNewsletters: jest.fn(),
  findNewsletterById: jest.fn(),
  unsubscribeNewsletter: jest.fn(),
  createCareerForm: jest.fn(),
  findAllCareers: jest.fn(),
  findCareerFormByTicketId: jest.fn(),
  updateCareerForm: jest.fn(),
};

describe('FormsController', () => {
  let controller: FormsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FormsController],
      providers: [
        {
          provide: FormsService,
          useValue: mockFormsService,
        },
      ],
    })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true }) // Mock the guard
      .compile();

    controller = module.get<FormsController>(FormsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createContactUsForm', () => {
    it('should call formsService.createContactUsForm and return success', async () => {
      const formDto: CreateContactUsFormDto = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        message: 'A message',
        inquiryType: InquiryType.GENERAL,
      };
      mockFormsService.createContactUsForm.mockResolvedValue(undefined);

      const result = await controller.createContactUsForm(formDto);

      expect(mockFormsService.createContactUsForm).toHaveBeenCalledWith(
        formDto,
      );
      expect(result).toEqual({
        success: true,
        data: null,
        message: 'Form submitted successfully',
      });
    });
  });

  describe('findAllContactUsForms', () => {
    it('should call formsService.findAllContactUs and return paginated data', async () => {
      const query: QueryParamDto = {
        page: 1,
        limit: 10,
        sortby: 'createdAt',
        lean: true,
        query: '',
        sort: SortOrder.DESC,
      };
      const filters = {};
      const serviceResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
      mockFormsService.findAllContactUs.mockResolvedValue(serviceResult);

      const result = await controller.findAllContactUsForms(query, filters);

      expect(mockFormsService.findAllContactUs).toHaveBeenCalledWith(
        filters,
        query,
      );
      expect(result.success).toBe(true);
      expect(result.data.forms).toEqual(serviceResult.items);
    });
  });

  describe('findContactUsFormById', () => {
    it('should call formsService.findContactUsByTicketId and return the form', async () => {
      const ticketId = '123';
      const form = { ticketId, email: 'test@test.com' };
      mockFormsService.findContactUsByTicketId.mockResolvedValue(form);

      const result = await controller.findContactUsFormById(ticketId);

      expect(mockFormsService.findContactUsByTicketId).toHaveBeenCalledWith(
        ticketId,
      );
      expect(result.data).toEqual(form);
    });
  });

  // Add similar, concise tests for the other form types (Grievance, Newsletter, Career)
  describe('createGrievanceForm', () => {
    it('should call the service to create a grievance form', async () => {
      const formDto: CreateGrievanceFormDto = {
        fullName: 'Test User',
        email: 'grievance@test.com',
        subject: 'test',
        description: 'test',
        grievanceType: GrievanceType.OTHER,
      };
      await controller.createGrievanceForm(formDto);
      expect(mockFormsService.createGrievanceForm).toHaveBeenCalledWith(
        formDto,
      );
    });
  });

  describe('createNewsletterForm', () => {
    it('should call the service to create a newsletter form', async () => {
      const formDto = { email: 'newsletter@test.com' };
      await controller.createNewsletterForm(formDto);
      expect(mockFormsService.createNewsletterForm).toHaveBeenCalledWith(
        formDto,
      );
    });
  });

  describe('createCareerForm', () => {
    it('should call the service to create a career form', async () => {
      const formDto = {
        fullName: 'Test',
        email: 'career@test.com',
        description: 'Dev',
        socialLinks: 'linkedin.com',
      };
      await controller.createCareerForm(formDto);
      expect(mockFormsService.createCareerForm).toHaveBeenCalledWith(formDto);
    });
  });
});
