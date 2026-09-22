import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';
import { createTV } from 'tailwind-variants';

/*
 * Custom typography utilities are declared as `@utility text-*` in
 * src/styles/index.css. tailwind-merge doesn't know about them — by default it
 * reads an unrecognised `text-*` as a text COLOR, so it would drop e.g.
 * `text-body` when a `text-white` follows it. Registering them in the
 * `font-size` group keeps size and colour independent.
 *
 * Keep this list in sync with the `@utility text-*` blocks in
 * src/styles/index.css.
 */
const FONT_SIZE_SUFFIXES: string[] = [
  'badge',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'subtitle',
  'subtitle2',
  'body',
  'body-sm',
  'caption',
  'micro',
  'overline',
  'display-xl',
  'display-lg',
  'display-md',
  'display-sm',
];

/*
 * Shared so both tailwind-merge (`cn`) and tailwind-variants (`tv`) resolve
 * these the same way — `tv` runs its OWN internal merge, so configuring `cn`
 * alone isn't enough. Components built with variants must use the `tv` below,
 * never the one imported straight from "tailwind-variants".
 */
const TW_MERGE_CONFIG = {
  extend: {
    classGroups: {
      'font-size': [{ text: FONT_SIZE_SUFFIXES }],
    },
  },
};

const twMerge = extendTailwindMerge(TW_MERGE_CONFIG);

export const tv = createTV({ twMergeConfig: TW_MERGE_CONFIG });

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type { ClassValue };
