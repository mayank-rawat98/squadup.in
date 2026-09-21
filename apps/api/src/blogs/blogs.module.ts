import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogSearchProvider } from './blog-search.provider';
import { BlogsController } from './blogs.controller';
import { BlogsRepository } from './blogs.repository';
import { BlogsService } from './blogs.service';
import { BlogPost } from './entities/blog-post.entity';

/**
 * Owns the blog_posts table and the BlogsService domain logic (CRUD, publish,
 * schedule, the auto-publish cron). Serves the public read routes itself;
 * authoring is exposed by the admin-ops module, which reuses this service.
 */
@Module({
  imports: [TypeOrmModule.forFeature([BlogPost])],
  controllers: [BlogsController],
  providers: [BlogsService, BlogsRepository, BlogSearchProvider],
  exports: [BlogsService, BlogsRepository],
})
export class BlogsModule {}
