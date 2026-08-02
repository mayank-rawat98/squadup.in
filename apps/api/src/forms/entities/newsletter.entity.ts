import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('newsletters')
export class Newsletter {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  name?: string;

  @Column({ type: 'boolean', default: true })
  subscribed!: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  source?: string;

  @Column({ type: 'boolean', default: false })
  consentGiven!: boolean;

  // optional tags or segmentation metadata
  @Column({ type: 'json', nullable: true })
  tags?: string[];

  // token used for unsubscribe links / verification — unique externally visible key
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, unique: true })
  unsubscribeToken!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  unsubscribedAt?: Date | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  summary?: string;
}
