import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ALL_LESSONS, nextIncompleteLesson, TOTAL_LESSONS, TRACKS } from '../../data/mathLessons';
import { lessonPath } from '../../lib/routes';
import { lessonStatus } from '../../lib/progress';
import { useProgressData } from '../../lib/ProgressProvider';
import { StaticSquare, STATUS_LEVEL } from '../progress/ProgressSquare';

const STATUS_TEXT = { todo: 'not started', tried: 'in progress', done: 'done' } as const;

/** The six math tracks, each with a square per lesson so progress is visible at a glance. */
export const LearnOverview: React.FC = () => {
  const { progress, doneLessons } = useProgressData();
  const next = nextIncompleteLesson((id) => doneLessons.has(id));
  const started = doneLessons.size > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-white tabular-nums">
            {doneLessons.size} of {TOTAL_LESSONS} lessons done
          </span>
          <div className="flex flex-wrap gap-1" aria-hidden="true">
            {ALL_LESSONS.map((l) => (
              <StaticSquare key={l.id} size="sm" level={STATUS_LEVEL[lessonStatus(progress, l.id)]} />
            ))}
          </div>
        </div>
        {next ? (
          <Link to={lessonPath(next.trackId, next.slug)} className="btn btn-primary">
            {started ? 'Continue' : 'Start with'}: {next.title}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <span className="text-sm font-medium text-emerald-400">Every lesson complete</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {TRACKS.map((track) => {
          const done = track.lessons.filter((l) => doneLessons.has(l.id)).length;
          return (
            <section key={track.id} id={track.id} aria-labelledby={`track-${track.id}`} className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <h2 id={`track-${track.id}`} className="text-xl font-semibold text-white">
                    {track.title}
                  </h2>
                  <p className="text-sm text-slate-400">{track.blurb}</p>
                </div>
                <span className="shrink-0 text-xs font-medium tabular-nums text-slate-400">
                  {done}/{track.lessons.length}
                </span>
              </div>
              <ul className="flex flex-col">
                {track.lessons.map((lesson) => {
                  const status = lessonStatus(progress, lesson.id);
                  return (
                    <li key={lesson.id}>
                      <Link
                        to={lessonPath(lesson.trackId, lesson.slug)}
                        className="glow-item flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-200 hover:bg-slate-800/60 hover:text-white"
                      >
                        <StaticSquare level={STATUS_LEVEL[status]} />
                        <span className="flex-1">{lesson.title}</span>
                        <span className="sr-only">, {STATUS_TEXT[status]}</span>
                        <span className="text-xs tabular-nums text-slate-500">{lesson.minutes} min</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="flex justify-end">
        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5"><StaticSquare size="sm" level={0} /> Not started</span>
          <span className="flex items-center gap-1.5"><StaticSquare size="sm" level={2} /> In progress</span>
          <span className="flex items-center gap-1.5"><StaticSquare size="sm" level={4} /> Done</span>
        </div>
      </div>
    </div>
  );
};

