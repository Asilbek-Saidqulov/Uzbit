import React, { useState } from 'react';
import type { DemoKey } from '../../data/mathLessons';
import { squareStyle } from '../progress/ProgressSquare';

const PANEL = 'rounded-xl border border-slate-800 bg-slate-950/70 p-4 flex flex-col gap-4';

/* ---------- Unit circle ---------- */

const UnitCircleDemo: React.FC = () => {
  const [angle, setAngle] = useState(45);
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const c = 120;
  const r = 90;
  const px = c + r * cos;
  const py = c - r * sin;
  const arcR = 24;
  const arcEnd = { x: c + arcR * cos, y: c - arcR * sin };

  return (
    <div className={`${PANEL} sm:flex-row sm:items-center`}>
      <svg viewBox="0 0 240 240" className="h-56 w-56 shrink-0 self-center" role="img" aria-label={`Unit circle at ${angle} degrees. Cosine ${cos.toFixed(2)}, sine ${sin.toFixed(2)}.`}>
        <line x1="10" y1={c} x2="230" y2={c} stroke="rgb(var(--line))" />
        <line x1={c} y1="10" x2={c} y2="230" stroke="rgb(var(--line))" />
        <circle cx={c} cy={c} r={r} fill="none" stroke="rgb(var(--muted))" strokeWidth="1.5" />
        {angle > 0 && (
          <path d={`M ${c + arcR} ${c} A ${arcR} ${arcR} 0 ${angle > 180 ? 1 : 0} 0 ${arcEnd.x} ${arcEnd.y}`} fill="none" stroke="rgb(var(--ink))" strokeWidth="1.5" />
        )}
        <line x1={c} y1={c} x2={px} y2={py} stroke="rgb(var(--ink))" strokeWidth="1.5" />
        <line x1={c} y1={c} x2={px} y2={c} stroke="rgb(var(--accent))" strokeWidth="3" strokeLinecap="round" />
        <line x1={px} y1={c} x2={px} y2={py} stroke="rgb(var(--highlight))" strokeWidth="3" strokeLinecap="round" />
        <circle cx={px} cy={py} r="5" fill="rgb(var(--ink))" />
      </svg>

      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-sm">
            <label htmlFor="unit-angle" className="text-slate-300">Angle θ</label>
            <span className="font-semibold tabular-nums text-white">{angle}°</span>
          </div>
          <input
            id="unit-angle"
            type="range"
            min={0}
            max={360}
            step={5}
            value={angle}
            onChange={(e) => setAngle(parseInt(e.target.value, 10))}
            aria-valuetext={`${angle} degrees`}
            className="w-full cursor-pointer accent-accent"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="h-2.5 w-2.5 rounded-sm bg-accent" aria-hidden="true" /> cos θ, sideways
            </span>
            <span className="text-lg font-semibold tabular-nums text-white">{cos.toFixed(3)}</span>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="h-2.5 w-2.5 rounded-sm bg-highlight" aria-hidden="true" /> sin θ, height
            </span>
            <span className="text-lg font-semibold tabular-nums text-white">{sin.toFixed(3)}</span>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-slate-400">
          Slide the angle. The teal line is how far right (or left) the point is; the lime line is how high (or low).
        </p>
      </div>
    </div>
  );
};

/* ---------- Bayes ---------- */

const BayesDemo: React.FC = () => {
  const [prior, setPrior] = useState(1);
  const [sens, setSens] = useState(99);
  const [fp, setFp] = useState(5);

  const people = 1000;
  const sick = (prior / 100) * people;
  const truePos = (sens / 100) * sick;
  const falsePos = (fp / 100) * (people - sick);
  const posterior = truePos / (truePos + falsePos);
  const squares = Math.round(posterior * 20);

  const Slider = ({ id, label, value, min, max, set }: { id: string; label: string; value: number; min: number; max: number; set: (n: number) => void }) => (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-sm">
        <label htmlFor={id} className="text-slate-300">{label}</label>
        <span className="font-semibold tabular-nums text-white">{value}%</span>
      </div>
      <input id={id} type="range" min={min} max={max} value={value} onChange={(e) => set(parseInt(e.target.value, 10))} aria-valuetext={`${value} percent`} className="w-full cursor-pointer accent-accent" />
    </div>
  );

  return (
    <div className={PANEL}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Slider id="bayes-prior" label="How common is it?" value={prior} min={1} max={30} set={setPrior} />
        <Slider id="bayes-sens" label="Test catches it" value={sens} min={50} max={100} set={setSens} />
        <Slider id="bayes-fp" label="Healthy people flagged" value={fp} min={1} max={25} set={setFp} />
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4 flex flex-col gap-3">
        <p className="text-sm leading-relaxed text-slate-300">
          Picture {people.toLocaleString()} people. About <strong className="text-white">{Math.round(sick)}</strong> have it, and the test flags{' '}
          <strong className="text-white">{Math.round(truePos)}</strong> of them. Among the other {Math.round(people - sick)}, it wrongly flags{' '}
          <strong className="text-white">{Math.round(falsePos)}</strong>.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1" role="img" aria-label={`${squares} of every 20 positive results are real`}>
            {Array.from({ length: 20 }, (_, i) => (
              <span key={i} className="h-4 w-4 rounded-[3px] border" style={squareStyle(i < squares ? 4 : 0, 'success')} />
            ))}
          </div>
          <p className="text-sm text-slate-300" aria-live="polite">
            A positive result is real about <strong className="text-lg tabular-nums text-white">{(posterior * 100).toFixed(0)}%</strong> of the time.
          </p>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-slate-400">
        Try making the condition rarer. Even a very accurate test gives mostly false alarms when almost nobody has the condition.
      </p>
    </div>
  );
};

/* ---------- De Morgan truth table ---------- */

const TruthTableDemo: React.FC = () => {
  const [op, setOp] = useState<'AND' | 'OR'>('AND');
  const other = op === 'AND' ? 'OR' : 'AND';
  const combine = (a: boolean, b: boolean, which: 'AND' | 'OR') => (which === 'AND' ? a && b : a || b);
  const rows = [
    [true, true],
    [true, false],
    [false, true],
    [false, false],
  ] as const;
  const tf = (v: boolean) => (v ? 'T' : 'F');
  const cell = 'px-3 py-2 text-center tabular-nums';

  return (
    <div className={PANEL}>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Choose the operator">
        <span className="text-sm text-slate-300">Compare with</span>
        {(['AND', 'OR'] as const).map((o) => (
          <button key={o} type="button" onClick={() => setOp(o)} aria-pressed={op === o} className={`tab ${op === o ? 'is-active' : ''}`}>
            {o}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <caption className="sr-only">Truth table comparing NOT (A {op} B) with (NOT A) {other} (NOT B)</caption>
          <thead>
            <tr className="border-b border-slate-800 text-xs text-slate-400">
              <th scope="col" className={cell}>A</th>
              <th scope="col" className={cell}>B</th>
              <th scope="col" className={cell}>NOT (A {op} B)</th>
              <th scope="col" className={cell}>(NOT A) {other} (NOT B)</th>
              <th scope="col" className={cell}>Same?</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([a, b]) => {
              const left = !combine(a, b, op);
              const right = combine(!a, !b, other);
              return (
                <tr key={`${a}${b}`} className="border-b border-slate-800/60 text-slate-200">
                  <td className={cell}>{tf(a)}</td>
                  <td className={cell}>{tf(b)}</td>
                  <td className={cell}>{tf(left)}</td>
                  <td className={cell}>{tf(right)}</td>
                  <td className={`${cell} font-semibold text-emerald-400`}>{left === right ? 'Yes' : 'No'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs leading-relaxed text-slate-400">
        The last two columns match on every row. Pushing the NOT inside swaps AND for OR (and OR for AND).
      </p>
    </div>
  );
};

export const LessonDemo: React.FC<{ demo: DemoKey }> = ({ demo }) => {
  switch (demo) {
    case 'unit-circle':
      return <UnitCircleDemo />;
    case 'bayes':
      return <BayesDemo />;
    case 'truth-table':
      return <TruthTableDemo />;
  }
};
