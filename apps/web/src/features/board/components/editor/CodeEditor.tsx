'use client';

import { useEffect, useRef } from 'react';
import { basicSetup } from 'codemirror';
import { indentWithTab } from '@codemirror/commands';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { yCollab, yUndoManagerKeymap } from 'y-codemirror.next';
import type { Awareness } from 'y-protocols/awareness';
import * as Y from 'yjs';
import type { EditorLanguage } from '../../utils/editor-language';
import { editorHighlighting, editorTheme } from './editor-theme';

const LANGUAGE_SUPPORT: Record<EditorLanguage, () => Extension> = {
  cpp,
  c: cpp,
  java,
  python,
  javascript,
  typescript: () => javascript({ typescript: true }),
  tsx: () => javascript({ typescript: true, jsx: true }),
  jsx: () => javascript({ jsx: true }),
  plain: () => [],
};

export interface CodeEditorProps {
  /** The shared file this editor edits. */
  text: Y.Text;
  awareness: Awareness;
  language: EditorLanguage;
  /** Read out to screen readers, e.g. "Shared code, C++". */
  label: string;
  /** Scrolls this 1-based line into view when it changes (following someone). */
  revealLine?: number;
  /** Reports the line your caret is on, for your presence. */
  onCaretLine?: (line: number) => void;
  /** Shows the file without letting anyone type in it, e.g. package.json. */
  readOnly?: boolean;
}

/*
 * CodeMirror bound to one shared Y.Text: a language's file on the board, or
 * a file of the room's React project.
 * y-codemirror merges everyone's edits and draws their carets from
 * awareness; undo only undoes your own edits.
 *
 * Tab indents, as people expect in an editor. Escape then Tab moves focus
 * out, which CodeMirror provides, so the editor never traps the keyboard.
 */
export default function CodeEditor({
  text,
  awareness,
  language,
  label,
  revealLine,
  onCaretLine,
  readOnly = false,
}: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const reportLine = useRef(onCaretLine);
  reportLine.current = onCaretLine;

  useEffect(() => {
    if (!host.current) return;
    const undoManager = new Y.UndoManager(text);
    let lastLine = 0;

    const editor = new EditorView({
      parent: host.current,
      doc: text.toString(),
      extensions: [
        keymap.of([...yUndoManagerKeymap, indentWithTab]),
        basicSetup,
        LANGUAGE_SUPPORT[language](),
        editorTheme,
        editorHighlighting,
        yCollab(text, awareness, { undoManager }),
        EditorState.readOnly.of(readOnly),
        EditorView.contentAttributes.of({ 'aria-label': label }),
        EditorView.updateListener.of((update) => {
          if (!update.selectionSet && !update.docChanged) return;
          const line = update.state.doc.lineAt(
            update.state.selection.main.head,
          ).number;
          if (line !== lastLine) {
            lastLine = line;
            reportLine.current?.(line);
          }
        }),
      ],
    });
    view.current = editor;

    return () => {
      view.current = null;
      editor.destroy();
      undoManager.destroy();
    };
  }, [text, awareness, language, label, readOnly]);

  useEffect(() => {
    const editor = view.current;
    if (!editor || !revealLine) return;
    const line = editor.state.doc.line(
      Math.min(revealLine, editor.state.doc.lines),
    );
    editor.dispatch({
      effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
    });
  }, [revealLine]);

  return <div ref={host} className="h-full min-h-0" />;
}
