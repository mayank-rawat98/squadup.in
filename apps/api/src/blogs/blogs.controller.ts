import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicRateLimit } from '../decorators/throttler.decorator';
import { toBlogDetail, toBlogRow } from './blog.presenter';
import { BlogsService } from './blogs.service';
import { ListBlogsDto } from './dto/list-blogs.dto';

/**
 * Public, read-only blog routes for the marketing site. Only PUBLISHED posts
 * are reachable; authoring lives in the staff-guarded admin-ops controller.
 */
@Controller({ version: '1', path: 'blogs' })
@ApiTags('blogs')
@PublicRateLimit()
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Get()
  async list(@Query() query: ListBlogsDto) {
    const result = await this.blogsService.listPublished(query);
    return {
      success: true,
      data: { items: result.blogs.map(toBlogRow) },
      currentPage: result.currentPage,
      itemsPerPage: result.itemsPerPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
      message: 'Blogs fetched successfully',
    };
  }

  @Get(':slug')
  async getBySlug(@Param('slug') slug: string) {
    const { blog, related } = await this.blogsService.getPublishedBySlug(slug);
    return {
      success: true,
      data: { blog: toBlogDetail(blog), related: related.map(toBlogRow) },
      message: 'Blog fetched successfully',
    };
  }
}
