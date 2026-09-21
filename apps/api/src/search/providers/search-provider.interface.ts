import { User } from '../../users/entities/user.entity';
import { SEARCH_RESULT_TYPE } from '../constants/search.constants';

/**
 * Everything a provider needs to run a search, built once per request by
 * SearchService and handed to every provider.
 *
 * Each provider MUST scope its query exactly as its domain's own list endpoint
 * does — by `user.id` for private data, or to public rows only: global search
 * is a new door onto existing data, never a way to see more of it.
 */
export interface SearchContext {
  /** Trimmed, length-checked and LIKE-escaped. */
  query: string;
  /** Max hits this provider may return. */
  limit: number;
  user: User;
}

/** One row in the palette. `meta` carries whatever the client needs to route. */
export interface SearchHit {
  id: string;
  type: SEARCH_RESULT_TYPE;
  title: string;
  subtitle?: string | null;
  meta?: Record<string, unknown> | null;
}

/**
 * A domain's contribution to global search. Implemented inside the owning domain
 * and self-registered into the {@link SearchRegistry} from its own module, so
 * the search module never imports a single domain service and no import cycle
 * is possible.
 */
export interface SearchProvider {
  readonly type: SEARCH_RESULT_TYPE;
  search(ctx: SearchContext): Promise<SearchHit[]>;
}
