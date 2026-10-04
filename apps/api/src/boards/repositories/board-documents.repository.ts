import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BoardDocument } from '../entities';

/** The stored Yjs state of each board. */
@Injectable()
export class BoardDocumentsRepository {
  constructor(
    @InjectRepository(BoardDocument)
    private readonly documents: Repository<BoardDocument>,
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
}
