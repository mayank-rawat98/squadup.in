import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { type Request as ExpressRequest } from 'express';
import { PermissionsGuard } from '../common/guards/auth.guard';
import { UserRateLimit } from '../decorators/throttler.decorator';
import { QuerySearchDto } from './dto/query-search.dto';
import { SearchService } from './search.service';
import { GlobalSearchDocs } from './swagger/search.swagger';

@Controller({ version: '1', path: 'search' })
@UseGuards(PermissionsGuard)
@UserRateLimit()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @GlobalSearchDocs
  @Get()
  async search(@Query() query: QuerySearchDto, @Request() req: ExpressRequest) {
    const result = await this.searchService.search(query, req.user);
    return {
      success: true,
      data: result,
      message: 'Search results fetched successfully',
    };
  }
}
