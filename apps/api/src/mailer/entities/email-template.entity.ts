import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EMAIL_AUDIENCE } from '../constants/mailer.constants';

/**
 * Maps one application email functionality to the mailtr template that renders
 * it. Templates no longer live in this repo — mailtr owns the markup and the
 * subject line; we only send `templateId` + `variables`.
 *
 * The natural key is (emailType, audience): a single functionality can mail
 * both the customer and the ops inbox with different templates.
 */
@Entity({ name: 'email_templates' })
@Index('UQ_EMAIL_TEMPLATE_TYPE_AUDIENCE', ['emailType', 'audience'], {
  unique: true,
})
export class EmailTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * A value from EMAIL_TYPE_ENUM or FOLLOW_UP_EMAIL_TYPE. Stored as plain text
   * rather than a PG enum so adding a new email type is a code change plus a
   * row, with no migration.
   */
  @Column({ type: 'varchar', length: 64 })
  emailType!: string;

  @Column({ type: 'varchar', length: 16, default: EMAIL_AUDIENCE.USER })
  audience!: EMAIL_AUDIENCE;

  /** The mailtr template identifier, e.g. `tpl_aB3xK9mZ`. */
  @Column({ type: 'varchar', length: 128, nullable: true })
  templateId!: string | null;

  /** Human label for the ops dashboard; seeded from EMAIL_TEMPLATE_CATALOGUE. */
  @Column({ type: 'varchar', length: 160, nullable: true })
  label!: string | null;

  /**
   * Optional per-template sender override. When null the mailtr account default
   * (MAILTR_FROM_EMAIL) is used.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  fromEmail!: string | null;

  /**
   * Set false to suppress this email entirely without clearing its templateId —
   * sends resolve to "not configured" and the caller's failure path runs.
   */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
