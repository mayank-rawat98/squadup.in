import {
  Atom,
  Brain,
  Code,
  Code2,
  Container,
  Eye,
  PanelsTopLeft,
  Rocket,
  Send,
  Target,
  Trophy,
  UserSearch,
  Users,
  UsersRound,
} from 'lucide-react';
import type {
  Arena,
  BuildStep,
  SquadRole,
  SquadStep,
} from '../types/landing.types';

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
  { text: string; tile: string; ring: string; dot: string }
> = {
  frontend: {
    text: 'text-arena-frontend',
    tile: 'bg-arena-frontend-soft',
    ring: 'group-hover:border-arena-frontend/40',
    dot: 'bg-arena-frontend',
  },
  backend: {
    text: 'text-arena-backend',
    tile: 'bg-arena-backend-soft',
    ring: 'group-hover:border-arena-backend/40',
    dot: 'bg-arena-backend',
  },
  devops: {
    text: 'text-arena-devops',
    tile: 'bg-arena-devops-soft',
    ring: 'group-hover:border-arena-devops/40',
    dot: 'bg-arena-devops',
  },
  react: {
    text: 'text-arena-react',
    tile: 'bg-arena-react-soft',
    ring: 'group-hover:border-arena-react/40',
    dot: 'bg-arena-react',
  },
  ai: {
    text: 'text-arena-ai',
    tile: 'bg-arena-ai-soft',
    ring: 'group-hover:border-arena-ai/40',
    dot: 'bg-arena-ai',
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

/* -------------------------------------------------------------------------
 * Section 1 — Choose Your Arena
 * ---------------------------------------------------------------------- */

export const CHOOSE_ARENA_COPY = {
  title: 'Choose Your Arena',
  subtitle:
    'Compete in real-world software challenges across different technologies. Join solo or with your squad.',
} as const;

/* -------------------------------------------------------------------------
 * Section 2 — Build Your Squad
 * ---------------------------------------------------------------------- */

export const BUILD_SQUAD_COPY = {
  title: 'Build Your Squad',
  subtitle:
    'Great software is not built alone. Find teammates, create your squad, and compete together across every challenge.',
  /* Closes the section instead of a button, so it leads into the next one. */
  statement: 'Every great product starts with a great squad.',
} as const;

export const SQUAD_STEPS: SquadStep[] = [
  {
    id: 'find',
    icon: UserSearch,
    title: 'Find Developers',
    description:
      'Discover developers who match your interests, skills and preferred technologies.',
  },
  {
    id: 'create',
    icon: UsersRound,
    title: 'Create Your Squad',
    description:
      'Invite teammates, assign roles, and create a permanent squad that competes together in every arena.',
  },
  {
    id: 'compete',
    icon: Trophy,
    title: 'Compete Together',
    description:
      'Enter hackathons, coding battles and challenges as one squad while climbing the leaderboards.',
  },
];

/*
 * The example squad on the middle card. An illustration of the product, not a
 * claim about a real team — the name is invented and reads that way.
 */
export const EXAMPLE_SQUAD = {
  name: 'Team PixelForge',
  roles: [
    { name: 'Ira N', role: 'Frontend', accent: 'frontend' },
    { name: 'Dev K', role: 'Backend', accent: 'backend' },
    { name: 'Sam R', role: 'DevOps', accent: 'devops' },
    { name: 'Ana P', role: 'AI', accent: 'ai' },
  ] satisfies SquadRole[],
} as const;

/* -------------------------------------------------------------------------
 * Section 3 — Build Inside SquadUp
 * ---------------------------------------------------------------------- */

export const BUILD_INSIDE_COPY = {
  title: 'Build Inside SquadUp',
  subtitle:
    'Everything your squad needs, from the challenge brief to the final submission, lives in one collaborative workspace.',
} as const;

export const BUILD_STEPS: BuildStep[] = [
  {
    id: 'challenge',
    icon: Target,
    title: 'Receive the Challenge',
    description:
      'Every arena opens with a real engineering problem, not an isolated question. Your squad has a fixed window to ship a complete solution.',
  },
  {
    id: 'squad',
    icon: Users,
    title: 'Form Your Squad',
    description:
      'Invite developers with complementary skills and assign roles before the clock starts.',
    highlights: ['Frontend', 'Backend', 'DevOps', 'AI / ML'],
  },
  {
    id: 'workspace',
    icon: Code,
    title: 'Build Together',
    description:
      'Work inside one shared development environment where the whole squad stays in sync.',
    highlights: [
      'Collaborative editor',
      'Live cursors',
      'Shared terminal',
      'Voice and chat',
    ],
  },
  {
    id: 'preview',
    icon: Eye,
    title: 'Test as You Build',
    description:
      'Preview the application instantly while building. Iterate, debug and refine without leaving the platform.',
  },
  {
    id: 'deploy',
    icon: Rocket,
    title: 'Deploy Instantly',
    description:
      'Publish straight from SquadUp and generate a live deployment judges can open immediately. No external hosting.',
  },
  {
    id: 'submit',
    icon: Send,
    title: 'Submit Your Project',
    description:
      'Finalise in one click. The submission carries the live app, the source, the documentation and the project details.',
  },
];

/** The full-width banner that closes Build Inside SquadUp. */
export const PHILOSOPHY_COPY = {
  heading: 'Build products. Not prompts.',
  body: [
    'Modern software development is more than writing code. SquadUp rewards engineering thinking, collaboration, architecture, creativity and execution.',
    'AI can generate code. Only developers can design systems, make decisions, solve real problems and build products that matter.',
  ],
} as const;
