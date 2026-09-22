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
import { FeatureRequestStatus } from '../feature-flags.constants';
import type { FeatureFlag } from './feature-flag.entity';

@Entity({ name: 'feature_flag_user_access' })
@Index(['featureFlagId', 'userId'], { unique: true })
export class FeatureFlagUserAccess {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  featureFlagId!: string;

  @ManyToOne(
    'FeatureFlag',
    (featureFlag: FeatureFlag) => featureFlag.userAccesses,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'featureFlagId' })
  featureFlag!: FeatureFlag;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({
    type: 'enum',
    enum: FeatureRequestStatus,
    default: FeatureRequestStatus.APPROVED,
  })
  status!: FeatureRequestStatus;

  @Column({ type: 'text', nullable: true })
  requestMessage?: string | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  requestedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  decidedAt?: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
