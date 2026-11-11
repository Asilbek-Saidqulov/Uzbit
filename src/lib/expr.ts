export type Vars = (x: number, y: number) => number;

export type UserFunc = (arg: number) => number;

export type ExprEnv = {
  vars?: Record<string, number>;
  funcs?: Record<string, UserFunc>;
};

export type Expr = {
  fn: Vars;
  usesX: boolean;
  usesY: boolean;
  unboundVars: string[];
};

export class ExprError extends Error {}

type Tok = { k: 'num' | 'name' | 'op'; t: string; v?: number };

type Node =
  | { type: 'num'; v: number }
  | { type: 'var'; name: 'x' | 'y' }
  | { type: 'neg'; a: Node }
  | { type: 'call'; f: (n: number) => number; a: Node }
  | { type: 'userCall'; name: string; a: Node }
  | { type: 'bin'; op: '+' | '-' | '*' | '/' | '^'; l: Node; r: Node };

const BUILTIN_FUNCS = new Map<string, (n: number) => number>([
  ['sin', Math.sin],
  ['cos', Math.cos],
  ['tan', Math.tan],
  ['sec', (x) => 1 / Math.cos(x)],
  ['csc', (x) => 1 / Math.sin(x)],
  ['cot', (x) => 1 / Math.tan(x)],
  ['asin', Math.asin],
  ['acos', Math.acos],
  ['atan', Math.atan],
  ['asec', (x) => Math.acos(1 / x)],
  ['acsc', (x) => Math.asin(1 / x)],
  ['acot', (x) => Math.atan(1 / x)],
  ['sinh', Math.sinh],
  ['cosh', Math.cosh],
  ['tanh', Math.tanh],
  ['sech', (x) => 1 / Math.cosh(x)],
  ['csch', (x) => 1 / Math.sinh(x)],
  ['coth', (x) => 1 / Math.tanh(x)],
  ['sqrt', Math.sqrt],
  ['cbrt', Math.cbrt],
  ['abs', Math.abs],
  ['exp', Math.exp],
  ['ln', Math.log],
  ['log', Math.log10],
  ['log2', Math.log2],
  ['floor', Math.floor],
  ['ceil', Math.ceil],
  ['round', Math.round],
  ['sign', Math.sign],
  ['sinc', (x) => (x === 0 ? 1 : Math.sin(x) / x)],
]);

const CONSTS = new Map<string, number>([
  ['pi', Math.PI],
  ['e', Math.E],
]);

export function findFreeIdentifiers(src: string): string[] {
  const matches = src.match(/[a-zA-Z]+/g) || [];
  const reserved = new Set([
    ...BUILTIN_FUNCS.keys(),
    ...CONSTS.keys(),
    'x',
    'y',
  ]);
  const free = new Set<string>();
  for (const m of matches) {
    const k = m.toLowerCase();
    if (!reserved.has(k) && k.length === 1) {
      free.add(k);
    }
  }
  return [...free];
}

function tokenize(src: string, env: ExprEnv): Tok[] {
  const customVarNames = Object.keys(env.vars || {});
  const customFuncNames = Object.keys(env.funcs || {});
  const words = [
    ...BUILTIN_FUNCS.keys(),
    ...CONSTS.keys(),
    ...customFuncNames,
    'x',
    'y',
    ...customVarNames,
  ].sort((a, b) => b.length - a.length);

  const out: Tok[] = [];
  let i = 0;

  while (i < src.length) {
    const ch = src[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    const num = /^(\d+\.?\d*|\.\d+)/.exec(src.slice(i));
    if (num) {
      out.push({ k: 'num', t: num[0], v: parseFloat(num[0]) });
      i += num[0].length;
      continue;
    }

    if (/[a-zA-Z]/.test(ch)) {
      // 1. Try matching known function/constant words first (e.g. "log2", "sinh", "sec")
      const matchedWord = words.find((w) => src.startsWith(w, i));
      if (matchedWord) {
        out.push({ k: 'name', t: matchedWord });
        i += matchedWord.length;
        continue;
      }

      // 2. Otherwise extract individual letter identifier (e.g. variable 'a', 'x', 'y')
      out.push({ k: 'name', t: ch });
      i++;
      continue;
    }

    if ('+-*/^()|'.includes(ch)) {
      out.push({ k: 'op', t: ch });
      i++;
      continue;
    }

    throw new ExprError(`Unexpected character "${ch}".`);
  }

  return out;
}

class Parser {
  private pos = 0;
  private absDepth = 0;
  public unbound = new Set<string>();

  constructor(private readonly toks: Tok[], private readonly env: ExprEnv) {}

  parse(): Node {
    if (this.toks.length === 0) throw new ExprError('Finish the expression.');
    const node = this.expr();
    if (this.pos < this.toks.length) {
      throw new ExprError(`Unexpected "${this.toks[this.pos].t}".`);
    }
    return node;
  }

  private peek(): Tok | undefined {
    return this.toks[this.pos];
  }

  private isOp(text: string): boolean {
    const k = this.peek();
    return k?.k === 'op' && k.t === text;
  }

  private expect(text: string): void {
    if (!this.isOp(text)) throw new ExprError(`Missing "${text}".`);
    this.pos++;
  }

  private startsPrimary(): boolean {
    const k = this.peek();
    if (!k) return false;
    if (k.k === 'num' || k.k === 'name') return true;
    return k.k === 'op' && (k.t === '(' || (k.t === '|' && this.absDepth === 0));
  }

  private expr(): Node {
    let left = this.term();
    while (this.isOp('+') || this.isOp('-')) {
      const op = this.toks[this.pos++].t as '+' | '-';
      left = { type: 'bin', op, l: left, r: this.term() };
    }
    return left;
  }

  private term(): Node {
    let left = this.unary();
    for (;;) {
      if (this.isOp('*') || this.isOp('/')) {
        const op = this.toks[this.pos++].t as '*' | '/';
        left = { type: 'bin', op, l: left, r: this.unary() };
      } else if (this.startsPrimary()) {
        left = { type: 'bin', op: '*', l: left, r: this.unary() };
      } else {
        break;
      }
    }
    return left;
  }

  private unary(): Node {
    if (this.isOp('-')) {
      this.pos++;
      return { type: 'neg', a: this.unary() };
    }
    if (this.isOp('+')) {
      this.pos++;
      return this.unary();
    }
    return this.power();
  }

  private power(): Node {
    const base = this.primary();
    if (this.isOp('^')) {
      this.pos++;
      return { type: 'bin', op: '^', l: base, r: this.unary() };
    }
    return base;
  }

  private parenthesized(): Node {
    this.expect('(');
    const inner = this.expr();
    this.expect(')');
    return inner;
  }

  private primary(): Node {
    const t = this.peek();
    if (!t) throw new ExprError('The expression ends too soon.');

    if (t.k === 'num') {
      this.pos++;
      return { type: 'num', v: t.v ?? 0 };
    }

    if (t.k === 'name') {
      this.pos++;
      const name = t.t;

      if (BUILTIN_FUNCS.has(name)) {
        const fn = BUILTIN_FUNCS.get(name)!;
        const arg = this.isOp('(') ? this.parenthesized() : this.primary();
        return { type: 'call', f: fn, a: arg };
      }

      if (this.env.funcs && Object.prototype.hasOwnProperty.call(this.env.funcs, name)) {
        const arg = this.isOp('(') ? this.parenthesized() : this.primary();
        return { type: 'userCall', name, a: arg };
      }

      if (name === 'x') return { type: 'var', name: 'x' };
      if (name === 'y') return { type: 'var', name: 'y' };

      if (this.env.vars && Object.prototype.hasOwnProperty.call(this.env.vars, name)) {
        return { type: 'num', v: this.env.vars[name] };
      }

      const c = CONSTS.get(name);
      if (c !== undefined) return { type: 'num', v: c };

      // Free parameter
      this.unbound.add(name);
      return { type: 'num', v: 1 }; // Default placeholder
    }

    if (this.isOp('(')) return this.parenthesized();

    if (this.isOp('|')) {
      this.pos++;
      this.absDepth++;
      const inner = this.expr();
      this.absDepth--;
      if (!this.isOp('|')) throw new ExprError('Missing closing "|".');
      this.pos++;
      return { type: 'call', f: Math.abs, a: inner };
    }

    throw new ExprError(`Unexpected "${t.t}".`);
  }
}

function mark(n: Node, seen: { x: boolean; y: boolean }): void {
  switch (n.type) {
    case 'var':
      seen[n.name] = true;
      break;
    case 'num':
      break;
    case 'neg':
    case 'call':
    case 'userCall':
      mark(n.a, seen);
      break;
    case 'bin':
      mark(n.l, seen);
      mark(n.r, seen);
      break;
  }
}

function build(n: Node, env: ExprEnv): Vars {
  switch (n.type) {
    case 'num': {
      const v = n.v;
      return () => v;
    }
    case 'var':
      return n.name === 'x' ? (x) => x : (_x, y) => y;
    case 'neg': {
      const a = build(n.a, env);
      return (x, y) => -a(x, y);
    }
    case 'call': {
      const f = n.f;
      const a = build(n.a, env);
      return (x, y) => f(a(x, y));
    }
    case 'userCall': {
      const userFn = env.funcs?.[n.name] || ((v: number) => v);
      const a = build(n.a, env);
      return (x, y) => userFn(a(x, y));
    }
    case 'bin': {
      const l = build(n.l, env);
      const r = build(n.r, env);
      switch (n.op) {
        case '+':
          return (x, y) => l(x, y) + r(x, y);
        case '-':
          return (x, y) => l(x, y) - r(x, y);
        case '*':
          return (x, y) => l(x, y) * r(x, y);
        case '/':
          return (x, y) => l(x, y) / r(x, y);
        case '^':
          return (x, y) => Math.pow(l(x, y), r(x, y));
      }
    }
  }
}

export function compileExpr(src: string, env: ExprEnv = {}): Expr {
  const parser = new Parser(tokenize(src, env), env);
  const ast = parser.parse();
  const seen = { x: false, y: false };
  mark(ast, seen);
  return {
    fn: build(ast, env),
    usesX: seen.x,
    usesY: seen.y,
    unboundVars: [...parser.unbound],
  };
}