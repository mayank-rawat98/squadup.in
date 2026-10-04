import type { BoardLanguageId } from '../types/board.types';

/** What the shared editor can highlight: the board's languages and a React project's files. */
export type EditorLanguage =
  | BoardLanguageId
  | 'typescript'
  | 'tsx'
  | 'jsx'
  | 'plain';

const BY_EXTENSION: Record<string, EditorLanguage> = {
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'tsx',
  jsx: 'jsx',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  // JSON reads well with JavaScript's highlighting.
  json: 'javascript',
};

/**
 * The highlighting for a project file, by its extension. CSS, HTML and the
 * rest show as plain text: their CodeMirror packages aren't installed, and
 * a lighter editor is worth more here than their colours.
 */
export function editorLanguageOf(path: string): EditorLanguage {
  const name = path.slice(path.lastIndexOf('/') + 1);
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return 'plain';
  return BY_EXTENSION[name.slice(dot + 1).toLowerCase()] ?? 'plain';
}
