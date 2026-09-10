import type { LucideIcon } from 'lucide-react';

/*
 * Shapes for the landing page's content. Everything here is currently served
 * from `constants/landing.constant.ts`, but the types are written to match
 * what the arena endpoints will return, so swapping the source is a one-file
 * change rather than a rewrite of every section.
 */

/** Keys of the five arena accent token pairs in the design system. */
export type ArenaAccent = 'frontend' | 'backend' | 'devops' | 'react' | 'ai';

export type ArenaDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type ArenaStatus =
  | 'live'
  | 'registration-open'
  | 'starts-soon'
  | 'coming-soon';

export interface Arena {
  id: string;
  slug: string;
  name: string;
  /** One concise sentence. The doc is explicit that this stays a single line. */
  description: string;
  icon: LucideIcon;
  accent: ArenaAccent;
  /** "Solo", "Duo", "Team of 4". */
  teamSize: string;
  /** "60 Minutes", "3 Hours", "Weekend Challenge". */
  duration: string;
  difficulty: ArenaDifficulty;
  /** "₹10,000", "SquadUp Merchandise", "XP Rewards". */
  prize: string;
  status: ArenaStatus;
  /*
   * Populated by the API, absent until then. The landing page renders the
   * card without them rather than inventing figures — see the note at the top
   * of landing.constant.ts.
   */
  participants?: number;
  endsAt?: string;
  startsAt?: string;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: Array<NavItem & { comingSoon?: boolean }>;
}

/** A card in the Find -> Form -> Compete flow. */
export interface SquadStep {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

/** A stage in the Build Inside SquadUp workflow. */
export interface BuildStep {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  /** Rendered as a short bullet list under the description. */
  highlights?: string[];
}

/** One of the four roles shown on the example squad card. */
export interface SquadRole {
  name: string;
  role: string;
  accent: ArenaAccent;
}

/** A recognition badge a squad can earn in an arena. */
export interface Achievement {
  id: string;
  icon: LucideIcon;
  label: string;
  accent: ArenaAccent;
}

/** A stage in the vertical growth journey. */
export interface JourneyStage {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  /** Short supporting points, rendered as a list. */
  points?: string[];
}

/** One of the four reward columns. */
export interface RewardCategory {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  examples: string[];
  accent: ArenaAccent;
}

/** One of the three developer stories in Join the Builders. */
export interface BuilderStory {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
}

/** A community a developer can join. */
export interface CommunityGroup {
  label: string;
  accent: ArenaAccent;
}

export interface FaqEntry {
  id: string;
  question: string;
  /** Paragraphs. Rendered in order. */
  answer: string[];
  /** Optional bullets shown under the answer. */
  points?: string[];
}
