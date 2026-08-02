import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EmailQueueStatus } from '../constants';

@Entity({ name: 'notification_email_queue' })
@Index('IDX_EMAIL_QUEUE_STATUS_ATTEMPTS', ['status', 'attempts'])
@Index('IDX_EMAIL_QUEUE_SCHEDULED', ['scheduledFor'])
export class EmailQueue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  notificationId!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 500 })
  subject!: string;

  @Column({ type: 'varchar', length: 100, default: 'notification' })
  template!: string;

  @Column({ type: 'jsonb', nullable: true })
  variables?: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: EmailQueueStatus,
    default: EmailQueueStatus.PENDING,
  })
  status!: EmailQueueStatus;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'text', nullable: true })
  lastError?: string;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt?: Date;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  scheduledFor!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
