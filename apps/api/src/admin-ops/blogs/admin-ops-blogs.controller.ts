import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type Request as ExpressRequest } from 'express';
import { CreateBlogDto } from '../../blogs/dto/create-blog.dto';
import { ListBlogsDto } from '../../blogs/dto/list-blogs.dto';
import { ScheduleBlogDto } from '../../blogs/dto/schedule-blog.dto';
import { UpdateBlogDto } from '../../blogs/dto/update-blog.dto';
import { BlogsService } from '../../blogs/blogs.service';
import { toBlogDetail, toBlogRow } from '../../blogs/blog.presenter';
import { UploadFileInterceptor } from '../../common/interceptors/upload.interceptor';
import { StaffGuard } from '../../staff/guards/staff.guard';
import {
  UploadRateLimit,
  UserRateLimit,
} from '../../decorators/throttler.decorator';
import { AdminOpsBlogsService } from './admin-ops-blogs.service';

/**
 * Admin-ops Blog Management. Every ops-dashboard blog call routes through here;
 * authorization is the staff realm's `StaffGuard`, applied once at the
 * controller level.
 *
 * NOTE: static segments (`stats`, `upload-image`) are declared before the
 * `:id` routes so Nest matches them ahead of the param route.
 */
@Controller({ version: '1', path: 'admin-ops/blogs' })
@ApiTags('admin-ops')
@UseGuards(StaffGuard)
@UserRateLimit()
export class AdminOpsBlogsController {
  constructor(
    private readonly blogsService: BlogsService,
    private readonly adminOpsBlogsService: AdminOpsBlogsService,
  ) {}

  @Get()
  async list(@Query() query: ListBlogsDto) {
    const result = await this.blogsService.list(query);
    return {
      success: true,
      data: {
        items: result.blogs.map(toBlogRow),
      },
      currentPage: result.currentPage,
      itemsPerPage: result.itemsPerPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
      message: 'Blogs fetched successfully',
    };
  }

  @Get('stats')
  async getStats() {
    return {
      success: true,
      data: await this.blogsService.getStats(),
      message: 'Blog stats fetched successfully',
    };
  }

  @Post('upload-image')
  @UploadRateLimit()
  @UseInterceptors(UploadFileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    return {
      success: true,
      data: await this.adminOpsBlogsService.uploadImage(file),
      message: 'Image uploaded successfully',
    };
  }

  @Get(':id')
  async getBlog(@Param('id', ParseUUIDPipe) id: string) {
    const { blog, related } = await this.blogsService.getById(id);
    return {
      success: true,
      data: {
        blog: toBlogDetail(blog),
        related: related.map(toBlogRow),
      },
      message: 'Blog fetched successfully',
    };
  }

  @Post()
  async create(@Body() dto: CreateBlogDto, @Request() req: ExpressRequest) {
    const blog = await this.blogsService.create(dto, req.staffAuth?.staffId);
    return {
      success: true,
      data: toBlogDetail(blog),
      message: 'Blog created successfully',
    };
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlogDto,
  ) {
    const blog = await this.blogsService.update(id, dto);
    return {
      success: true,
      data: toBlogDetail(blog),
      message: 'Blog updated successfully',
    };
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  async publish(@Param('id', ParseUUIDPipe) id: string) {
    const blog = await this.blogsService.publish(id);
    return {
      success: true,
      data: toBlogDetail(blog),
      message: 'Blog published successfully',
    };
  }

  @Post(':id/schedule')
  @HttpCode(HttpStatus.OK)
  async schedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleBlogDto,
  ) {
    const blog = await this.blogsService.schedule(id, dto.scheduledAt);
    return {
      success: true,
      data: toBlogDetail(blog),
      message: 'Blog scheduled successfully',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.blogsService.remove(id);
    return {
      success: true,
      data: { id },
      message: 'Blog deleted successfully',
    };
  }
}
