/**
 * Display-only tree for the formula field. It mirrors the grammar in parser.ts
 * (implicit products, * and / left to right, ^ binding tighter than /) so that the
 * stacked fractions and superscripts match what is actually computed. Every node
 * keeps its index in the source string so the cursor can be placed exactly.
 */

export type Ch = { t: 'ch'; i: number; ch: string };
export type Lit = { t: 'lit'; ch: string };
export type Seq = { nodes: Node[]; start: number; end: number };
export type Sup = { t: 'sup'; base: Seq; exp: Seq; start: number; end: number };
export type Frac = { t: 'frac'; num: Seq; den: Seq; start: number; end: number };
export type Node = Ch | Lit | Sup | Frac;

// Longest first, so "asin(" is never read as "sin(".
const FUNCTION_NAMES = [
  'asin', 'acos', 'atan', 'asec', 'acsc', 'acot',
  'sinh', 'cosh', 'tanh', 'sech', 'csch', 'coth',
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot',
  'sqrt', 'cbrt', 'abs', 'exp', 'ln', 'log2', 'log',
  'floor', 'ceil', 'round', 'sign', 'sinc',
].sort((a, b) => b.length - a.length);

const isDigit = (c?: string) => !!c && (c === '.' || (c >= '0' && c <= '9'));
const isLetter = (c?: string) => !!c && /[a-zA-Z]/.test(c);
const isFactorStart = (c?: string) => isDigit(c) || isLetter(c) || c === '(' || c === '|';

class Parser {
  private p = 0;

  constructor(private readonly s: string) {}

  seq(closer?: string): Seq {
    const start = this.p;
    const nodes: Node[] = [];
    while (this.p < this.s.length && this.s[this.p] !== closer) {
      if (isFactorStart(this.s[this.p])) nodes.push(...this.chain());
      else nodes.push(this.ch());
    }
    return { nodes, start, end: this.p };
  }

  private ch(): Ch {
    const i = this.p;
    this.p++;
    return { t: 'ch', i, ch: this.s[i] };
  }

  /** A run of factors joined by implicit products, "*", or "/". */
  private chain(): Node[] {
    const start = this.p;
    let cur: Node[] = this.factor();

    for (;;) {
      const c = this.s[this.p];
      if (c === '/') {
        const slash = this.p;
        this.p++;
        const denStart = this.p;
        const den = this.factor();
        cur = [
          {
            t: 'frac',
            num: { nodes: cur, start, end: slash },
            den: { nodes: den, start: denStart, end: this.p },
            start,
            end: this.p,
          },
        ];
      } else if (c === '*') {
        cur.push(this.ch());
        cur.push(...this.factor());
      } else if (isFactorStart(c)) {
        cur.push(...this.factor());
      } else {
        break;
      }
    }
    return cur;
  }

  /** A primary with an optional right-associative exponent. */
  private factor(): Node[] {
    if (!isFactorStart(this.s[this.p])) return [];
    const start = this.p;
    const base = this.primary();

    if (this.s[this.p] !== '^') return base;

    const caret = this.p++;
    const expStart = this.p;
    const exp: Node[] = [];
    if (this.s[this.p] === '-' || this.s[this.p] === '+') exp.push(this.ch());
    if (isFactorStart(this.s[this.p])) exp.push(...this.factor());

    return [{
      t: 'sup',
      base: { nodes: base, start, end: caret },
      exp: { nodes: exp, start: expStart, end: this.p },
      start,
      end: this.p,
    }];
  }

  private primary(): Node[] {
    const c = this.s[this.p];

    if (isDigit(c)) {
      const out: Node[] = [];
      while (isDigit(this.s[this.p])) out.push(this.ch());
      return out;
    }

    if (c === '(') return this.group();

    if (isLetter(c)) {
      // Match functions with or without parentheses, as the evaluator does.
      const fn = FUNCTION_NAMES.find((name) => this.s.startsWith(name, this.p));
      if (fn) {
        const out: Node[] = [];
        for (let k = 0; k < fn.length; k++) out.push(this.ch());

        if (this.s[this.p] === '(') return [...out, ...this.group()];

        // The evaluator reads sinx^2 as (sin(x))^2. Add display-only
        // parentheses so the rendered expression communicates that grouping.
        if (isFactorStart(this.s[this.p])) {
          return [...out, { t: 'lit', ch: '(' }, ...this.primary(), { t: 'lit', ch: ')' }];
        }
        return out;
      }
      return [this.ch()];
    }

    // "|" is kept as a plain character.
    return [this.ch()];
  }

  private group(): Node[] {
    const out: Node[] = [this.ch()];
    out.push(...this.seq(')').nodes);
    if (this.s[this.p] === ')') out.push(this.ch());
    return out;
  }
}

export function parseDisplay(text: string): Seq {
  return new Parser(text).seq();
}