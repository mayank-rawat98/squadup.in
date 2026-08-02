import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SelectQueryBuilder } from 'typeorm';
import { QueryParamDto, SortOrder } from './dto/query-param-dto';
import { Career } from './entities/career.entity';
import { ContactUs, ContactStatus } from './entities/contactUs.entity';
import { Grievance } from './entities/grievance.entity';
import { Newsletter } from './entities/newsletter.entity';
import { FormsRepository } from './forms.repository';

// A simplified, explicit mock type for the repository to solve TS errors.
type MockRepository<T extends object> = {
  create: jest.Mock;
  save: jest.Mock;
  findOne: jest.Mock;
  createQueryBuilder: jest.Mock<SelectQueryBuilder<T>>;
};

// Factory to create a mock repository object that matches the type
const createMockRepository = <T extends object>(): MockRepository<T> => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('FormsRepository', () => {
  let repository: FormsRepository;
  let contactUsRepo: MockRepository<ContactUs>;
  let grievanceRepo: MockRepository<Grievance>;
  let newsletterRepo: MockRepository<Newsletter>;
  let careerRepo: MockRepository<Career>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormsRepository,
        {
          provide: getRepositoryToken(ContactUs),
          useValue: createMockRepository<ContactUs>(),
        },
        {
          provide: getRepositoryToken(Grievance),
          useValue: createMockRepository<Grievance>(),
        },
        {
          provide: getRepositoryToken(Newsletter),
          useValue: createMockRepository<Newsletter>(),
        },
        {
          provide: getRepositoryToken(Career),
          useValue: createMockRepository<Career>(),
        },
      ],
    }).compile();

    repository = module.get<FormsRepository>(FormsRepository);
    contactUsRepo = module.get<MockRepository<ContactUs>>(
      getRepositoryToken(ContactUs),
    );
    grievanceRepo = module.get<MockRepository<Grievance>>(
      getRepositoryToken(Grievance),
    );
    newsletterRepo = module.get<MockRepository<Newsletter>>(
      getRepositoryToken(Newsletter),
    );
    careerRepo = module.get<MockRepository<Career>>(getRepositoryToken(Career));
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('ContactUs Methods', () => {
    it('should create a contact us form', () => {
      const formData = { firstName: 'Test', lastName: 'User' };
      repository.createContactUsForm(formData);
      expect(contactUsRepo.create).toHaveBeenCalledWith(formData);
    });

    it('should save a contact us form', async () => {
      const form = new ContactUs();
      await repository.saveContactUsForm(form);
      expect(contactUsRepo.save).toHaveBeenCalledWith(form);
    });

    it('should find a contact us form by ticketId', async () => {
      const ticketId = 'ticket-123';
      await repository.findContactUsByTicketId(ticketId);
      expect(contactUsRepo.findOne).toHaveBeenCalledWith({
        where: { ticketId },
      });
    });

    it('should find all contact us forms with pagination and filters', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getCount: jest.fn().mockResolvedValue(0),
      };
      contactUsRepo.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as SelectQueryBuilder<ContactUs>,
      );

      const filters: Partial<ContactUs> = { status: ContactStatus.NEW };
      const queryParams: QueryParamDto = {
        page: 1,
        limit: 10,
        sortby: 'createdAt',
        lean: true,
        query: '',
        sort: SortOrder.ASC,
      };
      await repository.findAllContactUs(filters, queryParams);

      expect(contactUsRepo.createQueryBuilder).toHaveBeenCalledWith('contact');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        'contact.createdAt',
        'ASC',
      );
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
      expect(mockQueryBuilder.getCount).toHaveBeenCalled();
    });
  });

  // You can add similar describe blocks for Grievance, Newsletter, and Career
  describe('Grievance Methods', () => {
    it('should create a grievance form', () => {
      const formData = { subject: 'Test' };
      repository.createGrievanceForm(formData);
      expect(grievanceRepo.create).toHaveBeenCalledWith(formData);
    });

    it('should save a grievance form', async () => {
      const form = new Grievance();
      await repository.saveGrievanceForm(form);
      expect(grievanceRepo.save).toHaveBeenCalledWith(form);
    });
  });

  describe('Newsletter Methods', () => {
    it('should create a newsletter form', () => {
      const formData = { email: 'test@test.com' };
      repository.createNewsletterForm(formData);
      expect(newsletterRepo.create).toHaveBeenCalledWith(formData);
    });

    it('should save a newsletter form', async () => {
      const form = new Newsletter();
      await repository.saveNewsletterForm(form);
      expect(newsletterRepo.save).toHaveBeenCalledWith(form);
    });
  });

  describe('Career Methods', () => {
    it('should create a career form', () => {
      const formData = { fullName: 'Test' };
      repository.createCareerForm(formData);
      expect(careerRepo.create).toHaveBeenCalledWith(formData);
    });

    it('should save a career form', async () => {
      const form = new Career();
      await repository.saveCareerForm(form);
      expect(careerRepo.save).toHaveBeenCalledWith(form);
    });
  });
});
