import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { type Request as ExpressRequest } from 'express';
import { StaffGuard } from '../staff/guards/staff.guard';
import { Public } from '../decorators/guards.decorator';
import { UserRateLimit } from '../decorators/throttler.decorator';
import { CreateChangelogDto } from './dto/create-changelog.dto';
import { QueryChangelogDto } from './dto/query-changelog.dto';
import { UpdateChangelogDto } from './dto/update-changelog.dto';
import { ChangelogService } from './changelog.service';
import {
  ChangelogTag,
  CreateChangelogDocs,
  DeleteChangelogDocs,
  GetChangelogByIdDocs,
  GetChangelogsDocs,
  UpdateChangelogDocs,
} from './swagger/changelog.swagger';

@ChangelogTag
@Controller({ version: '1', path: 'changelog' })
@UseGuards(StaffGuard)
@UserRateLimit()
export class ChangelogController {
  constructor(private readonly changelogService: ChangelogService) {}

  @Public()
  @Get()
  @GetChangelogsDocs
  async findAll(@Query() query: QueryChangelogDto) {
    const result = await this.changelogService.findAll(query);
    return {
      success: true,
      data: result,
      message: 'Changelog entries fetched successfully',
    };
  }

  @Public()
  @Get(':id')
  @GetChangelogByIdDocs
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const entry = await this.changelogService.findOne(id);
    return {
      success: true,
      data: { entry },
      message: 'Changelog entry fetched successfully',
    };
  }
  @Post()
  @CreateChangelogDocs
  async create(
    @Body() dto: CreateChangelogDto,
    @Request() req: ExpressRequest,
  ) {
    const userId = req.user?.id ?? req.staffAuth?.staffId;
    const entry = await this.changelogService.create(userId, dto);
    return {
      success: true,
      data: { entry },
      message: 'Changelog entry created successfully',
    };
  }
  @Put(':id')
  @UpdateChangelogDocs
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChangelogDto,
    @Request() req: ExpressRequest,
  ) {
    const userId = req.user?.id ?? req.staffAuth?.staffId;
    const entry = await this.changelogService.update(userId, id, dto);
    return {
      success: true,
      data: { entry },
      message: 'Changelog entry updated successfully',
    };
  }
  @Delete(':id')
  @DeleteChangelogDocs
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: ExpressRequest,
  ) {
    const userId = req.user?.id ?? req.staffAuth?.staffId;
    await this.changelogService.delete(userId, id);
    return {
      success: true,
      data: null,
      message: 'Changelog entry deleted successfully',
    };
  }
}
