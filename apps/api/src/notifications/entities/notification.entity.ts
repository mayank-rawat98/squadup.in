import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  NotificationCategory,
  NotificationEntityType,
  NotificationPriority,
} from '../constants';
import type { NotificationReceiver } from './notification-receiver.entity';

@Entity({ name: 'notifications' })
@Index('IDX_NOTIFICATION_CATEGORY_CREATED', ['category', 'createdAt'])
@Index('IDX_NOTIFICATION_ENTITY', ['entityType', 'entityId'])
@Index('IDX_NOTIFICATION_IDEMPOTENCY_KEY', ['idempotencyKey'], {
  unique: true,
  where: '"idempotencyKey" IS NOT NULL',
})
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  templateCode?: string;

  @Column({ type: 'enum', enum: NotificationCategory })
  category!: NotificationCategory;

  @Column({ type: 'uuid', nullable: true })
  actorId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  actorName?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  actorAvatar?: string;

  @Column({
    type: 'enum',
    enum: NotificationEntityType,
    nullable: true,
  })
  entityType?: NotificationEntityType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  entityId?: string;

  @Column({ type: 'varchar', length: 500 })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'jsonb', nullable: true })
  data?: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  priority!: NotificationPriority;

  @Column({ type: 'boolean', default: false })
  requiresAction!: boolean;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  actionUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  idempotencyKey?: string;

  @OneToMany('NotificationReceiver', 'notification', {
    cascade: true,
  })
  receivers!: NotificationReceiver[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
