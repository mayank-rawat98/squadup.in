import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { BoardRole } from '../constants/board.constants';
import { Board } from './board.entity';

/** Someone who has joined a board. Membership is what grants access to it. */
@Entity({ name: 'board_members' })
@Index('UQ_BOARD_MEMBERS_BOARD_USER', ['boardId', 'userId'], { unique: true })
@Index('IDX_BOARD_MEMBERS_USER_JOINED', ['userId', 'joinedAt'])
export class BoardMember {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_BOARD_MEMBERS',
  })
  id!: string;

  @Column({ type: 'uuid' })
  boardId!: string;

  @ManyToOne(() => Board, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'boardId',
    foreignKeyConstraintName: 'FK_BOARD_MEMBERS_BOARD',
  })
  board!: Board;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'userId',
    foreignKeyConstraintName: 'FK_BOARD_MEMBERS_USER',
  })
  user!: User;

  @Column({
    type: 'enum',
    enum: BoardRole,
    default: BoardRole.MEMBER,
  })
  role!: BoardRole;

  @CreateDateColumn({ type: 'timestamptz' })
  joinedAt!: Date;
}
