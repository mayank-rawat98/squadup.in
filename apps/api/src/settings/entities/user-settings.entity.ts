import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

// ── Enums ───────────────────────────────────────

export enum TwoFactorMethod {
  AUTHENTICATOR = 'authenticator',
  EMAIL = 'email',
  PHONE = 'phone',
  PASSKEY = 'passkey',
  BACKUP_CODE = 'backupCode',
}

export enum TwoFactorPreference {
  PASSKEY = 0,
  AUTHENTICATOR = 1,
  EMAIL = 2,
  PHONE = 3,
  BACKUP_CODE = 99,
}

/**
 * Currency / Timezone / Language are admin-managed reference data —
 * see apps/api/src/reference-data/. Stored here as plain string codes
 * (ISO-4217, IANA, BCP-47). Validation happens in GeneralSettingsService.
 */

export enum DateFormat {
  MM_DD_YYYY = 'MM/DD/YYYY',
  DD_MM_YYYY = 'DD/MM/YYYY',
  YYYY_MM_DD = 'YYYY-MM-DD',
  DD_MON_YYYY = 'DD-Mon-YYYY',
}

// ── 2FA Embedded Classes ────────────────────────

export class TwoFactorAuthenticator {
  @Column({ default: false })
  enabled!: boolean;

  /** AES-256-GCM encrypted TOTP secret */
  @Column({ type: 'varchar', nullable: true, select: false })
  secret?: string | null;

  /** SHA-256 hashed backup codes stored as JSON array */
  @Column({ type: 'jsonb', nullable: true, select: false })
  backupCodes?: string[] | null;

  @Column({
    type: 'smallint',
    default: TwoFactorPreference.AUTHENTICATOR,
  })
  preference!: number;
}

export class TwoFactorEmail {
  @Column({ default: false })
  enabled!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date | null;

  @Column({
    type: 'smallint',
    default: TwoFactorPreference.EMAIL,
  })
  preference!: number;
}

export class TwoFactorPhone {
  @Column({ default: false })
  enabled!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date | null;

  @Column({
    type: 'smallint',
    default: TwoFactorPreference.PHONE,
  })
  preference!: number;
}

export class TwoFactorPasskey {
  @Column({ default: false })
  enabled!: boolean;

  @Column({
    type: 'smallint',
    default: TwoFactorPreference.PASSKEY,
  })
  preference!: number;
}

/**
 * Account-level 2FA recovery codes. Method-agnostic (decoupled from the
 * authenticator) so a passkey can be a user's sole 2FA factor and still be
 * recoverable. See TwoFactorRecoveryService.
 */
export class TwoFactorRecovery {
  /** SHA-256 hashed recovery codes stored as JSON array */
  @Column({ type: 'jsonb', nullable: true, select: false })
  backupCodes?: string[] | null;
}

export class TwoFactorSettings {
  @Column(() => TwoFactorAuthenticator, { prefix: 'authenticator' })
  authenticator!: TwoFactorAuthenticator;

  @Column(() => TwoFactorEmail, { prefix: 'email' })
  email!: TwoFactorEmail;

  @Column(() => TwoFactorPhone, { prefix: 'phone' })
  phone!: TwoFactorPhone;

  @Column(() => TwoFactorPasskey, { prefix: 'passkey' })
  passkey!: TwoFactorPasskey;

  @Column(() => TwoFactorRecovery, { prefix: 'recovery' })
  recovery!: TwoFactorRecovery;
}

// ── Entity ──────────────────────────────────────

@Entity({ name: 'user_settings' })
export class UserSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => User, (user) => user.settings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  // ── Two-Factor Authentication ───────────────────

  @Column(() => TwoFactorSettings, { prefix: '' })
  twoFactor!: TwoFactorSettings;

  // ── Regional / Locale ───────────────────────────

  @Column({ type: 'varchar', length: 8, default: 'INR' })
  currency!: string;

  @Column({ type: 'varchar', length: 64, default: 'Asia/Kolkata' })
  timezone!: string;

  @Column({ type: 'enum', enum: DateFormat, default: DateFormat.MM_DD_YYYY })
  dateFormat!: DateFormat;

  @Column({ type: 'varchar', length: 16, default: 'en' })
  language!: string;

  // ── User Preferences ────────────────────────────

  @Column({ default: false })
  isPublicProfile!: boolean;

  // ── Timestamps ──────────────────────────────────

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
