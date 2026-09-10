import { Atom, Brain, Code2, Container, PanelsTopLeft } from 'lucide-react';
import type { Arena } from '../types/landing.types';

/*
 * Static landing content, shaped to match the arena endpoints.
 *
 * Deliberately absent: participant counts, countdown timers and platform-wide
 * statistics. The arenas below are competitions we intend to run, so they are
 * real content — but no figure is invented. `participants`, `endsAt` and
 * `startsAt` stay undefined until the API supplies them, and every component
 * renders correctly without them.
 */

export const ARENAS: Arena[] = [
  {
    id: 'frontend-sprint',
    slug: 'frontend-sprint',
    name: 'Frontend Sprint',
    description: 'Build responsive interfaces using React, HTML and CSS.',
    icon: PanelsTopLeft,
    accent: 'frontend',
    teamSize: 'Solo',
    duration: '60 Minutes',
    difficulty: 'beginner',
    prize: '₹5,000',
    status: 'live',
  },
  {
    id: 'backend-battle',
    slug: 'backend-battle',
    name: 'Backend Battle',
    description: 'Design and ship REST APIs that hold up under real load.',
    icon: Code2,
    accent: 'backend',
    teamSize: 'Duo',
    duration: '3 Hours',
    difficulty: 'intermediate',
    prize: '₹10,000',
    status: 'live',
  },
  {
    id: 'devops-deployment',
    slug: 'devops-deployment',
    name: 'DevOps Deployment',
    description: 'Containerise, deploy and scale an application end to end.',
    icon: Container,
    accent: 'devops',
    teamSize: 'Team of 4',
    duration: '24 Hours',
    difficulty: 'advanced',
    prize: '₹10,000',
    status: 'live',
  },
  {
    id: 'react-speed-build',
    slug: 'react-speed-build',
    name: 'React Speed Build',
    description: 'Ship a working React product in a single focused hour.',
    icon: Atom,
    accent: 'react',
    teamSize: 'Solo',
    duration: '60 Minutes',
    difficulty: 'intermediate',
    prize: 'SquadUp Merchandise',
    status: 'registration-open',
  },
  {
    id: 'ai-hack-sprint',
    slug: 'ai-hack-sprint',
    name: 'AI Hack Sprint',
    description: 'Use AI APIs to build something genuinely useful.',
    icon: Brain,
    accent: 'ai',
    teamSize: 'Team of 4',
    duration: 'Weekend Challenge',
    difficulty: 'advanced',
    prize: '₹25,000',
    status: 'starts-soon',
  },
];

/** Copy for the status pill on an arena card. */
export const ARENA_STATUS_LABEL: Record<Arena['status'], string> = {
  live: 'Live',
  'registration-open': 'Registration Open',
  'starts-soon': 'Starting Soon',
  'coming-soon': 'Coming Soon',
};

export const ARENA_DIFFICULTY_LABEL: Record<Arena['difficulty'], string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

/*
 * Maps an arena's accent to its token pair. Written out rather than
 * interpolated because Tailwind only emits classes it can see as whole
 * strings — `text-arena-${accent}` would compile to nothing.
 */
export const ARENA_ACCENT_CLASS: Record<
  Arena['accent'],
  { text: string; tile: string; ring: string }
> = {
  frontend: {
    text: 'text-arena-frontend',
    tile: 'bg-arena-frontend-soft',
    ring: 'group-hover:border-arena-frontend/40',
  },
  backend: {
    text: 'text-arena-backend',
    tile: 'bg-arena-backend-soft',
    ring: 'group-hover:border-arena-backend/40',
  },
  devops: {
    text: 'text-arena-devops',
    tile: 'bg-arena-devops-soft',
    ring: 'group-hover:border-arena-devops/40',
  },
  react: {
    text: 'text-arena-react',
    tile: 'bg-arena-react-soft',
    ring: 'group-hover:border-arena-react/40',
  },
  ai: {
    text: 'text-arena-ai',
    tile: 'bg-arena-ai-soft',
    ring: 'group-hover:border-arena-ai/40',
  },
};

/** The hero's three-line promise, kept out of the component for reuse. */
export const HERO_COPY = {
  eyebrow: 'The developer arena is live',
  titleLeading: 'Compete. Collaborate.',
  titleAccent: 'Win together.',
  subtitle:
    'Join developer competitions, build with your squad, climb the leaderboard and earn real recognition.',
  primaryCta: { label: 'Join a Live Arena', href: '/arenas' },
  secondaryCta: { label: 'Explore Contests', href: '/contests' },
} as const;
