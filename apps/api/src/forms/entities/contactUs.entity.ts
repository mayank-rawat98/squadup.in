import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ContactStatus {
  NEW = 'new',
  IN_PROGRESS = 'inProgress',
  RESOLVED = 'resolved',
  NEED_MORE_INFO = 'needMoreInfo',
  CLOSED = 'closed',
}
export enum InquiryType {
  GENERAL = 'general',
  SUPPORT = 'support',
  SALES = 'sales',
  PARTNERSHIP = 'partnership',
}

@Entity('contact_us')
export class ContactUs {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, unique: true })
  ticketId!: string;

  @Column({ type: 'varchar', length: 120 })
  firstName!: string;

  @Column({ type: 'varchar', length: 120 })
  lastName!: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  company?: string;

  @Column({ type: 'enum', enum: InquiryType, default: InquiryType.GENERAL })
  inquiryType!: InquiryType;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  assignedTo?: string;

  @Column({
    type: 'enum',
    enum: ContactStatus,
    default: ContactStatus.NEW,
  })
  status!: ContactStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ type: 'varchar', length: 30, nullable: true })
  summary?: string;
}
