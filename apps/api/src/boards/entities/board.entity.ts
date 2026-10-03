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

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
