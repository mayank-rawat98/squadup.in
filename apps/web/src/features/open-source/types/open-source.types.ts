import type { LucideIcon } from 'lucide-react';

export interface WayToHelp {
  icon: LucideIcon;
  title: string;
  description: string;
  link: { label: string; href: string };
}

export interface ContributionStep {
  title: string;
  description: string;
}
