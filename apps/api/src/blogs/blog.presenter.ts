import { BlogPost } from './entities/blog-post.entity';

/**
 * Response shapes for blog posts, shared by the public blog routes and the
 * ops dashboard so both render the same fields. Strips TypeORM internals and
 * the audit-only `createdById`.
 */
export function toBlogRow(blog: BlogPost) {
  return {
    id: blog.id,
    title: blog.title,
    slug: blog.slug,
    author: blog.author,
    category: blog.category,
    tags: blog.tags ?? [],
    excerpt: blog.excerpt ?? null,
    coverImageUrl: blog.coverImageUrl ?? null,
    status: blog.status,
    scheduledAt: blog.scheduledAt ?? null,
    publishedAt: blog.publishedAt ?? null,
    readMinutes: blog.readMinutes,
    views: blog.views,
    createdAt: blog.createdAt,
    updatedAt: blog.updatedAt,
  };
}

/** Full payload, including the HTML body, for the read and edit screens. */
export function toBlogDetail(blog: BlogPost) {
  return { ...toBlogRow(blog), content: blog.content };
}
