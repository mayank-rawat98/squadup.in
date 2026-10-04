'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RotateCw } from 'lucide-react';
import { Button, EmptyState, Spinner, Typography } from '@squadup.in/ui';
import { getErrorMessage, isApiError } from '@/lib/api';
import { getFeatureFlag } from '../api/feature-flags.api';
import {
  FEATURE_FLAGS_PATH,
  FEATURE_FLAG_QUERY_KEYS,
} from '../constants/feature-flags.constant';
import type { FeatureFlag } from '../types/feature-flag.types';
import AudienceForm from './AudienceForm';
import FeatureAudienceBadge from './FeatureAudienceBadge';
import FlagPeople from './FlagPeople';
import FlagRequests from './FlagRequests';

const linkClass =
  'text-primary focus-visible:ring-ring inline-flex items-center gap-1.5 self-start rounded-sm text-body-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none';

export interface FeatureFlagDetailScreenProps {
  featureKey: string;
}

/* One flag: who it reaches, the people with their own access, and requests waiting. */
export default function FeatureFlagDetailScreen({
  featureKey,
}: FeatureFlagDetailScreenProps) {
  const queryClient = useQueryClient();
  const queryKey = FEATURE_FLAG_QUERY_KEYS.one(featureKey);
  const flag = useQuery({
    queryKey,
    queryFn: ({ signal }) => getFeatureFlag(featureKey, signal),
  });

  const backLink = (
    <Link href={FEATURE_FLAGS_PATH} className={linkClass}>
      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
      All feature flags
    </Link>
  );

  if (flag.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading the feature flag" />
      </div>
    );
  }

  if (flag.isError) {
    const missing = isApiError(flag.error) && flag.error.status === 404;
    return (
      <div className="flex flex-col gap-6">
        {backLink}
        <EmptyState
          title={
            missing
              ? 'There is no flag with this key'
              : "We couldn't load this feature flag"
          }
          description={getErrorMessage(flag.error)}
          action={
            missing ? null : (
              <Button onClick={() => flag.refetch()}>
                <RotateCw aria-hidden="true" className="h-4 w-4" />
                Try again
              </Button>
            )
          }
        />
      </div>
    );
  }

  const onSaved = (saved: FeatureFlag) => {
    queryClient.setQueryData(queryKey, saved);
    void queryClient.invalidateQueries({
      queryKey: FEATURE_FLAG_QUERY_KEYS.all,
      exact: true,
    });
  };

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      {backLink}
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Typography as="h1" variant="h2">
            {flag.data.name}
          </Typography>
          <FeatureAudienceBadge audience={flag.data.audience} />
        </div>
        <Typography
          variant="bodySmall"
          className="text-muted-foreground font-mono"
        >
          {flag.data.key}
        </Typography>
        {flag.data.description ? (
          <Typography className="text-muted-foreground">
            {flag.data.description}
          </Typography>
        ) : null}
      </header>
      {/* Remount on each save, so the form restarts from what was stored. */}
      <AudienceForm
        key={flag.data.updatedAt}
        flag={flag.data}
        onSaved={onSaved}
      />
      <FlagRequests
        featureKey={featureKey}
        onDecided={() => void flag.refetch()}
      />
      <FlagPeople flag={flag.data} onSaved={onSaved} />
    </div>
  );
}
