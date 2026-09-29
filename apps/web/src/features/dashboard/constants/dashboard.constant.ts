import type { LucideIcon } from 'lucide-react';
import { Code2, Swords, Trophy, Users } from 'lucide-react';

/*
 * The dashboard's stats have no source until challenges and arenas ship
 * (Milestones 3 and 4), so each tile names what will fill it rather than
 * showing a made-up number.
 */
export const DASHBOARD_STATS = [
  { label: 'Challenges solved', note: 'Starts with solo challenges' },
  { label: 'Arenas joined', note: 'Starts with arenas' },
  { label: 'Global rank', note: 'Starts with leaderboards' },
] as const;

export interface ComingUpItem {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const COMING_UP: readonly ComingUpItem[] = [
  {
    title: 'Solo challenges',
    description: 'Solve problems in the browser and climb the leaderboard.',
    icon: Code2,
  },
  {
    title: 'Arenas',
    description: 'Timed, proctored contests where the work is your own.',
    icon: Swords,
  },
  {
    title: 'Coding board',
    description: 'Find a squad and build a project together.',
    icon: Users,
  },
  {
    title: 'Rewards',
    description: 'Turn your wins into points you can spend in the store.',
    icon: Trophy,
  },
];

/* Where "Finish your profile" points. */
export const PROFILE_SETTINGS_HREF = '/settings/profile';
