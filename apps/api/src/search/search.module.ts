import { Global, Module } from '@nestjs/common';
import { SearchRegistry } from './providers/search.registry';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

/**
 * Global search. Owns the endpoint and the fan-out, and knows about NO domain:
 * each domain contributes a SearchProvider that self-registers into the
 * {@link SearchRegistry}.
 *
 * @Global so the registry is one shared instance every domain module can inject
 * to register into, without importing this module.
 */
@Global()
@Module({
  controllers: [SearchController],
  providers: [SearchService, SearchRegistry],
  exports: [SearchRegistry],
})
export class SearchModule {}
