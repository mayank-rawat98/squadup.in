import { Injectable, Logger } from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import {
  SEARCH_DEFAULT_LIMIT,
  SEARCH_GROUP_ORDER,
  SEARCH_MAX_LIMIT,
  SEARCH_PROVIDER_TIMEOUT_MS,
  SEARCH_RESULT_TYPE,
} from './constants/search.constants';
import { QuerySearchDto } from './dto/query-search.dto';
import {
  SearchContext,
  SearchHit,
  SearchProvider,
} from './providers/search-provider.interface';
import { SearchRegistry } from './providers/search.registry';

export interface SearchGroup {
  type: SEARCH_RESULT_TYPE;
  items: SearchHit[];
}

/**
 * Neutralize LIKE/ILIKE wildcards in the user's term so it matches literally.
 *
 * Every provider interpolates the query into `%q%`. Left alone, a term
 * containing `%` or `_` is a pattern, not a search: "50%_off" silently becomes
 * "any string, then any character, then 'off'" — matching rows that contain none
 * of what was typed. Postgres treats backslash as the LIKE escape character by
 * default, so escaping is enough; no ESCAPE clause is needed. (This is about
 * correctness, not injection — the term is always a bound parameter.)
 */
export function escapeLikeWildcards(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * Fans one query out across every registered domain and returns the hits grouped
 * by type.
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly registry: SearchRegistry) {}

  async search(
    dto: QuerySearchDto,
    user: User,
  ): Promise<{ groups: SearchGroup[]; total: number }> {
    const providers = dto.types?.length
      ? this.registry.forTypes(dto.types)
      : this.registry.all();

    const ctx: SearchContext = {
      query: escapeLikeWildcards(dto.q.trim()),
      limit: Math.min(dto.limit ?? SEARCH_DEFAULT_LIMIT, SEARCH_MAX_LIMIT),
      user,
    };

    // One slow or broken domain must not take the whole palette down with it:
    // every provider is raced against a timeout and settled independently, and a
    // failure costs that group only. Partial results beat an error page.
    const settled = await Promise.all(
      providers.map((provider) => this.runProvider(provider, ctx)),
    );

    const byType = new Map<SEARCH_RESULT_TYPE, SearchHit[]>();
    for (const { type, hits } of settled) {
      if (hits.length) byType.set(type, hits);
    }

    const groups = SEARCH_GROUP_ORDER.filter((type) => byType.has(type)).map(
      (type) => ({ type, items: byType.get(type) as SearchHit[] }),
    );

    return {
      groups,
      total: groups.reduce((sum, g) => sum + g.items.length, 0),
    };
  }

  private async runProvider(
    provider: SearchProvider,
    ctx: SearchContext,
  ): Promise<{ type: SEARCH_RESULT_TYPE; hits: SearchHit[] }> {
    let timer: NodeJS.Timeout | undefined;
    try {
      const hits = await Promise.race([
        provider.search(ctx),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('search provider timed out')),
            SEARCH_PROVIDER_TIMEOUT_MS,
          );
        }),
      ]);
      // A provider that ignores ctx.limit can't blow up the payload.
      return { type: provider.type, hits: hits.slice(0, ctx.limit) };
    } catch (err) {
      this.logger.warn(
        `Search provider "${provider.type}" failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return { type: provider.type, hits: [] };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
