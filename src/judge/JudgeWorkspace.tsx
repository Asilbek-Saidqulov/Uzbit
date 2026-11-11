import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import { fetchAttempts, mergeAttempts, saveAttempt } from '@/lib/sync/attempts';
import { ArrowLeft, BookOpen, FlaskConical, ListChecks, Terminal } from 'lucide-react';
import { ProblemList } from './components/ProblemList';
import { LearnPanel } from './components/LearnPanel';
import { SolveView } from './components/SolveView';
import { PROBLEMS, SANDBOX, getProblem } from './data/problems';
import { defaultStarter } from './engine/harness';
import {
  addAttempt,
  saveAttempts,
  loadAttempts,
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
  const [view, setView] = useState<View>('problems');
  const [problemId, setProblemId] = useState<string>(PROBLEMS[0].id);
  const [preferredLanguage, setPreferredLanguage] = useState<Language>(() => loadLastLanguage('python'));
  const [attempts, setAttempts] = useState<Attempt[]>(() => loadAttempts());
  const { user } = useAuth();

  // On sign-in, bring in the account's history and merge it with this browser's.
  useEffect(() => {
    if (!user) return;
    let active = true;
    fetchAttempts(user.id).then((remote) => {
      if (!active || !remote) return;
      const merged = mergeAttempts(loadAttempts(), remote);
      saveAttempts(merged);
      setAttempts(merged);
    });
    return () => {
      active = false;
    };
  }, [user]);
  const [code, setCode] = useState('');
  const [loadNonce, setLoadNonce] = useState(0);

  const problem: JudgeProblem = problemId === SANDBOX.id ? SANDBOX : getProblem(problemId) ?? PROBLEMS[0];
  // A problem only offers the languages it supports; fall back to its first one.
  const language: Language = problem.languages.includes(preferredLanguage) ? preferredLanguage : problem.languages[0];
  const starter = problem.starters[language] ?? defaultStarter(language);
  const solved = useMemo(() => solvedProblemIds(attempts), [attempts]);

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

  const handleAttempt = (attempt: Attempt) => {
    setAttempts(addAttempt(attempt));
    if (user) void saveAttempt(attempt, user.id);
  };

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
    <div className="flex flex-col h-[calc(100vh-13rem)] min-h-[680px] rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-800 bg-slate-950/60">
        <div className="flex items-center gap-3 min-w-0">
          {view === 'solve' && (
            <button
              onClick={() => setView('problems')}
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
                else setView(t.id as View);
              }}
              className={`tab ${activeTab === t.id ? 'is-active' : ''}`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>

        <span className="text-xs text-slate-500">
          {solved.size} / {PROBLEMS.length} solved
        </span>
      </header>

      <div className="flex-1 min-h-0 flex flex-col">
        {view === 'problems' && <ProblemList problems={PROBLEMS} solvedIds={solved} onOpen={(p) => openProblem(p.id)} />}

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
          />
        )}
      </div>
    </div>
  );
};
