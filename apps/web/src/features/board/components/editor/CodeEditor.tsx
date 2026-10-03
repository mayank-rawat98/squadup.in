'use client';

import { useEffect, useRef } from 'react';
import { basicSetup } from 'codemirror';
import { indentWithTab } from '@codemirror/commands';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import type { Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { yCollab, yUndoManagerKeymap } from 'y-codemirror.next';
import type { Awareness } from 'y-protocols/awareness';
import * as Y from 'yjs';
import { BOARD_DOC } from '../../constants/board.constant';
import type { BoardLanguageId } from '../../types/board.types';
import { editorHighlighting, editorTheme } from './editor-theme';

const LANGUAGE_SUPPORT: Record<BoardLanguageId, () => Extension> = {
  cpp,
  c: cpp,
  java,
  python,
  javascript,
};

export interface CodeEditorProps {
  doc: Y.Doc;
  awareness: Awareness;
  language: BoardLanguageId;
  /** Read out to screen readers, e.g. "Shared code, C++". */
  label: string;
  /** Scrolls this 1-based line into view when it changes (following someone). */
  revealLine?: number;
  /** Reports the line your caret is on, for your presence. */
  onCaretLine?: (line: number) => void;
}

/*
 * CodeMirror bound to the room's shared Y.Text for the current language.
 * y-codemirror merges everyone's edits and draws their carets from
 * awareness; undo only undoes your own edits.
 *
 * Tab indents, as people expect in an editor. Escape then Tab moves focus
 * out, which CodeMirror provides, so the editor never traps the keyboard.
 */
export default function CodeEditor({
  doc,
  awareness,
  language,
  label,
  revealLine,
  onCaretLine,
}: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const reportLine = useRef(onCaretLine);
  reportLine.current = onCaretLine;

  useEffect(() => {
    if (!host.current) return;
    const text = doc.getText(BOARD_DOC.code(language));
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
  }, [doc, awareness, language, label]);

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
