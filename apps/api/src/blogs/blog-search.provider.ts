import { Injectable, OnModuleInit } from '@nestjs/common';
import { SEARCH_RESULT_TYPE } from '../search/constants/search.constants';
import {
  SearchContext,
  SearchHit,
  SearchProvider,
} from '../search/providers/search-provider.interface';
import { SearchRegistry } from '../search/providers/search.registry';
import { BlogsRepository } from './blogs.repository';

/**
 * Published blog posts in global search. Blogs are public, so there is no
 * per-user scoping — but only PUBLISHED posts match, the same rule the public
 * blog routes apply. Matches title, excerpt and tags, not the HTML body.
 */
@Injectable()
export class BlogSearchProvider implements SearchProvider, OnModuleInit {
  readonly type = SEARCH_RESULT_TYPE.BLOG;

  constructor(
    private readonly blogsRepository: BlogsRepository,
    private readonly registry: SearchRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async search({ query, limit }: SearchContext): Promise<SearchHit[]> {
    const posts = await this.blogsRepository.searchPublished(query, limit);
    return posts.map((post) => ({
      id: post.id,
      type: this.type,
      title: post.title,
      subtitle: post.excerpt ?? null,
      meta: { slug: post.slug, category: post.category },
    }));
  }
}
