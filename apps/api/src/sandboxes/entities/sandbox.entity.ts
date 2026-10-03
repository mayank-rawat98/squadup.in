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
import { User } from '../../users/entities/user.entity';
import { SANDBOX_NAME_MAX_LENGTH } from '../constants/sandbox.constants';
import type { SandboxFiles } from '../utils/sandbox-files';

/**
 * A React + TypeScript project a person keeps in the sandbox. The browser
 * compiles and runs it; the API only stores its files, which are small
 * enough (SANDBOX_MAX_TOTAL_BYTES) to save whole on every change.
 */
@Entity({ name: 'sandboxes' })
@Index('IDX_SANDBOXES_OWNER_UPDATED', ['ownerId', 'updatedAt'])
export class Sandbox {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_SANDBOXES' })
  id!: string;

  @Column({ type: 'uuid' })
  ownerId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'ownerId',
    foreignKeyConstraintName: 'FK_SANDBOXES_OWNER',
  })
  owner!: User;

  @Column({ type: 'varchar', length: SANDBOX_NAME_MAX_LENGTH })
  name!: string;

  /** Absolute path (`/src/App.tsx`) to source text. */
  @Column({ type: 'jsonb' })
  files!: SandboxFiles;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
