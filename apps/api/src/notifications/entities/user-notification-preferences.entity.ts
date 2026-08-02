import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'user_notification_preferences' })
@Index('IDX_PREFERENCES_USER', ['userId'], { unique: true })
export class UserNotificationPreferences {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  userId!: string;

  /** Global channel toggles */
  @Column({
    type: 'jsonb',
    default: () => `'{"inApp": true, "email": true, "sms": false}'`,
  })
  channels!: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
  };

  /**
   * Per-category preferences
   * e.g. { "JOB": { "enabled": true, "channels": { "inApp": true, "email": true } } }
   */
  @Column({ type: 'jsonb', nullable: true })
  categories?: Record<
    string,
    {
      enabled: boolean;
      channels: { inApp: boolean; email: boolean };
    }
  >;

  /** Quiet hours configuration */
  @Column({
    type: 'jsonb',
    default: () =>
      `'{"enabled": false, "startTime": "22:00", "endTime": "08:00"}'`,
  })
  quietHours!: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };

  /** Email batching preferences */
  @Column({
    type: 'jsonb',
    default: () => `'{"enabled": false, "frequency": "daily"}'`,
  })
  emailBatching!: {
    enabled: boolean;
    frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  };

  /** Categories the user has explicitly unsubscribed from */
  @Column({ type: 'text', array: true, default: () => `'{}'` })
  unsubscribedCategories!: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
