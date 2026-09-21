import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

/**
 * Per-page completion state. `completed` and `skipped` are the only durable
 * facts the server tracks. Transient UI state (currentStepIndex, isRunning)
 * lives client-side only.
 */
export interface TourPageState {
  completed: boolean;
  skipped: boolean;
}

export type TourPages = Record<string, TourPageState>;

/**
 * Server-primary persistence for the in-app guide tour. One row per user;
 * lazily created on first GET. `pages` is a jsonb map keyed by tour page key
 * (one per screen that has a guided tour).
 */
@Entity({ name: 'user_tour_state' })
export class UserTourState {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'jsonb', default: {} })
  pages!: TourPages;

  @Column({ type: 'boolean', default: false })
  hasSeenIntroModal!: boolean;

  @Column({ type: 'boolean', default: false })
  hasOptedOutOfTours!: boolean;

  /**
   * Ids of the one-time "what's new" announcements this user has dismissed.
   * An id absent from the list is still unseen, so a newly shipped announcement
   * surfaces for everyone without a backfill. Kept here rather than in its own
   * table because it is the same question the tour flags answer — "has this
   * user been shown X?" — and it rides the /tour fetch the app already makes.
   */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  seenAnnouncements!: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
