import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SandboxesModule } from '../sandboxes/sandboxes.module';
import { BoardsController } from './controllers/boards.controller';
import {
  Board,
  BoardDocument,
  BoardMember,
  BoardMessage,
  BoardSandboxDocument,
} from './entities';
import { BoardsGateway } from './gateways/boards.gateway';
import { BoardDocumentsRepository } from './repositories/board-documents.repository';
import { BoardMessagesRepository } from './repositories/board-messages.repository';
import { BoardSandboxDocumentsRepository } from './repositories/board-sandbox-documents.repository';
import { BoardsRepository } from './repositories/boards.repository';
import { BoardChatService } from './services/board-chat.service';
import { BoardExpiryService } from './services/board-expiry.service';
import { BoardRoomsService } from './services/board-rooms.service';
import { BoardSandboxService } from './services/board-sandbox.service';
import { BoardsService } from './services/boards.service';

/**
 * The coding board (ROADMAP Milestone 5): rooms, members, chat, the shared
 * document and the room's shared React project.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Board,
      BoardMember,
      BoardMessage,
      BoardDocument,
      BoardSandboxDocument,
    ]),
    SandboxesModule,
  ],
  controllers: [BoardsController],
  providers: [
    BoardsService,
    BoardChatService,
    BoardExpiryService,
    BoardRoomsService,
    BoardSandboxService,
    BoardsGateway,
    BoardsRepository,
    BoardMessagesRepository,
    BoardDocumentsRepository,
    BoardSandboxDocumentsRepository,
  ],
})
export class BoardsModule {}
