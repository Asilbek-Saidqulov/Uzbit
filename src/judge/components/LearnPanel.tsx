import React, { useState } from 'react';
import { BookOpen, Check, ChevronDown, Compass, Copy, FlaskConical, Layers, Play } from 'lucide-react';
import { LESSONS } from '../data/lessons';
import { ALGORITHMS, runnableCode, type Algorithm } from '../data/algorithms';
import { NO_ANSWERS, recommendTechnique, type TechniqueAnswers } from '../recommend';
import type { Language } from '../types';
import { LANGUAGE_META } from '../types';

interface LearnPanelProps {
  onTry: (language: Language, code: string) => void;
  onOpenProblem: (problemId: string) => void;
  initialSection?: 'lessons' | 'algorithms' | 'guide';
}

const CODE_LANGS: Language[] = ['python', 'javascript'];
const ALGO_LANGS: Language[] = ['python', 'javascript', 'cpp'];

function CodeBlock({ code, language, onTry }: { code: string; language: Language; onTry?: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; the code is still visible */
    }
  };
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800 bg-slate-900/70">
        <span className="text-[11px] font-sans tabular-nums text-slate-400">{LANGUAGE_META[language].file}</span>
        <div className="flex items-center gap-2">
          <button onClick={copy} className="btn btn-ghost btn-sm flex items-center gap-1 text-[11px]">
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          {onTry && (
            <button onClick={onTry} className="btn btn-ghost btn-sm flex items-center gap-1 text-[11px]">
              <Play className="w-3 h-3" /> Try it
            </button>
          )}
        </div>
      </div>
      <pre className="p-3 text-xs font-sans tabular-nums text-slate-200 overflow-x-auto leading-5">{code}</pre>
    </div>
  );
}

function LanguageTabs({ value, onChange, options = CODE_LANGS }: { value: Language; onChange: (l: Language) => void; options?: Language[] }) {
  return (
    <div className="flex gap-1">
      {options.map((l) => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className={`btn btn-ghost btn-sm text-[11px] ${value === l ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
        >
          {LANGUAGE_META[l].label}
        </button>
      ))}
    </div>
  );
}

const GUIDE_QUESTIONS: { key: keyof TechniqueAnswers; label: string }[] = [
  { key: 'smallInput', label: 'Is the input small (about 1000 items or fewer)?' },
  { key: 'graph', label: 'Is the input a graph, a grid, or a set of connections?' },
  { key: 'weighted', label: 'Do the connections have lengths or costs?' },
  { key: 'mergeGroups', label: 'Do you join groups and ask whether two items are together?' },
  { key: 'sorted', label: 'Is the input already sorted?' },
  { key: 'bestOrCount', label: 'Do you need a minimum, a maximum, or the best value?' },
  { key: 'subarray', label: 'Are you asked about a block of neighbouring elements?' },
  { key: 'choices', label: 'Does each decision depend on earlier decisions, with the same smaller cases coming back?' },
  { key: 'capacity', label: 'Is there a weight or capacity limit on what you can choose?' },
  { key: 'mod', label: 'Is the answer taken modulo a number, or is the exponent huge?' },
  { key: 'primes', label: 'Do you work with primes?' },
  { key: 'divisibility', label: 'Do you need a common divisor or a simplified fraction?' },
  { key: 'nesting', label: 'Must things close in reverse order, like brackets?' },
];

function TechniqueGuide({ onOpen }: { onOpen: (id: string) => void }) {
  const [answers, setAnswers] = useState<TechniqueAnswers>(NO_ANSWERS);
  const advice = recommendTechnique(answers);
  const alg = ALGORITHMS.find((a) => a.id === advice.algorithmId);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-slate-400 leading-relaxed">
        Answer what you know about the problem. Leave a question on No if you are not sure. The guide suggests one technique and says when not to use it.
      </p>
      <div className="flex flex-col gap-2">
        {GUIDE_QUESTIONS.map((q) => (
          <div key={q.key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
            <span className="text-xs text-slate-300">{q.label}</span>
            <div className="flex gap-1 shrink-0">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  aria-pressed={answers[q.key] === v}
                  onClick={() => setAnswers({ ...answers, [q.key]: v })}
                  className={`btn btn-ghost btn-sm text-[11px] ${answers[q.key] === v ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  {v ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-indigo-800/60 bg-indigo-950/30 p-4 flex flex-col gap-2">
        <span className="text-[11px] uppercase tracking-wider text-indigo-300">Suggested technique</span>
        <span className="text-sm font-semibold text-white">{alg?.name}</span>
        <p className="text-xs text-slate-300 leading-relaxed">{advice.reason}</p>
        <p className="text-xs text-amber-200/80 leading-relaxed"><span className="font-semibold">Don't use it if: </span>{advice.dontUse}</p>
        {alg && (
          <button onClick={() => onOpen(alg.id)} className="btn btn-secondary btn-sm self-start text-[11px]">
            Open {alg.name}
          </button>
        )}
      </div>
    </div>
  );
}

export const LearnPanel: React.FC<LearnPanelProps> = ({ onTry, onOpenProblem, initialSection = 'lessons' }) => {
  const [section, setSection] = useState<'lessons' | 'algorithms' | 'guide'>(initialSection);
  const [openLesson, setOpenLesson] = useState<string | null>(LESSONS[0].id);
  const [openAlgorithm, setOpenAlgorithm] = useState<string | null>(null);
  const [lessonLang, setLessonLang] = useState<Language>('python');
  const [algoLang, setAlgoLang] = useState<Language>('python');

  return (
    <div className="flex flex-col gap-4 p-5 overflow-y-auto">
      <div className="flex gap-2">
        {(['lessons', 'algorithms', 'guide'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`btn btn-secondary flex items-center gap-1.5 text-xs capitalize ${ section === s ? 'bg-indigo-600 border-indigo-500 text-canvas' : 'border-slate-800 text-slate-400 hover:text-white' }`}
          >
            {s === 'lessons' ? <BookOpen className="w-3.5 h-3.5" /> : s === 'algorithms' ? <Layers className="w-3.5 h-3.5" /> : <Compass className="w-3.5 h-3.5" />}
            {s === 'guide' ? 'which technique?' : s}
          </button>
        ))}
      </div>

      {section === 'lessons' && (
        <div className="flex flex-col gap-3">
          {LESSONS.map((lesson) => {
            const open = openLesson === lesson.id;
            const example = lesson.example[lessonLang] ?? lesson.example.python!;
            const exampleLang = lesson.example[lessonLang] ? lessonLang : 'python';
            return (
              <div key={lesson.id} className="rounded-xl border border-slate-800 bg-slate-950/50">
                <button
                  onClick={() => setOpenLesson(open ? null : lesson.id)}
                  aria-expanded={open}
                  className="btn btn-content btn-ghost w-full flex items-center justify-between gap-3 text-left"
                >
                  <div>
                    <div className="text-sm font-semibold text-white">{lesson.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{lesson.summary}</div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                  <div className="px-4 pb-4 flex flex-col gap-4">
                    {lesson.sections.map((s) => (
                      <div key={s.heading} className="flex flex-col gap-1.5">
                        <h4 className="text-xs font-semibold text-indigo-300">{s.heading}</h4>
                        {s.paragraphs.map((p, i) => (
                          <p key={i} className="text-xs text-slate-300 leading-relaxed">{p}</p>
                        ))}
                      </div>
                    ))}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400">Example</span>
                        <LanguageTabs value={lessonLang} onChange={setLessonLang} />
                      </div>
                      <CodeBlock code={example} language={exampleLang} onTry={() => onTry(exampleLang, example)} />
                    </div>
                    {lesson.practice && (
                      <button
                        onClick={() => onOpenProblem(lesson.practice!)}
                        className="btn btn-ghost self-start flex items-center gap-1.5 text-xs"
                      >
                        <FlaskConical className="w-3.5 h-3.5" /> Practice this in a problem
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {section === 'algorithms' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {ALGORITHMS.map((alg: Algorithm) => {
            const open = openAlgorithm === alg.id;
            const { code, language: codeLang } = runnableCode(alg, algoLang);
            return (
              <div key={alg.id} className="rounded-xl border border-slate-800 bg-slate-950/50 flex flex-col">
                <button
                  onClick={() => setOpenAlgorithm(open ? null : alg.id)}
                  aria-expanded={open}
                  className="btn btn-content btn-ghost text-left flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white">{alg.name}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">{alg.category}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px] font-sans tabular-nums">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-950/60 text-indigo-300 border border-indigo-800/50">
                      time {alg.time}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800">
                      space {alg.space}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{alg.whenToUse}</p>
                </button>
                {open && (
                  <div className="px-4 pb-4 flex flex-col gap-3">
                    {alg.idea.map((p, i) => (
                      <p key={i} className="text-xs text-slate-300 leading-relaxed">{p}</p>
                    ))}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-emerald-300">Why it works</span>
                      <p className="text-xs text-slate-300 leading-relaxed">{alg.whyItWorks}</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold text-amber-300">Common traps</span>
                      <ul className="flex flex-col gap-1.5 list-disc pl-4">
                        {alg.traps.map((t, i) => (
                          <li key={i} className="text-xs text-slate-300 leading-relaxed">{t}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">Implementation</span>
                      <LanguageTabs value={codeLang} onChange={setAlgoLang} options={ALGO_LANGS.filter((l) => alg.code[l])} />
                    </div>
                    <CodeBlock code={code} language={codeLang} onTry={() => onTry(codeLang, code)} />
                    {alg.practice.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {alg.practice.map((pid) => (
                          <button
                            key={pid}
                            onClick={() => onOpenProblem(pid)}
                            className="btn btn-secondary btn-sm py-1 text-[11px]"
                          >
                            Practice problem
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {section === 'guide' && (
        <TechniqueGuide onOpen={(id) => { setSection('algorithms'); setOpenAlgorithm(id); }} />
      )}
    </div>
  );
};
