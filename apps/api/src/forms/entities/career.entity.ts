import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CareerStatus {
  NEW = 'new',
  IN_PROGRESS = 'inProgress',
  RESOLVED = 'resolved',
  NEED_MORE_INFO = 'needMoreInfo',
  CLOSED = 'closed',
}

@Entity('career')
export class Career {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, unique: true })
  ticketId!: string;

  @Column({ type: 'varchar', length: 120 })
  fullName!: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar' })
  description!: string;

  @Column({ type: 'varchar', length: 120 })
  socialLinks!: string;

  @Column({
    type: 'enum',
    enum: CareerStatus,
    default: CareerStatus.NEW,
  })
  status!: CareerStatus;

  @Column({ type: 'varchar', length: 120, nullable: true })
  assignedTo?: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ type: 'varchar', length: 30, nullable: true })
  summary?: string;
}
