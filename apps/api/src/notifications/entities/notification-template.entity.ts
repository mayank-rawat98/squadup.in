import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NotificationCategory } from '../constants';

@Entity({ name: 'notification_templates' })
@Index('IDX_TEMPLATE_CODE', ['code'], { unique: true })
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: NotificationCategory })
  category!: NotificationCategory;

  /** Template string for the notification title (supports {{variable}} syntax) */
  @Column({ type: 'text', nullable: true })
  titleTemplate?: string;

  /** Template string for the notification message body */
  @Column({ type: 'text', nullable: true })
  messageTemplate?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  icon?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color?: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
