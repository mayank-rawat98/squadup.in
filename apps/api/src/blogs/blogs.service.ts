import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreateBlogDto, BlogSaveStatus } from './dto/create-blog.dto';
import { ListBlogsDto } from './dto/list-blogs.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { BlogsRepository } from './blogs.repository';
import { BlogPost, BlogStatus } from './entities/blog-post.entity';

const RELATED_LIMIT = 3;
const WORDS_PER_MINUTE = 200;

@Injectable()
export class BlogsService {
  private readonly logger = new Logger(BlogsService.name);

  constructor(private readonly blogsRepository: BlogsRepository) {}

  async list(filters: ListBlogsDto) {
    const result = await this.blogsRepository.findAllPaginated(filters);
    return {
      blogs: result.items,
      totalItems: result.total,
      totalPages: result.totalPages,
      currentPage: result.page,
      itemsPerPage: result.limit,
    };
  }

  getStats() {
    return this.blogsRepository.getStats();
  }

  /**
   * The public blog index. Status is pinned to PUBLISHED here rather than
   * trusted from the query, so a caller can never page through drafts.
   */
  listPublished(filters: ListBlogsDto) {
    return this.list({ ...filters, status: BlogStatus.PUBLISHED });
  }

  /**
   * One live post for a reader, by slug, counting the view. A draft or
   * scheduled post answers 404 exactly like a missing one, so the public API
   * never reveals what is in the pipeline.
   */
  async getPublishedBySlug(slug: string) {
    const blog = await this.blogsRepository.findPublishedBySlug(slug);
    if (!blog) {
      throw new NotFoundException('Blog post not found');
    }
    await this.blogsRepository.incrementViews(blog.id);
    blog.views += 1;
    const related = await this.blogsRepository.findRelatedByAuthor(
      blog.author,
      blog.id,
      RELATED_LIMIT,
    );
    return { blog, related };
  }

  /**
   * Full post for the view/edit screens. `incrementView` bumps the view counter
   * (used by the read-only Blog View, not by the edit screen).
   */
  async getById(id: string, incrementView = false) {
    const blog = await this.blogsRepository.findById(id);
    if (!blog) {
      throw new NotFoundException('Blog post not found');
    }
    if (incrementView) {
      await this.blogsRepository.incrementViews(id);
      blog.views += 1;
    }
    const related = await this.blogsRepository.findRelatedByAuthor(
      blog.author,
      blog.id,
      RELATED_LIMIT,
    );
    return { blog, related };
  }

  async create(dto: CreateBlogDto, createdById?: string): Promise<BlogPost> {
    const status = (dto.status ??
      BlogSaveStatus.DRAFT) as unknown as BlogStatus;
    const content = dto.content ?? '';
    const { scheduledAt, publishedAt } = this.resolveTimestamps(
      status,
      dto.scheduledAt,
    );

    return this.blogsRepository.create({
      title: dto.title,
      slug: await this.generateUniqueSlug(dto.title),
      author: dto.author,
      createdById: createdById ?? null,
      category: dto.category,
      tags: dto.tags ?? [],
      excerpt: dto.excerpt ?? null,
      content,
      coverImageUrl: dto.coverImageUrl ?? null,
      status,
      scheduledAt,
      publishedAt,
      readMinutes: this.estimateReadMinutes(content),
    });
  }

  async update(id: string, dto: UpdateBlogDto): Promise<BlogPost> {
    const existing = await this.blogsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Blog post not found');
    }

    const patch: Partial<BlogPost> = {};

    if (dto.title !== undefined && dto.title !== existing.title) {
      patch.title = dto.title;
      patch.slug = await this.generateUniqueSlug(dto.title, id);
    }
    if (dto.author !== undefined) patch.author = dto.author;
    if (dto.category !== undefined) patch.category = dto.category;
    if (dto.tags !== undefined) patch.tags = dto.tags;
    if (dto.excerpt !== undefined) patch.excerpt = dto.excerpt;
    if (dto.coverImageUrl !== undefined) {
      patch.coverImageUrl = dto.coverImageUrl;
    }
    if (dto.content !== undefined) {
      patch.content = dto.content;
      patch.readMinutes = this.estimateReadMinutes(dto.content);
    }
    if (dto.status !== undefined) {
      const status = dto.status as unknown as BlogStatus;
      patch.status = status;
      const { scheduledAt, publishedAt } = this.resolveTimestamps(
        status,
        dto.scheduledAt,
        existing,
      );
      patch.scheduledAt = scheduledAt;
      patch.publishedAt = publishedAt;
    }

    return this.blogsRepository.update(id, patch);
  }

  /** "Publish" action / confirm modal. */
  async publish(id: string): Promise<BlogPost> {
    const blog = await this.blogsRepository.findById(id);
    if (!blog) {
      throw new NotFoundException('Blog post not found');
    }
    return this.blogsRepository.update(id, {
      status: BlogStatus.PUBLISHED,
      publishedAt: blog.publishedAt ?? new Date(),
      scheduledAt: null,
    });
  }

  /** "Schedule your Blog" modal. */
  async schedule(id: string, scheduledAtIso: string): Promise<BlogPost> {
    const scheduledAt = new Date(scheduledAtIso);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Invalid schedule date');
    }
    if (scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException('Schedule time must be in the future');
    }
    const blog = await this.blogsRepository.findById(id);
    if (!blog) {
      throw new NotFoundException('Blog post not found');
    }
    return this.blogsRepository.update(id, {
      status: BlogStatus.SCHEDULED,
      scheduledAt,
      publishedAt: null,
    });
  }

  async remove(id: string): Promise<void> {
    await this.blogsRepository.softDelete(id);
  }

  /**
   * Promote scheduled posts whose time has arrived. Runs every minute; the
   * one-minute granularity matches the schedule picker (HH:MM).
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async publishDueScheduled(): Promise<void> {
    const due = await this.blogsRepository.findDueScheduled(new Date());
    if (due.length === 0) return;
    for (const blog of due) {
      try {
        await this.blogsRepository.update(blog.id, {
          status: BlogStatus.PUBLISHED,
          publishedAt: blog.scheduledAt ?? new Date(),
          scheduledAt: null,
        });
      } catch (error) {
        this.logger.error(
          `Failed to auto-publish scheduled blog ${blog.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
    this.logger.log(`Auto-published ${due.length} scheduled blog post(s)`);
  }

  /**
   * Decide the scheduledAt/publishedAt pair for a given target status.
   * `existing` lets edits preserve a prior publish timestamp.
   */
  private resolveTimestamps(
    status: BlogStatus,
    scheduledAtIso?: string,
    existing?: BlogPost,
  ): { scheduledAt: Date | null; publishedAt: Date | null } {
    if (status === BlogStatus.SCHEDULED) {
      if (!scheduledAtIso) {
        throw new BadRequestException(
          'scheduledAt is required when scheduling a post',
        );
      }
      const scheduledAt = new Date(scheduledAtIso);
      if (Number.isNaN(scheduledAt.getTime())) {
        throw new BadRequestException('Invalid schedule date');
      }
      if (scheduledAt.getTime() <= Date.now()) {
        throw new BadRequestException('Schedule time must be in the future');
      }
      return { scheduledAt, publishedAt: null };
    }
    if (status === BlogStatus.PUBLISHED) {
      return {
        scheduledAt: null,
        publishedAt: existing?.publishedAt ?? new Date(),
      };
    }
    // DRAFT
    return { scheduledAt: null, publishedAt: null };
  }

  /** kebab-case slug, de-duplicated with a short random suffix on collision. */
  private async generateUniqueSlug(
    title: string,
    excludeId?: string,
  ): Promise<string> {
    const base =
      title
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 200) || 'post';

    let slug = base;
    let attempt = 0;
    while (await this.blogsRepository.slugExists(slug, excludeId)) {
      attempt += 1;
      const suffix = Math.random().toString(36).slice(2, 8);
      slug = `${base}-${suffix}`;
      if (attempt > 5) {
        slug = `${base}-${Date.now().toString(36)}`;
        break;
      }
    }
    return slug;
  }

  private estimateReadMinutes(html: string): number {
    const text = html.replace(/<[^>]*>/g, ' ').trim();
    const words = text ? text.split(/\s+/).length : 0;
    return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
  }
}
