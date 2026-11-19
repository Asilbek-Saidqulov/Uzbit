import React from 'react';

/**
 * One design for every empty, loading and error state.
 * Each one says what happened, why, and what to do next.
 */
export type StateTone = 'neutral' | 'error' | 'loading';

interface StatePanelProps {
  icon: React.ReactNode;
  title: string;
  body?: string;
  tone?: StateTone;
  action?: { label: string; onClick: () => void };
  secondary?: { label: string; onClick: () => void };
  className?: string;
}

const TILE: Record<StateTone, string> = {
  neutral: 'bg-accent-subtle text-accent',
  error: 'bg-danger/10 text-danger',
  loading: 'bg-accent-subtle text-accent',
};

export const StatePanel: React.FC<StatePanelProps> = ({ icon, title, body, tone = 'neutral', action, secondary, className = '' }) => (
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-panel/60 p-8 text-center ${className}`}
  >
    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${TILE[tone]}`} aria-hidden="true">
      {icon}
    </div>
    <div className="flex max-w-md flex-col gap-1.5">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {body && <p className="text-sm leading-relaxed text-muted">{body}</p>}
    </div>
    {(action || secondary) && (
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        {action && (
          <button onClick={action.onClick} className="btn btn-secondary btn-sm">
            {action.label}
          </button>
        )}
        {secondary && (
          <button onClick={secondary.onClick} className="btn btn-ghost btn-sm">
            {secondary.label}
          </button>
        )}
      </div>
    )}
  </div>
);
