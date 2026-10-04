import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { SandboxesService } from '../../sandboxes/sandboxes.service';
import {
  type SandboxFiles,
  findSandboxFilesProblem,
} from '../../sandboxes/utils/sandbox-files';
import { BOARD_SOCKET_EVENTS } from '../constants/board-socket.constants';
import type { StartBoardSandboxDto } from '../dto';
import { BoardSandboxDocumentsRepository } from '../repositories/board-sandbox-documents.repository';
import { encodeSandboxDoc } from '../utils/sandbox-doc';
import { BoardRoomsService } from './board-rooms.service';
import { BoardsService } from './boards.service';

/**
 * A room's shared React project. Starting it is the one REST step; after
 * that everyone edits it live over the board socket (`sandbox:*` events).
 */
@Injectable()
export class BoardSandboxService {
  constructor(
    private readonly boards: BoardsService,
    private readonly sandboxes: SandboxesService,
    private readonly documents: BoardSandboxDocumentsRepository,
    private readonly rooms: BoardRoomsService,
  ) {}

  /**
   * Starts the room's project once. Any member may start it; whoever is
   * second is told it exists, so two people can't overwrite each other.
   */
  async start(
    userId: string,
    code: string,
    dto: StartBoardSandboxDto,
  ): Promise<void> {
    const { board } = await this.boards.requireMember(userId, code);
    const files = await this.startingFiles(userId, dto);
    const created = await this.documents.createIfAbsent(
      board.id,
      encodeSandboxDoc(files),
    );
    if (!created) {
      throw new ConflictException(
        'Someone in this room already started a React project. Open it to join in.',
      );
    }
    this.rooms.notify(board.id, BOARD_SOCKET_EVENTS.SANDBOX_READY, {});
  }

  /** Your own sandbox is read through the sandboxes rules, so only the owner can bring it in. */
  private async startingFiles(
    userId: string,
    dto: StartBoardSandboxDto,
  ): Promise<SandboxFiles> {
    if ((dto.sandboxId === undefined) === (dto.files === undefined)) {
      throw new BadRequestException(
        'Start the project from the template or from one of your sandboxes, not both.',
      );
    }
    const files =
      dto.sandboxId !== undefined
        ? (await this.sandboxes.get(userId, dto.sandboxId)).files
        : dto.files;
    const problem = findSandboxFilesProblem(files);
    if (problem) throw new BadRequestException(problem);
    return files as SandboxFiles;
  }
}
