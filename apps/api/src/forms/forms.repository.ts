import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactUs } from './entities/contactUs.entity';
import { Grievance } from './entities/grievance.entity';
import { Newsletter } from './entities/newsletter.entity';
import { QueryParamDto } from './dto/query-param-dto';
import { Career } from './entities/career.entity';

export interface FindFormsOptions {
  category?: string;
  email?: string;
  name?: string;
  type?: string;
}

@Injectable()
export class FormsRepository {
  constructor(
    @InjectRepository(ContactUs)
    private readonly contactUs: Repository<ContactUs>,
    @InjectRepository(Grievance)
    private readonly grievanceRepo: Repository<Grievance>,
    @InjectRepository(Newsletter)
    private readonly newsletterRepo: Repository<Newsletter>,
    @InjectRepository(Career)
    private readonly careerRepo: Repository<Career>,
  ) {}
  // --- ContactUs helpers ---
  createContactUsForm(data: Partial<ContactUs>) {
    return this.contactUs.create(data);
  }

  async saveContactUsForm(form: ContactUs) {
    return await this.contactUs.save(form);
  }

  async findContactUsByTicketId(ticketId: string) {
    return await this.contactUs.findOne({ where: { ticketId } });
  }

  async findAllContactUs(
    filters: Partial<ContactUs>,
    queryParam: QueryParamDto,
  ) {
    const qb = this.contactUs.createQueryBuilder('contact');

    if (queryParam?.query) {
      const q = `%${queryParam.query}%`;
      qb.andWhere(
        '(contact.email ILIKE :q OR contact.name ILIKE :q OR contact.subject ILIKE :q OR contact.message ILIKE :q)',
        { q },
      );
    }

    // whitelist filterable columns to prevent SQL injection
    const allowedFilters = new Set([
      'email',
      'name',
      'subject',
      'message',
      'phone',
      'department',
      'assignedTo',
      'status',
    ]);

    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (!allowedFilters.has(key)) {
        throw new BadRequestException(`Invalid filter field: ${key}`);
      }
      const param = `filter_${key}`;
      qb.andWhere(`contact.${key} ILIKE :${param}`, {
        [param]: `%${String(value)}%`,
      });
    });

    const allowedSort = ['createdAt', 'email', 'name', 'subject'];
    if (queryParam?.sortby && !allowedSort.includes(queryParam.sortby)) {
      throw new BadRequestException(`Invalid sort field: ${queryParam.sortby}`);
    }
    if (queryParam?.sortby) {
      const order = queryParam.sort === 'asc' ? 'ASC' : 'DESC';
      qb.addOrderBy(`contact.${queryParam.sortby}`, order);
    } else {
      qb.addOrderBy('contact.createdAt', 'DESC');
    }

    const limit = queryParam?.limit || 20;
    const page = queryParam?.page || 1;
    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    const [items, total] = await Promise.all([qb.getMany(), qb.getCount()]);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // --- Grievance helpers ---
  createGrievanceForm(data: Partial<Grievance>) {
    return this.grievanceRepo.create(data);
  }

  async saveGrievanceForm(form: Grievance) {
    return await this.grievanceRepo.save(form);
  }

  async findGrievanceByTicketId(ticketId: string) {
    return await this.grievanceRepo.findOne({ where: { ticketId } });
  }

  async findAllGrievances(
    filters: Partial<Grievance>,
    queryParam: QueryParamDto,
  ) {
    const qb = this.grievanceRepo.createQueryBuilder('grievance');

    if (queryParam?.query) {
      const q = `%${queryParam.query}%`;
      qb.andWhere(
        '(grievance.subject ILIKE :q OR grievance.description ILIKE :q OR grievance.reporterName ILIKE :q OR grievance.reporterEmail ILIKE :q)',
        { q },
      );
    }

    // whitelist filterable columns to prevent SQL injection
    const allowedFilters = new Set([
      'subject',
      'description',
      'reporterName',
      'reporterEmail',
      'reporterPhone',
      'department',
      'assignedTo',
      'status',
      'priority',
    ]);

    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (!allowedFilters.has(key)) {
        throw new BadRequestException(`Invalid filter field: ${key}`);
      }
      const param = `filter_${key}`;
      qb.andWhere(`grievance.${key} ILIKE :${param}`, {
        [param]: `%${String(value)}%`,
      });
    });

    const allowedSort = ['createdAt', 'priority', 'status', 'reporterEmail'];
    if (queryParam?.sortby && !allowedSort.includes(queryParam.sortby)) {
      throw new BadRequestException(`Invalid sort field: ${queryParam.sortby}`);
    }
    if (queryParam?.sortby) {
      const order = queryParam.sort === 'asc' ? 'ASC' : 'DESC';
      qb.addOrderBy(`grievance.${queryParam.sortby}`, order);
    } else {
      qb.addOrderBy('grievance.createdAt', 'DESC');
    }

    const limit = queryParam?.limit || 20;
    const page = queryParam?.page || 1;
    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    const [items, total] = await Promise.all([qb.getMany(), qb.getCount()]);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // --- Newsletter helpers ---
  createNewsletterForm(data: Partial<Newsletter>) {
    return this.newsletterRepo.create(data);
  }

  async saveNewsletterForm(form: Newsletter) {
    return await this.newsletterRepo.save(form);
  }

  async findNewsletterById(id: string) {
    return await this.newsletterRepo.findOne({ where: { id } });
  }

  async findAllNewsletters(
    filters: Partial<Newsletter>,
    queryParam: QueryParamDto,
  ) {
    const qb = this.newsletterRepo.createQueryBuilder('newsletter');

    if (queryParam?.query) {
      const q = `%${queryParam.query}%`;
      qb.andWhere(
        '(newsletter.email ILIKE :q OR newsletter.name ILIKE :q OR newsletter.source ILIKE :q)',
        { q },
      );
    }

    // whitelist filterable columns to prevent SQL injection
    const allowedFilters = new Set([
      'email',
      'name',
      'source',
      'subscribed',
      'consentGiven',
    ]);

    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (!allowedFilters.has(key)) {
        throw new BadRequestException(`Invalid filter field: ${key}`);
      }
      const param = `filter_${key}`;
      // for boolean fields you may want exact match; detect and handle if needed
      if (key === 'subscribed' || key === 'consentGiven') {
        qb.andWhere(`newsletter.${key} = :${param}`, {
          [param]: value,
        });
      } else {
        qb.andWhere(`newsletter.${key} ILIKE :${param}`, {
          [param]: `%${String(value)}%`,
        });
      }
    });

    const allowedSort = ['createdAt', 'email', 'name'];
    if (queryParam?.sortby && !allowedSort.includes(queryParam.sortby)) {
      throw new BadRequestException(`Invalid sort field: ${queryParam.sortby}`);
    }
    if (queryParam?.sortby) {
      const order = queryParam.sort === 'asc' ? 'ASC' : 'DESC';
      qb.addOrderBy(`newsletter.${queryParam.sortby}`, order);
    } else {
      qb.addOrderBy('newsletter.createdAt', 'DESC');
    }

    const limit = queryParam?.limit || 20;
    const page = queryParam?.page || 1;
    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    const [items, total] = await Promise.all([qb.getMany(), qb.getCount()]);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createCareerForm(data: Partial<Career>) {
    return this.careerRepo.create(data);
  }
  async saveCareerForm(form: Career) {
    return await this.careerRepo.save(form);
  }
  async findCareerByTicketId(ticketId: string) {
    return await this.careerRepo.findOne({ where: { ticketId } });
  }
  async findAllCareerForms(
    filters: Partial<Career>,
    queryParam: QueryParamDto,
  ) {
    const qb = this.careerRepo.createQueryBuilder('career');

    if (queryParam?.query) {
      const q = `%${queryParam.query}%`;
      qb.andWhere(
        '(career.email ILIKE :q OR career.fullName ILIKE :q OR career.description ILIKE :q OR career.socialLinks ILIKE :q)',
        { q },
      );
    }

    // whitelist filterable columns to prevent SQL injection
    const allowedFilters = new Set([
      'email',
      'fullName',
      'description',
      'socialLinks',
    ]);

    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (!allowedFilters.has(key)) {
        throw new BadRequestException(`Invalid filter field: ${key}`);
      }
      const param = `filter_${key}`;
      // for boolean fields you may want exact match; detect and handle if needed
      if (key === 'reviewed') {
        qb.andWhere(`career.${key} = :${param}`, {
          [param]: value,
        });
      } else {
        qb.andWhere(`career.${key} ILIKE :${param}`, {
          [param]: `%${String(value)}%`,
        });
      }
    });

    const allowedSort = ['createdAt', 'email', 'fullName'];
    if (queryParam?.sortby && !allowedSort.includes(queryParam.sortby)) {
      throw new BadRequestException(`Invalid sort field: ${queryParam.sortby}`);
    }
    if (queryParam?.sortby) {
      const order = queryParam.sort === 'asc' ? 'ASC' : 'DESC';
      qb.addOrderBy(`career.${queryParam.sortby}`, order);
    } else {
      qb.addOrderBy('career.createdAt', 'DESC');
    }

    const limit = queryParam?.limit || 20;
    const page = queryParam?.page || 1;
    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    const [items, total] = await Promise.all([qb.getMany(), qb.getCount()]);
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findNewsletterByUnsubscribeToken(token: string) {
    return await this.newsletterRepo.findOne({
      where: { unsubscribeToken: token },
    });
  }
  async findNewsletterByEmail(email: string) {
    return await this.newsletterRepo.findOne({
      where: { email },
    });
  }
}
