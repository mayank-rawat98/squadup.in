import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { PermissionsGuard } from '../../common/guards/auth.guard';
import {
  FormRateLimit,
  UserRateLimit,
} from '../../decorators/throttler.decorator';
import {
  toBoardDetail,
  toBoardMessage,
  toBoardSummary,
} from '../boards.presenter';
import { BoardCodeDto, CreateBoardDto, ListBoardPageDto } from '../dto';
import { BoardChatService } from '../services/board-chat.service';
import { BoardsService } from '../services/boards.service';

/**
 * Coding board rooms for the signed-in user. Live editing, presence and chat
 * sending happen over the `/boards` socket (BoardsGateway); these routes
 * create and join rooms and load what a room needs to open.
 */
@ApiTags('boards')
@ApiBearerAuth('JWT-auth')
@Controller({ version: '1', path: 'boards' })
@UseGuards(PermissionsGuard)
@UserRateLimit()
export class BoardsController {
  constructor(
    private readonly boards: BoardsService,
    private readonly chat: BoardChatService,
  ) {}

  @Post()
  @FormRateLimit()
  @ApiOperation({ summary: 'Create a room; you become its host' })
  async create(@Request() req: ExpressRequest, @Body() dto: CreateBoardDto) {
    const { board, membership, members } = await this.boards.create(
      req.auth.userId,
      dto,
    );
    return {
      success: true,
      data: toBoardDetail(board, membership, members),
      message: 'Room created',
    };
  }

  /** Rate-limited hard: room codes are short, so joining must not be a guessing game. */
  @Post('join')
  @FormRateLimit()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join a room by its room ID' })
  async join(@Request() req: ExpressRequest, @Body() dto: BoardCodeDto) {
    const { board, membership, members } = await this.boards.join(
      req.auth.userId,
      dto.code,
    );
    return {
      success: true,
      data: toBoardDetail(board, membership, members),
      message: `Joined ${board.name}`,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Rooms you have joined, most recent first' })
  async list(@Request() req: ExpressRequest, @Query() query: ListBoardPageDto) {
    const result = await this.boards.listForUser(req.auth.userId, query);
    return {
      success: true,
      data: result.items.map((m) => toBoardSummary(m.board, m)),
      currentPage: result.page,
      itemsPerPage: result.limit,
      totalItems: result.total,
      totalPages: result.totalPages,
      message: 'Rooms fetched successfully',
    };
  }

  @Get(':code')
  @ApiOperation({ summary: 'Open a room you are in' })
  async get(@Request() req: ExpressRequest, @Param() params: BoardCodeDto) {
    const { board, membership, members } = await this.boards.open(
      req.auth.userId,
      params.code,
    );
    return {
      success: true,
      data: toBoardDetail(board, membership, members),
      message: 'Room fetched successfully',
    };
  }

  @Get(':code/messages')
  @ApiOperation({ summary: "A room's chat, newest first" })
  async messages(
    @Request() req: ExpressRequest,
    @Param() params: BoardCodeDto,
    @Query() query: ListBoardPageDto,
  ) {
    const { board } = await this.boards.requireMember(
      req.auth.userId,
      params.code,
    );
    const result = await this.chat.history(board.id, query);
    return {
      success: true,
      data: result.items.map(toBoardMessage),
      currentPage: result.page,
      itemsPerPage: result.limit,
      totalItems: result.total,
      totalPages: result.totalPages,
      message: 'Messages fetched successfully',
    };
  }
}
