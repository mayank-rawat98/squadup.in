import {
  Atom,
  Award,
  BadgeCheck,
  Banknote,
  Blocks,
  Boxes,
  Brain,
  Briefcase,
  Code,
  Code2,
  Cog,
  Compass,
  Container,
  Eye,
  GitBranch,
  Handshake,
  Lightbulb,
  Medal,
  Palette,
  PanelsTopLeft,
  Rocket,
  Send,
  Target,
  TrendingUp,
  Trophy,
  UserSearch,
  Users,
  UsersRound,
  Zap,
} from 'lucide-react';
import type {
  Achievement,
  Arena,
  BuilderStory,
  BuildStep,
  CommunityGroup,
  FaqEntry,
  JourneyStage,
  RewardCategory,
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
    prize: '3D-Printed Trophy',
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

/* -------------------------------------------------------------------------
 * Section 4 — Hall of Champions
 * ---------------------------------------------------------------------- */

export const CHAMPIONS_COPY = {
  title: 'Hall of Champions',
  subtitle:
    'Every great product deserves recognition. Discover the squads and developers building exceptional software inside SquadUp.',
  /*
   * No squads have competed yet, so this section ships its real layout around
   * an empty state rather than inventing winners. The achievement categories
   * below are genuine — they are awards we define, not results we are claiming.
   */
  emptyTitle: 'The first champions are yet to be crowned',
  emptyBody:
    'Squads, winning projects and arena titles appear here as soon as the first arenas close. Enter one and your squad could be the first.',
  emptyCta: { label: 'Enter an arena', href: '/arenas' },
} as const;

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'champion', icon: Trophy, label: 'Arena Champion', accent: 'react' },
  { id: 'deploy', icon: Zap, label: 'Fastest Deployment', accent: 'devops' },
  { id: 'ui', icon: Palette, label: 'Best UI / UX', accent: 'frontend' },
  {
    id: 'architecture',
    icon: Cog,
    label: 'Best Architecture',
    accent: 'backend',
  },
  {
    id: 'collab',
    icon: Handshake,
    label: 'Best Collaboration',
    accent: 'devops',
  },
  { id: 'innovation', icon: Lightbulb, label: 'Most Innovative', accent: 'ai' },
];

/* -------------------------------------------------------------------------
 * Section 5 — Every Arena Makes You Better
 * ---------------------------------------------------------------------- */

export const JOURNEY_COPY = {
  title: 'Every Arena Makes You Better',
  subtitle:
    'Whether you finish first or fiftieth, every challenge leaves you a stronger developer and a better teammate.',
  statement:
    'Every arena ends with something more valuable than a prize. You leave with a product, new teammates, and experience that stays with you long after the competition ends.',
} as const;

export const JOURNEY_STAGES: JourneyStage[] = [
  {
    id: 'build',
    icon: Blocks,
    title: 'Build Something Real',
    description:
      'Every arena ends with a working application. Not a solved question, not an uploaded PDF. A real product.',
  },
  {
    id: 'portfolio',
    icon: Briefcase,
    title: 'Strengthen Your Portfolio',
    description:
      'Every completed challenge becomes part of your public developer profile.',
    points: ['Projects', 'Technologies', 'Contributions', 'Team participation'],
  },
  {
    id: 'recognition',
    icon: Medal,
    title: 'Earn Recognition',
    description:
      'Unlock badges, arena titles, featured projects and squad achievements. Recognition lasts longer than prize money.',
  },
  {
    id: 'engineer',
    icon: TrendingUp,
    title: 'Improve as an Engineer',
    description:
      'The goal is to become a better engineer, not a better contestant.',
    points: [
      'Communication',
      'Architecture',
      'Debugging',
      'Time management',
      'Collaboration',
    ],
  },
  {
    id: 'opportunity',
    icon: Compass,
    title: 'Open New Opportunities',
    description:
      'Companies discover your work, developers invite you to squads, and your portfolio speaks for itself.',
  },
];

/* -------------------------------------------------------------------------
 * Section 6 — Rewards & Recognition
 * ---------------------------------------------------------------------- */

export const REWARDS_COPY = {
  title: 'Build. Compete. Get Recognized.',
  subtitle:
    'Every project you build brings more than experience. Earn exclusive rewards, unlock achievements, and grow your reputation as a developer.',
} as const;

export const REWARD_CATEGORIES: RewardCategory[] = [
  {
    id: 'cash',
    icon: Banknote,
    title: 'Win Real Prizes',
    description:
      'Top-performing squads receive cash prizes for outstanding engineering, innovation and execution.',
    examples: [
      'Arena winner prizes',
      'Championship prize pool',
      'Sponsored rewards',
    ],
    accent: 'backend',
  },
  {
    id: 'achievements',
    icon: Award,
    title: 'Earn Achievements',
    description:
      'Unlock badges that represent your journey as a builder. Achievements become part of your public profile.',
    examples: [
      'Arena Champion',
      'Best UI',
      'Fastest Deployment',
      'Team Player',
    ],
    accent: 'frontend',
  },
  {
    id: 'merch',
    icon: Boxes,
    title: 'Earn It. Never Buy It.',
    /*
     * 3D-printed pieces lead here on purpose. Hoodies and stickers are given
     * away at every hackathon, so they cannot carry the "I earned this"
     * signal on their own. A printed trophy cut for one squad and one win
     * can, because there is nowhere to buy one. The classic merch stays, one
     * tier down.
     */
    description:
      'Squad Points unlock rewards that are not for sale. The centrepiece is 3D printed for your squad and your win, with the usual merch alongside it.',
    examples: [
      '3D-printed arena trophies',
      'Custom squad keycaps',
      'Printed desk pieces',
      'Hoodies, tees and stickers',
    ],
    accent: 'react',
  },
  {
    id: 'reputation',
    icon: BadgeCheck,
    title: 'Build Your Reputation',
    description:
      'Every competition strengthens your public developer profile and the story it tells.',
    examples: [
      'Projects built',
      'Arenas completed',
      'Squad history',
      'Tech used',
    ],
    accent: 'ai',
  },
];

/** The progression system that ties participation to the reward catalogue. */
export const SQUAD_POINTS_COPY = {
  title: 'Squad Points',
  description:
    'The long-term progression system. Points accumulate through everything you do on the platform, and they are the only way to reach the rewards catalogue.',
  earn: [
    'Participating in arenas',
    'Completing projects',
    'Winning competitions',
    'Helping teammates',
    'Contributing to the community',
    'Maintaining streaks',
  ],
  unlock: [
    '3D-printed rewards',
    'Classic merch',
    'Profile customisations',
    'Exclusive arenas',
    'Community perks',
    'Seasonal rewards',
  ],
} as const;

/* -------------------------------------------------------------------------
 * Section 7 — Join the Builders
 * ---------------------------------------------------------------------- */

export const BUILDERS_COPY = {
  title: 'Find Your People. Build Your Future.',
  subtitle:
    'Every great product starts with a team. Connect with developers who share your passion, complement your skills, and are ready to build something meaningful.',
} as const;

export const BUILDER_STORIES: BuilderStory[] = [
  {
    id: 'meet',
    icon: UserSearch,
    title: 'Meet Developers Like You',
    description:
      'Browse developers by technology, interest, experience and availability. Whether you need a frontend specialist, a backend architect or an AI enthusiast, SquadUp helps you build a balanced team.',
  },
  {
    id: 'beyond',
    icon: GitBranch,
    title: 'Projects Do Not End When Arenas Do',
    description:
      'The best ideas deserve more than a leaderboard. Keep collaborating after the competition, improve what you built, and turn a weekend project into a real product.',
  },
  {
    id: 'together',
    icon: Users,
    title: 'One Squad. Many Arenas.',
    description:
      'Stay with your squad across competitions. Build trust, sharpen how you work together, and develop a shared engineering identity over time.',
  },
];

export const COMMUNITY_GROUPS: CommunityGroup[] = [
  { label: 'Frontend Builders', accent: 'frontend' },
  { label: 'Backend Engineers', accent: 'backend' },
  { label: 'DevOps Enthusiasts', accent: 'devops' },
  { label: 'AI & ML Developers', accent: 'ai' },
  { label: 'Open Source Contributors', accent: 'backend' },
  { label: 'UI/UX Designers', accent: 'frontend' },
  { label: 'Startup Builders', accent: 'react' },
  { label: 'College Chapters', accent: 'devops' },
];

/*
 * The signature idea of the section: a squad is a lasting identity, not a team
 * that dissolves when the event ends.
 */
export const PERSISTENT_SQUADS_COPY = {
  title: 'Persistent Squads',
  description:
    'A SquadUp squad has its own identity. It carries a name, a profile, a win history, the projects it has built and the badges it has earned. Your squad becomes your reputation.',
  attributes: [
    'Squad profile',
    'Win history',
    'Projects built',
    'Technologies mastered',
    'Achievement badges',
    'Public reputation',
  ],
} as const;

/* -------------------------------------------------------------------------
 * Section 8 — Built on SquadUp
 * ---------------------------------------------------------------------- */

export const BUILT_ON_COPY = {
  title: 'Built on SquadUp',
  subtitle:
    'Every arena creates more than winners. It creates products, friendships, and developers who keep building long after the competition ends.',
  /*
   * The brief is explicit here: do not invent testimonials. This section ships
   * as a featured-projects showcase with nothing in it yet, and fills up with
   * real work as arenas close. Three real projects beat ten invented quotes.
   */
  emptyTitle: 'The first projects are being built right now',
  emptyBody:
    'This is where finished work goes: the project, the squad that built it, the stack they chose and a link you can open. Real builds only, added as arenas close.',
  emptyCta: { label: 'Start building', href: '/signup' },
} as const;

/* -------------------------------------------------------------------------
 * Section 9 — The Future of Building
 * ---------------------------------------------------------------------- */

export const MANIFESTO_COPY = {
  title: 'We Are Building the Future of Developer Collaboration',
  subtitle:
    'Software is not built by individuals racing against timers. It is built by teams solving real problems together. SquadUp exists to make that experience available to every developer.',
  beliefs: [
    'Great developers are not measured by how many problems they solve. They are measured by what they build.',
    'The best engineering happens through discussion, collaboration, experimentation and iteration. Not in isolation.',
    'AI can accelerate development. But curiosity, creativity, system design, communication and judgement will always belong to humans.',
    'Every developer deserves a place where learning happens through building, not through memorising.',
    'The best products begin with one idea, and one squad willing to build it.',
  ],
  closing: 'Build products. Build friendships. Build your future.',
  closingSub: 'Welcome to SquadUp.',
} as const;

/* -------------------------------------------------------------------------
 * Section 10 — Frequently Asked Questions
 * ---------------------------------------------------------------------- */

export const FAQ_COPY = {
  title: 'Frequently Asked Questions',
  subtitle: 'Everything you need to know before joining your first arena.',
  stillStuck: {
    title: 'Still have a question?',
    body: 'Could not find what you are looking for? Join our Discord, reach out to the community, or contact the team. We are happy to help.',
    cta: { label: 'Contact us', href: '/contact' },
    secondaryCta: { label: 'Join Discord', href: '/discord' },
  },
} as const;

export const FAQS: FaqEntry[] = [
  {
    id: 'what',
    question: 'What is SquadUp?',
    answer: [
      'SquadUp is a collaborative developer arena where individuals and teams build real software through project-based competitions.',
      'Instead of solving coding questions, participants create complete applications inside a shared workspace and compete on engineering quality, creativity and execution.',
    ],
  },
  {
    id: 'team',
    question: 'Do I need a team before joining?',
    answer: [
      'No. You can compete solo or create a squad. If you do not have teammates yet, SquadUp helps you find developers with complementary skills and build one.',
    ],
  },
  {
    id: 'beginners',
    question: 'Can beginners participate?',
    answer: [
      'Yes. Arenas run at multiple difficulty levels, from beginner-friendly challenges to advanced engineering competitions. The goal is continuous learning and building, not just winning.',
    ],
  },
  {
    id: 'inside',
    question: 'Do I build projects inside SquadUp?',
    answer: [
      'Yes. Every arena gives your squad a collaborative workspace to code, communicate, preview, deploy and submit, without leaving the platform.',
    ],
  },
  {
    id: 'judging',
    question: 'How are projects evaluated?',
    answer: [
      'Against the criteria of the specific challenge. Depending on the arena, judging may weigh functionality, user experience, technical implementation, creativity, performance and overall execution.',
    ],
  },
  {
    id: 'prizes',
    question: 'What can I win?',
    answer: [
      'It depends on the competition. Every completed project also strengthens your developer profile, whether or not you place.',
      'Physical rewards are earned with Squad Points and never sold. Most of the catalogue is 3D printed for the squad that won it, so there is nowhere else to get one.',
    ],
    points: [
      'Cash prizes',
      'Squad Points',
      'Achievement badges',
      'Public recognition',
      '3D-printed rewards',
      'Classic merch',
    ],
  },
  {
    id: 'free',
    question: 'Is SquadUp free?',
    answer: [
      'Yes. Creating an account, joining squads and entering standard arenas is free. Premium experiences or sponsored competitions may be introduced later.',
    ],
  },
  {
    id: 'after',
    question: 'Can I keep working on my project after the arena ends?',
    answer: [
      'Yes. Projects belong to your squad. Keep improving them, put them in your portfolio, or turn them into real products.',
    ],
  },
  {
    id: 'ownership',
    question: 'Who owns the projects built on SquadUp?',
    answer: [
      'Your squad does. SquadUp provides the collaborative environment and claims no ownership of what you build.',
    ],
  },
  {
    id: 'different',
    question: 'Why is SquadUp different from other coding platforms?',
    answer: [
      'Most platforms focus on solving questions or submitting a finished file. SquadUp focuses on building real software together, combining collaboration, competition, project building and developer growth into one experience.',
    ],
  },
];

/* -------------------------------------------------------------------------
 * Section 11 — Your First Arena Starts Here
 * ---------------------------------------------------------------------- */

export const FINAL_CTA_COPY = {
  title: 'Your Next Great Project Starts Here.',
  subtitle:
    'Join developers who are building real products, forming lasting squads, and growing through every arena. Your first challenge is waiting.',
  primaryCta: { label: 'Enter Your First Arena', href: '/signup' },
  secondaryCta: { label: 'Explore Arenas', href: '/arenas' },
  /* Removes the two biggest objections without adding another FAQ entry. */
  supporting: [
    'No team? We will help you find one.',
    'New to development? Start with a beginner-friendly arena.',
  ],
  closing:
    'Every great product started with one idea. Every great team started with one squad.',
} as const;
