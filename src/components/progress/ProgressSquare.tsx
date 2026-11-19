import React from 'react';

/**
 * One small square. Its shade says how much: 0 is an empty slot, 4 is fully filled.
 * Shade is never the only signal: every square carries a text label for screen readers and hover.
 */
export type SquareLevel = 0 | 1 | 2 | 3 | 4;

/** Opacity of the fill at each level. */
const ALPHA: Record<SquareLevel, number> = { 0: 0, 1: 0.3, 2: 0.5, 3: 0.75, 4: 1 };

const SIZE = { sm: 'h-3 w-3', md: 'h-4 w-4', lg: 'h-5 w-5' } as const;

export interface ProgressSquareProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  level: SquareLevel;
  /** accent: lessons and activity (teal). success: solved problems (lime). */
  tone?: 'accent' | 'success';
  /** Plain-text description, for example "Algebra: Quadratics. Done". */
  label: string;
  size?: keyof typeof SIZE;
  selected?: boolean;
}

export function squareStyle(level: SquareLevel, tone: 'accent' | 'success'): React.CSSProperties {
  const color = tone === 'success' ? 'var(--success)' : 'var(--accent)';
  return level === 0
    ? { backgroundColor: 'rgb(var(--line-subtle))', borderColor: 'rgb(var(--line))' }
    : { backgroundColor: `rgb(${color} / ${ALPHA[level]})`, borderColor: `rgb(${color} / ${Math.min(1, ALPHA[level] + 0.15)})` };
}

export const ProgressSquare = React.forwardRef<HTMLButtonElement, ProgressSquareProps>(function ProgressSquare(
  { level, tone = 'accent', label, size = 'md', selected = false, className = '', style, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={rest.onClick ? selected : undefined}
      style={{ ...squareStyle(level, tone), ...style }}
      className={`${SIZE[size]} shrink-0 rounded-[3px] border p-0 transition-transform hover:scale-125 focus-visible:scale-125 ${
        selected ? 'ring-2 ring-ink ring-offset-1 ring-offset-canvas' : ''
      } ${className}`}
      {...rest}
    />
  );
});

/** "Less ▢▢▢▢▢ More" key for a row of squares. */
export const SquareLegend: React.FC<{ tone?: 'accent' | 'success'; lessText?: string; moreText?: string }> = ({
  tone = 'accent',
  lessText = 'Less',
  moreText = 'More',
}) => (
  <div className="flex items-center gap-1.5 text-[11px] text-slate-400" aria-hidden="true">
    <span>{lessText}</span>
    {([0, 1, 2, 3, 4] as SquareLevel[]).map((l) => (
      <span key={l} className="h-3 w-3 rounded-[3px] border" style={squareStyle(l, tone)} />
    ))}
    <span>{moreText}</span>
  </div>
);

/** A square that is only decoration (for example inside a link whose text already says the status). */
export const StaticSquare: React.FC<{ level: SquareLevel; tone?: 'accent' | 'success'; size?: keyof typeof SIZE; className?: string }> = ({
  level,
  tone = 'accent',
  size = 'md',
  className = '',
}) => <span aria-hidden="true" className={`${SIZE[size]} shrink-0 rounded-[3px] border ${className}`} style={squareStyle(level, tone)} />;

/** Shade for each kind of status: not started is empty, tried is half, finished is full. */
export const STATUS_LEVEL = { todo: 0, tried: 2, done: 4, solved: 4 } as const satisfies Record<string, SquareLevel>;
