/*
 * Each person in a room gets one of the six presence colours, by the order
 * they joined, so everyone in the room sees the same person in the same
 * colour. Tailwind needs the class names written out to generate them.
 */

const PRESENCE_COUNT = 6;

const PRESENCE_BG = [
  'bg-presence-1',
  'bg-presence-2',
  'bg-presence-3',
  'bg-presence-4',
  'bg-presence-5',
  'bg-presence-6',
] as const;

export interface PresenceColour {
  /** Tailwind background class for avatars and name tags. */
  bgClass: string;
  /** CSS colour for inline styles, canvas and the editor's carets. */
  css: string;
  /** The same colour, faded, for selections. */
  cssFaded: string;
}

export function presenceColour(index: number): PresenceColour {
  const slot = ((index % PRESENCE_COUNT) + PRESENCE_COUNT) % PRESENCE_COUNT;
  const token = `--presence-${slot + 1}`;
  return {
    bgClass: PRESENCE_BG[slot],
    css: `hsl(var(${token}))`,
    cssFaded: `hsl(var(${token}) / 0.25)`,
  };
}

/** The colour slot for a member, by their position in the room's join order. */
export function presenceIndex(memberIds: readonly string[], userId: string) {
  const index = memberIds.indexOf(userId);
  return index === -1 ? memberIds.length : index;
}

/** "Diya Shah" → "DS", "@diya" → "D". */
export function initialsOf(name: string): string {
  return name
    .replace(/^@/, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase();
}
