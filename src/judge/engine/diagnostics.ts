/**
 * Turns what a runtime reports (a JavaScript stack, a Python traceback record, compiler text)
 * into the same thing a real terminal would print, plus structured line and column data
 * that the editor can mark. Pure functions only, so they can be tested without a browser.
 */
import type { Diagnostic, Language, RawResult, StreamChunk } from '../types';
import { LANGUAGE_META } from '../types';

/** Must match the wrapper in worker.js: user code starts right after it, on line 1. */
export const JS_PREFIX = '(function(console,print,input,readAll){';

/* ------------------------------------------------------------------ */
/* What the worker sends back                                          */
/* ------------------------------------------------------------------ */

export interface PyFrame {
  file: string;
  fn: string;
  line: number;
  col?: number | null;
  endCol?: number | null;
}

export interface PyFailure {
  name: string;
  message: string;
  /** The traceback exactly as Python prints it. */
  text: string;
  frames: PyFrame[];
  syntax?: { line: number; col: number; endCol?: number | null } | null;
  /** Set when the program called sys.exit with a non-zero code. */
  exit?: number;
}

export interface TsDiag {
  code: number;
  message: string;
  line: number;
  column: number;
  endColumn?: number;
}

export interface WorkerReply {
  id: number;
  kind: 'ok' | 'runtime' | 'compile';
  stream: StreamChunk[];
  err?: {
    name: string;
    message: string;
    stack?: string;
    syntaxAt?: { line: number; column: number; endColumn?: number } | null;
  };
  py?: PyFailure;
  ts?: { diagnostics?: TsDiag[]; sourceMap?: string };
}

export interface BuildContext {
  language: Language;
  /** The exact program that ran (user code, plus the harness for function problems). */
  program: string;
  /** How many lines at the start of the program are the learner's own code. */
  userLines?: number;
  timeMs: number;
}

/* ------------------------------------------------------------------ */
/* Source locations                                                    */
/* ------------------------------------------------------------------ */

interface Place {
  file: string;
  line: number;
  column: number;
  endColumn?: number;
  /** True when the place is inside the learner's own code. */
  user: boolean;
}

/** The first line of the judge's own code, after the learner's. */
function harnessStart(program: string, userLines: number): number {
  const lines = program.split('\n');
  let i = userLines;
  while (i < lines.length && lines[i].trim() === '') i++;
  return i; // zero-based
}

/** Maps a line of the whole program to the file a terminal would name, and a line in it. */
export function placeOf(
  language: Language,
  program: string,
  userLines: number | undefined,
  line: number,
  column: number,
  endColumn?: number
): Place {
  const file = LANGUAGE_META[language].file;
  if (userLines === undefined || line <= userLines) return { file, line, column, endColumn, user: true };
  const first = harnessStart(program, userLines);
  return { file: file.replace(/^main/, 'judge'), line: Math.max(1, line - first), column, endColumn, user: false };
}

/** The text of one line, from the file a place belongs to. */
export function sourceLineOf(program: string, userLines: number | undefined, place: Place): string {
  const lines = program.split('\n');
  if (place.user) return (lines[place.line - 1] ?? '').replace(/\r$/, '');
  const first = harnessStart(program, userLines ?? 0);
  return (lines[first + place.line - 1] ?? '').replace(/\r$/, '');
}

/** A caret line that lines up under the source line, keeping tabs so the carets stay aligned. */
export function caretLine(source: string, column: number, endColumn?: number): string {
  const pad = source.slice(0, Math.max(0, column - 1)).replace(/[^\t]/g, ' ');
  const width = endColumn && endColumn > column ? endColumn - column : 1;
  return pad + '^'.repeat(width);
}

/* ------------------------------------------------------------------ */
/* JavaScript and TypeScript                                           */
/* ------------------------------------------------------------------ */

export interface JsFrame {
  fn: string;
  line: number;
  column: number;
}

/** Reads the frames that belong to the learner's file out of an error stack (Chrome, Firefox and Safari formats). */
export function parseJsStack(stack: string | undefined): JsFrame[] {
  const frames: JsFrame[] = [];
  for (const raw of (stack ?? '').split('\n')) {
    const v8 = /^\s*at (?:(.*?) \()?.*?main\.js:(\d+):(\d+)\)?\s*$/.exec(raw);
    const gecko = /^(.*?)@.*?main\.js:(\d+):(\d+)\s*$/.exec(raw);
    const m = v8 ?? gecko;
    if (!m) continue;
    let fn = (m[1] ?? '').trim();
    if (!fn || fn === 'eval' || fn === 'anonymous' || fn.startsWith('eval ')) fn = '';
    frames.push({ fn, line: Number(m[2]), column: Number(m[3]) });
  }
  return frames;
}

/** Decodes a source map's "mappings" string into per-line segments. */
export function decodeMappings(mappings: string): number[][][] {
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lines: number[][][] = [];
  let srcLine = 0;
  let srcCol = 0;
  for (const lineText of mappings.split(';')) {
    const segs: number[][] = [];
    let genCol = 0;
    for (const segText of lineText.split(',')) {
      if (!segText) continue;
      const fields: number[] = [];
      let shift = 0;
      let value = 0;
      for (const ch of segText) {
        const digit = B64.indexOf(ch);
        value += (digit & 31) << shift;
        if (digit & 32) {
          shift += 5;
        } else {
          fields.push(value & 1 ? -(value >> 1) : value >> 1);
          value = 0;
          shift = 0;
        }
      }
      genCol += fields[0];
      if (fields.length >= 4) {
        srcLine += fields[2];
        srcCol += fields[3];
        segs.push([genCol, srcLine, srcCol]);
      }
    }
    lines.push(segs);
  }
  return lines;
}

/** The original line and column (both from 1) for a generated position, or null when the map has nothing there. */
export function originalPosition(
  decoded: number[][][],
  line: number,
  column: number
): { line: number; column: number } | null {
  const segs = decoded[line - 1];
  if (!segs || segs.length === 0) return null;
  let best = segs[0];
  for (const s of segs) if (s[0] <= column - 1) best = s;
  return { line: best[1] + 1, column: best[2] + 1 };
}

function jsErrorHeader(name: string, message: string): string {
  return message ? `${name}: ${message}` : name;
}

/** Builds the text Node.js prints for an uncaught error, with the file, line, source line and caret. */
function nodeStyleText(opts: {
  place: Place | null;
  sourceLine: string;
  name: string;
  message: string;
  frames: { fn: string; file: string; line: number; column: number }[];
}): string {
  const out: string[] = [];
  if (opts.place) {
    out.push(`${opts.place.file}:${opts.place.line}`, opts.sourceLine, caretLine(opts.sourceLine, opts.place.column, opts.place.endColumn), '');
  }
  out.push(jsErrorHeader(opts.name, opts.message));
  for (const f of opts.frames) out.push(`    at ${f.fn ? `${f.fn} (${f.file}:${f.line}:${f.column})` : `${f.file}:${f.line}:${f.column}`}`);
  return out.join('\n') + '\n';
}

function buildJs(reply: WorkerReply, ctx: BuildContext): { text: string; diagnostics: Diagnostic[]; summary: string } {
  const { language, program, userLines } = ctx;
  const err = reply.err ?? { name: 'Error', message: 'Unknown error' };
  const map = reply.ts?.sourceMap ? decodeMappings(JSON.parse(reply.ts.sourceMap).mappings as string) : null;

  const toPlace = (line: number, column: number): Place => {
    let l = line;
    let c = line === 1 ? Math.max(1, column - JS_PREFIX.length) : column;
    if (map) {
      const o = originalPosition(map, l, c);
      if (o) {
        l = o.line;
        c = o.column;
      }
    }
    return placeOf(language, program, userLines, l, c);
  };

  let frames = parseJsStack(err.stack).map((f) => ({ fn: f.fn, place: toPlace(f.line, f.column) }));
  let top: Place | null = frames.length ? frames[0].place : null;

  if (err.syntaxAt) {
    top = placeOf(language, program, userLines, err.syntaxAt.line, err.syntaxAt.column, err.syntaxAt.endColumn);
    frames = [];
  }

  const sourceLine = top ? sourceLineOf(program, userLines, top) : '';
  const text = nodeStyleText({
    place: top,
    sourceLine,
    name: err.name,
    message: err.message,
    frames: frames.map((f) => ({ fn: f.fn || 'Object.<anonymous>', file: f.place.file, line: f.place.line, column: f.place.column })),
  });

  // The editor mark goes on the innermost frame that is the learner's own code.
  const userPlace = err.syntaxAt ? top : frames.find((f) => f.place.user)?.place ?? null;
  const diagnostics: Diagnostic[] = userPlace
    ? [{ severity: 'error', name: err.name, message: err.message, file: userPlace.file, line: userPlace.line, column: userPlace.column, endColumn: userPlace.endColumn }]
    : [];
  const where = userPlace ? ` (${userPlace.file}:${userPlace.line}:${userPlace.column})` : '';
  return { text, diagnostics, summary: `${jsErrorHeader(err.name, err.message)}${where}` };
}

/** tsc's own layout: location, error code, then the source line with squiggles under it. */
function buildTsCompile(reply: WorkerReply, ctx: BuildContext) {
  const diags = reply.ts?.diagnostics ?? [];
  const file = LANGUAGE_META[ctx.language].file;
  const lines = ctx.program.split('\n');
  const out: string[] = [];
  const diagnostics: Diagnostic[] = [];
  for (const d of diags) {
    const src = (lines[d.line - 1] ?? '').replace(/\r$/, '');
    const gutter = String(d.line);
    const squiggle = caretLine(src, d.column, d.endColumn).replace(/\^/g, '~');
    out.push(`${file}:${d.line}:${d.column} - error TS${d.code}: ${d.message}`, '', `${gutter} ${src}`, `${' '.repeat(gutter.length)} ${squiggle}`, '');
    diagnostics.push({ severity: 'error', name: `TS${d.code}`, message: d.message, file, line: d.line, column: d.column, endColumn: d.endColumn });
  }
  if (diags.length) out.push(diags.length === 1 ? `Found 1 error in ${file}:${diags[0].line}` : `Found ${diags.length} errors.`, '');
  const first = diags[0];
  return {
    text: out.join('\n'),
    diagnostics,
    summary: first ? `${file}:${first.line}:${first.column} - error TS${first.code}: ${first.message}` : 'Compilation failed.',
  };
}

/* ------------------------------------------------------------------ */
/* Python                                                              */
/* ------------------------------------------------------------------ */

function buildPython(reply: WorkerReply, ctx: BuildContext) {
  const py = reply.py!;
  const file = LANGUAGE_META.python.file;
  const diagnostics: Diagnostic[] = [];
  if (py.syntax) {
    diagnostics.push({ severity: 'error', name: py.name, message: py.message, file, line: py.syntax.line, column: py.syntax.col, endColumn: py.syntax.endCol ?? undefined });
  } else {
    // The innermost frame in the learner's own file is where to look first.
    const inner = [...py.frames].reverse().find((f) => f.file === file);
    if (inner) {
      diagnostics.push({ severity: 'error', name: py.name, message: py.message, file, line: inner.line, column: inner.col ?? 1, endColumn: inner.endCol ?? undefined });
    }
  }
  const d = diagnostics[0];
  const where = d ? ` (${d.file}:${d.line}:${d.column})` : '';
  return { text: py.text, diagnostics, summary: `${py.name}${py.message ? `: ${py.message}` : ''}${where}` };
}

/* ------------------------------------------------------------------ */
/* C++ and Rust (compiler output is already what a terminal shows)     */
/* ------------------------------------------------------------------ */

const baseName = (p: string) => p.split(/[\\/]/).pop() ?? p;

/** Reads `file:line:col: error: message` lines from GCC and Clang. */
export function parseGcc(text: string): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const raw of text.split('\n')) {
    const m = /^(.+?):(\d+):(\d+):\s+(fatal error|error|warning):\s+(.*)$/.exec(raw);
    if (!m) continue;
    out.push({
      severity: m[4] === 'warning' ? 'warning' : 'error',
      name: m[4] === 'warning' ? 'warning' : 'error',
      message: m[5],
      file: baseName(m[1]),
      line: Number(m[2]),
      column: Number(m[3]),
    });
  }
  return out;
}

/** Reads rustc errors: a header line, then ` --> file:line:col`, then the underline. */
export function parseRustc(text: string): Diagnostic[] {
  const lines = text.split('\n');
  const out: Diagnostic[] = [];
  for (let i = 0; i < lines.length; i++) {
    const head = /^(error|warning)(?:\[(E\d+)\])?:\s+(.*)$/.exec(lines[i]);
    if (!head) continue;
    for (let j = i + 1; j < Math.min(lines.length, i + 4); j++) {
      const loc = /^\s*-->\s+(.+?):(\d+):(\d+)\s*$/.exec(lines[j]);
      if (!loc) continue;
      let endColumn: number | undefined;
      for (let k = j + 1; k < Math.min(lines.length, j + 5); k++) {
        const carets = /^\s*\|\s*(\s*)(\^+)/.exec(lines[k]);
        if (carets) {
          endColumn = Number(loc[3]) + carets[2].length;
          break;
        }
      }
      out.push({
        severity: head[1] === 'warning' ? 'warning' : 'error',
        name: head[2] ?? head[1],
        message: head[3],
        file: baseName(loc[1]),
        line: Number(loc[2]),
        column: Number(loc[3]),
        endColumn,
      });
      break;
    }
  }
  return out;
}

/** A Rust panic names its own place: `thread 'main' panicked at main.rs:4:5:`. */
export function parseRustPanic(text: string): Diagnostic[] {
  const m = /panicked at (?:.*[\\/])?([^\\/:\s]+):(\d+):(\d+)(?::\s*\n?(.*))?/.exec(text);
  if (!m) return [];
  return [{ severity: 'error', name: 'panic', message: (m[4] ?? '').trim() || 'The program panicked', file: m[1], line: Number(m[2]), column: Number(m[3]) }];
}

export function parseCompilerOutput(text: string, language?: Language): Diagnostic[] {
  const gcc = language === 'rust' ? [] : parseGcc(text);
  if (gcc.length) return gcc;
  const rust = language === 'cpp' ? [] : parseRustc(text);
  if (rust.length) return rust;
  return language === 'cpp' ? [] : parseRustPanic(text);
}

/* ------------------------------------------------------------------ */
/* Putting it together                                                 */
/* ------------------------------------------------------------------ */

export const OUTPUT_CAP = 200_000;

export const joinStream = (stream: StreamChunk[], fd: 1 | 2) => stream.filter((c) => c.fd === fd).map((c) => c.text).join('');

/** Builds the result the judge and the terminal use from what the worker reported. */
export function buildRawResult(reply: WorkerReply, ctx: BuildContext): RawResult {
  const stream = [...reply.stream];
  const stdout = joinStream(stream, 1);

  if (reply.kind === 'ok') {
    return { kind: 'ok', stdout, stream, exitCode: 0, timeMs: ctx.timeMs };
  }

  let built: { text: string; diagnostics: Diagnostic[]; summary: string };
  if (ctx.language === 'python' && reply.py) {
    built = buildPython(reply, ctx);
  } else if (ctx.language === 'typescript' && reply.kind === 'compile') {
    built = buildTsCompile(reply, ctx);
  } else {
    built = buildJs(reply, ctx);
  }

  if (reply.py?.exit !== undefined && !reply.py.text) {
    return { kind: 'runtime', stdout, stream, exitCode: reply.py.exit, error: `Exited with code ${reply.py.exit}`, timeMs: ctx.timeMs };
  }

  if (built.text) stream.push({ fd: 2, text: built.text });
  return {
    kind: reply.kind,
    stdout,
    stream,
    diagnostics: built.diagnostics,
    exitCode: 1,
    error: built.summary,
    timeMs: ctx.timeMs,
  };
}

/* ------------------------------------------------------------------ */
/* Terminal text helpers                                               */
/* ------------------------------------------------------------------ */

export interface TermLine {
  fd: 1 | 2;
  text: string;
}

/** Splits streamed output into lines, keeping which stream each line came from. */
export function streamToLines(stream: StreamChunk[]): TermLine[] {
  const lines: TermLine[] = [];
  let open: TermLine | null = null;
  for (const chunk of stream) {
    const parts = chunk.text.split('\n');
    parts.forEach((part, i) => {
      if (i > 0) open = null;
      if (open && open.fd === chunk.fd) {
        open.text += part;
        return;
      }
      if (i === parts.length - 1 && part === '') return; // text ended with a newline
      open = { fd: chunk.fd, text: part };
      lines.push(open);
    });
    if (chunk.text.endsWith('\n')) open = null;
  }
  return lines.map((l) => ({ ...l, text: l.text.replace(/\r$/, '') }));
}

export interface LinePart {
  text: string;
  link?: { line: number; column: number };
}

const LOCATION = /(File "main\.(?:py|js|ts|cpp|rs)", line (\d+))|(main\.(?:py|js|ts|cpp|rs):(\d+)(?::(\d+))?)/g;

/** Finds places in a line of output that point into the learner's file, so they can be clicked. */
export function linkParts(text: string): LinePart[] {
  const parts: LinePart[] = [];
  let last = 0;
  for (const m of text.matchAll(LOCATION)) {
    const at = m.index ?? 0;
    if (at > last) parts.push({ text: text.slice(last, at) });
    const line = Number(m[2] ?? m[4]);
    const column = m[5] ? Number(m[5]) : 1;
    parts.push({ text: m[0], link: { line, column } });
    last = at + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts.length ? parts : [{ text }];
}

export type LineRole = 'plain' | 'traceback' | 'file' | 'source' | 'caret' | 'error' | 'note';

/** What a stderr line is, so it can be coloured the way editors and terminals colour it. */
export function classifyErrorLine(text: string): LineRole {
  if (/^\s*[\^~]+[\^~\s]*$/.test(text) && /[\^~]/.test(text)) return 'caret';
  if (/^Traceback \(most recent call last\):/.test(text)) return 'traceback';
  if (/^\s*File "/.test(text)) return 'file';
  if (/^\s*at /.test(text)) return 'file';
  if (/^\s*\d*\s*\|/.test(text)) return 'source';
  if (/^\s*-->/.test(text)) return 'file';
  if (/^[A-Za-z_][\w.]*(Error|Exception|Exit|Warning)\b/.test(text) || /^(error|fatal error)(\[\w+\])?:/.test(text) || /^\S+:\d+:\d+: (fatal )?error:/.test(text) || /^thread '.*' panicked/.test(text) || /^\S+:\d+:\d+ - error/.test(text)) return 'error';
  if (/^\s{3,}\S/.test(text)) return 'source';
  return 'plain';
}
