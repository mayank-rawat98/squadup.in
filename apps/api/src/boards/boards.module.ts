import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BoardsController } from './controllers/boards.controller';
import { Board, BoardDocument, BoardMember, BoardMessage } from './entities';
import { BoardsGateway } from './gateways/boards.gateway';
import { BoardDocumentsRepository } from './repositories/board-documents.repository';
import { BoardMessagesRepository } from './repositories/board-messages.repository';
import { BoardsRepository } from './repositories/boards.repository';
import { BoardChatService } from './services/board-chat.service';
import { BoardRoomsService } from './services/board-rooms.service';
import { BoardsService } from './services/boards.service';

/** The coding board (ROADMAP Milestone 5): rooms, members, chat and the shared document. */
@Module({
  imports: [
    TypeOrmModule.forFeature([Board, BoardMember, BoardMessage, BoardDocument]),
  ],
  controllers: [BoardsController],
  providers: [
    BoardsService,
    BoardChatService,
    BoardRoomsService,
    BoardsGateway,
    BoardsRepository,
    BoardMessagesRepository,
    BoardDocumentsRepository,
  ],
})
export class BoardsModule {}
