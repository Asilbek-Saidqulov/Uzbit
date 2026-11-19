import { compileExpr, ExprError, type Expr, type ExprEnv, type Vars } from './expr';

export type Op = '<' | '<=' | '>' | '>=';

export type Relation =
  | { kind: 'explicit'; fn: (x: number) => number }
  | { kind: 'vline'; x: number }
  | { kind: 'implicit'; F: Vars }
  | { kind: 'region'; F: Vars; op: Op }
  | { kind: 'variable'; name: string; value: number }
  | { kind: 'functionDef'; name: string; param: string; fn: (x: number) => number };

export type Drawable = Exclude<Relation, { kind: 'variable' }>;

export type ParseResult =
  | { status: 'empty' }
  | { status: 'ok'; value: Relation; unboundVars?: string[] }
  | { status: 'error'; message: string };

export type RowStatus =
  | { kind: 'empty' }
  | { kind: 'ok'; label: string; relation: Relation; unboundVars?: string[] }
  | { kind: 'error'; message: string; stale?: Drawable };

const ok = (value: Relation, unboundVars: string[] = []): ParseResult => ({
  status: 'ok',
  value,
  unboundVars,
});
const fail = (message: string): ParseResult => ({ status: 'error', message });
const squash = (s: string) => s.replace(/\s+/g, '').toLowerCase();

const isYSide = (s: string) => {
  const k = squash(s);
  return k === 'y';
};

const isVariableName = (s: string) => /^[a-zA-Z]$/.test(s) && !'xye'.includes(s);

// Detects function definition headers such as f(x) or g(x)
const FUNCTION_DEF_REGEX = /^([a-zA-Z])\(([a-zA-Z])\)$/;

const OPERATOR = /<=|>=|<|>|=/g;

function normalize(input: string): string {
  return input
    .replace(/[×·⋅]/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–]/g, '-')
    .replace(/π/g, 'pi')
    .replace(/√/g, 'sqrt')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .trim();
}

export function labelOf(r: Relation): string {
  if (r.kind === 'explicit') return 'y = f(x)';
  if (r.kind === 'vline') return 'Vertical line';
  if (r.kind === 'region') return 'Inequality region';
  if (r.kind === 'variable') return 'Parameter slider';
  if (r.kind === 'functionDef') return `Function ${r.name}(${r.param})`;
  return 'Implicit curve';
}

export function parseRelation(input: string, env: ExprEnv = {}): ParseResult {
  const src = normalize(input);
  if (!src) return { status: 'empty' };

  try {
    const ops = [...src.matchAll(OPERATOR)];

    if (ops.length === 0) {
      const e = compileExpr(src, env);
      if (e.usesY) return fail('Write equations in terms of x or y, such as x^2 + y^2 = 1.');
      return ok({ kind: 'explicit', fn: (x) => e.fn(x, 0) }, e.unboundVars);
    }
    if (ops.length > 1) return fail('Use only one "=", "<", or ">" sign.');

    const op = ops[0][0] as Op | '=';
    const at = ops[0].index ?? 0;
    const lhs = src.slice(0, at).trim();
    const rhs = src.slice(at + op.length).trim();
    if (!lhs || !rhs) return fail(`Complete both sides of "${op}".`);

    // 1. Function definition: f(x) = 2x^2 + 1
    const fnMatch = lhs.match(FUNCTION_DEF_REGEX);
    if (op === '=' && fnMatch) {
      const fnName = fnMatch[1].toLowerCase();
      const paramName = fnMatch[2].toLowerCase();
      const rhsExpr = compileExpr(rhs, env);
      if (rhsExpr.usesY) return fail(`Function ${fnName}(${paramName}) cannot use y.`);

      return ok(
        {
          kind: 'functionDef',
          name: fnName,
          param: paramName,
          fn: (v: number) => rhsExpr.fn(v, 0),
        },
        rhsExpr.unboundVars.filter((v) => v !== paramName)
      );
    }

    // 2. Numeric variable slider: a = 2
    if (op === '=' && isVariableName(squash(lhs))) {
      const name = squash(lhs);
      const e = compileExpr(rhs, env);
      if (e.usesX || e.usesY) {
        return fail(`${name} is a number, so it cannot contain x or y.`);
      }
      const value = e.fn(0, 0);
      if (!Number.isFinite(value)) return fail('Value must be a finite real number.');
      return ok({ kind: 'variable', name, value }, e.unboundVars);
    }

    const lY = isYSide(lhs);
    const rY = isYSide(rhs);
    if (lY && rY) return fail('Both sides are y.');

    const L: Expr | null = lY ? null : compileExpr(lhs, env);
    const R: Expr | null = rY ? null : compileExpr(rhs, env);

    const usesX = !!L?.usesX || !!R?.usesX;
    const usesY = lY || rY || !!L?.usesY || !!R?.usesY;
    if (!usesX && !usesY) return fail('Add x or y to the expression.');

    const left: Vars = L ? L.fn : (_x, y) => y;
    const right: Vars = R ? R.fn : (_x, y) => y;
    const F: Vars = (x, y) => left(x, y) - right(x, y);

    const unbound = [...new Set([...(L?.unboundVars || []), ...(R?.unboundVars || [])])];

    if (op !== '=') return ok({ kind: 'region', F, op }, unbound);

    // y = g(x)
    if (lY && R && !R.usesY) return ok({ kind: 'explicit', fn: (x) => R.fn(x, 0) }, unbound);
    if (rY && L && !L.usesY) return ok({ kind: 'explicit', fn: (x) => L.fn(x, 0) }, unbound);

    // x = c
    if (squash(lhs) === 'x' && R && !R.usesX && !R.usesY) {
      const val = R.fn(0, 0);
      return Number.isFinite(val) ? ok({ kind: 'vline', x: val }, unbound) : fail('Not a real number.');
    }
    if (squash(rhs) === 'x' && L && !L.usesX && !L.usesY) {
      const val = L.fn(0, 0);
      return Number.isFinite(val) ? ok({ kind: 'vline', x: val }, unbound) : fail('Not a real number.');
    }

    return ok({ kind: 'implicit', F }, unbound);
  } catch (err) {
    return fail(err instanceof ExprError ? err.message : 'This expression could not be read.');
  }
}