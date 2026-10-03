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
import { Board } from './board.entity';

/** One chat message in a board, kept with the board. */
@Entity({ name: 'board_messages' })
@Index('IDX_BOARD_MESSAGES_BOARD_CREATED', ['boardId', 'createdAt'])
export class BoardMessage {
  @PrimaryGeneratedColumn('uuid', {
    primaryKeyConstraintName: 'PK_BOARD_MESSAGES',
  })
  id!: string;

  @Column({ type: 'uuid' })
  boardId!: string;

  @ManyToOne(() => Board, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'boardId',
    foreignKeyConstraintName: 'FK_BOARD_MESSAGES_BOARD',
  })
  board!: Board;

  @Column({ type: 'uuid' })
  authorId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'authorId',
    foreignKeyConstraintName: 'FK_BOARD_MESSAGES_AUTHOR',
  })
  author!: User;

  @Column({ type: 'varchar', length: 2000 })
  body!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
