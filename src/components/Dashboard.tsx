import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, Code2, Flame, Sparkles } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useProgressData } from '../lib/ProgressProvider';
import { getTrack, nextIncompleteLesson, TOTAL_LESSONS, TRACKS } from '../data/mathLessons';
import { PROBLEMS, getProblem } from '../judge/data/problems';
import { problemStatus, recommendNext } from '../judge/recommend';
import { LANGUAGE_META, type Difficulty, type Verdict } from '../judge/types';
import { activityByDay, currentStreak, lessonStatus, totalFor } from '../lib/progress';
import { lessonPath, PAGE_PATHS } from '../lib/routes';
import { ActivityHeatmap } from './progress/ActivityHeatmap';
import { ProgressSquare, SquareLegend, STATUS_LEVEL } from './progress/ProgressSquare';

const CARD = 'rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6';
const CARD_TITLE = 'text-lg font-semibold text-white';

const VERDICT_TEXT: Record<Verdict, string> = {
  accepted: 'Accepted',
  wrong_answer: 'Wrong answer',
  runtime_error: 'Runtime error',
  compile_error: 'Compile error',
  time_limit: 'Time limit',
  unavailable: 'Runner unavailable',
};

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

const Stat: React.FC<{ icon: React.ReactNode; value: string; label: string }> = ({ icon, value, label }) => (
  <div className="flex flex-col gap-1 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
    <span className="flex items-center gap-1.5 text-xs text-slate-400">
      {icon}
      {label}
    </span>
    <span className="text-2xl font-semibold tabular-nums text-white">{value}</span>
  </div>
);

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, configured } = useAuth();
  const { progress, attempts, doneLessons } = useProgressData();

  const days = useMemo(() => activityByDay(progress, attempts.map((a) => a.at)), [progress, attempts]);
  const streak = useMemo(() => currentStreak(days, new Date()), [days]);
  const activeDays = useMemo(() => Object.values(days).filter((d) => totalFor(d) > 0).length, [days]);

  const nextLesson = nextIncompleteLesson((id) => doneLessons.has(id));
  const recommendation = recommendNext(PROBLEMS, attempts);
  const solvedCount = PROBLEMS.filter((p) => problemStatus(p.id, attempts) === 'solved').length;
  const isNew = doneLessons.size === 0 && attempts.length === 0;

  const rawName = (user?.user_metadata as { name?: string } | undefined)?.name ?? user?.email?.split('@')[0];
  const recent = attempts.slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {rawName ? `Welcome back, ${rawName}` : 'Your dashboard'}
        </h1>
        <p className="text-sm text-slate-400">
          {isNew ? 'Everything you do here shows up on this page. Start with a lesson below.' : 'Pick up where you left off.'}
        </p>
      </header>

      {configured && !user && (
        <aside className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-accent/30 bg-accent-subtle/40 p-4" aria-label="Save your progress">
          <p className="flex items-center gap-2 text-sm text-slate-200">
            <Sparkles className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
            Progress is saved in this browser. Create a free account to keep it on every device.
          </p>
          <div className="flex gap-2">
            <Link to={`${PAGE_PATHS.signup}?next=${PAGE_PATHS.dashboard}`} className="btn btn-primary btn-sm">
              Create account
            </Link>
            <Link to={`${PAGE_PATHS.login}?next=${PAGE_PATHS.dashboard}`} className="btn btn-ghost btn-sm">
              Log in
            </Link>
          </div>
        </aside>
      )}

      {/* What to do next */}
      <section aria-label="Continue" className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className={`${CARD} flex flex-col justify-between gap-5`}>
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand">
              <BookOpen className="h-3.5 w-3.5" aria-hidden="true" /> {isNew ? 'Start here' : 'Next lesson'}
            </span>
            {nextLesson ? (
              <>
                <h2 className={CARD_TITLE}>{nextLesson.title}</h2>
                <p className="text-sm text-slate-400">
                  {getTrack(nextLesson.trackId)?.title} · {nextLesson.minutes} min
                </p>
              </>
            ) : (
              <h2 className={CARD_TITLE}>Every lesson complete. Nicely done.</h2>
            )}
          </div>
          {nextLesson ? (
            <Link to={lessonPath(nextLesson.trackId, nextLesson.slug)} className="btn btn-primary self-start">
              {isNew ? 'Start lesson' : 'Continue'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <Link to={PAGE_PATHS.curriculum} className="btn btn-secondary self-start">
              Review lessons
            </Link>
          )}
        </div>

        <div className={`${CARD} flex flex-col justify-between gap-5`}>
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand">
              <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
              {recommendation?.reason === 'resume' ? 'Pick up where you left off' : 'Next problem'}
            </span>
            {recommendation ? (
              <>
                <h2 className={CARD_TITLE}>{recommendation.problem.title}</h2>
                <p className="text-sm capitalize text-slate-400">
                  {recommendation.problem.difficulty} · {recommendation.problem.tags.slice(0, 2).join(', ')}
                </p>
              </>
            ) : (
              <h2 className={CARD_TITLE}>Every problem solved. Impressive.</h2>
            )}
          </div>
          {recommendation ? (
            <Link to={`${PAGE_PATHS.code}?problem=${recommendation.problem.id}`} className="btn btn-primary self-start">
              {recommendation.reason === 'resume' ? 'Resume' : 'Open problem'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <Link to={PAGE_PATHS.code} className="btn btn-secondary self-start">
              Browse problems
            </Link>
          )}
        </div>
      </section>

      {/* Numbers */}
      <section aria-label="Your numbers" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={<Flame className="h-3.5 w-3.5" aria-hidden="true" />} value={`${streak}`} label="Day streak" />
        <Stat icon={<BookOpen className="h-3.5 w-3.5" aria-hidden="true" />} value={`${doneLessons.size}/${TOTAL_LESSONS}`} label="Lessons done" />
        <Stat icon={<CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />} value={`${solvedCount}/${PROBLEMS.length}`} label="Problems solved" />
        <Stat icon={<Sparkles className="h-3.5 w-3.5" aria-hidden="true" />} value={`${activeDays}`} label="Active days" />
      </section>

      {/* Activity grid */}
      <section aria-labelledby="activity-heading" className={`${CARD} flex flex-col gap-4`}>
        <h2 id="activity-heading" className={CARD_TITLE}>
          Activity
        </h2>
        <ActivityHeatmap days={days} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Lessons */}
        <section aria-labelledby="lessons-heading" className={`${CARD} flex flex-col gap-5`}>
          <div className="flex items-center justify-between gap-3">
            <h2 id="lessons-heading" className={CARD_TITLE}>
              Lessons
            </h2>
            <Link to={PAGE_PATHS.curriculum} className="text-xs font-medium text-accent hover:underline">
              All lessons
            </Link>
          </div>
          <div className="flex flex-col gap-4">
            {TRACKS.map((track) => {
              const done = track.lessons.filter((l) => doneLessons.has(l.id)).length;
              return (
                <div key={track.id} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-sm text-slate-300">{track.title}</span>
                  <div className="flex flex-1 flex-wrap gap-1.5">
                    {track.lessons.map((lesson) => {
                      const status = lessonStatus(progress, lesson.id);
                      const text = status === 'done' ? 'done' : status === 'tried' ? 'in progress' : 'not started';
                      return (
                        <ProgressSquare
                          key={lesson.id}
                          level={STATUS_LEVEL[status]}
                          label={`${track.title}: ${lesson.title}, ${text}`}
                          onClick={() => navigate(lessonPath(lesson.trackId, lesson.slug))}
                        />
                      );
                    })}
                  </div>
                  <span className="text-xs tabular-nums text-slate-500">
                    {done}/{track.lessons.length}
                  </span>
                </div>
              );
            })}
          </div>
          <SquareLegend lessText="Not started" moreText="Done" />
        </section>

        {/* Problems */}
        <section aria-labelledby="problems-heading" className={`${CARD} flex flex-col gap-5`}>
          <div className="flex items-center justify-between gap-3">
            <h2 id="problems-heading" className={CARD_TITLE}>
              Coding problems
            </h2>
            <Link to={PAGE_PATHS.code} className="text-xs font-medium text-accent hover:underline">
              All problems
            </Link>
          </div>
          <div className="flex flex-col gap-4">
            {DIFFICULTIES.map((difficulty) => {
              const group = PROBLEMS.filter((p) => p.difficulty === difficulty);
              if (group.length === 0) return null;
              const solved = group.filter((p) => problemStatus(p.id, attempts) === 'solved').length;
              return (
                <div key={difficulty} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-sm capitalize text-slate-300">{difficulty}</span>
                  <div className="flex flex-1 flex-wrap gap-1.5">
                    {group.map((p) => {
                      const status = problemStatus(p.id, attempts);
                      const text = status === 'solved' ? 'solved' : status === 'tried' ? 'tried' : 'not started';
                      return (
                        <ProgressSquare
                          key={p.id}
                          tone="success"
                          level={STATUS_LEVEL[status]}
                          label={`${p.title}, ${text}`}
                          onClick={() => navigate(`${PAGE_PATHS.code}?problem=${p.id}`)}
                        />
                      );
                    })}
                  </div>
                  <span className="text-xs tabular-nums text-slate-500">
                    {solved}/{group.length}
                  </span>
                </div>
              );
            })}
          </div>
          <SquareLegend tone="success" lessText="Not started" moreText="Solved" />
        </section>
      </div>

      {/* Recent submissions */}
      <section aria-labelledby="recent-heading" className={`${CARD} flex flex-col gap-3`}>
        <h2 id="recent-heading" className={CARD_TITLE}>
          Recent submissions
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-400">
            No submissions yet. Open a problem, write a solution, and press Submit to see it here.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-800">
            {recent.map((a) => {
              const p = getProblem(a.problemId);
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <Link to={`${PAGE_PATHS.code}?problem=${a.problemId}`} className="font-medium text-slate-100 hover:underline">
                    {p?.title ?? a.problemId}
                  </Link>
                  <span className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{LANGUAGE_META[a.language].label}</span>
                    <span className={a.verdict === 'accepted' ? 'font-medium text-emerald-400' : 'text-slate-300'}>
                      {VERDICT_TEXT[a.verdict]} · {a.passed}/{a.total}
                    </span>
                    <time dateTime={new Date(a.at).toISOString()}>
                      {new Date(a.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {!configured && (
        <p className="text-center text-xs text-slate-500">Progress is saved in this browser.</p>
      )}
    </div>
  );
};

