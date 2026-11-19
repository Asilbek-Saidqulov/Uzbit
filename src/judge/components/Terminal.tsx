import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Loader2, Trash2 } from 'lucide-react';
import { classifyErrorLine, linkParts, streamToLines, type LineRole } from '../engine/diagnostics';
import type { Language, StreamChunk } from '../types';
import { LANGUAGE_META } from '../types';

/** What the terminal prints: a program run with its output, or a plain line of text. */
export type TermEntry =
  | {
      type: 'run';
      id: number;
      command: string;
      stream: StreamChunk[];
      exitCode: number;
      timeMs: number;
      /** Extra line printed after the output, for example when the program was stopped. */
      footer?: string;
    }
  | { type: 'note'; id: number; text: string; tone: 'good' | 'bad' | 'plain' };

/** The command a real terminal would be given for this language. */
export function commandFor(language: Language, stdinName?: string): string {
  const file = LANGUAGE_META[language].file;
  const feed = stdinName ? ` < ${stdinName}` : '';
  switch (language) {
    case 'python':
      return `python3 ${file}${feed}`;
    case 'javascript':
      return `node ${file}${feed}`;
    case 'typescript':
      return `tsx ${file}${feed}`;
    case 'cpp':
      return `g++ -std=c++17 -O2 ${file} -o main && ./main${feed}`;
    case 'rust':
      return `rustc ${file} && ./main${feed}`;
  }
}

const ROLE_CLASS: Record<LineRole, string> = {
  plain: 'text-rose-200',
  traceback: 'text-rose-300/80',
  file: 'text-rose-200/80',
  source: 'text-slate-300',
  caret: 'font-semibold text-rose-400',
  error: 'font-semibold text-rose-300',
  note: 'text-slate-400',
};

const PROMPT = 'uzbit@practice:~$';

const LineText: React.FC<{ text: string; onJump: (line: number, column: number) => void }> = ({ text, onJump }) => (
  <>
    {linkParts(text).map((part, i) =>
      part.link ? (
        <button
          key={i}
          type="button"
          onClick={() => onJump(part.link!.line, part.link!.column)}
          title="Go to this line in the editor"
          className="cursor-pointer rounded-sm underline decoration-dotted underline-offset-2 hover:bg-rose-500/20 hover:decoration-solid focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        >
          {part.text}
        </button>
      ) : (
        <React.Fragment key={i}>{part.text}</React.Fragment>
      )
    )}
  </>
);

const RunBlock: React.FC<{ entry: Extract<TermEntry, { type: 'run' }>; onJump: (line: number, column: number) => void }> = ({ entry, onJump }) => {
  const lines = useMemo(() => streamToLines(entry.stream), [entry.stream]);
  const failed = entry.exitCode !== 0;
  return (
    <div className="mb-3">
      <div className="whitespace-pre-wrap break-all">
        <span className="text-emerald-400">{PROMPT}</span> <span className="text-slate-100">{entry.command}</span>
      </div>
      {lines.map((line, i) => {
        if (line.fd === 1) {
          return (
            <div key={i} className="whitespace-pre-wrap break-all text-slate-200">
              {line.text || '\u00a0'}
            </div>
          );
        }
        const role = classifyErrorLine(line.text);
        return (
          <div key={i} className={`whitespace-pre-wrap break-all ${ROLE_CLASS[role]}`}>
            {role === 'caret' || role === 'source' ? line.text || '\u00a0' : <LineText text={line.text || '\u00a0'} onJump={onJump} />}
          </div>
        );
      })}
      {entry.footer && <div className="whitespace-pre-wrap text-amber-300">{entry.footer}</div>}
      <div className={`mt-0.5 text-[11px] ${failed ? 'text-rose-400/90' : 'text-slate-500'}`}>
        [exit {entry.exitCode} · {entry.timeMs} ms]
      </div>
    </div>
  );
};

interface TerminalProps {
  entries: TermEntry[];
  /** Set while a program runs, with what to show next to the prompt. */
  running: string | null;
  language: Language;
  onClear: () => void;
  onJump: (line: number, column: number) => void;
  /** Hide Copy and Clear, for a terminal that only demonstrates something. */
  toolbar?: boolean;
  /** Announce new output to screen readers. Off for demos that change while the visitor drags a slider. */
  live?: boolean;
}

/**
 * A terminal for the learner's program. Output is shown as the program wrote it:
 * stdout in the normal colour, stderr in red, and every `main.py:3:5` style place
 * is a link that jumps to that spot in the editor.
 */
export const Terminal: React.FC<TerminalProps> = ({ entries, running, language, onClear, onJump, toolbar = true, live = true }) => {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Follow new output, the way a terminal does.
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, running]);

  const plainText = () =>
    entries
      .map((e) =>
        e.type === 'note'
          ? e.text
          : [`${PROMPT} ${e.command}`, ...e.stream.map((c) => c.text.replace(/\n$/, '')), e.footer ?? '', `[exit ${e.exitCode} · ${e.timeMs} ms]`].filter(Boolean).join('\n')
      )
      .join('\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(plainText());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* the browser may block clipboard access; nothing to do */
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-slate-800 bg-[#0a0e14]">
      <div className="flex items-center justify-between border-b border-slate-800/80 px-3 py-1 text-[11px] text-slate-500">
        <span>{LANGUAGE_META[language].label} · stdout and stderr</span>
        {toolbar && (
        <span className="flex items-center gap-1">
          <button type="button" onClick={copy} disabled={entries.length === 0} className="btn btn-ghost btn-sm" aria-label="Copy terminal output">
            {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button type="button" onClick={onClear} disabled={entries.length === 0 && !running} className="btn btn-ghost btn-sm" aria-label="Clear terminal">
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Clear
          </button>
        </span>
        )}
      </div>

      <div
        ref={bodyRef}
        role="log"
        aria-live={live ? 'polite' : 'off'}
        aria-label="Program output"
        tabIndex={0}
        className="min-h-0 flex-1 overflow-auto px-3 py-2 font-mono text-[12.5px] leading-[1.45] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
      >
        {entries.length === 0 && !running && (
          <p className="mb-2 text-slate-500">Press Run (Ctrl+Enter) to run your code. Its output, and any error with its line and column, appears here.</p>
        )}
        {entries.map((e) =>
          e.type === 'note' ? (
            <div key={e.id} className={`mb-3 whitespace-pre-wrap font-semibold ${e.tone === 'good' ? 'text-emerald-400' : e.tone === 'bad' ? 'text-rose-300' : 'text-slate-400'}`}>
              {e.text}
            </div>
          ) : (
            <RunBlock key={e.id} entry={e} onJump={onJump} />
          )
        )}
        {running ? (
          <div className="whitespace-pre-wrap break-all">
            <span className="text-emerald-400">{PROMPT}</span> <span className="text-slate-100">{running}</span>
            <div className="mt-1 flex items-center gap-2 text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              {language === 'python' ? 'running (the first Python run starts the interpreter, which takes a few seconds)' : 'running'}
            </div>
          </div>
        ) : (
          <div>
            <span className="text-emerald-400">{PROMPT}</span> <span className="term-cursor" aria-hidden="true" />
          </div>
        )}
      </div>
    </div>
  );
};
