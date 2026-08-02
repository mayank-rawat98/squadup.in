import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from './entities/staff.entity';

@Injectable()
export class StaffRepository {
  constructor(
    @InjectRepository(Staff)
    private readonly repo: Repository<Staff>,
  ) {}

  create(data: Partial<Staff>): Staff {
    return this.repo.create(data);
  }

  save(staff: Staff): Promise<Staff> {
    return this.repo.save(staff);
  }

  findById(id: string): Promise<Staff | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<Staff | null> {
    return this.repo.findOne({ where: { email: email.toLowerCase() } });
  }

  /**
   * Login path only — `password` is `select: false` on the entity, so the hash
   * has to be requested explicitly.
   */
  findByEmailWithPassword(email: string): Promise<Staff | null> {
    return this.repo
      .createQueryBuilder('staff')
      .addSelect('staff.password')
      .where('LOWER(staff.email) = LOWER(:email)', { email })
      .getOne();
  }

  findAll(): Promise<Staff[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async update(id: string, patch: Partial<Staff>): Promise<Staff | null> {
    await this.repo.update(id, patch);
    return this.findById(id);
  }

  async softDelete(id: string): Promise<boolean> {
    const result = await this.repo.softDelete(id);
    return Boolean(result.affected);
  }

  countActive(): Promise<number> {
    return this.repo.count();
  }
}
