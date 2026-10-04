'use client';

import Link from 'next/link';
import { type UseQueryResult, useQuery } from '@tanstack/react-query';
import { ChevronRight, RotateCw } from 'lucide-react';
import { Badge, Button, EmptyState, Spinner, Typography } from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { listFeatureFlags } from '../api/feature-flags.api';
import {
  FEATURE_FLAG_QUERY_KEYS,
  featureFlagPath,
} from '../constants/feature-flags.constant';
import type { FeatureFlag } from '../types/feature-flag.types';
import FeatureAudienceBadge from './FeatureAudienceBadge';

/*
 * Every feature flag the code checks, with who it reaches today and how many
 * people are waiting for access. Flags are declared in the API's code, so
 * there is nothing to create here; this is where they're opened up.
 */
export default function FeatureFlagsScreen() {
  const flags = useQuery({
    queryKey: FEATURE_FLAG_QUERY_KEYS.all,
    queryFn: ({ signal }) => listFeatureFlags(signal),
  });

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <Typography as="h1" variant="h2">
          Feature flags
        </Typography>
        <Typography className="text-muted-foreground max-w-2xl">
          Who can use each feature that is still being opened up. Switch one off
          for everyone, open it to the people you choose, or open it to all.
        </Typography>
      </header>

      <FlagsBody query={flags} />
    </div>
  );
}

function FlagsBody({ query }: { query: UseQueryResult<FeatureFlag[]> }) {
  if (query.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading feature flags" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <EmptyState
        title="We couldn't load the feature flags"
        description={getErrorMessage(query.error)}
        action={
          <Button onClick={() => query.refetch()}>
            <RotateCw aria-hidden="true" className="h-4 w-4" />
            Try again
          </Button>
        }
      />
    );
  }

  if (query.data.length === 0) {
    return (
      <EmptyState
        title="No feature flags yet"
        description="Flags appear here once the API declares and seeds them, the first time it starts with them."
      />
    );
  }

  return (
    <ul className="border-border divide-border divide-y overflow-hidden rounded-xl border">
      {query.data.map((flag) => (
        <li key={flag.key}>
          <FlagRow flag={flag} />
        </li>
      ))}
    </ul>
  );
}

function FlagRow({ flag }: { flag: FeatureFlag }) {
  const granted = flag.users.filter((u) => u.enabled).length;
  return (
    <Link
      href={featureFlagPath(flag.key)}
      className="hover:bg-accent/50 focus-visible:ring-ring flex items-center gap-3 px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-body-sm text-foreground font-medium">
          {flag.name}
        </span>
        <span className="text-caption text-muted-foreground truncate">
          <span className="font-mono">{flag.key}</span>
          {flag.audience === 'selected'
            ? ` · ${granted} ${granted === 1 ? 'person' : 'people'} granted`
            : null}
        </span>
      </span>
      {flag.pendingRequests > 0 ? (
        <Badge variant="warning">
          {flag.pendingRequests}{' '}
          {flag.pendingRequests === 1 ? 'request' : 'requests'}
        </Badge>
      ) : null}
      <FeatureAudienceBadge audience={flag.audience} />
      <ChevronRight
        aria-hidden="true"
        className="text-muted-foreground h-4 w-4 shrink-0"
      />
    </Link>
  );
}
