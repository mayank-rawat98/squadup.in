import type {
  FeatureAudience,
  FeatureFlagPatch,
} from '../types/feature-flag.types';

/** The flag's two switches for an audience; `off` keeps the rollout as it was. */
export function audiencePatch(
  audience: FeatureAudience,
  rolloutToAll: boolean,
): FeatureFlagPatch {
  if (audience === 'off') return { enabled: false, rolloutToAll };
  return { enabled: true, rolloutToAll: audience === 'everyone' };
}

/** How the people list reads: who a person is, in the most useful words available. */
export function personLabel(person: {
  name: string | null;
  email: string | null;
  userId: string;
}): { primary: string; secondary: string | null } {
  if (person.name) return { primary: person.name, secondary: person.email };
  if (person.email) return { primary: person.email, secondary: null };
  return { primary: 'Deleted account', secondary: person.userId };
}
