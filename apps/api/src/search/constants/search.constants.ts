/**
 * Every kind of thing global search can return. A domain joins search by adding
 * its type here and registering a provider for it.
 */
export enum SEARCH_RESULT_TYPE {
  BLOG = 'blog',
}

/**
 * Order the groups are rendered in. Deliberately fixed rather than scored:
 * substring matching gives no cross-type relevance signal, so a stable order the
 * user can learn beats a ranking that only looks meaningful.
 */
export const SEARCH_GROUP_ORDER: SEARCH_RESULT_TYPE[] = [SEARCH_RESULT_TYPE.BLOG];

/** Below this a substring match returns most of the table — not worth a query. */
export const SEARCH_MIN_QUERY_LENGTH = 2;

/** Hits per type. The palette shows a preview of each group, not a full list. */
export const SEARCH_DEFAULT_LIMIT = 5;
export const SEARCH_MAX_LIMIT = 20;

/**
 * A provider that overruns this is dropped from the response rather than being
 * allowed to hold up the whole palette — a search that returns most groups fast
 * is worth far more than one that returns all of them slowly.
 */
export const SEARCH_PROVIDER_TIMEOUT_MS = 3_000;
