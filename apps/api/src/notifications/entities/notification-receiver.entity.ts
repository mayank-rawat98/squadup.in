import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DeliveryStatus } from '../constants';
import type { Notification } from './notification.entity';

@Entity({ name: 'notification_receivers' })
@Index('IDX_RECEIVER_USER_READ_CREATED', ['userId', 'isRead', 'createdAt'])
@Index('IDX_RECEIVER_NOTIFICATION', ['notificationId'])
@Index('IDX_RECEIVER_USER_DELETED', ['userId', 'isDeleted'])
export class NotificationReceiver {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  notificationId!: string;

  @ManyToOne('Notification', 'receivers', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'notificationId' })
  notification!: Notification;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'boolean', default: false })
  isRead!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  readAt?: Date;

  @Column({ type: 'boolean', default: false })
  isDeleted!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
  })
  deliveryStatus!: DeliveryStatus;

  @Column({ type: 'int', default: 0 })
  deliveryAttempts!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
