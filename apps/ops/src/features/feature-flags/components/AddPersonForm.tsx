'use client';

import { useEffect, useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Spinner } from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { searchUsers } from '../api/feature-flags.api';
import {
  FEATURE_FLAG_QUERY_KEYS,
  USER_SEARCH_MIN_LENGTH,
} from '../constants/feature-flags.constant';

export interface AddPersonFormProps {
  /** Ids already on the flag, which are shown as such rather than offered again. */
  decided: ReadonlySet<string>;
  onDecide: (userId: string, enabled: boolean) => void;
  busy: boolean;
}

const SEARCH_DELAY_MS = 300;

/* Find someone by name or email and grant or deny them, whatever the rollout. */
export default function AddPersonForm({
  decided,
  onDecide,
  busy,
}: AddPersonFormProps) {
  const inputId = useId();
  const hintId = useId();
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setQuery(draft.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft]);

  const enabled = query.length >= USER_SEARCH_MIN_LENGTH;
  const results = useQuery({
    queryKey: FEATURE_FLAG_QUERY_KEYS.userSearch(query),
    queryFn: ({ signal }) => searchUsers(query, signal),
    enabled,
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-body-sm font-medium">
          Add a person
        </label>
        <Input
          id={inputId}
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Name or email"
          autoComplete="off"
          aria-describedby={hintId}
        />
        <p id={hintId} className="text-caption text-muted-foreground">
          Type at least {USER_SEARCH_MIN_LENGTH} characters.
        </p>
      </div>

      {enabled ? (
        <div aria-live="polite">
          {results.isPending ? (
            <Spinner label="Searching people" />
          ) : results.isError ? (
            <p className="text-danger text-body-sm">
              {getErrorMessage(results.error)}
            </p>
          ) : results.data.length === 0 ? (
            <p className="text-muted-foreground text-body-sm">
              Nobody matches “{query}”.
            </p>
          ) : (
            <ul
              aria-label="Matching people"
              className="border-border divide-border divide-y rounded-xl border"
            >
              {results.data.map((user) => (
                <li
                  key={user.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-2.5"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-body-sm truncate font-medium">
                      {user.fullName ?? user.email}
                    </span>
                    {user.fullName ? (
                      <span className="text-caption text-muted-foreground truncate">
                        {user.email}
                      </span>
                    ) : null}
                  </span>
                  {decided.has(user.id) ? (
                    <span className="text-caption text-muted-foreground">
                      Already listed below
                    </span>
                  ) : (
                    <span className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => onDecide(user.id, true)}
                        aria-label={`Grant ${user.fullName ?? user.email}`}
                      >
                        Grant
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => onDecide(user.id, false)}
                        aria-label={`Deny ${user.fullName ?? user.email}`}
                      >
                        Deny
                      </Button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
