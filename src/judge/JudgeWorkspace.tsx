import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProgressData } from '@/lib/ProgressProvider';
import { ArrowLeft, BookOpen, FlaskConical, ListChecks, Maximize2, Minimize2, Terminal } from 'lucide-react';
import { ProblemList } from './components/ProblemList';
import { LearnPanel } from './components/LearnPanel';
import { SolveView } from './components/SolveView';
import { PROBLEMS, SANDBOX, getProblem } from './data/problems';
import { defaultStarter } from './engine/harness';
import { recommendNext } from './recommend';
import {
  loadDraft,
  loadLastLanguage,
  saveDraft,
  saveLastLanguage,
  solvedProblemIds,
  type Attempt,
} from './storage';
import type { JudgeProblem, Language } from './types';

type View = 'problems' | 'learn' | 'solve';

export const JudgeWorkspace: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('problem');
  const linked = requested ? getProblem(requested) : undefined;

  // A link such as /practice?problem=gcd opens that problem straight away.
  const [view, setView] = useState<View>(linked ? 'solve' : 'problems');
  const [problemId, setProblemId] = useState<string>(linked?.id ?? PROBLEMS[0].id);
  const [preferredLanguage, setPreferredLanguage] = useState<Language>(() => loadLastLanguage('python'));
  const { attempts, recordAttempt } = useProgressData();
  const [code, setCode] = useState('');
  const [loadNonce, setLoadNonce] = useState(0);

  /*
   * Wide screen mode uses the browser Fullscreen API instead of trying to
   * fake fullscreen with negative margins and viewport measurements.
   *
   * The workspace itself becomes the fullscreen element, so the site's
   * header/footer are outside the fullscreen tree and are not rendered while
   * wide mode is active. Escape exits fullscreen through the browser, and the
   * fullscreenchange event keeps React state in sync.
   */
  const [wide, setWide] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Wide mode only applies to the coding area, not to the problem list or the lessons.
  const wideActive = wide && view === 'solve';

  const toggleWide = async () => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    if (document.fullscreenElement === wrap) {
      await document.exitFullscreen();
      return;
    }

    try {
      await wrap.requestFullscreen();
    } catch {
      // Fullscreen can be rejected by the browser/user settings.
      setWide(false);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      const isThisWorkspaceFullscreen = document.fullscreenElement === wrapRef.current;
      setWide(isThisWorkspaceFullscreen);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // If the user navigates away from the solve view while fullscreen is active,
  // leave fullscreen so the other practice screens behave normally.
  useEffect(() => {
    if (!wideActive && document.fullscreenElement === wrapRef.current) {
      void document.exitFullscreen();
    }
  }, [wideActive]);

  useEffect(() => {
    if (wideActive) {
      wrapRef.current?.scrollIntoView({ block: 'start' });
    }
  }, [wideActive]);

  const problem: JudgeProblem = problemId === SANDBOX.id ? SANDBOX : getProblem(problemId) ?? PROBLEMS[0];
  // A problem only offers the languages it supports; fall back to its first one.
  const language: Language = problem.languages.includes(preferredLanguage) ? preferredLanguage : problem.languages[0];
  const starter = problem.starters[language] ?? defaultStarter(language);
  const solved = useMemo(() => solvedProblemIds(attempts), [attempts]);
  const recommendation = useMemo(() => recommendNext(PROBLEMS, attempts), [attempts]);

  // Load the saved draft, or the starter, whenever the problem or language changes.
  useEffect(() => {
    setCode(loadDraft(problem.id, language) ?? starter);
    // starter is derived from problem and language, so those are the real dependencies.
    // loadNonce forces a reload when the same problem is reopened, for example via "Try it".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem.id, language, loadNonce]);

  const openProblem = useCallback((id: string) => {
    setProblemId(id);
    setView('solve');
    setLoadNonce((n) => n + 1);
  }, []);

  // The address can change while this page is open, for example from the dashboard.
  useEffect(() => {
    if (requested && getProblem(requested) && !(view === 'solve' && problemId === requested)) openProblem(requested);
    // Only a change of the requested problem should open one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requested]);

  const backToProblems = () => {
    setView('problems');
    if (requested) setSearchParams({}, { replace: true });
  };

  const handleLanguageChange = (next: Language) => {
    setPreferredLanguage(next);
    saveLastLanguage(next);
  };

  const handleCodeChange = (next: string) => {
    setCode(next);
    saveDraft(problem.id, language, next);
  };

  const handleTry = (lang: Language, text: string) => {
    saveDraft(SANDBOX.id, lang, text);
    setProblemId(SANDBOX.id);
    setPreferredLanguage(lang);
    saveLastLanguage(lang);
    setView('solve');
    setLoadNonce((n) => n + 1);
  };

  const handleAttempt = (attempt: Attempt) => recordAttempt(attempt);

  const handleRestore = (attempt: Attempt) => {
    saveDraft(attempt.problemId, attempt.language, attempt.code);
    setPreferredLanguage(attempt.language);
    saveLastLanguage(attempt.language);
    setLoadNonce((n) => n + 1);
  };

  const tabs: { id: View | 'sandbox'; label: string; icon: React.ReactNode }[] = [
    { id: 'problems', label: 'Problems', icon: <ListChecks className="w-3.5 h-3.5" /> },
    { id: 'learn', label: 'Lessons', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'sandbox', label: 'Sandbox', icon: <FlaskConical className="w-3.5 h-3.5" /> },
  ];
  const activeTab = view === 'solve' && problemId === SANDBOX.id ? 'sandbox' : view;

  return (
    <div ref={wrapRef}>
      <div
        className={`flex flex-col border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden ${
          wideActive ? 'rounded-none border-x-0' : 'h-[calc(100vh-13rem)] min-h-[680px] rounded-2xl'
        }`}
        style={
          wideActive
            ? {
                width: '100vw',
                height: '100dvh',
                maxWidth: 'none',
                maxHeight: 'none',
                margin: 0,
              }
            : undefined
        }
      >
        <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3 min-w-0">
            {view === 'solve' && (
              <button
                onClick={backToProblems}
                className="btn btn-ghost flex items-center gap-1.5 text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Problems
              </button>
            )}
            <div className="flex items-center gap-2 min-w-0">
              <Terminal className="w-4 h-4 text-indigo-400 shrink-0" aria-hidden="true" />
              <span className="text-sm font-semibold text-white truncate">
                {view === 'solve' ? problem.title : view === 'learn' ? 'Lessons and algorithms' : 'Coding practice'}
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800" aria-label="Coding sections">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  if (t.id === 'sandbox') handleTry(language, loadDraft(SANDBOX.id, language) ?? defaultStarter(language));
                  else if (t.id === 'problems') backToProblems();
                  else setView(t.id as View);
                }}
                className={`tab ${activeTab === t.id ? 'is-active' : ''}`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {view === 'solve' && (
              <button
                type="button"
                onClick={toggleWide}
                aria-pressed={wide}
                title={wide ? 'Leave wide screen mode (Esc)' : 'Wide screen mode: editor and terminal across the whole window'}
                className="btn btn-ghost flex items-center gap-1.5 text-xs"
              >
                {wide ? <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" /> : <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />}
                <span className="hidden sm:inline">{wide ? 'Exit wide' : 'Wide'}</span>
              </button>
            )}
            <span className="text-xs text-slate-500">
              {solved.size} / {PROBLEMS.length} solved
            </span>
          </div>
        </header>

        <div className="flex-1 min-h-0 flex flex-col">
          {view === 'problems' && <ProblemList problems={PROBLEMS} attempts={attempts} recommendation={recommendation} onOpen={(p) => openProblem(p.id)} />}

          {view === 'learn' && <LearnPanel onTry={handleTry} onOpenProblem={openProblem} />}

          {view === 'solve' && (
            <SolveView
              key={problem.id}
              problem={problem}
              language={language}
              onLanguageChange={handleLanguageChange}
              code={code}
              onCodeChange={handleCodeChange}
              starter={starter}
              attempts={attempts}
              onAttempt={handleAttempt}
              onRestoreAttempt={handleRestore}
              wide={wideActive}
            />
          )}
        </div>
      </div>
    </div>
  );
};
