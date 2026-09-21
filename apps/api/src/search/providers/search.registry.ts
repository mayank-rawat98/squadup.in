import { Injectable } from '@nestjs/common';
import { SEARCH_RESULT_TYPE } from '../constants/search.constants';
import { SearchProvider } from './search-provider.interface';

/**
 * Runtime registry of {@link SearchProvider}s, keyed by result type. Providers
 * self-register from their own domain modules in `onModuleInit`, so the search
 * module depends on no domain, and a domain joins global search by declaring
 * one provider.
 *
 * Exported by a @Global SearchModule so every domain registers into the same
 * instance.
 */
@Injectable()
export class SearchRegistry {
  private readonly byType = new Map<SEARCH_RESULT_TYPE, SearchProvider>();

  register(provider: SearchProvider): void {
    this.byType.set(provider.type, provider);
  }

  /** Every registered provider, in registration order. */
  all(): SearchProvider[] {
    return Array.from(this.byType.values());
  }

  /** The providers for `types`, ignoring any type nothing has registered for. */
  forTypes(types: SEARCH_RESULT_TYPE[]): SearchProvider[] {
    return types
      .map((type) => this.byType.get(type))
      .filter((p): p is SearchProvider => !!p);
  }
}
