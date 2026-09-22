import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { FeatureFlagUserAccess } from './feature-flag-user-access.entity';

/**
 * A feature flag. Who can use it is decided in this order:
 *
 *   1. `enabled` is the kill switch — off means off for everyone.
 *   2. A decided per-user row (granted or denied by ops, or an approved /
 *      rejected request) wins for that user.
 *   3. Otherwise `rolloutToAll` decides: on is everyone, off is nobody.
 *
 * `isExperimental` only controls discoverability: experimental flags are listed
 * to users, who can request access to them.
 */
@Entity({ name: 'feature_flags' })
export class FeatureFlag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  key!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ type: 'boolean', default: false })
  isExperimental!: boolean;

  @Column({ type: 'boolean', default: false })
  rolloutToAll!: boolean;

  @OneToMany(
    'FeatureFlagUserAccess',
    (access: FeatureFlagUserAccess) => access.featureFlag,
    {
      cascade: true,
    },
  )
  userAccesses?: FeatureFlagUserAccess[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
