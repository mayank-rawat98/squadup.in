import { SEARCH_RESULT_TYPE } from './constants/search.constants';
import { SearchProvider } from './providers/search-provider.interface';
import { SearchRegistry } from './providers/search.registry';
import { escapeLikeWildcards, SearchService } from './search.service';

describe('SearchService', () => {
  const user = { id: 'user-1' } as never;

  const makeProvider = (
    search: SearchProvider['search'],
  ): SearchProvider => ({ type: SEARCH_RESULT_TYPE.BLOG, search });

  it('escapes LIKE wildcards so a term matches literally', () => {
    expect(escapeLikeWildcards('50%_off\\')).toBe('50\\%\\_off\\\\');
  });

  it('passes an escaped, trimmed query and the capped limit to providers', async () => {
    const search = jest.fn().mockResolvedValue([]);
    const registry = new SearchRegistry();
    registry.register(makeProvider(search));
    const service = new SearchService(registry);

    await service.search({ q: '  100%  ', limit: 50 }, user);

    expect(search).toHaveBeenCalledWith({
      query: '100\\%',
      limit: 20,
      user,
    });
  });

  it('groups hits by type and trims to the limit', async () => {
    const registry = new SearchRegistry();
    registry.register(
      makeProvider(async () =>
        ['a', 'b', 'c'].map((id) => ({
          id,
          type: SEARCH_RESULT_TYPE.BLOG,
          title: id,
        })),
      ),
    );
    const service = new SearchService(registry);

    const result = await service.search({ q: 'squad', limit: 2 }, user);

    expect(result.total).toBe(2);
    expect(result.groups).toEqual([
      {
        type: SEARCH_RESULT_TYPE.BLOG,
        items: [
          { id: 'a', type: SEARCH_RESULT_TYPE.BLOG, title: 'a' },
          { id: 'b', type: SEARCH_RESULT_TYPE.BLOG, title: 'b' },
        ],
      },
    ]);
  });

  it('drops a failing provider instead of failing the search', async () => {
    const registry = new SearchRegistry();
    registry.register(
      makeProvider(async () => {
        throw new Error('db down');
      }),
    );
    const service = new SearchService(registry);

    await expect(service.search({ q: 'squad' }, user)).resolves.toEqual({
      groups: [],
      total: 0,
    });
  });
});
