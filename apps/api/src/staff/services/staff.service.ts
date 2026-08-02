import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { RedisService } from '../../redis/redis.service';
import {
  STAFF_PASSWORD_SALT_ROUNDS,
  STAFF_ROLE_ADMIN,
} from '../constants/staff.constants';
import { CreateStaffDto } from '../dto/create-staff.dto';
import { UpdateStaffDto } from '../dto/update-staff.dto';
import { Staff, StaffStatus } from '../entities/staff.entity';
import { StaffRepository } from '../staff.repository';

/**
 * Staff directory management. Every operation here is performed BY an
 * authenticated staff admin — there is no self-signup for the ops realm.
 */
@Injectable()
export class StaffService {
  constructor(
    private readonly repository: StaffRepository,
    private readonly redisService: RedisService,
  ) {}

  /** Resolves the principal for the staff middleware. */
  findById(id: string): Promise<Staff | null> {
    return this.repository.findById(id);
  }

  async getStaff(id: string): Promise<Staff> {
    const staff = await this.repository.findById(id);
    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }
    return staff;
  }

  list(): Promise<Staff[]> {
    return this.repository.findAll();
  }

  async create(dto: CreateStaffDto): Promise<Staff> {
    const existing = await this.repository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('A staff member with this email exists');
    }
    // @BeforeInsert on the entity hashes `password`.
    const staff = this.repository.create({
      email: dto.email,
      password: dto.password,
      fullName: dto.fullName ?? null,
      role: STAFF_ROLE_ADMIN,
      status: StaffStatus.ACTIVE,
    });
    return this.repository.save(staff);
  }

  async update(id: string, dto: UpdateStaffDto): Promise<Staff> {
    await this.getStaff(id);
    const updated = await this.repository.update(id, {
      ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    });
    if (!updated) {
      throw new BadRequestException('Unable to update staff member');
    }
    // A suspended operator must lose every live session immediately, not at
    // access-token expiry.
    if (dto.status === StaffStatus.SUSPENDED) {
      await this.redisService.removeStaffAllDevices(id);
    }
    return updated;
  }

  /**
   * Set a new password and sign every device out — a password change must
   * invalidate sessions that were established with the old one.
   */
  async changePassword(id: string, newPassword: string): Promise<void> {
    await this.getStaff(id);
    const password = await bcrypt.hash(newPassword, STAFF_PASSWORD_SALT_ROUNDS);
    await this.repository.update(id, { password });
    await this.redisService.removeStaffAllDevices(id);
  }

  /**
   * Soft-delete an operator and revoke their sessions. Refuses to remove the
   * last one, which would lock everybody out of the ops dashboard.
   */
  async remove(id: string, actingStaffId: string): Promise<void> {
    if (id === actingStaffId) {
      throw new BadRequestException('You cannot remove your own account');
    }
    await this.getStaff(id);
    if ((await this.repository.countActive()) <= 1) {
      throw new BadRequestException(
        'Cannot remove the last remaining staff account',
      );
    }
    await this.repository.softDelete(id);
    await this.redisService.removeStaffAllDevices(id);
  }
}
