'use client';

import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Lock } from 'lucide-react';
import {
  Alert,
  Button,
  EmptyState,
  Spinner,
  buttonVariants,
} from '@squadup.in/ui';
import { getErrorMessage } from '@/lib/api';
import { requestFeatureAccess } from '../api/feature-flags.api';
import {
  FEATURE_QUERY_KEYS,
  type FeatureFlagKey,
} from '../constants/feature-flags.constant';
import { useExperimentalFeatures } from '../hooks/use-feature';

export interface FeatureUnavailableProps {
  feature: FeatureFlagKey;
  className?: string;
}

const DASHBOARD_PATH = '/dashboard';

/*
 * What a page behind a flag shows someone it doesn't reach yet. Features
 * still being opened up can be asked for; once asked, this says the request
 * is waiting, or why it wasn't approved.
 */
export default function FeatureUnavailable({
  feature,
  className,
}: FeatureUnavailableProps) {
  const queryClient = useQueryClient();
  const experimental = useExperimentalFeatures();
  const request = useMutation({
    mutationFn: () => requestFeatureAccess(feature),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: FEATURE_QUERY_KEYS.all }),
  });

  if (experimental.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Checking this feature" />
      </div>
    );
  }

  const entry = experimental.data?.find((f) => f.key === feature);
  const back = (
    <Link
      href={DASHBOARD_PATH}
      className={buttonVariants({ variant: 'outline' })}
    >
      Back to dashboard
    </Link>
  );

  if (!entry) {
    return (
      <EmptyState
        icon={Lock}
        title="This isn't open yet"
        description="We're still getting this ready. It will appear in your menu once it's open to you."
        action={back}
        className={className}
      />
    );
  }

  if (entry.userStatus === 'PENDING') {
    return (
      <EmptyState
        icon={Clock}
        title={`You've asked for ${entry.name}`}
        description="Your request is waiting for review. We'll send you a notification when it's decided."
        action={back}
        className={className}
      />
    );
  }

  const rejected = entry.userStatus === 'REJECTED';
  return (
    <div className={className}>
      <EmptyState
        icon={Lock}
        title={`${entry.name} is in early access`}
        description={
          rejected
            ? `Your last request wasn't approved${entry.rejectionReason ? `: ${entry.rejectionReason}` : '.'} You can ask again.`
            : (entry.description ??
              "It's open to a few people while we try it out. Ask for access and we'll let you know.")
        }
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => request.mutate()}
              disabled={request.isPending}
            >
              {request.isPending ? 'Sending request…' : 'Request access'}
            </Button>
            {back}
          </div>
        }
      />
      {request.isError ? (
        <Alert tone="danger" className="mt-4">
          {getErrorMessage(request.error)}
        </Alert>
      ) : null}
    </div>
  );
}
