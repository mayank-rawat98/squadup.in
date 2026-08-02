// users/entities/user.entity.ts
import * as bcrypt from 'bcryptjs';
import { instanceToPlain } from 'class-transformer';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { UserSettings } from '../../settings/entities/user-settings.entity';

export enum AccountStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
  HOLD = 'hold',
}


@Entity({ name: 'users' })
@Index('IDX_USER_PHONE', ['phone'], {
  unique: true,
  where: '"phone" IS NOT NULL',
})
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 255,
    transformer: {
      to: (v: string) => v?.toLowerCase(),
      from: (v: string) => v,
    },
  })
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  phone?: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fullName?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl?: string;

  @Column({ default: true })
  isPasswordSet!: boolean;

  // Forces the user to change their password on next login. Set when an account
  // is provisioned with a system-generated temporary password.
  @Column({ default: false })
  mustChangePassword!: boolean;

  // One-time, expiring token that lets a provisioned user log in via an email
  // link without typing the temporary password. Cleared once consumed.
  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  magicLoginToken?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  magicLoginTokenExpiresAt?: Date | null;

  @Column({ default: false })
  emailVerified!: boolean;

  @Column({ default: false })
  phoneVerified!: boolean;

  @Column({ type: 'enum', enum: AccountStatus, default: AccountStatus.HOLD })
  accountStatus!: AccountStatus;

  // Free-text reason for the current non-active status (e.g. the violation(s)
  // a user was suspended for). Surfaced to admins and included in the
  // suspension email. Cleared on reactivation.
  @Column({ type: 'text', nullable: true })
  statusReason?: string | null;

  // When accountStatus was last changed by an admin (deactivate / suspend /
  // reactivate). Gives future data-purge jobs a timestamp to key off.
  @Column({ type: 'timestamptz', nullable: true })
  statusChangedAt?: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  addressLine1!: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  city?: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  state?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  postalCode?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country?: string;


  @OneToOne('UserSettings', (settings: UserSettings) => settings.user)
  settings?: UserSettings;

  /**
   * When the user accepted the Terms of Service & Privacy Policy at signup.
   * This is the proof-of-consent GDPR requires — a boolean alone is not enough,
   * we must be able to demonstrate *when* consent was given. Pre-existing
   * accounts were backfilled to their `createdAt` (signup was never allowed
   * without accepting the Terms), so this is effectively always set.
   */
  @Column({ type: 'timestamptz', nullable: true })
  acceptedTermsAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;

  @BeforeInsert()
  async hashPassword(): Promise<void> {
    this.password = await bcrypt.hash(this.password, 10);
  }
  async comparePassword(attempt: string): Promise<boolean> {
    return bcrypt.compare(attempt, this.password);
  }
  removePassword(this: User) {
    const userObject = instanceToPlain(this);
    delete userObject['password'];
    return userObject;
  }
}
