import React, { useEffect, useRef, useState } from 'react';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { indentUnit } from '@codemirror/language';
import { basicSetup } from 'codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { cpp } from '@codemirror/lang-cpp';
import { rust } from '@codemirror/lang-rust';
import { LANGUAGE_META, type Language } from '../types';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: Language;
  onRun: () => void;
  onSubmit: () => void;
  readOnly?: boolean;
}

const MAX_CHARS = 65536;

function languageExtension(language: Language): Extension {
  switch (language) {
    case 'python':
      return python();
    case 'javascript':
      return javascript();
    case 'typescript':
      return javascript({ typescript: true });
    case 'cpp':
      return cpp();
    case 'rust':
      return rust();
  }
}

/** Keeps the editor's background transparent so it sits on the app's panel. */
const appTheme = EditorView.theme(
  {
    '&': { height: '100%', backgroundColor: 'transparent', fontSize: '13px' },
    '.cm-scroller': { fontFamily: 'ui-monospace, "JetBrains Mono", Menlo, monospace', lineHeight: '1.5rem' },
    '.cm-gutters': {
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
      borderRight: '1px solid rgba(30, 41, 59, 0.8)',
      color: '#475569',
    },
    '.cm-activeLine': { backgroundColor: 'rgba(30, 41, 59, 0.45)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: '#cbd5e1' },
    '&.cm-focused': { outline: 'none' },
  },
  { dark: true }
);

/**
 * Code editor built on CodeMirror 6: syntax highlighting, bracket matching,
 * autocomplete, undo history, and language-aware indentation.
 * Ctrl/Cmd+Enter runs the examples; Ctrl/Cmd+Shift+Enter submits.
 */
export const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, language, onRun, onSubmit, readOnly }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const languageCompartment = useRef(new Compartment());
  const readOnlyCompartment = useRef(new Compartment());
  const indentCompartment = useRef(new Compartment());

  // Callbacks change every render; read the latest through refs so the view is created once.
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  const onSubmitRef = useRef(onSubmit);
  onChangeRef.current = onChange;
  onRunRef.current = onRun;
  onSubmitRef.current = onSubmit;

  const [caret, setCaret] = useState({ line: 1, col: 1 });

  // Create the editor once.
  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          // Our shortcuts go first so they win over the defaults (Mod-Enter inserts a blank line by default).
          keymap.of([
            { key: 'Mod-Enter', run: () => (onRunRef.current(), true) },
            { key: 'Mod-Shift-Enter', run: () => (onSubmitRef.current(), true) },
            indentWithTab,
          ]),
          basicSetup,
          oneDark,
          appTheme,
          indentCompartment.current.of(indentUnit.of(' '.repeat(LANGUAGE_META[language].indent))),
          languageCompartment.current.of(languageExtension(language)),
          readOnlyCompartment.current.of(EditorState.readOnly.of(!!readOnly)),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
            if (update.docChanged || update.selectionSet) {
              const head = update.state.selection.main.head;
              const line = update.state.doc.lineAt(head);
              setCaret({ line: line.number, col: head - line.from + 1 });
            }
          }),
        ],
      }),
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // The view is created once; props are synced by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Replace the document when the parent sets a new value (Reset, draft load, restored attempt).
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  // Switch syntax highlighting, completions, and indentation with the language.
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: [
        languageCompartment.current.reconfigure(languageExtension(language)),
        indentCompartment.current.reconfigure(indentUnit.of(' '.repeat(LANGUAGE_META[language].indent))),
      ],
    });
  }, [language]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: readOnlyCompartment.current.reconfigure(EditorState.readOnly.of(!!readOnly)) });
  }, [readOnly]);

  return (
    <div className="flex flex-col min-h-0 flex-1 bg-slate-950">
      <div ref={hostRef} className="flex-1 min-h-[200px] min-w-0 overflow-hidden" />
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-slate-800 bg-slate-900/70 text-[11px] font-mono text-slate-500">
        <span>
          Ln {caret.line}, Col {caret.col}
        </span>
        <span className={value.length > MAX_CHARS ? 'text-rose-400' : ''}>
          {value.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
        </span>
      </div>
    </div>
  );
};
