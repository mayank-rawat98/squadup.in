import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteFooter, SiteHeader } from '@/components/organisms';
import { PublicProfileView, getPublicProfile } from '@/features/public-profile';

interface Props {
  params: Promise<{ username: string }>;
}

/*
 * No loading.tsx here on purpose: a loading boundary starts streaming a 200
 * before notFound() can run, and a missing profile must answer 404. The
 * fetch is cached for a minute, so there is little to wait for.
 */

/* One request for both the metadata and the page. */
const loadProfile = cache((username: string) =>
  getPublicProfile(decodeURIComponent(username)),
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await loadProfile((await params).username);
  if (!profile) return { title: 'Profile not found' };
  const name = profile.fullName ?? `@${profile.username}`;
  return {
    title: profile.fullName
      ? `${profile.fullName} (@${profile.username})`
      : name,
    description: `${name} on SquadUp.`,
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const profile = await loadProfile((await params).username);
  if (!profile) notFound();

  return (
    <>
      <SiteHeader />
      <main>
        <PublicProfileView profile={profile} />
      </main>
      <SiteFooter />
    </>
  );
}
