import { useEffect, useMemo, useRef, useState } from 'react';
import type { Row } from '@/components/ExpressionList';
import type { RowStatus } from '@/lib/relation';
import { fitQuadratic, formatQuadratic, type QuadraticCoefficients } from '@/lib/quadraticFit';
import { solveQuadratic } from '@/utils/mathEngine.ts';
import { KaTeX } from '@/components/KaTeX.tsx';
import { exactQuadraticRoots } from '@/lib/exactRoots.ts';
import { expressionToTex } from '@/lib/tex.ts';

interface QuadraticInspectorProps {
  rows: Row[];
  statuses: Record<string, RowStatus | undefined>;
  focusId: string | null;
  onRewrite: (rowId: string, text: string) => void;
}

type Target = { row: Row; coeffs: QuadraticCoefficients };

/** Keeps the "f(x) =" or "y =" part of a row so an edit does not rename the function. */
function prefixOf(text: string): string {
  const match = /^\s*([a-zA-Z]\(x\)|y)\s*=/.exec(text);
  return match ? `${match[1]} = ` : '';
}

/**
 * Finds the quadratic to analyse: the focused row if it is a quadratic,
 * otherwise the first visible quadratic in the list.
 */
function findTarget(rows: Row[], statuses: QuadraticInspectorProps['statuses'], focusId: string | null): Target | null {
  const candidates: Target[] = [];
  for (const row of rows) {
    if (row.type === 'table' || !row.visible) continue;
    const status = statuses[row.id];
    if (!status || status.kind !== 'ok') continue;
    const rel = status.relation;
    if (rel.kind !== 'explicit' && rel.kind !== 'functionDef') continue;
    const coeffs = fitQuadratic(rel.fn);
    if (coeffs) candidates.push({ row, coeffs });
  }
  return candidates.find((t) => t.row.id === focusId) ?? candidates[0] ?? null;
}

function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const min = Math.min(-10, Math.floor(value) - 1);
  const max = Math.max(10, Math.ceil(value) + 1);
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center justify-between text-xs text-muted">
        <span>{label}</span>
        <span className="font-sans tabular-nums font-semibold text-accent">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${label} coefficient`}
        className="w-full cursor-pointer accent-indigo-500"
      />
    </label>
  );
}

export default function QuadraticInspector({ rows, statuses, focusId, onRewrite }: QuadraticInspectorProps) {
  const target = useMemo(() => findTarget(rows, statuses, focusId), [rows, statuses, focusId]);
  const [rootView, setRootView] = useState<'exact' | 'decimal'>('exact');
  // The coefficients the user is setting. Held here, so fast key presses are not lost while the
  // expression is still being re-read. Cleared when the expression is edited by typing.
  const [draft, setDraft] = useState<QuadraticCoefficients | null>(null);
  const written = useRef<Set<string>>(new Set());
  const rowText = target?.row.text;
  useEffect(() => {
    if (rowText === undefined) return;
    if (written.current.has(rowText)) return; // our own write coming back
    written.current.clear();
    setDraft(null);
  }, [rowText]);

  if (!target) {
    return (
      <section className="mt-4 rounded-xl border border-line bg-field/60 p-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted font-sans">Quadratic analysis</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          Type a quadratic such as <span className="font-sans tabular-nums text-ink">x^2 - 4x + 3</span> or{' '}
          <span className="font-sans tabular-nums text-ink">(x - 3)(x - 1)</span> to see its discriminant, roots, vertex, and a step-by-step factorization here.
        </p>
      </section>
    );
  }

  const { row, coeffs: parsed } = target;
  const coeffs = draft ?? parsed;
  const { a, b, c } = coeffs;
  const result = solveQuadratic(a, b, c);
  const exact = exactQuadraticRoots(a, b, c);
  const prefix = prefixOf(row.text);

  const rewrite = (next: QuadraticCoefficients) => {
    const text = `${prefix}${formatQuadratic(next)}`;
    written.current.add(text);
    setDraft(next);
    onRewrite(row.id, text);
  };

  const discColor =
    result.discriminant > 0 ? 'text-emerald-400' : result.discriminant === 0 ? 'text-amber-400' : 'text-rose-400';
  const discNote =
    result.discriminant > 0 ? 'Two real roots' : result.discriminant === 0 ? 'One repeated root' : 'Complex roots, no x-intercept';

  return (
    <section className="mt-4 flex flex-col gap-3" aria-label="Quadratic analysis">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted font-sans">Quadratic analysis</h3>
        <span className="truncate text-[11px] text-muted"><KaTeX math={expressionToTex(formatQuadratic(coeffs))} /></span>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-line bg-field/60 p-3">
        <Slider label="a (x²)" value={a} onChange={(v) => rewrite({ ...coeffs, a: v })} />
        <Slider label="b (x)" value={b} onChange={(v) => rewrite({ ...coeffs, b: v })} />
        <Slider label="c (constant)" value={c} onChange={(v) => rewrite({ ...coeffs, c: v })} />
        <p className="text-[11px] text-muted">Drag a slider to change the expression above. The graph updates with it.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-line bg-field/60 p-3">
          <div className="text-[11px] text-muted">Discriminant Δ</div>
          <div className={`mt-0.5 font-sans tabular-nums text-lg font-bold tabular-nums ${discColor}`}>{result.discriminant}</div>
          <div className="mt-0.5 text-[11px] text-muted">{discNote}</div>
        </div>
        <div className="rounded-xl border border-line bg-field/60 p-3">
          <div className="text-[11px] text-muted">Vertex</div>
          <div className="mt-0.5 font-sans tabular-nums text-sm font-bold tabular-nums text-ink">
            ({result.vertex.x.toFixed(2)}, {result.vertex.y.toFixed(2)})
          </div>
          <div className="mt-0.5 text-[11px] text-muted">{a > 0 ? 'Minimum' : 'Maximum'}</div>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-field/60 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] text-muted">Roots</div>
          {exact && (
            <div className="flex gap-1" role="group" aria-label="Root format">
              {(['exact', 'decimal'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setRootView(v)}
                  aria-pressed={rootView === v}
                  className={`btn btn-ghost btn-sm capitalize ${rootView === v ? 'is-active' : ''}`}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>
        {exact && rootView === 'exact' ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-4 text-ink">
            {exact.roots.map((r, i) => (
              <span key={i} className="text-sm">
                <KaTeX math={r.latex} />
              </span>
            ))}
          </div>
        ) : (
          <div className="mt-0.5 font-sans tabular-nums text-sm text-ink">
            {result.hasRealRoots && result.roots.length > 0 ? result.roots.map((r) => r.toFixed(3)).join(', ') : 'None (complex)'}
          </div>
        )}
        {!exact && <p className="mt-1 text-[11px] text-muted">Exact form needs whole-number coefficients, so only decimals are shown.</p>}
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-line bg-field/60 p-3">
        <div className="text-xs font-semibold text-emerald-400">Factorization and proof</div>
        <div className="rounded-lg border border-line bg-panel px-2.5 py-1.5 font-sans tabular-nums text-xs text-accent">
          f(x) = {result.factorization}
        </div>
        <ol className="flex list-none flex-col gap-1.5">
          {result.steps.map((step, i) => (
            <li key={i} className="rounded-lg border border-line/60 bg-panel/60 px-2.5 py-1.5 font-sans tabular-nums text-[11px] leading-relaxed text-muted">
              {step}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
