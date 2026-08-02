import * as bcrypt from 'bcryptjs';
import { instanceToPlain } from 'class-transformer';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  STAFF_PASSWORD_SALT_ROUNDS,
  STAFF_ROLE_ADMIN,
} from '../constants/staff.constants';

export enum StaffStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

/**
 * An ops-dashboard operator. Entirely separate from `User`: staff never appear
 * in the customer tables, hold their own credentials and sessions, and are
 * created out-of-band (see the migration notes) rather than by self-signup.
 *
 * Single role for now — `role` is fixed to 'admin'. It is a column rather than
 * an assumption so introducing a hierarchy later is an additive change.
 */
@Entity({ name: 'staff' })
export class Staff {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Named explicitly so the entity metadata matches the migration; without a
  // name TypeORM derives a hash and every `migration:generate` churns the index.
  @Index('UQ_staff_email', { unique: true })
  @Column({
    type: 'varchar',
    length: 255,
    transformer: {
      to: (v: string) => v?.toLowerCase(),
      from: (v: string) => v,
    },
  })
  email!: string;

  /**
   * Never selected by default — a plain `find` must not be able to leak the
   * hash. The login path opts in explicitly via addSelect.
   */
  @Column({ type: 'varchar', length: 255, select: false })
  password!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  fullName!: string | null;

  @Column({ type: 'varchar', length: 32, default: STAFF_ROLE_ADMIN })
  role!: string;

  @Column({
    type: 'enum',
    enum: StaffStatus,
    default: StaffStatus.ACTIVE,
  })
  status!: StaffStatus;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt?: Date;

  @BeforeInsert()
  async hashPassword() {
    if (this.password) {
      this.password = await bcrypt.hash(this.password, STAFF_PASSWORD_SALT_ROUNDS);
    }
  }

  async validatePassword(plain: string): Promise<boolean> {
    return bcrypt.compare(plain, this.password);
  }

  /** Strips the hash whenever the entity is serialized into a response. */
  toJSON() {
    const plain = instanceToPlain(this) as Record<string, unknown>;
    delete plain.password;
    return plain;
  }
}
