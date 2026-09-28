'use client';

import { LayoutDashboard } from 'lucide-react';
import { EmptyState, Typography } from '@squadup.in/ui';
import { useCurrentUser } from '@/features/auth';

/*
 * Where sign-in lands until Milestone 2 builds the real dashboard. It greets
 * the user by name so a successful sign-in is visibly a sign-in.
 */
export default function DashboardPlaceholder() {
  const { data: user } = useCurrentUser();
  const name = user?.fullName || user?.email;

  return (
    <div className="flex flex-col gap-8">
      <Typography as="h1" variant="h3">
        {name ? `Welcome, ${name}` : 'Welcome'}
      </Typography>
      <EmptyState
        icon={LayoutDashboard}
        title="Your dashboard is on its way"
        description="Challenges, arenas and your stats will show up here as they launch."
      />
    </div>
  );
}
