import type { SandpackTheme } from '@codesandbox/sandpack-react';

/*
 * Sandpack's editor, tabs and preview chrome drawn from the design tokens,
 * so they follow the light and dark themes like the board's editor
 * (features/board editor-theme). Sandpack writes these values into CSS
 * custom properties, so `hsl(var(--token))` resolves live.
 */

const token = (name: string, alpha?: number) =>
  alpha === undefined
    ? `hsl(var(--${name}))`
    : `hsl(var(--${name}) / ${alpha})`;

export const sandpackTheme: SandpackTheme = {
  colors: {
    surface1: token('card'),
    surface2: token('border'),
    surface3: token('muted'),
    clickable: token('muted-foreground'),
    base: token('foreground'),
    disabled: token('muted-foreground', 0.6),
    hover: token('foreground'),
    accent: token('primary'),
    error: token('danger'),
    errorSurface: token('danger', 0.1),
    warning: token('warning'),
    warningSurface: token('warning', 0.1),
  },
  syntax: {
    plain: token('foreground'),
    comment: { color: token('muted-foreground'), fontStyle: 'italic' },
    keyword: token('primary'),
    tag: token('presence-3'),
    punctuation: token('muted-foreground'),
    definition: token('presence-5'),
    property: token('presence-1'),
    static: token('presence-4'),
    string: token('presence-2'),
  },
  font: {
    body: 'var(--font-sans)',
    mono: 'var(--font-mono)',
    size: '13px',
    lineHeight: '22px',
  },
};
