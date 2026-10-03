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
import {
  BOARD_CODE_LENGTH,
  BOARD_DEFAULT_SEATS,
  BOARD_RETENTION_DAYS,
  BoardLanguage,
} from '../constants/board.constants';

/**
 * A coding board ("room"): the shared editor, whiteboard and chat a squad
 * works in. People find it by its five-character `code`; the uuid never
 * leaves the API.
 */
@Entity({ name: 'boards' })
export class Board {
  @PrimaryGeneratedColumn('uuid', { primaryKeyConstraintName: 'PK_BOARDS' })
  id!: string;

  @Index('UQ_BOARDS_CODE', { unique: true })
  @Column({ type: 'char', length: BOARD_CODE_LENGTH })
  code!: string;

  @Column({ type: 'varchar', length: 80 })
  name!: string;

  /** The language the room opened in; the live choice is in the shared doc. */
  @Column({
    type: 'enum',
    enum: BoardLanguage,
    default: BoardLanguage.CPP,
  })
  language!: BoardLanguage;

  @Column({ type: 'smallint', default: BOARD_DEFAULT_SEATS })
  seats!: number;

  @Index('IDX_BOARDS_HOST')
  @Column({ type: 'uuid' })
  hostId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostId', foreignKeyConstraintName: 'FK_BOARDS_HOST' })
  host!: User;

  /** Set when the host closes the room; closed rooms are read-only history. */
  @Column({ type: 'timestamptz', nullable: true })
  closedAt!: Date | null;

  /**
   * When the room is deleted with everything in it. Set by the database on
   * insert, so every writer (including an older release mid-deploy) gets it.
   * Written the way Postgres reads the default back, so `migration:generate`
   * doesn't see a change that isn't there.
   */
  @Index('IDX_BOARDS_EXPIRES')
  @Column({
    type: 'timestamptz',
    default: () => `(now() + '${BOARD_RETENTION_DAYS} days')`,
  })
  expiresAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
