import { SOCIAL_LINKS } from './navigation';

/*
 * What search engines and link previews say about SquadUp. One place, so the
 * root metadata, the manifest and the structured data
 * can't drift apart.
 */

export const SITE = {
  name: 'SquadUp',
  url: 'https://squadup.in',
  tagline: 'Compete. Collaborate. Win together.',
  description:
    'SquadUp is where student developers code, compete and build together, alone or as a squad. Arenas are proctored, so what you build and win is genuinely yours, not an AI’s.',
  keywords: [
    'SquadUp',
    'coding competitions',
    'developer arena',
    'hackathon',
    'student developers',
    'coding challenges',
    'proctored coding',
    'team coding',
    'leaderboard',
    'India',
  ],
  locale: 'en_IN',
  twitterHandle: '@squadup_in',
} as const;

/*
 * Brand colours for places that can't read CSS tokens: the manifest and the
 * browser theme colour. They repeat the light theme's --primary, --background
 * and --foreground from libs/ui/src/styles/index.css, as do the raster icons
 * from tools/generate-brand-icons.mjs.
 */
export const BRAND_COLORS = {
  primary: '#7c3aed',
  background: '#fcfbfe',
  foreground: '#171221',
} as const;

/** Profiles elsewhere that are SquadUp's own, for structured data. */
export const SAME_AS: readonly string[] = SOCIAL_LINKS.map(
  ({ href }) => href,
).filter((href) => href.startsWith('https://'));
