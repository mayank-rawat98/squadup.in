import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { PermissionsGuard } from '../common/guards/auth.guard';
import {
  FormRateLimit,
  UserRateLimit,
} from '../decorators/throttler.decorator';
import {
  CreateSandboxDto,
  ListSandboxesDto,
  SandboxIdDto,
  UpdateSandboxDto,
} from './dto';
import { toSandboxDetail, toSandboxSummary } from './sandboxes.presenter';
import { SandboxesService } from './sandboxes.service';

/**
 * The signed-in user's React sandboxes. The browser bundles and runs the
 * code; these routes only keep the project files.
 */
@ApiTags('sandboxes')
@ApiBearerAuth('JWT-auth')
@Controller({ version: '1', path: 'sandboxes' })
@UseGuards(PermissionsGuard)
@UserRateLimit()
export class SandboxesController {
  constructor(private readonly sandboxes: SandboxesService) {}

  @Post()
  @FormRateLimit()
  @ApiOperation({ summary: 'Start a sandbox from a set of files' })
  async create(@Request() req: ExpressRequest, @Body() dto: CreateSandboxDto) {
    const sandbox = await this.sandboxes.create(req.auth.userId, dto);
    return {
      success: true,
      data: toSandboxDetail(sandbox),
      message: 'Sandbox created',
    };
  }

  @Get()
  @ApiOperation({ summary: 'Your sandboxes, most recently saved first' })
  async list(@Request() req: ExpressRequest, @Query() query: ListSandboxesDto) {
    const result = await this.sandboxes.listForOwner(req.auth.userId, query);
    return {
      success: true,
      data: result.items.map(toSandboxSummary),
      currentPage: result.page,
      itemsPerPage: result.limit,
      totalItems: result.total,
      totalPages: result.totalPages,
      message: 'Sandboxes fetched successfully',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Open one of your sandboxes with its files' })
  async get(@Request() req: ExpressRequest, @Param() params: SandboxIdDto) {
    const sandbox = await this.sandboxes.get(req.auth.userId, params.id);
    return {
      success: true,
      data: toSandboxDetail(sandbox),
      message: 'Sandbox fetched successfully',
    };
  }

  /** The editor autosaves through this, a second or so after typing stops. */
  @Patch(':id')
  @ApiOperation({ summary: 'Rename a sandbox or save its files' })
  async update(
    @Request() req: ExpressRequest,
    @Param() params: SandboxIdDto,
    @Body() dto: UpdateSandboxDto,
  ) {
    const sandbox = await this.sandboxes.update(
      req.auth.userId,
      params.id,
      dto,
    );
    return {
      success: true,
      data: toSandboxSummary(sandbox),
      message: 'Sandbox saved',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete one of your sandboxes' })
  async delete(@Request() req: ExpressRequest, @Param() params: SandboxIdDto) {
    await this.sandboxes.delete(req.auth.userId, params.id);
    return { success: true, data: null, message: 'Sandbox deleted' };
  }
}
