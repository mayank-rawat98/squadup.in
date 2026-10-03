'use client';

import Link from 'next/link';
import { Activity, ArrowRight, UserRound } from 'lucide-react';
import {
  Alert,
  Button,
  EmptyState,
  Typography,
  buttonVariants,
  cn,
} from '@squadup.in/ui';
import { useCurrentUser, type CurrentUser } from '@/features/auth';
import { RecentRooms } from '@/features/board';
import {
  COMING_UP,
  DASHBOARD_STATS,
  PROFILE_SETTINGS_HREF,
} from '../constants/dashboard.constant';
import { firstNameOf, isProfileIncomplete } from '../utils/first-name';

/*
 * The signed-in home. Most of what it will show (stats, activity) comes from
 * features that don't exist yet, so those parts render their final layout
 * around honest empty states instead of invented numbers.
 */
export default function DashboardHome() {
  const { data: user, isPending, isError, refetch } = useCurrentUser();

  if (isPending) return <DashboardSkeleton />;

  if (isError || !user) {
    return (
      <Alert tone="danger">
        <p className="font-semibold">We couldn&apos;t load your dashboard.</p>
        <p>Check your connection and try again.</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => void refetch()}
        >
          Try again
        </Button>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <Greeting user={user} />
      {isProfileIncomplete(user) && <ProfilePrompt user={user} />}
      <Stats />
      <RecentRooms />
      <div className="grid gap-10 lg:grid-cols-5">
        <section aria-labelledby="activity-heading" className="lg:col-span-3">
          <Typography
            as="h2"
            variant="h5"
            id="activity-heading"
            className="mb-4"
          >
            Recent activity
          </Typography>
          <EmptyState
            icon={Activity}
            title="Nothing here yet"
            description="Your solved challenges, arena results and squad updates will appear here."
            className="py-10 md:py-12"
          />
        </section>
        <ComingUp />
      </div>
    </div>
  );
}

function Greeting({ user }: { user: CurrentUser }) {
  const firstName = firstNameOf(user);
  return (
    <header className="flex flex-col gap-1">
      <Typography as="h1" variant="h3" className="wrap-anywhere">
        {firstName ? `Welcome back, ${firstName}` : 'Welcome to SquadUp'}
      </Typography>
      {/* An email is one long word that would otherwise widen a phone screen. */}
      <Typography variant="bodyMuted" className="wrap-anywhere">
        Signed in as {user.email}
      </Typography>
    </header>
  );
}

function ProfilePrompt({ user }: { user: CurrentUser }) {
  const missing = [
    !user.fullName?.trim() && 'your name',
    !user.avatarUrl && 'a photo',
  ].filter(Boolean);

  return (
    <div className="border-primary/30 bg-accent/50 flex flex-col gap-4 rounded-xl border p-5 sm:flex-row sm:items-center">
      <span className="bg-background text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
        <UserRound aria-hidden="true" className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <Typography as="h2" variant="h6">
          Finish your profile
        </Typography>
        <Typography variant="bodySmall" className="text-muted-foreground">
          Add {missing.join(' and ')} so your squad knows who you are.
        </Typography>
      </div>
      <Link
        href={PROFILE_SETTINGS_HREF}
        className={cn(
          buttonVariants({ size: 'sm' }),
          'self-start sm:self-auto',
        )}
      >
        Edit profile
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </div>
  );
}

function Stats() {
  return (
    <section aria-labelledby="stats-heading">
      <h2 id="stats-heading" className="sr-only">
        Your stats
      </h2>
      <dl className="grid gap-4 sm:grid-cols-3">
        {DASHBOARD_STATS.map((stat) => (
          <div
            key={stat.label}
            className="border-border bg-card flex flex-col gap-1 rounded-xl border p-5"
          >
            <dt className="text-body-sm text-muted-foreground font-medium">
              {stat.label}
            </dt>
            <dd className="text-h3 font-semibold">
              <span aria-hidden="true">—</span>
              <span className="sr-only">Not available yet</span>
            </dd>
            <dd className="text-caption text-muted-foreground">{stat.note}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ComingUp() {
  return (
    <section aria-labelledby="coming-up-heading" className="lg:col-span-2">
      <Typography as="h2" variant="h5" id="coming-up-heading" className="mb-4">
        Coming to SquadUp
      </Typography>
      <ul className="border-border divide-border divide-y rounded-xl border">
        {COMING_UP.map(({ title, description, icon: Icon }) => (
          <li key={title} className="flex gap-4 p-4">
            <Icon
              aria-hidden="true"
              className="text-primary mt-0.5 h-5 w-5 shrink-0"
            />
            <div>
              <p className="text-body-sm font-semibold">{title}</p>
              <p className="text-body-sm text-muted-foreground">
                {description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-10" aria-busy="true">
      <span className="sr-only" role="status">
        Loading your dashboard
      </span>
      <div className="flex flex-col gap-2" aria-hidden="true">
        <div className="bg-muted h-9 w-64 max-w-full animate-pulse rounded-md motion-reduce:animate-none" />
        <div className="bg-muted h-5 w-48 max-w-full animate-pulse rounded-md motion-reduce:animate-none" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3" aria-hidden="true">
        {DASHBOARD_STATS.map((stat) => (
          <div
            key={stat.label}
            className="bg-muted h-28 animate-pulse rounded-xl motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  );
}
