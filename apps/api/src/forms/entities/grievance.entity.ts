import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum GrievanceStatus {
  NEW = 'new',
  IN_PROGRESS = 'inProgress',
  RESOLVED = 'resolved',
  NEED_MORE_INFO = 'needMoreInfo',
  CLOSED = 'closed',
}

export enum GrievancePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum GrievanceType {
  PRIVACY = 'privacy',
  CONTENT = 'content',
  OTHER = 'other',
}
@Entity('grievances')
export class Grievance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, unique: true })
  ticketId!: string;

  @Column({ type: 'enum', enum: GrievanceType, default: GrievanceType.OTHER })
  grievanceType!: GrievanceType;

  @Column({ type: 'varchar', length: 255 })
  subject!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 120 })
  fullName!: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  assignedTo?: string;

  @Column({
    type: 'enum',
    enum: GrievanceStatus,
    default: GrievanceStatus.NEW,
  })
  status!: GrievanceStatus;

  @Column({
    type: 'enum',
    enum: GrievancePriority,
    default: GrievancePriority.MEDIUM,
  })
  priority!: GrievancePriority;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt?: Date;

  @Column({ type: 'varchar', length: 30, nullable: true })
  summary?: string;
}
