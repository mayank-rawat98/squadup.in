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
 * A room's shared React project, stored the same way as the board's own
 * document: one encoded Yjs state. Kept apart from `board_documents` so the
 * project loads only for people who open it and is gated by its own flag.
 * No row means nobody has started the project yet.
 */
@Entity({ name: 'board_sandbox_documents' })
export class BoardSandboxDocument {
  @PrimaryColumn({
    type: 'uuid',
    primaryKeyConstraintName: 'PK_BOARD_SANDBOX_DOCUMENTS',
  })
  boardId!: string;

  @OneToOne(() => Board, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'boardId',
    foreignKeyConstraintName: 'FK_BOARD_SANDBOX_DOCUMENTS_BOARD',
  })
  board!: Board;

  @Column({ type: 'bytea' })
  state!: Buffer;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
