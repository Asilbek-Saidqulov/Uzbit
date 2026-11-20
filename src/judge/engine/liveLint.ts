/**
 * Connects the live checker to CodeMirror's lint system. Kept apart from the React component so it
 * can be tested with an EditorState alone, without a browser.
 */
import { ensureSyntaxTree } from '@codemirror/language';
import type { Diagnostic } from '@codemirror/lint';
import type { EditorState } from '@codemirror/state';
import type { Language } from '../types';
import { liveIssues } from './liveCheck';

/** Above this size the check is skipped so typing never stalls. The editor itself caps code at 65,536 characters. */
const MAX_CHECKED_CHARS = 200_000;

export function lintState(state: EditorState, language: Language): Diagnostic[] {
  const length = state.doc.length;
  if (length === 0 || length > MAX_CHECKED_CHARS) return [];
  const text = state.doc.toString();
  const tree = ensureSyntaxTree(state, length, 100);
  return liveIssues(language, text, tree).map((issue) => {
    const from = Math.min(Math.max(0, issue.from), length);
    const to = Math.min(Math.max(issue.to, from + 1), length);
    return { from: Math.min(from, Math.max(0, to - 1)), to, severity: issue.severity, message: issue.message, source: 'Uzbit' };
  });
}
