import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Copy, History, Lightbulb, Loader2, Play, RotateCcw, Send, Square, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { CodeEditor } from './CodeEditor';
import { StatePanel } from '@/components/StatePanel.tsx';
import { cancelRun, NATIVE_RUNNER_CONFIGURED, runProgram } from '../engine/runner';
import { judgeCode, runCustom } from '../engine/judge';
import type { Attempt } from '../storage';
import type { Difficulty, JudgeProblem, JudgeReport, Language, RawResult, Verdict } from '../types';
import { LANGUAGE_META } from '../types';

interface SolveViewProps {
  problem: JudgeProblem;
  language: Language;
  onLanguageChange: (language: Language) => void;
  code: string;
  onCodeChange: (code: string) => void;
  starter: string;
  attempts: Attempt[];
  onAttempt: (attempt: Attempt) => void;
  onRestoreAttempt: (attempt: Attempt) => void;
}

export const VERDICT_LABEL: Record<Verdict, string> = {
  accepted: 'Accepted',
  wrong_answer: 'Wrong Answer',
  runtime_error: 'Runtime Error',
  compile_error: 'Compilation Error',
  time_limit: 'Time Limit Exceeded',
  unavailable: 'Not available',
};

const VERDICT_STYLE: Record<Verdict, string> = {
  accepted: 'text-emerald-300 bg-emerald-950/50 border-emerald-800',
  wrong_answer: 'text-rose-300 bg-rose-950/50 border-rose-800',
  runtime_error: 'text-amber-300 bg-amber-950/40 border-amber-800',
  compile_error: 'text-amber-300 bg-amber-950/40 border-amber-800',
  time_limit: 'text-violet-300 bg-violet-950/40 border-violet-800',
  unavailable: 'text-slate-300 bg-slate-900 border-slate-700',
};

const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  easy: 'text-indigo-300 bg-indigo-950/50 border-indigo-800/60',
  medium: 'text-amber-300 bg-amber-950/40 border-amber-800/60',
  hard: 'text-rose-300 bg-rose-950/40 border-rose-800/60',
};

const newId = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);

const Pre: React.FC<{ children: React.ReactNode; tone?: string }> = ({ children, tone = 'text-slate-200' }) => (
  <pre className={`whitespace-pre-wrap break-words rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs font-sans tabular-nums ${tone} min-h-[2.5rem]`}>
    {children}
  </pre>
);

export const SolveView: React.FC<SolveViewProps> = ({
  problem,
  language,
  onLanguageChange,
  code,
  onCodeChange,
  starter,
  attempts,
  onAttempt,
  onRestoreAttempt,
}) => {
  const [leftTab, setLeftTab] = useState<'description' | 'hint'>('description');
  const [bottomTab, setBottomTab] = useState<'tests' | 'result' | 'attempts'>('tests');
  const examples = useMemo(() => problem.tests.filter((t) => t.example), [problem]);
  const [selected, setSelected] = useState<number | 'custom'>(examples.length ? 0 : 'custom');
  const [customInput, setCustomInput] = useState('');
  const [busy, setBusy] = useState<null | 'run' | 'submit' | 'custom'>(null);
  const [report, setReport] = useState<JudgeReport | null>(null);
  const [customRaw, setCustomRaw] = useState<RawResult | null>(null);
  const [lastAction, setLastAction] = useState<'run' | 'submit' | 'custom' | null>(null);
  const [stopped, setStopped] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const runId = useRef(0);

  // A different problem or language starts with a clean slate.
  useEffect(() => {
    runId.current++;
    setBusy(null);
    setReport(null);
    setCustomRaw(null);
    setLastAction(null);
    setStopped(false);
    setSelected(examples.length ? 0 : 'custom');
    setBottomTab('tests');
  }, [problem.id, language, examples.length]);

  const native = (language === 'cpp' || language === 'rust') && !NATIVE_RUNNER_CONFIGURED;

  const execute = async (action: 'run' | 'submit' | 'custom') => {
    const id = ++runId.current;
    setBusy(action);
    setLastAction(action);
    setStopped(false);
    setBottomTab('result');

    if (action === 'custom') {
      const raw = await runCustom({ problem, code, language, stdin: customInput, runner: runProgram });
      if (id !== runId.current) return;
      setCustomRaw(raw);
      setBusy(null);
      return;
    }

    const result = await judgeCode({ problem, code, language, mode: action, runner: runProgram });
    if (id !== runId.current) return;
    setReport(result);
    setBusy(null);
    if (action === 'submit') {
      onAttempt({
        id: newId(),
        problemId: problem.id,
        language,
        code,
        verdict: result.verdict,
        passed: result.passed,
        total: result.total,
        at: Date.now(),
      });
    }
  };

  const onRun = () => {
    if (busy) return;
    if (selected === 'custom' || examples.length === 0) execute('custom');
    else execute('run');
  };

  const onSubmit = () => {
    if (busy || problem.tests.length === 0) return;
    execute('submit');
  };

  const onStop = () => {
    cancelRun();
    runId.current++;
    setBusy(null);
    setStopped(true);
    setReport(null);
    setCustomRaw(null);
  };

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1200);
    } catch {
      /* ignore */
    }
  };

  const statementParagraphs = problem.statement.split(/\n\s*\n/);
  const attemptsForProblem = attempts.filter((a) => a.problemId === problem.id);
  const solved = attemptsForProblem.some((a) => a.verdict === 'accepted');

  return (
    <div className="flex flex-col lg:flex-row min-h-0 flex-1">
      {/* ----- Left: statement ----- */}
      <section className="lg:w-[44%] lg:max-w-[560px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col min-h-0">
        <div className="flex gap-1 px-4 pt-3 border-b border-slate-800">
          {(['description', 'hint'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setLeftTab(t)}
              className={`btn btn-ghost rounded-none border-x-0 border-t-0 border-b-2 h-9 flex items-center gap-1.5 text-xs -mb-px ${ leftTab === t ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-white' }`}
            >
              {t === 'description' ? 'Description' : (<><Lightbulb className="w-3.5 h-3.5" /> Hint</>)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {leftTab === 'description' ? (
            <>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-sans tabular-nums">
                  <span className="text-slate-500">#{problem.code}</span>
                  <span>Time: <span className="text-slate-200">{problem.timeLimitMs} ms</span></span>
                  <span>Memory: <span className="text-slate-200">{problem.memoryMb} MB</span></span>
                  {solved && <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" />Solved</span>}
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">{problem.title}</h2>
                <div className="flex flex-wrap gap-1.5">
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border capitalize ${DIFFICULTY_STYLE[problem.difficulty]}`}>
                    {problem.difficulty}
                  </span>
                  {problem.tags.map((t) => (
                    <span key={t} className="px-2 py-0.5 text-[10px] rounded-md border border-slate-800 text-slate-400">{t}</span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 text-sm text-slate-200 leading-relaxed">
                {statementParagraphs.map((p, i) => (
                  <p key={i} className="whitespace-pre-line">{p}</p>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-white">Input</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{problem.inputSpec}</p>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-white">Output</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{problem.outputSpec}</p>
              </div>

              {examples.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold text-white">Examples</h3>
                  {examples.map((ex, i) => (
                    <div key={i} className="grid grid-cols-2 rounded-lg border border-slate-800 overflow-hidden text-xs font-sans tabular-nums">
                      <div className="border-r border-slate-800">
                        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/70 border-b border-slate-800 text-slate-400">
                          <span>input.txt</span>
                          <button onClick={() => copy(`in${i}`, ex.input)} aria-label="Copy example input" className="btn btn-ghost">
                            {copied === `in${i}` ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <pre className="p-3 text-slate-200 whitespace-pre-wrap">{ex.input}</pre>
                      </div>
                      <div>
                        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/70 border-b border-slate-800 text-slate-400">
                          <span>output.txt</span>
                          <button onClick={() => copy(`out${i}`, ex.output)} aria-label="Copy example output" className="btn btn-ghost">
                            {copied === `out${i}` ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <pre className="p-3 text-slate-200 whitespace-pre-wrap">{ex.output}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-white">A hint for this problem</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{problem.hint}</p>
              <p className="text-xs text-slate-500">Try the problem on your own first. Hints are most useful once you have an idea that does not work yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* ----- Right: editor and results ----- */}
      <section className="flex-1 min-w-0 flex flex-col min-h-0">
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-slate-800 bg-slate-900/60">
          <label className="sr-only" htmlFor="judge-language">Language</label>
          <select
            id="judge-language"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as Language)}
            className="px-2.5 py-1.5 text-xs font-medium bg-slate-950 border border-slate-800 rounded-lg text-slate-200 outline-none focus:border-indigo-500"
          >
            {problem.languages.map((l) => (
              <option key={l} value={l}>{LANGUAGE_META[l].label}</option>
            ))}
          </select>
          <button
            onClick={() => onCodeChange(starter)}
            className="btn btn-ghost flex items-center gap-1.5 text-xs"
            title="Replace your code with the starter"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <div className="ml-auto flex items-center gap-2">
            {busy && (
              <button onClick={onStop} className="btn btn-secondary flex items-center gap-1.5 text-xs">
                <Square className="w-3 h-3 fill-current" /> Stop
              </button>
            )}
            <button
              onClick={onRun}
              disabled={!!busy}
              className="btn btn-secondary flex items-center gap-1.5 text-xs"
            >
              {busy === 'run' || busy === 'custom' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              Run
            </button>
            <button
              onClick={onSubmit}
              disabled={!!busy || problem.tests.length === 0}
              title={problem.tests.length === 0 ? 'The sandbox has no tests to submit' : 'Judge every test'}
              className="btn btn-primary flex items-center gap-1.5 text-xs"
            >
              {busy === 'submit' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Submit
            </button>
          </div>
        </div>

        {native && (
          <div className="flex items-start gap-2 px-4 py-2 text-[11px] text-amber-200 bg-amber-950/30 border-b border-amber-900/50">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
            <span>
              {LANGUAGE_META[language].label} runs on a separate sandboxed judge service, which is not configured here. Python and JavaScript run in your browser.
            </span>
          </div>
        )}

        <CodeEditor
          value={code}
          onChange={onCodeChange}
          language={language}
          onRun={onRun}
          onSubmit={onSubmit}
        />

        {/* ----- Bottom panel ----- */}
        <div className="h-[290px] shrink-0 border-t border-slate-800 flex flex-col min-h-0">
          <div className="flex gap-1 px-3 pt-2 border-b border-slate-800">
            {([
              ['tests', 'Test cases'],
              ['result', 'Result'],
              ['attempts', `My attempts (${attemptsForProblem.length})`],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setBottomTab(key)}
                className={`btn btn-ghost rounded-none border-x-0 border-t-0 border-b-2 h-9 flex items-center gap-1.5 text-xs -mb-px ${ bottomTab === key ? 'border-indigo-500 text-white' : 'border-transparent text-slate-400 hover:text-white' }`}
              >
                {key === 'attempts' && <History className="w-3.5 h-3.5" />}
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 text-xs">
            {bottomTab === 'tests' && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  {examples.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setSelected(i)}
                      className={`btn btn-secondary btn-sm font-sans tabular-nums ${ selected === i ? 'bg-slate-800 border-slate-600 text-white' : 'border-slate-800 text-slate-400 hover:text-white' }`}
                    >
                      Test {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelected('custom')}
                    className={`btn btn-secondary btn-sm font-sans tabular-nums ${ selected === 'custom' ? 'bg-slate-800 border-slate-600 text-white' : 'border-slate-800 text-slate-400 hover:text-white' }`}
                  >
                    Custom
                  </button>
                </div>

                {selected === 'custom' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-slate-400 font-medium">Input (input.txt)</span>
                      <textarea
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        spellCheck={false}
                        rows={5}
                        className="p-3 rounded-lg border border-slate-800 bg-slate-950 font-sans tabular-nums text-slate-200 outline-none focus:border-indigo-500 resize-none"
                        placeholder="Type the input your program should read"
                      />
                    </label>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-slate-400 font-medium">Output (output.txt)</span>
                      <Pre tone={customRaw?.kind === 'ok' ? 'text-slate-200' : 'text-rose-300'}>
                        {customRaw ? (customRaw.kind === 'ok' ? customRaw.stdout || '(no output)' : customRaw.error || customRaw.kind) : 'Press Run to see the output.'}
                      </Pre>
                    </div>
                  </div>
                ) : examples[selected as number] ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-slate-400 font-medium">Input (input.txt)</span>
                      <Pre>{examples[selected as number].input}</Pre>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-slate-400 font-medium">Expected output (output.txt)</span>
                      <Pre>{examples[selected as number].output}</Pre>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {bottomTab === 'result' && (
              <ResultPanel
                busy={busy}
                stopped={stopped}
                lastAction={lastAction}
                report={report}
                customRaw={customRaw}
                timeLimitMs={problem.timeLimitMs}
                language={language}
                onSwitchLanguage={() => onLanguageChange('python')}
                onRetry={onRun}
              />
            )}

            {bottomTab === 'attempts' && (
              <div className="flex flex-col gap-2">
                {attemptsForProblem.length === 0 && (
                  <StatePanel icon={<History className="h-5 w-5" />} title="No submissions yet" body="Press Submit to judge every test. Each attempt is saved here, so you can compare them." />
                )}
                {attemptsForProblem.map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-800 bg-slate-950/60">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${VERDICT_STYLE[a.verdict]}`}>
                        {VERDICT_LABEL[a.verdict]}
                      </span>
                      <span className="text-slate-400">{LANGUAGE_META[a.language].label}</span>
                      <span className="text-slate-500 font-sans tabular-nums">{a.passed}/{a.total}</span>
                      <span className="text-slate-600">{new Date(a.at).toLocaleString()}</span>
                    </div>
                    <button onClick={() => onRestoreAttempt(a)} className="btn btn-ghost">Load this code</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

const ResultPanel: React.FC<{
  busy: null | 'run' | 'submit' | 'custom';
  stopped: boolean;
  lastAction: null | 'run' | 'submit' | 'custom';
  report: JudgeReport | null;
  customRaw: RawResult | null;
  timeLimitMs: number;
  language: Language;
  onSwitchLanguage: () => void;
  onRetry: () => void;
}> = ({ busy, stopped, lastAction, report, customRaw, language, onSwitchLanguage, onRetry }) => {
  if (busy) {
    if (language === 'python') {
      return (
        <StatePanel
          tone="loading"
          icon={<Loader2 className="h-5 w-5 animate-spin" />}
          title="Running your code"
          body="The first Python run starts the interpreter, which takes a few seconds. Later runs are fast."
        />
      );
    }
    return (
      <StatePanel
        tone="loading"
        icon={<Loader2 className="h-5 w-5 animate-spin" />}
        title="Running your code"
        body="Checking your program against the tests."
      />
    );
  }
  if (stopped) return <StatePanel icon={<Square className="h-4 w-4" />} title="Run stopped" body="Press Run or Submit to try again." />;

  if (lastAction === 'custom') {
    if (!customRaw) return <p className="text-slate-500">Run your code on the custom input to see its output here.</p>;
    const ok = customRaw.kind === 'ok';
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-slate-300">
          {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-400" />}
          <span className="font-semibold">{ok ? 'Finished' : customRaw.kind === 'timeout' ? 'Time limit exceeded' : customRaw.kind === 'compile' ? 'Compilation error' : 'Error'}</span>
          {customRaw.timeMs > 0 && <span className="flex items-center gap-1 text-slate-500"><Clock className="w-3 h-3" />{customRaw.timeMs} ms</span>}
        </div>
        <Pre tone={ok ? 'text-slate-200' : 'text-rose-300'}>{ok ? customRaw.stdout || '(no output)' : customRaw.error || customRaw.kind}</Pre>
      </div>
    );
  }

  if (!report) return <StatePanel icon={<Play className="h-4 w-4 fill-current" />} title="No result yet" body="Press Run to check the examples, or Submit to judge every test." />;

  // This language needs the judge service, which is not configured here.
  if (report.verdict === 'unavailable') {
    return (
      <StatePanel
        tone="error"
        icon={<AlertTriangle className="h-5 w-5" />}
        title={`${LANGUAGE_META[language].label} needs a judge service`}
        body={`${report.message} Python and JavaScript run in your browser right away.`}
        action={{ label: 'Switch to Python', onClick: onSwitchLanguage }}
      />
    );
  }

  // The Python runtime could not be fetched, usually because the connection dropped.
  if (report.verdict === 'runtime_error' && /importScripts|Failed to|Could not load|NetworkError/i.test(report.message)) {
    return (
      <StatePanel
        tone="error"
        icon={<AlertTriangle className="h-5 w-5" />}
        title="The runtime did not load"
        body="Check your connection, then try again. The runtime is downloaded once per visit."
        action={{ label: 'Try again', onClick: onRetry }}
      />
    );
  }

  const tone = VERDICT_STYLE[report.verdict];
  return (
    <div className="flex flex-col gap-3">
      <div className={`flex flex-wrap items-center gap-3 p-3 rounded-lg border ${tone}`}>
        {report.verdict === 'accepted' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
        <span className="font-bold">{VERDICT_LABEL[report.verdict]}</span>
        <span className="text-slate-300">{report.message}</span>
        <span className="ml-auto font-sans tabular-nums text-slate-400">{report.passed}/{report.total} passed</span>
      </div>
      <div className="flex flex-col gap-2">
        {report.outcomes.map((o) => (
          <div key={o.index} className="rounded-lg border border-slate-800 bg-slate-950/60 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-sans tabular-nums">
                {o.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                <span className="text-slate-200">{o.hidden ? `Hidden test ${o.index}` : `Test ${o.index}`}</span>
              </div>
              <span className="text-slate-500 font-sans tabular-nums">{o.timeMs} ms</span>
            </div>
            {!o.hidden && !o.passed && (
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] font-sans tabular-nums">
                <div><span className="text-slate-500">input</span><Pre>{o.input}</Pre></div>
                <div><span className="text-slate-500">expected</span><Pre>{o.expected}</Pre></div>
                <div><span className="text-slate-500">got</span><Pre tone="text-rose-300">{o.error ?? (o.actual || '(no output)')}</Pre></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
