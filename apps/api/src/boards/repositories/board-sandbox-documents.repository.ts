import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BoardSandboxDocument } from '../entities';

/** The stored Yjs state of each room's shared React project. */
@Injectable()
export class BoardSandboxDocumentsRepository {
  constructor(
    @InjectRepository(BoardSandboxDocument)
    private readonly documents: Repository<BoardSandboxDocument>,
  ) {}

  async load(boardId: string): Promise<Uint8Array | null> {
    const row = await this.documents.findOne({ where: { boardId } });
    return row ? new Uint8Array(row.state) : null;
  }

  async save(boardId: string, state: Uint8Array): Promise<void> {
    await this.documents.upsert(
      { boardId, state: Buffer.from(state) },
      { conflictPaths: ['boardId'] },
    );
  }

  /**
   * Stores the project's first state unless the room already has one, and
   * says whether it did. Two people starting it at once can't both win.
   */
  async createIfAbsent(boardId: string, state: Uint8Array): Promise<boolean> {
    const inserted: unknown[] = await this.documents.query(
      `INSERT INTO "board_sandbox_documents" ("boardId", "state")
       VALUES ($1, $2)
       ON CONFLICT ("boardId") DO NOTHING
       RETURNING "boardId"`,
      [boardId, Buffer.from(state)],
    );
    return inserted.length > 0;
  }
}
