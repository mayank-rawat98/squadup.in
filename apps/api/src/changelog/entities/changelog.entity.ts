import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { ChangeType, ReleaseType } from '../dto/create-changelog.dto';

export interface ChangeItem {
  type: ChangeType;
  text: string;
}

@Entity({ name: 'changelogs' })
export class Changelog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  version!: string;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'jsonb', default: [] })
  changes!: ChangeItem[];

  @Column({ type: 'varchar', length: 10, default: 'minor' })
  releaseType!: ReleaseType;

  @Column({ type: 'boolean', default: false })
  isMajor!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
