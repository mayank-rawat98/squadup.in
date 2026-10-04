import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';

/*
 * The editor drawn from the design tokens, so it follows the light and dark
 * themes like the rest of the app. CodeMirror's default highlight style
 * hard-codes colours for a light page; this one uses the palette instead.
 */

const token = (name: string, alpha?: number) =>
  alpha === undefined
    ? `hsl(var(--${name}))`
    : `hsl(var(--${name}) / ${alpha})`;

export const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    color: token('foreground'),
    backgroundColor: token('card'),
    fontSize: '13px',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono)',
    lineHeight: '22px',
    overflow: 'auto',
  },
  '.cm-content': { padding: '12px 0', caretColor: token('foreground') },
  '.cm-gutters': {
    backgroundColor: token('card'),
    color: token('muted-foreground'),
    border: 'none',
  },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 12px 0 16px' },
  '.cm-activeLine': { backgroundColor: token('accent', 0.45) },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: token('foreground'),
  },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: token('foreground') },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection':
    { backgroundColor: token('primary', 0.22) },
  '.cm-matchingBracket': {
    backgroundColor: token('primary', 0.18),
    outline: `1px solid ${token('primary', 0.4)}`,
  },
  '.cm-tooltip': {
    backgroundColor: token('popover'),
    color: token('popover-foreground'),
    border: `1px solid ${token('border')}`,
    borderRadius: '8px',
  },
  // Name tags on everyone else's caret stay visible, as in the design.
  '.cm-ySelectionInfo': {
    opacity: '1',
    top: '-1.15em',
    padding: '1px 6px',
    borderRadius: '4px 4px 4px 0',
    fontFamily: 'var(--font-sans)',
    fontSize: '10.5px',
    fontWeight: '600',
    lineHeight: '14px',
    color: token('presence-foreground'),
  },
});

const highlight = HighlightStyle.define([
  {
    tag: [tags.keyword, tags.controlKeyword, tags.moduleKeyword],
    color: token('primary'),
  },
  { tag: [tags.string, tags.special(tags.string)], color: token('presence-2') },
  { tag: [tags.number, tags.bool, tags.null], color: token('presence-4') },
  {
    tag: [tags.typeName, tags.className, tags.namespace],
    color: token('presence-3'),
  },
  {
    tag: [tags.function(tags.variableName), tags.function(tags.propertyName)],
    color: token('presence-5'),
  },
  {
    tag: [tags.comment, tags.lineComment, tags.blockComment],
    color: token('muted-foreground'),
    fontStyle: 'italic',
  },
  { tag: [tags.processingInstruction, tags.meta], color: token('presence-1') },
  { tag: tags.invalid, color: token('danger') },
]);

export const editorHighlighting = syntaxHighlighting(highlight);
