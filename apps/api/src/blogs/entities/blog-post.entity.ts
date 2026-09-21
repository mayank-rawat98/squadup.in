import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Lifecycle of a blog post.
 *  - DRAFT     — saved but not visible anywhere.
 *  - SCHEDULED — has a `scheduledAt` in the future; the cron promotes it to
 *                PUBLISHED once that time passes.
 *  - PUBLISHED — live, has a `publishedAt`.
 */
export enum BlogStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
}

/**
 * Fixed taxonomy shown in the ops "Category" dropdown. Stored as plain strings
 * so adding a value never needs a Postgres enum migration.
 */
export enum BlogCategory {
  ANNOUNCEMENTS = 'announcements',
  ESPORTS = 'esports',
  GUIDES = 'guides',
  COMMUNITY = 'community',
  EVENTS = 'events',
  PRODUCT = 'product',
}

/**
 * A Squadup blog post. Blogs are platform content managed exclusively from the
 * ops dashboard by staff — there is no per-user ownership. The `author` is a
 * free-text display name; `createdById` records which staff member created the
 * row for auditing. Published posts are readable by anyone.
 */
@Entity({ name: 'blog_posts' })
@Index(['status', 'category'])
export class BlogPost {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 280 })
  slug!: string;

  @Column({ type: 'varchar', length: 255 })
  author!: string;

  /** Staff member who created the post (audit only). */
  @Column({ type: 'uuid', nullable: true })
  createdById?: string | null;

  @Column({ type: 'varchar', length: 32, default: BlogCategory.PRODUCT })
  category!: BlogCategory;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  tags!: string[];

  @Column({ type: 'text', nullable: true })
  excerpt?: string | null;

  /** Rendered HTML produced by the rich-text editor. */
  @Column({ type: 'text', default: '' })
  content!: string;

  @Column({ type: 'text', nullable: true })
  coverImageUrl?: string | null;

  @Column({ type: 'varchar', length: 32, default: BlogStatus.DRAFT })
  status!: BlogStatus;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt?: Date | null;

  /** Estimated reading time in minutes (derived from content on save). */
  @Column({ type: 'int', default: 1 })
  readMinutes!: number;

  @Column({ type: 'int', default: 0 })
  views!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date | null;
}
