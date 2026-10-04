'use client';

import type { ReactNode } from 'react';
import { RotateCw } from 'lucide-react';
import { Button, EmptyState, Spinner, cn } from '@squadup.in/ui';
import type { FeatureFlagKey } from '../constants/feature-flags.constant';
import { useFeature } from '../hooks/use-feature';
import FeatureUnavailable from './FeatureUnavailable';

export interface FeatureGateProps {
  feature: FeatureFlagKey;
  children: ReactNode;
  /** Centre the waiting and refusal states in the window, for full-screen pages. */
  fullScreen?: boolean;
}

/*
 * Renders a page only for people its feature flag reaches. The API refuses
 * them too; this just says so kindly instead of showing a broken page.
 */
export default function FeatureGate({
  feature,
  children,
  fullScreen = false,
}: FeatureGateProps) {
  const { status, retry } = useFeature(feature);
  if (status === 'on') return <>{children}</>;

  const frame = cn(
    'flex w-full justify-center',
    fullScreen ? 'min-h-dvh items-center px-5 py-16' : 'py-8 md:py-12',
  );

  if (status === 'pending') {
    return (
      <div className={frame}>
        <Spinner label="Loading" />
      </div>
    );
  }

  return (
    <div className={frame}>
      <div className="w-full max-w-md">
        {status === 'error' ? (
          <EmptyState
            icon={RotateCw}
            title="We couldn't check your access"
            description="Check your connection and try again."
            action={
              <Button variant="outline" onClick={retry}>
                Try again
              </Button>
            }
          />
        ) : (
          <FeatureUnavailable feature={feature} />
        )}
      </div>
    </div>
  );
}
