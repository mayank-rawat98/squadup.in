import { Bug, BookOpen, GitPullRequest, Lightbulb } from 'lucide-react';
import { REPOSITORY_LINKS } from '@/config/repository';
import type { ContributionStep, WayToHelp } from '../types/open-source.types';

/*
 * The /open-source page's copy. It restates CONTRIBUTING.md in a few lines
 * and links to it for the details, so the rules live in one place: the
 * repository.
 */

export const OPEN_SOURCE_INTRO = {
  title: 'SquadUp is open source',
  description:
    'The whole platform, from the arenas to this page, is built in the open under the MIT licence. Read the code, run it yourself, and help build it.',
} as const;

export const WAYS_TO_HELP: WayToHelp[] = [
  {
    icon: GitPullRequest,
    title: 'Fix an issue',
    description:
      'Pick an open issue, build it on a branch and open a pull request. Issues labelled "good first issue" are a gentle start.',
    link: {
      label: 'Browse good first issues',
      href: REPOSITORY_LINKS.goodFirstIssues,
    },
  },
  {
    icon: Bug,
    title: 'Report a bug',
    description:
      'Found something broken? Tell us the steps to reproduce it, what you expected and what happened instead.',
    link: { label: 'Open a bug report', href: REPOSITORY_LINKS.newIssue },
  },
  {
    icon: Lightbulb,
    title: 'Suggest a feature',
    description:
      'Describe the problem and who has it, and the outcome you would like. We agree on the approach before anyone builds it.',
    link: { label: 'Suggest a feature', href: REPOSITORY_LINKS.newIssue },
  },
  {
    icon: BookOpen,
    title: 'Improve the docs',
    description:
      'Clearer setup steps, a missing explanation, a typo. Documentation changes are as welcome as code.',
    link: {
      label: 'Read the contributing guide',
      href: REPOSITORY_LINKS.contributing,
    },
  },
];

export const CONTRIBUTION_STEPS: ContributionStep[] = [
  {
    title: 'Pick an issue',
    description:
      'Choose one from the issues or the roadmap. For anything bigger than a small fix, comment first so we can agree on the approach.',
  },
  {
    title: 'Branch from dev',
    description:
      'Fork the repository and name your branch after the issue, like feat/12-sign-in-page. Never work on main.',
  },
  {
    title: 'Build and check it',
    description:
      'Follow the engineering guide. The git hooks run lint, typecheck, tests and the build before you push.',
  },
  {
    title: 'Open a pull request',
    description:
      'Target dev, link the issue with "Closes #12" and fill in the template. A maintainer reviews it before it merges.',
  },
];

export const OPEN_SOURCE_RESOURCES = [
  { label: 'Contributing guide', href: REPOSITORY_LINKS.contributing },
  { label: 'Roadmap', href: REPOSITORY_LINKS.roadmap },
  { label: 'Open issues', href: REPOSITORY_LINKS.issues },
  { label: 'MIT licence', href: REPOSITORY_LINKS.license },
] as const;
