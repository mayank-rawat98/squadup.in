import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Not, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { ListBlogsDto } from './dto/list-blogs.dto';
import { BlogPost, BlogStatus } from './entities/blog-post.entity';

export interface BlogStats {
  totalBlogs: number;
  publishedBlogs: number;
  draftBlogs: number;
  scheduledBlogs: number;
}

@Injectable()
export class BlogsRepository {
  constructor(
    @InjectRepository(BlogPost)
    private readonly blogRepo: Repository<BlogPost>,
  ) {}

  async create(data: Partial<BlogPost>): Promise<BlogPost> {
    const post = this.blogRepo.create(data);
    return this.blogRepo.save(post);
  }

  async save(post: BlogPost): Promise<BlogPost> {
    return this.blogRepo.save(post);
  }

  async findById(id: string): Promise<BlogPost | null> {
    return this.blogRepo.findOne({ where: { id } });
  }

  /** A live post by its public slug; drafts and scheduled posts are invisible. */
  async findPublishedBySlug(slug: string): Promise<BlogPost | null> {
    return this.blogRepo.findOne({
      where: { slug, status: BlogStatus.PUBLISHED },
    });
  }

  /** Slug uniqueness check — includes soft-deleted rows to avoid collisions. */
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const qb = this.blogRepo
      .createQueryBuilder('blog')
      .withDeleted()
      .where('blog.slug = :slug', { slug });
    if (excludeId) {
      qb.andWhere('blog.id != :excludeId', { excludeId });
    }
    return (await qb.getCount()) > 0;
  }

  async findAllPaginated(filters: ListBlogsDto) {
    const limit = Math.min(Math.max(filters.limit || 10, 1), 100);
    const page = Math.max(filters.page || 1, 1);
    const skip = (page - 1) * limit;

    const qb = this.blogRepo.createQueryBuilder('blog');

    if (filters.status) {
      qb.andWhere('blog.status = :status', { status: filters.status });
    }
    if (filters.category) {
      qb.andWhere('blog.category = :category', { category: filters.category });
    }
    if (filters.query) {
      qb.andWhere(
        '(blog.title ILIKE :q OR blog.author ILIKE :q OR blog.tags::text ILIKE :q)',
        { q: `%${filters.query}%` },
      );
    }

    // Newest-first, but published posts order by when they went live.
    qb.orderBy('COALESCE(blog.publishedAt, blog.createdAt)', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Published posts matching an already LIKE-escaped term on title, excerpt or
   * tags, newest first. Backs the blog search provider.
   */
  async searchPublished(escapedTerm: string, limit: number): Promise<BlogPost[]> {
    return this.blogRepo
      .createQueryBuilder('blog')
      .where('blog.status = :status', { status: BlogStatus.PUBLISHED })
      .andWhere(
        '(blog.title ILIKE :q OR blog.excerpt ILIKE :q OR blog.tags::text ILIKE :q)',
        { q: `%${escapedTerm}%` },
      )
      .orderBy('blog.publishedAt', 'DESC')
      .take(limit)
      .getMany();
  }

  /** Aggregate counts for the four stat cards, in a single query. */
  async getStats(): Promise<BlogStats> {
    const row = await this.blogRepo
      .createQueryBuilder('blog')
      .select('COUNT(*)::int', 'totalBlogs')
      .addSelect(
        `COUNT(CASE WHEN blog.status = :published THEN 1 END)::int`,
        'publishedBlogs',
      )
      .addSelect(
        `COUNT(CASE WHEN blog.status = :draft THEN 1 END)::int`,
        'draftBlogs',
      )
      .addSelect(
        `COUNT(CASE WHEN blog.status = :scheduled THEN 1 END)::int`,
        'scheduledBlogs',
      )
      .setParameters({
        published: BlogStatus.PUBLISHED,
        draft: BlogStatus.DRAFT,
        scheduled: BlogStatus.SCHEDULED,
      })
      .getRawOne<{
        totalBlogs: number;
        publishedBlogs: number;
        draftBlogs: number;
        scheduledBlogs: number;
      }>();

    return {
      totalBlogs: row?.totalBlogs ?? 0,
      publishedBlogs: row?.publishedBlogs ?? 0,
      draftBlogs: row?.draftBlogs ?? 0,
      scheduledBlogs: row?.scheduledBlogs ?? 0,
    };
  }

  /** Other published posts by the same author — for "More Blog by this author". */
  async findRelatedByAuthor(
    author: string,
    excludeId: string,
    limit: number,
  ): Promise<BlogPost[]> {
    return this.blogRepo.find({
      where: {
        author,
        status: BlogStatus.PUBLISHED,
        id: Not(excludeId),
      },
      order: { publishedAt: 'DESC' },
      take: limit,
    });
  }

  async update(id: string, data: Partial<BlogPost>): Promise<BlogPost> {
    const result = await this.blogRepo.update(
      { id },
      data as unknown as QueryDeepPartialEntity<BlogPost>,
    );
    if (result.affected === 0) {
      throw new BadRequestException('Blog post not found');
    }
    const updated = await this.findById(id);
    if (!updated) {
      throw new BadRequestException('Blog post not found');
    }
    return updated;
  }

  async incrementViews(id: string): Promise<void> {
    await this.blogRepo.increment({ id }, 'views', 1);
  }

  async softDelete(id: string): Promise<void> {
    const result = await this.blogRepo.softDelete({ id });
    if (result.affected === 0) {
      throw new BadRequestException('Blog post not found');
    }
  }

  /** Scheduled posts whose time has arrived — promoted to PUBLISHED by the cron. */
  async findDueScheduled(now: Date): Promise<BlogPost[]> {
    return this.blogRepo.find({
      where: {
        status: BlogStatus.SCHEDULED,
        scheduledAt: LessThanOrEqual(now),
      },
    });
  }
}
