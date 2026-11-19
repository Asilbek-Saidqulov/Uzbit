import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronDown, Clock, Code2, Play, XCircle } from 'lucide-react';
import { KaTeX } from '../KaTeX';
import { LessonDemo } from './LessonDemos';
import { StaticSquare } from '../progress/ProgressSquare';
import { getLesson, getTrack, lessonNeighbors } from '../../data/mathLessons';
import { fromState, graphPath, lessonPath, PAGE_PATHS } from '../../lib/routes';
import { lessonStatus } from '../../lib/progress';
import { useProgressData } from '../../lib/ProgressProvider';

const SECTION_TITLE = 'text-xs font-semibold uppercase tracking-wider text-slate-400';

export const LessonPage: React.FC<{ trackId: string; slug: string }> = ({ trackId, slug }) => {
  const navigate = useNavigate();
  const { progress, recordLesson } = useProgressData();
  const lesson = getLesson(trackId, slug);
  const track = getTrack(trackId);

  const alreadyDone = lesson ? lessonStatus(progress, lesson.id) === 'done' : false;
  const [picked, setPicked] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number[]>([]);
  const [solved, setSolved] = useState(alreadyDone);

  // A different lesson starts fresh. A finished one opens already answered.
  useEffect(() => {
    setPicked(null);
    setWrong([]);
    setSolved(lesson ? lessonStatus(progress, lesson.id) === 'done' : false);
    // Only the lesson matters here; progress changes while answering must not reset the card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id]);

  if (!lesson || !track) return null;

  const position = track.lessons.findIndex((l) => l.id === lesson.id) + 1;
  const isCheckpoint = lesson.slug === 'checkpoint';
  const { prev, next } = lessonNeighbors(lesson.id);
  const { check } = lesson;
  const showExplanation = solved || wrong.length >= 2;

  const answer = (i: number) => {
    if (solved) return;
    const correct = i === check.correctIndex;
    setPicked(i);
    recordLesson(lesson.id, correct);
    if (correct) setSolved(true);
    else setWrong((w) => (w.includes(i) ? w : [...w, i]));
  };

  const openTryIt = () => {
    const t = lesson.tryIt;
    if (!t) return;
    const state = fromState(lessonPath(lesson.trackId, lesson.slug), lesson.title);
    if (t.to === 'graph') navigate(graphPath(t.expressions ?? []), { state });
    else navigate(t.to === 'geometry' ? PAGE_PATHS.geometry : PAGE_PATHS.threed, { state });
  };

  const optionStyle = (i: number) => {
    if (solved && i === check.correctIndex) return 'border-emerald-500/70 bg-emerald-950/50 text-emerald-100';
    if (wrong.includes(i)) return 'border-danger/50 bg-danger/10 text-slate-200 opacity-80';
    if (!solved && wrong.length >= 2 && i === check.correctIndex) return 'border-slate-600 bg-slate-900 text-slate-100';
    return 'border-slate-800 bg-slate-900/70 text-slate-200 hover:border-slate-600';
  };

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-400">
          <span className="text-brand">{track.title}</span>
          <span aria-hidden="true">·</span>
          <span>{isCheckpoint ? 'Checkpoint' : `Lesson ${position} of ${track.lessons.length - 1}`}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" /> {lesson.minutes} min
          </span>
          {alreadyDone && (
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Completed
            </span>
          )}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{lesson.title}</h1>
        <p className="text-base leading-relaxed text-slate-300 sm:text-lg">{lesson.hook}</p>
      </header>

      {lesson.tex && (
        <section aria-label="The key formula" className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-5 text-lg text-indigo-200 overflow-x-auto">
          <KaTeX math={lesson.tex} block />
        </section>
      )}

      {(lesson.demo || lesson.tryIt) && (
        <section className="flex flex-col gap-3">
          <h2 className={SECTION_TITLE}>Try it</h2>
          {lesson.demo && <LessonDemo demo={lesson.demo} />}
          {lesson.tryIt && (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-sm leading-relaxed text-slate-300">{lesson.tryIt.look}</p>
              <button type="button" onClick={openTryIt} className="btn btn-secondary">
                <Play className="h-4 w-4" aria-hidden="true" />
                {lesson.tryIt.label}
              </button>
            </div>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3" aria-labelledby="check-heading">
        <h2 id="check-heading" className={SECTION_TITLE}>
          Check yourself
        </h2>
        <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950/80 p-5">
          <p className="text-base font-medium leading-relaxed text-slate-100">{check.question}</p>
          <div className="flex flex-col gap-2" role="group" aria-labelledby="check-heading">
            {check.options.map((opt, i) => (
              <button
                key={opt}
                type="button"
                onClick={() => answer(i)}
                disabled={solved && i !== check.correctIndex}
                aria-pressed={picked === i}
                className={`btn btn-content flex items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm !h-auto !whitespace-normal ${optionStyle(i)}`}
              >
                <span className="shrink-0 font-semibold text-slate-500 tabular-nums">{String.fromCharCode(65 + i)}.</span>
                <span className="flex-1">{opt}</span>
                {solved && i === check.correctIndex && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-label="Correct" />}
                {wrong.includes(i) && <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-label="Not correct" />}
              </button>
            ))}
          </div>

          <div role="status" aria-live="polite" className="flex flex-col gap-2 text-sm">
            {!solved && wrong.length === 1 && <p className="text-slate-300">Not quite. Have another look and try again.</p>}
            {!solved && wrong.length >= 2 && <p className="text-slate-300">Still not it. Here is the reasoning; then pick the right answer.</p>}
            {solved && <p className="font-medium text-emerald-400">That’s right.</p>}
            {showExplanation && <p className="leading-relaxed text-slate-300">{check.explanation}</p>}
          </div>
        </div>
      </section>

      {solved && (
        <section className="flex flex-col gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5" aria-label="What next">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
            <StaticSquare level={4} tone="success" /> Lesson complete
          </div>
          <div className="flex flex-wrap gap-3">
            {next && (
              <Link to={lessonPath(next.trackId, next.slug)} className="btn btn-primary">
                Next: {next.title}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
            {lesson.practice && (
              <Link to={`${PAGE_PATHS.code}?problem=${lesson.practice.problemId}`} className="btn btn-secondary">
                <Code2 className="h-4 w-4" aria-hidden="true" />
                {lesson.practice.label}
              </Link>
            )}
            <Link to={PAGE_PATHS.dashboard} className="btn btn-ghost">
              Back to dashboard
            </Link>
          </div>
        </section>
      )}

      {lesson.deeper && (
        <details className="group rounded-xl border border-slate-800 bg-slate-900/50">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-medium text-slate-200">
            Go deeper
            <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="px-5 pb-5 text-sm leading-relaxed text-slate-400">{lesson.deeper}</div>
        </details>
      )}

      <nav aria-label="Lesson navigation" className="flex items-center justify-between gap-3 border-t border-slate-800 pt-5 text-sm">
        {prev ? (
          <Link to={lessonPath(prev.trackId, prev.slug)} className="btn btn-ghost -ml-3 max-w-[48%] !h-auto !whitespace-normal py-2 text-left">
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && !solved && (
          <Link to={lessonPath(next.trackId, next.slug)} className="btn btn-ghost -mr-3 max-w-[48%] !h-auto !whitespace-normal py-2 text-right">
            <span>{next.title}</span>
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
          </Link>
        )}
      </nav>
    </article>
  );
};
