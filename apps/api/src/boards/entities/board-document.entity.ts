import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Board } from './board.entity';

/**
 * The board's shared Yjs document (code in every language, the whiteboard),
 * stored as one encoded state update. The gateway loads it when the first
 * person opens the room and writes it back as edits arrive.
 */
@Entity({ name: 'board_documents' })
export class BoardDocument {
  @PrimaryColumn({
    type: 'uuid',
    primaryKeyConstraintName: 'PK_BOARD_DOCUMENTS',
  })
  boardId!: string;

  @OneToOne(() => Board, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'boardId',
    foreignKeyConstraintName: 'FK_BOARD_DOCUMENTS_BOARD',
  })
  board!: Board;

  @Column({ type: 'bytea' })
  state!: Buffer;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
