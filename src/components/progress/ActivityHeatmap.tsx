import React, { useEffect, useMemo, useRef, useState } from 'react';
import { buildHeatmap, dayKey, totalFor, type DayActivity } from '../../lib/progress';
import { ProgressSquare, SquareLegend } from './ProgressSquare';

interface ActivityHeatmapProps {
  days: Record<string, DayActivity>;
  /** How many weeks to show, ending with this week. */
  weeks?: number;
}

const ROW_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''];

const dateLabel = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function describe(date: Date, day?: DayActivity): string {
  if (!day || totalFor(day) === 0) return `${dateLabel(date)}: no activity`;
  const parts: string[] = [];
  if (day.lessons) parts.push(`${plural(day.lessons, 'lesson')} completed`);
  if (day.submissions) parts.push(plural(day.submissions, 'code submission'));
  return `${dateLabel(date)}: ${parts.join(', ')}`;
}

/**
 * One square per day, a column per week, shaded by how much the learner did that day.
 * The grid is a single tab stop; arrow keys move between days.
 */
export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ days, weeks = 26 }) => {
  const today = useMemo(() => new Date(), []);
  const columns = useMemo(() => buildHeatmap(days, weeks, today), [days, weeks, today]);
  const todayPos = useMemo(() => ({ c: weeks - 1, r: (today.getDay() + 6) % 7 }), [weeks, today]);

  const [focus, setFocus] = useState(todayPos);
  const [selectedKey, setSelectedKey] = useState(dayKey(today));
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const scroller = useRef<HTMLDivElement>(null);

  // Start scrolled to the newest weeks, which matters on a phone.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, []);

  const monthLabels = columns.map((col, i) => {
    const m = col[0].date.getMonth();
    const prev = i > 0 ? columns[i - 1][0].date.getMonth() : -1;
    return m !== prev ? col[0].date.toLocaleDateString(undefined, { month: 'short' }) : '';
  });

  const move = (dc: number, dr: number) => {
    const c = Math.min(weeks - 1, Math.max(0, focus.c + dc));
    const r = Math.min(6, Math.max(0, focus.r + dr));
    if (columns[c][r].future) return;
    setFocus({ c, r });
    cellRefs.current[c * 7 + r]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step: Record<string, [number, number]> = {
      ArrowRight: [1, 0],
      ArrowLeft: [-1, 0],
      ArrowDown: [0, 1],
      ArrowUp: [0, -1],
    };
    const delta = step[e.key];
    if (!delta) return;
    e.preventDefault();
    move(delta[0], delta[1]);
  };

  const selected = columns.flat().find((cell) => cell.key === selectedKey);

  return (
    <div className="flex flex-col gap-3">
      <div ref={scroller} className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1">
          {/* Month names */}
          <div className="flex gap-[3px] pl-8" aria-hidden="true">
            {monthLabels.map((label, i) => (
              <span key={i} className="w-3 overflow-visible whitespace-nowrap text-[10px] leading-3 text-slate-500">
                {label}
              </span>
            ))}
          </div>

          <div className="flex gap-1.5">
            <div className="flex w-6 flex-col gap-[3px] text-[10px] leading-3 text-slate-500" aria-hidden="true">
              {ROW_LABELS.map((l, i) => (
                <span key={i} className="h-3">
                  {l}
                </span>
              ))}
            </div>

            <div role="group" aria-label={`Your activity over the last ${weeks} weeks`} className="flex gap-[3px]" onKeyDown={onKeyDown}>
              {columns.map((col, c) => (
                <div key={c} className="flex flex-col gap-[3px]">
                  {col.map((cell, r) =>
                    cell.future ? (
                      <span key={cell.key} className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <ProgressSquare
                        key={cell.key}
                        ref={(el) => {
                          cellRefs.current[c * 7 + r] = el;
                        }}
                        size="sm"
                        level={cell.level}
                        label={describe(cell.date, days[cell.key])}
                        selected={cell.key === selectedKey}
                        tabIndex={focus.c === c && focus.r === r ? 0 : -1}
                        onFocus={() => setFocus({ c, r })}
                        onClick={() => setSelectedKey(cell.key)}
                      />
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-300" aria-live="polite">
          {selected ? describe(selected.date, days[selected.key]) : 'Select a day to see what you did.'}
        </p>
        <SquareLegend />
      </div>
    </div>
  );
};
