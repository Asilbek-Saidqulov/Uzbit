import React, { useEffect, useRef, useState } from 'react';
import { Compartment, EditorState, Range, RangeSet, StateEffect, StateField, type Extension, type Text } from '@codemirror/state';
import { Decoration, EditorView, GutterMarker, gutter, keymap, type DecorationSet } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { indentRange, indentUnit } from '@codemirror/language';
import { diagnosticCount, forceLinting, forEachDiagnostic, linter } from '@codemirror/lint';
import { basicSetup } from 'codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { cpp } from '@codemirror/lang-cpp';
import { rust } from '@codemirror/lang-rust';
import { LANGUAGE_META, type Diagnostic, type Language } from '../types';
import { extraCompletions } from '../engine/completions';
import { lintState } from '../engine/liveLint';

/** Asks the editor to put the cursor on a line. A new nonce repeats the request for the same spot. */
export interface JumpTarget {
  line: number;
  column: number;
  nonce: number;
}

interface CodeEditorProps {
  /** Errors to mark in the code: a tinted line, a wavy underline and a dot in the gutter. */
  markers?: Diagnostic[];
  jumpTo?: JumpTarget | null;
  value: string;
  onChange: (value: string) => void;
  language: Language;
  onRun: () => void;
  onSubmit: () => void;
  readOnly?: boolean;
}

const MAX_CHARS = 65536;

/* ----- error markers ----- */

const setMarkers = StateEffect.define<Diagnostic[]>();

class DotMarker extends GutterMarker {
  constructor(private readonly title: string) {
    super();
  }
  toDOM() {
    const el = document.createElement('span');
    el.className = 'cm-diag-dot';
    el.textContent = '●';
    el.title = this.title;
    return el;
  }
}

interface MarkerState {
  deco: DecorationSet;
  dots: RangeSet<GutterMarker>;
}

function buildMarkers(doc: Text, items: Diagnostic[]): MarkerState {
  const decos: Range<Decoration>[] = [];
  const dots: Range<GutterMarker>[] = [];
  const seen = new Set<number>();
  for (const d of items) {
    if (d.line < 1 || d.line > doc.lines) continue;
    const line = doc.line(d.line);
    if (!seen.has(line.number)) {
      seen.add(line.number);
      decos.push(Decoration.line({ class: 'cm-diag-line' }).range(line.from));
      dots.push(new DotMarker(`${d.name}: ${d.message}`).range(line.from));
    }
    const start = Math.min(line.to, line.from + Math.max(0, d.column - 1));
    let end = d.endColumn && d.endColumn > d.column ? Math.min(line.to, line.from + d.endColumn - 1) : start;
    if (end <= start) {
      // No end given: underline the word at the column, or one character.
      const word = /^\w+/.exec(line.text.slice(start - line.from));
      end = Math.min(line.to, start + (word ? word[0].length : 1));
    }
    if (end > start) decos.push(Decoration.mark({ class: 'cm-diag-squiggle', attributes: { title: `${d.name}: ${d.message}` } }).range(start, end));
  }
  return { deco: Decoration.set(decos, true), dots: RangeSet.of(dots, true) };
}

/** Marks disappear when the code is edited, because their positions would no longer be right. */
const markerField = StateField.define<MarkerState>({
  create: () => ({ deco: Decoration.none, dots: RangeSet.empty }),
  update(value, tr) {
    for (const e of tr.effects) if (e.is(setMarkers)) return buildMarkers(tr.state.doc, e.value);
    if (tr.docChanged) return { deco: Decoration.none, dots: RangeSet.empty };
    return value;
  },
  provide: (f) => EditorView.decorations.from(f, (v) => v.deco),
});

const markerGutter = gutter({
  class: 'cm-diag-gutter',
  markers: (view) => view.state.field(markerField).dots,
  initialSpacer: () => new DotMarker(''),
});

function baseLanguage(language: Language): Extension {
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

/** The language's own support (colours, indentation) plus the snippets and names added in completions.ts. */
const languageExtension = (language: Language): Extension => [baseLanguage(language), extraCompletions(language)];

/* ----- live problems summary for the status bar ----- */

interface ProblemSummary {
  count: number;
  from: number;
  message: string;
  severity: 'error' | 'warning';
}

function summariseProblems(state: EditorState): ProblemSummary | null {
  const count = diagnosticCount(state);
  if (count === 0) return null;
  let first: { from: number; message: string; severity: string } | null = null;
  forEachDiagnostic(state, (d, from) => {
    if (!first || from < first.from) first = { from, message: d.message, severity: d.severity };
  });
  const f = first as { from: number; message: string; severity: string } | null;
  if (!f) return null;
  return { count, from: f.from, message: f.message, severity: f.severity === 'error' ? 'error' : 'warning' };
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
    '.cm-diag-line': { backgroundColor: 'rgba(244, 63, 94, 0.14)' },
    '.cm-diag-squiggle': { textDecoration: 'underline wavy #fb7185', textUnderlineOffset: '3px', textDecorationSkipInk: 'none' },
    '.cm-diag-gutter': { width: '14px' },
    '.cm-tooltip-lint': { maxWidth: '420px' },
    '.cm-diagnostic': { padding: '4px 8px', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', fontSize: '12px' },
    '.cm-diag-dot': { color: '#fb7185', fontSize: '10px', lineHeight: '1.5rem', cursor: 'default' },
  },
  { dark: true }
);

/**
 * Code editor built on CodeMirror 6: syntax highlighting, bracket matching, auto-closing quotes and
 * brackets, autocomplete with snippets, live error underlines, undo history and language-aware
 * indentation.
 * Ctrl/Cmd+Enter runs the examples; Ctrl/Cmd+Shift+Enter submits; Shift+Alt+F formats; F8 jumps to the
 * next problem.
 */
export const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, language, onRun, onSubmit, readOnly, markers, jumpTo }) => {
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
  const [problems, setProblems] = useState<ProblemSummary | null>(null);

  // The live checker is created once, so it reads the current language through a ref.
  const languageRef = useRef(language);
  languageRef.current = language;

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
            {
              // Format document: re-indent everything. Not for Python, where indentation is the meaning.
              key: 'Shift-Alt-f',
              run: (view) => {
                if (languageRef.current === 'python') return false;
                const changes = indentRange(view.state, 0, view.state.doc.length);
                if (!changes.empty) view.dispatch({ changes, userEvent: 'format' });
                return true;
              },
            },
            indentWithTab,
          ]),
          basicSetup,
          // Mistakes are underlined a moment after typing stops: missing quotes and brackets, and syntax errors.
          linter((view) => lintState(view.state, languageRef.current), { delay: 400 }),
          markerField,
          markerGutter,
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
            const next = summariseProblems(update.state);
            setProblems((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
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
    if (viewRef.current) forceLinting(viewRef.current);
  }, [language]);

  // Show the errors from the latest run.
  useEffect(() => {
    viewRef.current?.dispatch({ effects: setMarkers.of(markers ?? []) });
  }, [markers]);

  // Move the cursor to a line when asked, for example from a link in the terminal.
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !jumpTo) return;
    const line = view.state.doc.line(Math.min(Math.max(1, jumpTo.line), view.state.doc.lines));
    const pos = Math.min(line.to, line.from + Math.max(0, jumpTo.column - 1));
    view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: 'center' }) });
    view.focus();
  }, [jumpTo]);

  useEffect(() => {
    viewRef.current?.dispatch({ effects: readOnlyCompartment.current.reconfigure(EditorState.readOnly.of(!!readOnly)) });
  }, [readOnly]);

  const jumpToProblem = () => {
    const view = viewRef.current;
    if (!view || !problems) return;
    const pos = Math.min(problems.from, view.state.doc.length);
    view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: 'center' }) });
    view.focus();
  };

  return (
    <div className="flex flex-col min-h-0 flex-1 bg-slate-950">
      <div ref={hostRef} className="flex-1 min-h-[200px] min-w-0 overflow-hidden" />
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-slate-800 bg-slate-900/70 text-[11px] font-mono text-slate-500">
        <span className="flex min-w-0 items-center gap-3">
          <span>
            Ln {caret.line}, Col {caret.col}
          </span>
          {markers && markers.length > 0 ? (
            <span role="status" className="truncate text-rose-300">
              {markers[0].file}:{markers[0].line}:{markers[0].column} {markers[0].name}: {markers[0].message}
            </span>
          ) : (
            problems && (
              <button
                type="button"
                onClick={jumpToProblem}
                title="Go to the first problem (F8 steps through them)"
                className={`truncate text-left hover:underline ${problems.severity === 'error' ? 'text-rose-300' : 'text-amber-300'}`}
              >
                {problems.count === 1 ? '1 problem' : `${problems.count} problems`}: {problems.message}
              </button>
            )
          )}
        </span>
        <span className={value.length > MAX_CHARS ? 'text-rose-400' : ''}>
          {value.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
        </span>
      </div>
    </div>
  );
};
