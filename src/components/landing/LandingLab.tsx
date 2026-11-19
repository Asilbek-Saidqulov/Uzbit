import React, { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Terminal, type TermEntry } from '../../judge/components/Terminal';
import { FAIL_LINE, LAB_FILE, labSource, realRoots, runLab, type LabState } from '../../lib/rootsLab';

const X_MIN = -6;
const X_MAX = 6;
const Y_MIN = -12;
const Y_MAX = 12;
const W = 440;
const H = 320;
const START: LabState = { a: 1, b: -2, c: -3 };

const sx = (x: number) => ((x - X_MIN) / (X_MAX - X_MIN)) * W;
const sy = (y: number) => H - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * H;

const MINUS = '\u2212';
const signed = (n: number) => (n < 0 ? `${MINUS}${Math.abs(n)}` : String(n));

/** y = ax² + bx + c, written the way it would be on paper. */
function equation({ a, b, c }: LabState): string {
  const terms: string[] = [];
  const add = (coef: number, body: string) => {
    if (coef === 0) return;
    const mag = Math.abs(coef) === 1 && body ? '' : String(Math.abs(coef));
    terms.push(`${terms.length === 0 ? (coef < 0 ? MINUS : '') : coef < 0 ? ` ${MINUS} ` : ' + '}${mag}${body}`);
  };
  add(a, 'x²');
  add(b, 'x');
  add(c, '');
  return `y = ${terms.length ? terms.join('') : '0'}`;
}

const KEYWORDS = /^(import|if|else)$/;

/** Light colouring for the few Python tokens the lab uses. */
function colour(line: string): React.ReactNode[] {
  const parts = line.split(/("[^"]*"|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][\w.]*\b)/g);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith('"')) return <span key={i} className="text-emerald-300">{part}</span>;
    if (/^\d/.test(part)) return <span key={i} className="text-amber-300">{part}</span>;
    if (KEYWORDS.test(part)) return <span key={i} className="text-accent">{part}</span>;
    if (part === 'print' || part === 'math.sqrt') return <span key={i} className="text-sky-300">{part}</span>;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

const Slider: React.FC<{ name: 'a' | 'b' | 'c'; value: number; min: number; max: number; onChange: (v: number) => void }> = ({ name, value, min, max, onChange }) => (
  <label className="flex items-center gap-3 text-sm text-slate-200">
    <span className="w-14 shrink-0 font-mono tabular-nums">
      {name} = {signed(value)}
    </span>
    <input
      type="range"
      min={min}
      max={max}
      step={1}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-valuetext={`${name} equals ${value}`}
      className="h-2 w-full cursor-pointer accent-accent"
    />
  </label>
);

/**
 * The page's one big moment: a graph and the Python that solves it, side by side. Move a slider and both change.
 * Set a to 0 and the program fails the way a real one does, with the file, line and column in the terminal.
 */
export const LandingLab: React.FC = () => {
  const [state, setState] = useState<LabState>(START);
  const set = (key: keyof LabState) => (v: number) => setState((s) => ({ ...s, [key]: v }));

  const run = useMemo(() => runLab(state), [state]);
  const roots = useMemo(() => realRoots(state), [state]);
  const source = useMemo(() => labSource(state), [state]);
  const failed = Boolean(run.traceback);

  const entries: TermEntry[] = useMemo(
    () => [
      {
        type: 'run',
        id: 1,
        command: `python3 ${LAB_FILE}`,
        stream: [
          ...(run.stdout.length ? [{ fd: 1 as const, text: run.stdout.join('\n') + '\n' }] : []),
          ...(run.traceback ? [{ fd: 2 as const, text: run.traceback.join('\n') + '\n' }] : []),
        ],
        exitCode: run.exitCode,
        timeMs: 31,
      },
    ],
    [run]
  );

  const curve = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 160; i++) {
      const x = X_MIN + ((X_MAX - X_MIN) * i) / 160;
      pts.push(`${sx(x).toFixed(1)},${sy(state.a * x * x + state.b * x + state.c).toFixed(1)}`);
    }
    return pts.join(' ');
  }, [state]);

  const summary = `Graph of ${equation(state)}. ${roots.length ? `It crosses the x-axis at ${roots.map((r) => signed(Math.round(r * 100) / 100)).join(' and ')}.` : 'It does not cross the x-axis.'}`;

  return (
    <div className="grid overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 lg:grid-cols-2">
      {/* Graph and sliders */}
      <div className="flex flex-col gap-4 border-b border-slate-800 p-4 sm:p-6 lg:border-b-0 lg:border-r">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-sm text-slate-100" aria-hidden="true">
            {equation(state)}
          </p>
          <button type="button" onClick={() => setState(START)} className="btn btn-ghost btn-sm" aria-label="Reset the sliders">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset
          </button>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="w-full rounded-lg border border-slate-800 bg-slate-950">
          <defs>
            <clipPath id="lab-clip">
              <rect width={W} height={H} />
            </clipPath>
          </defs>
          {[-6, -4, -2, 2, 4, 6].map((x) => (
            <line key={`gx${x}`} x1={sx(x)} x2={sx(x)} y1={0} y2={H} stroke="#232A38" strokeWidth={1} />
          ))}
          {[-8, -4, 4, 8].map((y) => (
            <line key={`gy${y}`} x1={0} x2={W} y1={sy(y)} y2={sy(y)} stroke="#232A38" strokeWidth={1} />
          ))}
          <line x1={sx(0)} x2={sx(0)} y1={0} y2={H} stroke="#3F485C" strokeWidth={1.5} />
          <line x1={0} x2={W} y1={sy(0)} y2={sy(0)} stroke="#3F485C" strokeWidth={1.5} />
          {[-4, -2, 2, 4].map((x) => (
            <text key={`tx${x}`} x={sx(x)} y={sy(0) + 14} textAnchor="middle" fontSize={10} fill="#8B93A7">
              {signed(x)}
            </text>
          ))}
          <g clipPath="url(#lab-clip)">
            <polyline points={curve} fill="none" stroke="#2DD4BF" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
          </g>
          {roots.map((r, i) => (
            <g key={i}>
              <circle cx={sx(r)} cy={sy(0)} r={6} fill="#D4FF3A" stroke="#0B0D12" strokeWidth={2} />
              <text x={sx(r)} y={sy(0) - 12} textAnchor="middle" fontSize={11} fontWeight={600} fill="#D4FF3A">
                {signed(Math.round(r * 100) / 100)}
              </text>
            </g>
          ))}
        </svg>

        <div className="flex flex-col gap-2.5">
          <Slider name="a" value={state.a} min={-3} max={3} onChange={set('a')} />
          <Slider name="b" value={state.b} min={-6} max={6} onChange={set('b')} />
          <Slider name="c" value={state.c} min={-6} max={6} onChange={set('c')} />
        </div>
        <p className="text-sm text-slate-400">
          Yellow dots are where the curve crosses zero.{' '}
          {state.a !== 0 && (
            <button type="button" onClick={() => setState((s) => ({ ...s, a: 0 }))} className="font-medium text-accent underline decoration-dotted underline-offset-4 hover:decoration-solid">
              Set a to 0
            </button>
          )}
          {state.a === 0 && 'With a = 0 there is no curve, only a line, and the program cannot divide by 2a.'}
        </p>
      </div>

      {/* The program and its terminal */}
      <div className="flex min-w-0 flex-col gap-3 p-4 sm:p-6">
        <p className="font-mono text-xs text-slate-400">{LAB_FILE}</p>
        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#0a0e14] py-2 font-mono text-[12.5px] leading-[1.55]" aria-label={`Python program ${LAB_FILE}`}>
          {source.map((text, i) => {
            const n = i + 1;
            const bad = failed && n === FAIL_LINE;
            const indent = text.length - text.trimStart().length;
            return (
              <div key={n} className={`flex whitespace-pre pr-3 ${bad ? 'bg-rose-500/15' : ''}`}>
                <span className={`w-9 shrink-0 select-none pr-3 text-right tabular-nums ${bad ? 'text-rose-300' : 'text-slate-600'}`} aria-hidden="true">
                  {n}
                </span>
                <span className="text-slate-200">
                  {bad ? (
                    <>
                      {' '.repeat(indent)}
                      <span className="underline decoration-rose-400 decoration-wavy underline-offset-4">{colour(text.trimStart())}</span>
                    </>
                  ) : (
                    colour(text)
                  )}
                </span>
              </div>
            );
          })}
        </div>
        <div className="h-52 min-h-0">
          <Terminal entries={entries} running={null} language="python" onClear={() => {}} onJump={() => {}} toolbar={false} live={false} />
        </div>
      </div>
    </div>
  );
};
