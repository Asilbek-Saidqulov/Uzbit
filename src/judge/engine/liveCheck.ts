/**
 * Live checks that run while the learner types, before anything is sent to a judge.
 *
 * Two layers:
 *  1. scanText: a small scanner that understands strings, comments and brackets for each language.
 *     It reports a missing closing quote, an unclosed or unexpected bracket, an unterminated
 *     comment, and (for C++) a likely missing semicolon at the end of a line.
 *  2. treeIssues: error nodes from the editor's own parser (Python, JavaScript, TypeScript, Rust).
 *     Used only when the scanner found nothing, because one missing bracket makes a parser report
 *     a cascade of errors further down.
 *
 * This is a syntax check, not a compiler. It does not know about types or undeclared names; the
 * real compiler output still appears when the program runs.
 */
import type { Language } from '../types';

export interface LiveIssue {
  from: number;
  to: number;
  severity: 'error' | 'warning';
  message: string;
  /** What kind of problem this is. Bracket problems are hidden when a quote problem explains them. */
  kind?: 'quote' | 'bracket' | 'comment' | 'semicolon';
}

const MAX_ISSUES = 25;

const CLOSE_TO_OPEN: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
const OPEN_TO_CLOSE: Record<string, string> = { '(': ')', '[': ']', '{': '}' };

interface Opener {
  ch: string;
  pos: number;
  /** Token index, for C++ analysis. */
  tok: number;
  /** A `{` that holds statements (a function body, an if body), as opposed to an initializer list. */
  block: boolean;
  /** For a `${` inside a JavaScript template: where the template started. */
  tpl?: number;
}

interface Tok {
  k: 'id' | 'num' | 'str' | 'op';
  t: string;
  from: number;
  to: number;
  line: number;
  /** True when the code right after this token is at statement level (not inside ( ) [ ] or an initializer). */
  stmt: boolean;
  /** For a closing bracket: the index of its opening token. */
  match?: number;
  /** For a closing `}`: whether it closed a block of statements. */
  blk?: boolean;
}

/** C++ words that can end a line without ending a statement. */
const NON_FINAL = new Set([
  'else', 'do', 'try', 'return', 'const', 'static', 'auto', 'unsigned', 'signed', 'long', 'short', 'int', 'char',
  'void', 'bool', 'float', 'double', 'struct', 'class', 'enum', 'union', 'namespace', 'template', 'typename',
  'public', 'private', 'protected', 'using', 'typedef', 'inline', 'constexpr', 'extern', 'volatile', 'mutable',
  'virtual', 'explicit', 'friend', 'new', 'delete', 'throw', 'case', 'goto', 'operator', 'noexcept', 'override',
  'final', 'and', 'or', 'not', 'xor', 'sizeof', 'default', 'register', 'thread_local', 'consteval', 'constinit',
]);
/** C++ words that can start a line while continuing the statement above. */
const CONTINUATION = new Set([
  'and', 'or', 'not', 'xor', 'bitand', 'bitor', 'compl', 'const', 'noexcept', 'override', 'final', 'volatile',
  'mutable', 'requires', 'throw', 'try', 'catch',
]);
const CONTROL = new Set(['if', 'for', 'while', 'switch', 'catch']);
const BLOCK_KEYWORDS = new Set(['else', 'do', 'try', 'const', 'noexcept', 'override', 'final', 'mutable', 'volatile', 'constexpr']);
const REGEX_PRECEDING_WORDS = new Set(['return', 'typeof', 'case', 'of', 'in', 'delete', 'void', 'throw', 'new', 'else', 'do', 'yield', 'await']);
const REGEX_PRECEDING_CHARS = '(,=:[!&|?{};+-*%<>~^';
const TWO_CHAR_OPS = new Set(['++', '--', '->', '::', '=>']);

const isIdentStart = (c: string) => /[A-Za-z_$]/.test(c) || c.charCodeAt(0) > 127;
const isIdentChar = (c: string | undefined) => !!c && (/[\w$]/.test(c) || c.charCodeAt(0) > 127);

function analyze(language: Language, text: string): LiveIssue[] {
  const isPy = language === 'python';
  const isRust = language === 'rust';
  const isCpp = language === 'cpp';
  const isJs = language === 'javascript' || language === 'typescript';
  const n = text.length;

  const issues: LiveIssue[] = [];
  const push = (issue: LiveIssue) => {
    if (issues.length < MAX_ISSUES) issues.push(issue);
  };

  const lineStarts = [0];
  for (let p = text.indexOf('\n'); p !== -1; p = text.indexOf('\n', p + 1)) lineStarts.push(p + 1);
  const lineOf = (pos: number): number => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
  const lineEnd = (pos: number): number => {
    const e = text.indexOf('\n', pos);
    return e === -1 ? n : e;
  };
  const startsLine = (pos: number): boolean => text.slice(lineStarts[lineOf(pos)], pos).trim() === '';

  const stack: Opener[] = [];
  const toks: Tok[] = [];
  const macros = new Set<string>();

  /** Is the code at this point a list of statements (top level, or directly inside a block)? */
  const stmtLevel = (): boolean => {
    const top = stack[stack.length - 1];
    return !top || (top.ch === '{' && top.block);
  };
  const addTok = (k: Tok['k'], t: string, from: number, to: number): number => {
    if (!isCpp) return -1;
    toks.push({ k, t, from, to, line: lineOf(from), stmt: stmtLevel() });
    return toks.length - 1;
  };

  /** Decide whether a `{` about to be opened holds statements or is an initializer list. */
  const braceIsBlock = (): boolean => {
    const p = toks[toks.length - 1];
    if (!p) return true;
    if (p.k === 'op') {
      // ) ] ; } : -> a function, if, lambda, plain block, constructor body or `case 1: {` body
      if (p.t === ')' || p.t === ']' || p.t === ';' || p.t === '}' || p.t === ':') return true;
      if (p.t === '{') return stack[stack.length - 1]?.block ?? false;
      return false; // = , ( and similar: an initializer
    }
    if (p.k === 'str') return true; // extern "C" {
    if (p.k !== 'id') return false;
    // Look back over the current declaration for struct/class/namespace (bodies hold members) or enum (a list).
    let isEnum = false;
    let isBody = false;
    let hasArrow = false;
    for (let k = toks.length - 1; k >= 0; k--) {
      const t = toks[k];
      if (t.k === 'op' && (t.t === ';' || t.t === '{' || t.t === '}')) break;
      if (t.k === 'op' && t.t === '->') hasArrow = true;
      if (t.k === 'id') {
        if (t.t === 'enum') isEnum = true;
        else if (t.t === 'struct' || t.t === 'class' || t.t === 'union' || t.t === 'namespace') isBody = true;
      }
    }
    if (isEnum) return false;
    if (isBody || hasArrow) return true;
    return BLOCK_KEYWORDS.has(p.t);
  };

  /* ----- string scanners ----- */

  const scanLineString = (start: number, q: string): number => {
    let j = start + 1;
    while (j < n) {
      const ch = text[j];
      if (ch === '\\') {
        j += text[j + 1] === '\r' && text[j + 2] === '\n' ? 3 : 2;
        continue;
      }
      if (ch === q) return j + 1;
      if (ch === '\n') break;
      j++;
    }
    const message =
      q === '"'
        ? 'Missing closing double quote (") — this string is never closed on its line'
        : isCpp
          ? "Missing closing single quote (') — a character literal is one character in quotes, like 'a'"
          : "Missing closing single quote (') — this string is never closed on its line";
    push({ from: start, to: Math.max(start + 1, lineEnd(start)), severity: 'error', message, kind: 'quote' });
    return Math.min(j, n);
  };

  const scanBlockString = (start: number): number => {
    let j = start + 1;
    while (j < n) {
      if (text[j] === '\\') {
        j += 2;
        continue;
      }
      if (text[j] === '"') return j + 1;
      j++;
    }
    push({ from: start, to: start + 1, severity: 'error', message: 'Missing closing double quote (") — this string never ends', kind: 'quote' });
    return n;
  };

  const scanTemplate = (from: number, tplStart: number): number => {
    let j = from;
    while (j < n) {
      const ch = text[j];
      if (ch === '\\') {
        j += 2;
        continue;
      }
      if (ch === '`') return j + 1;
      if (ch === '$' && text[j + 1] === '{') {
        stack.push({ ch: '${', pos: j, tok: -1, block: true, tpl: tplStart });
        return j + 2;
      }
      j++;
    }
    push({ from: tplStart, to: tplStart + 1, severity: 'error', message: 'Missing closing backtick (`) — this template string never ends', kind: 'quote' });
    return n;
  };

  const scanRegex = (start: number): number => {
    let j = start + 1;
    let inClass = false;
    while (j < n && text[j] !== '\n') {
      const ch = text[j];
      if (ch === '\\') {
        j += 2;
        continue;
      }
      if (ch === '[') inClass = true;
      else if (ch === ']') inClass = false;
      else if (ch === '/' && !inClass) {
        j++;
        while (j < n && /[a-z]/i.test(text[j])) j++;
        return j;
      }
      j++;
    }
    return -1;
  };

  /* ----- main loop ----- */

  let i = 0;
  let prev = ''; // class of the last significant character, for the JavaScript regex decision
  let prevWord = '';

  const unclosed = (op: Opener) => {
    if (op.ch === '${') {
      push({ from: op.pos, to: op.pos + 2, severity: 'error', message: "Missing '}' — this ${ placeholder is never closed", kind: 'bracket' });
    } else {
      push({ from: op.pos, to: op.pos + 1, severity: 'error', message: `Missing '${OPEN_TO_CLOSE[op.ch]}' — this '${op.ch}' is never closed`, kind: 'bracket' });
    }
  };

  while (i < n) {
    const c = text[i];
    const d = text[i + 1];

    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++;
      continue;
    }

    // C/C++ preprocessor line: skip it whole (it may hold unbalanced brackets in a macro).
    if (isCpp && c === '#' && startsLine(i)) {
      let end = lineEnd(i);
      while (end < n && text[end - 1] === '\\') end = lineEnd(end + 1);
      const m = /^#\s*define\s+([A-Za-z_]\w*)/.exec(text.slice(i, end));
      if (m) macros.add(m[1]);
      i = end;
      continue;
    }

    // Comments
    if (isPy ? c === '#' : c === '/' && d === '/') {
      i = lineEnd(i);
      continue;
    }
    if (!isPy && c === '/' && d === '*') {
      let depth = 1;
      let j = i + 2;
      while (j < n && depth > 0) {
        if (isRust && text[j] === '/' && text[j + 1] === '*') {
          depth++;
          j += 2;
        } else if (text[j] === '*' && text[j + 1] === '/') {
          depth--;
          j += 2;
        } else j++;
      }
      if (depth > 0) push({ from: i, to: i + 2, severity: 'error', message: 'Unterminated comment — it needs a closing */', kind: 'comment' });
      i = Math.min(j, n);
      continue;
    }

    // Python strings
    if (isPy && (c === '"' || c === "'")) {
      const triple = c.repeat(3);
      if (text.startsWith(triple, i)) {
        let j = i + 3;
        let closed = false;
        while (j < n) {
          if (text[j] === '\\') {
            j += 2;
            continue;
          }
          if (text.startsWith(triple, j)) {
            closed = true;
            j += 3;
            break;
          }
          j++;
        }
        if (!closed) {
          push({ from: i, to: i + 3, severity: 'error', message: `Missing closing ${triple} — this string never ends`, kind: 'quote' });
          break;
        }
        i = j;
      } else {
        i = scanLineString(i, c);
      }
      prev = 's';
      prevWord = '';
      continue;
    }

    // C++ raw string: R"delim( ... )delim"
    if (isCpp && c === '"' && text[i - 1] === 'R') {
      const m = /^"([^()\\\s]{0,16})\(/.exec(text.slice(i, i + 20));
      if (m) {
        const closeSeq = ')' + m[1] + '"';
        const endIdx = text.indexOf(closeSeq, i + m[0].length);
        if (toks.length && toks[toks.length - 1].to === i) toks.pop();
        if (endIdx === -1) {
          push({ from: i, to: i + m[0].length, severity: 'error', message: `Unterminated raw string — it needs ${closeSeq}`, kind: 'quote' });
          break;
        }
        addTok('str', '"', i, endIdx + closeSeq.length);
        i = endIdx + closeSeq.length;
        continue;
      }
    }

    // Rust raw strings: r"..." r#"..."# br#"..."#
    if (isRust && (c === 'r' || c === 'b') && !isIdentChar(text[i - 1])) {
      const m = /^b?r(#*)"/.exec(text.slice(i, i + 24));
      if (m) {
        const closeSeq = '"' + m[1];
        const endIdx = text.indexOf(closeSeq, i + m[0].length);
        if (endIdx === -1) {
          push({ from: i, to: i + m[0].length, severity: 'error', message: 'Unterminated raw string — it never ends', kind: 'quote' });
          break;
        }
        i = endIdx + closeSeq.length;
        prev = 's';
        continue;
      }
    }

    // Rust strings may span lines; characters and lifetimes both start with a single quote.
    if (isRust && c === '"') {
      i = scanBlockString(i);
      prev = 's';
      continue;
    }
    if (isRust && c === "'") {
      if (d === '\\') {
        let j = i + 3;
        while (j < n && text[j] !== "'" && text[j] !== '\n') j++;
        if (text[j] === "'") i = j + 1;
        else {
          push({ from: i, to: Math.max(i + 1, lineEnd(i)), severity: 'error', message: "Missing closing single quote (') in this character", kind: 'quote' });
          i = Math.min(j, n);
        }
      } else {
        const cp = text.codePointAt(i + 1);
        const width = cp !== undefined && cp > 0xffff ? 2 : 1;
        if (cp !== undefined && text[i + 1 + width] === "'") i += 2 + width; // 'a'
        else i++; // a lifetime such as 'a
      }
      prev = 's';
      continue;
    }

    // JavaScript template literal
    if (isJs && c === '`') {
      i = scanTemplate(i + 1, i);
      prev = 's';
      prevWord = '';
      continue;
    }

    // C++ and JavaScript quotes
    if ((isCpp || isJs) && (c === '"' || c === "'")) {
      const start = i;
      i = scanLineString(i, c);
      addTok('str', c, start, i);
      prev = 's';
      prevWord = '';
      continue;
    }

    // JavaScript regular expression literal (a slash where a value is expected)
    if (isJs && c === '/') {
      const allowed = prev === '' || REGEX_PRECEDING_CHARS.includes(prev) || (prev === 'a' && REGEX_PRECEDING_WORDS.has(prevWord));
      if (allowed) {
        const end = scanRegex(i);
        if (end > 0) {
          i = end;
          prev = 'a';
          prevWord = '';
          continue;
        }
      }
      i++;
      prev = '/';
      prevWord = '';
      continue;
    }

    // Identifiers and numbers
    if (isIdentStart(c)) {
      let j = i + 1;
      while (j < n && isIdentChar(text[j])) j++;
      const word = text.slice(i, j);
      addTok('id', word, i, j);
      prev = 'a';
      prevWord = word;
      i = j;
      continue;
    }
    if (c >= '0' && c <= '9') {
      let j = i + 1;
      while (j < n && (/[\w.]/.test(text[j]) || (isCpp && text[j] === "'" && /[0-9a-fA-F]/.test(text[j + 1] ?? '')))) j++;
      addTok('num', text.slice(i, j), i, j);
      prev = 'a';
      prevWord = '';
      i = j;
      continue;
    }

    // Brackets
    if (c === '(' || c === '[' || c === '{') {
      const block = isCpp && c === '{' ? braceIsBlock() : c === '{';
      stack.push({ ch: c, pos: i, tok: toks.length, block });
      addTok('op', c, i, i + 1);
      prev = c;
      prevWord = '';
      i++;
      continue;
    }
    if (c === ')' || c === ']' || c === '}') {
      const top = stack[stack.length - 1];
      if (c === '}' && top && top.ch === '${') {
        stack.pop();
        i = scanTemplate(i + 1, top.tpl ?? top.pos);
        prev = 's';
        continue;
      }
      const want = CLOSE_TO_OPEN[c];
      let closed: Opener | undefined;
      if (top && top.ch === want) {
        closed = stack.pop();
      } else {
        let k = stack.length - 1;
        while (k >= 0 && stack[k].ch !== want && stack[k].ch !== '${') k--;
        if (k >= 0 && stack[k].ch === want) {
          for (let m = stack.length - 1; m > k; m--) unclosed(stack[m]);
          closed = stack[k];
          stack.length = k;
        } else {
          push({ from: i, to: i + 1, severity: 'error', message: `Unexpected '${c}' — there is no matching '${want}' before it`, kind: 'bracket' });
        }
      }
      const idx = addTok('op', c, i, i + 1);
      if (idx >= 0 && closed) {
        toks[idx].match = closed.tok;
        toks[idx].blk = closed.block;
      }
      prev = c;
      prevWord = '';
      i++;
      continue;
    }

    // Other punctuation
    const two = d === undefined ? '' : c + d;
    if (isCpp && TWO_CHAR_OPS.has(two)) {
      addTok('op', two, i, i + 2);
      prev = c;
      prevWord = '';
      i += 2;
      continue;
    }
    addTok('op', c, i, i + 1);
    prev = c;
    prevWord = '';
    i++;
  }

  // Anything still open at the end of the file
  for (let k = stack.length - 1; k >= 0; k--) unclosed(stack[k]);

  // A broken string swallows the rest of its line, so the brackets there look unbalanced. Report only the quote.
  const hasQuoteIssue = issues.some((x) => x.kind === 'quote' || x.kind === 'comment');
  const result = hasQuoteIssue ? issues.filter((x) => x.kind !== 'bracket') : issues;
  if (isCpp && result.length === 0) findMissingSemicolons(toks, macros, (x) => result.push(x));
  return result;
}

/* ------------------------------------------------------------------ */
/* C++: a line that looks like a finished statement but has no ';'      */
/* ------------------------------------------------------------------ */

function findMissingSemicolons(toks: Tok[], macros: Set<string>, push: (issue: LiveIssue) => void) {
  const endsLikeStatement = (a: Tok): boolean => {
    if (a.k === 'num' || a.k === 'str') return true;
    if (a.k === 'id') return !NON_FINAL.has(a.t) && !macros.has(a.t);
    if (a.t === '++' || a.t === '--') return true;
    if (a.t === '}') return a.blk === false; // the end of an initializer list or an enum needs a ';'
    if (a.t === ']') {
      // [[nodiscard]] style attributes sit on their own line and are not statements.
      const before = a.match !== undefined ? toks[a.match - 1] : undefined;
      const after = a.match !== undefined ? toks[a.match + 1] : undefined;
      return !(before?.t === '[' || after?.t === '[');
    }
    if (a.t === ')') {
      const before = a.match !== undefined ? toks[a.match - 1] : undefined;
      if (before && before.k === 'id') {
        if (CONTROL.has(before.t) || macros.has(before.t)) return false; // a loop or if header: the body follows
        if (/^[A-Z][A-Z0-9_]*$/.test(before.t)) return false; // a function-like macro
      }
      return true;
    }
    return false;
  };

  const startsNewStatement = (a: Tok, b: Tok): boolean => {
    if (b.k === 'num') return true;
    if (b.k === 'str') return a.k !== 'str'; // neighbouring string literals join into one
    if (b.k === 'id') return !CONTINUATION.has(b.t);
    if (b.t === '}') return b.blk === true;
    return b.t === '++' || b.t === '--';
  };

  for (let k = 0; k + 1 < toks.length; k++) {
    const a = toks[k];
    const b = toks[k + 1];
    if (b.line === a.line || !a.stmt) continue;
    if (!endsLikeStatement(a) || !startsNewStatement(a, b)) continue;
    push({ from: a.from, to: a.to, severity: 'error', message: "Expected ';' at the end of this statement", kind: 'semicolon' });
  }
}

export function scanText(language: Language, text: string): LiveIssue[] {
  return analyze(language, text);
}

/* ------------------------------------------------------------------ */
/* Parser error nodes                                                  */
/* ------------------------------------------------------------------ */

/** The part of a Lezer syntax tree this module uses, so tests and callers need no extra import. */
export interface SyntaxTreeLike {
  iterate(spec: { enter(node: { type: { isError: boolean }; from: number; to: number }): boolean | void }): void;
}

const TREE_HINT: Record<Language, string> = {
  python: "Invalid syntax — a ':' or a closing bracket may be missing here",
  javascript: "Syntax error — check for a missing ')', '}' or ',' here or just above",
  typescript: "Possible syntax error — check for a missing ')', '}' or ',' here or just above",
  rust: "Possible syntax error — a ';' or a closing bracket may be missing here",
  cpp: 'Syntax error',
};

export function treeIssues(tree: SyntaxTreeLike, text: string, language: Language): LiveIssue[] {
  // The C++ parser accepts a missing ';' and rejects some valid modern C++, so it is not trusted.
  if (language === 'cpp') return [];
  const severity = language === 'python' || language === 'javascript' ? 'error' : 'warning';
  const out: LiveIssue[] = [];
  tree.iterate({
    enter(node) {
      if (out.length >= 3) return false;
      if (!node.type.isError) return;
      let { from, to } = node;
      if (to <= from) {
        // "Something is missing here": point at the last visible character before the gap.
        let p = Math.min(from, text.length);
        while (p > 0 && /\s/.test(text[p - 1])) p--;
        if (p === 0) {
          from = 0;
          to = Math.min(1, text.length);
        } else {
          from = p - 1;
          to = p;
        }
      } else {
        const nl = text.indexOf('\n', from);
        to = Math.min(to, from + 40, nl === -1 ? text.length : nl);
        if (to <= from) to = Math.min(text.length, from + 1);
      }
      out.push({ from, to, severity, message: TREE_HINT[language] });
      return false;
    },
  });
  return out;
}

/** Everything the editor shows while typing: scanner findings first, parser findings if the scanner found none. */
export function liveIssues(language: Language, text: string, tree?: SyntaxTreeLike | null): LiveIssue[] {
  const scanned = analyze(language, text);
  const found = scanned.length > 0 || !tree ? scanned : treeIssues(tree, text, language);
  return found.slice().sort((a, b) => a.from - b.from || a.to - b.to);
}
