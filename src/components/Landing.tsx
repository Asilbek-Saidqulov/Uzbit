import React, { Suspense } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useProgressData } from '../lib/ProgressProvider';
import { getTrack, nextIncompleteLesson, TOTAL_LESSONS, TRACKS } from '../data/mathLessons';
import { PROBLEMS } from '../judge/data/problems';
import { LANGUAGE_META } from '../judge/types';
import { lessonPath, PAGE_PATHS } from '../lib/routes';
import { LandingLab } from './landing/LandingLab';

// The 3D scene is only needed once the visitor scrolls to it, so it loads on its own.
const SolidShowcase = React.lazy(() => import('./landing/SolidShowcase'));

const judgeServiceOn = Boolean((import.meta as { env?: Record<string, string | undefined> }).env?.VITE_JUDGE0_URL);

const DIFFICULTY_CLASS = { easy: 'text-accent', medium: 'text-amber-300', hard: 'text-rose-300' } as const;

/**
 * The front page, for people who are new here. Signed-in learners never see it: they go straight to their dashboard.
 * The page leads with something to do (change a number, break a program) rather than something to read.
 */
export const Landing: React.FC = () => {
  const { user, loading, configured } = useAuth();
  const { doneLessons, attempts } = useProgressData();

  if (user) return <Navigate to={PAGE_PATHS.dashboard} replace />;
  if (loading) {
    return (
      <p role="status" className="py-24 text-center text-sm text-slate-400">
        Opening Uzbit…
      </p>
    );
  }

  const hasLocalProgress = doneLessons.size > 0 || attempts.length > 0;
  const next = nextIncompleteLesson((id) => doneLessons.has(id));
  const firstTrack = TRACKS[0];
  const path = firstTrack.lessons.slice(0, 5);
  const sample = PROBLEMS.filter((p) => p.tests.some((t) => t.example)).slice(0, 4);

  const facts: [string, string][] = [
    [String(TRACKS.length), 'learning paths'],
    [String(TOTAL_LESSONS), 'short lessons'],
    [String(PROBLEMS.length), 'coding problems'],
    [String(Object.keys(LANGUAGE_META).length), 'programming languages'],
  ];

  // With accounts on, the way in is to sign up. Without a backend, there is nothing to sign up to.
  const primary = configured ? { to: PAGE_PATHS.signup, label: 'Create a free account' } : { to: PAGE_PATHS.curriculum, label: 'Start learning' };
  const secondary = configured ? { to: PAGE_PATHS.login, label: 'Log in' } : { to: PAGE_PATHS.code, label: 'Try the coding practice' };

  const steps = configured
    ? [
        ['Create your account', 'It takes a minute and costs nothing.'],
        ['Pick anything to start', 'Every lesson and problem is open. Begin with a path, or jump to a topic you need.'],
        ['Come back to your dashboard', 'See what you finished, what is next, and how your days add up.'],
      ]
    : [
        ['Pick anything to start', 'Every lesson and problem is open. Begin with a path, or jump to a topic you need.'],
        ['Change things and run code', 'Drag, type and break things. Every answer is explained.'],
        ['Come back to your dashboard', 'Your progress is saved in this browser.'],
      ];

  return (
    <div className="flex flex-col gap-20 sm:gap-24">
      {hasLocalProgress && (
        <aside aria-label="Welcome back" className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent-subtle/40 px-5 py-4">
          <p className="text-sm text-slate-200">
            Welcome back.{' '}
            {next && (
              <>
                Next up: <strong className="font-semibold text-white">{next.title}</strong> in {getTrack(next.trackId)?.title}.
              </>
            )}
          </p>
          <div className="flex gap-2">
            {next && (
              <Link to={lessonPath(next.trackId, next.slug)} className="btn btn-primary btn-sm">
                Continue
              </Link>
            )}
            <Link to={PAGE_PATHS.dashboard} className="btn btn-secondary btn-sm">
              Open dashboard
            </Link>
          </div>
        </aside>
      )}

      {/* Opening: the promise, then the proof, right away */}
      <section aria-labelledby="hero-heading" className="flex flex-col gap-10">
        <div className="flex max-w-3xl flex-col gap-6">
          <h1 id="hero-heading" className="text-balance text-5xl font-semibold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Math you can move. Code you can break.
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-slate-300">
            Uzbit Academy is a free place to learn algebra, geometry, calculus and programming by changing things yourself. When something goes wrong, you see exactly where and why.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to={primary.to} className="btn btn-primary btn-lg">
              {primary.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link to={secondary.to} className="btn btn-secondary btn-lg">
              {secondary.label}
            </Link>
          </div>
          <p className="text-sm text-slate-400">{configured ? 'No card needed. Your progress follows you to every device.' : 'Free to use. Your progress is saved in this browser.'}</p>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-base text-slate-300">Try it now. Drag a slider and the graph and the program change together.</p>
          <LandingLab />
        </div>

        <dl className="grid grid-cols-2 gap-6 border-y border-slate-800/80 py-6 md:grid-cols-4">
          {facts.map(([value, label]) => (
            <div key={label} className="flex flex-col gap-1">
              <dt className="order-2 text-sm text-slate-400">{label}</dt>
              <dd className="order-1 text-3xl font-semibold tabular-nums text-white">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Learn: a real path, with real lessons */}
      <section aria-labelledby="learn-heading" className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center">
        <div className="flex flex-col gap-4">
          <h2 id="learn-heading" className="text-3xl font-semibold text-white sm:text-4xl">
            Short lessons, in an order that makes sense
          </h2>
          <p className="max-w-lg text-base leading-relaxed text-slate-300">
            Each lesson is one idea, with something to play with and a question to check that it stuck. Follow a path from the top, or jump to the topic you need this week.
          </p>
          <Link to={PAGE_PATHS.curriculum} className="btn btn-secondary btn-sm self-start">
            See all {TOTAL_LESSONS} lessons
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
          <h3 className="text-xl font-semibold text-white">{firstTrack.title}</h3>
          <p className="mt-1 text-sm text-slate-400">{firstTrack.blurb}</p>
          <ol className="mt-5 flex flex-col">
            {path.map((lesson, i) => (
              <li key={lesson.id} className="relative flex gap-4 pb-4 last:pb-0">
                {i < path.length - 1 && <span className="absolute left-[7px] top-5 h-full w-px bg-slate-700" aria-hidden="true" />}
                <span className="relative mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2 border-accent bg-slate-950" aria-hidden="true" />
                <Link to={lessonPath(lesson.trackId, lesson.slug)} className="group flex flex-1 items-baseline justify-between gap-3 rounded-md text-sm text-slate-200 hover:text-white">
                  <span className="group-hover:underline group-hover:underline-offset-4">{lesson.title}</span>
                  <span className="shrink-0 tabular-nums text-xs text-slate-500">{lesson.minutes} min</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Explore: a real 3D solid */}
      <section aria-labelledby="explore-heading" className="flex flex-col gap-8">
        <div className="flex max-w-2xl flex-col gap-4">
          <h2 id="explore-heading" className="text-3xl font-semibold text-white sm:text-4xl">
            See every shape from every side
          </h2>
          <p className="text-base leading-relaxed text-slate-300">
            Turn solids with your mouse or finger. Change an edge, a height or a width and the volume and surface area follow, with each step of the working shown.
          </p>
        </div>
        <Suspense fallback={<div className="aspect-[2/1] w-full rounded-2xl border border-slate-800 bg-slate-900/40" aria-hidden="true" />}>
          <SolidShowcase />
        </Suspense>
      </section>

      {/* Practice: the terminal */}
      <section aria-labelledby="practice-heading" className="grid gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-center">
        <div className="order-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6 lg:order-1">
          <h3 className="text-xl font-semibold text-white">Problems to start with</h3>
          <ul className="mt-4 flex flex-col divide-y divide-slate-800">
            {sample.map((p) => (
              <li key={p.id}>
                <Link to={`${PAGE_PATHS.code}?problem=${p.id}`} className="flex items-center justify-between gap-3 py-3 text-sm text-slate-200 hover:text-white">
                  <span>{p.title}</span>
                  <span className={`text-xs capitalize ${DIFFICULTY_CLASS[p.difficulty]}`}>{p.difficulty}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-400">
            {Object.values(LANGUAGE_META)
              .map((l) => l.label)
              .join(', ')}
            .{' '}
            {judgeServiceOn ? 'Python, JavaScript and TypeScript run in your browser. C++ and Rust run on our judge server.' : 'Python, JavaScript and TypeScript run right in your browser.'}
          </p>
        </div>
        <div className="order-1 flex flex-col gap-4 lg:order-2">
          <h2 id="practice-heading" className="text-3xl font-semibold text-white sm:text-4xl">
            Run your code and read the error
          </h2>
          <p className="max-w-lg text-base leading-relaxed text-slate-300">The practice terminal prints what a real terminal prints, so you learn to read errors the way programmers do.</p>
          <ul className="flex flex-col gap-2.5 text-sm text-slate-200">
            {['Every error shows its file, line and column, with a marker under the exact spot', 'Click a line in the error and the editor jumps to it', 'Wrong lines are underlined in your code, right where you wrote them'].map((t) => (
              <li key={t} className="flex gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                {t}
              </li>
            ))}
          </ul>
          <Link to={PAGE_PATHS.code} className="btn btn-secondary btn-sm self-start">
            Open the coding practice
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* How to begin: a real sequence */}
      <section aria-labelledby="steps-heading" className="flex flex-col gap-8">
        <h2 id="steps-heading" className="text-3xl font-semibold text-white sm:text-4xl">
          Start in three steps
        </h2>
        <ol className="grid gap-8 md:grid-cols-3">
          {steps.map(([title, body], i) => (
            <li key={title} className="flex flex-col gap-2 border-t border-slate-700 pt-4">
              <span className="text-sm tabular-nums text-accent">Step {i + 1}</span>
              <h3 className="text-xl font-semibold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-slate-300">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="final-heading" className="flex flex-col items-start gap-5 rounded-2xl border border-accent/30 bg-accent-subtle/30 p-6 sm:p-10">
        <h2 id="final-heading" className="max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
          Your first lesson takes about {TRACKS[0].lessons[0].minutes} minutes.
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to={primary.to} className="btn btn-primary btn-lg">
            {primary.label}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link to={secondary.to} className="btn btn-secondary btn-lg">
            {secondary.label}
          </Link>
        </div>
      </section>
    </div>
  );
};
