import React, { useMemo, useState } from 'react';
import { CheckCircle2, Search } from 'lucide-react';
import { StatePanel } from '@/components/StatePanel.tsx';
import type { Difficulty, JudgeProblem, Language } from '../types';
import { LANGUAGE_META } from '../types';

interface ProblemListProps {
  problems: JudgeProblem[];
  solvedIds: Set<string>;
  onOpen: (problem: JudgeProblem) => void;
}

const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  easy: 'text-indigo-300 bg-indigo-950/50 border-indigo-800/60',
  medium: 'text-amber-300 bg-amber-950/40 border-amber-800/60',
  hard: 'text-rose-300 bg-rose-950/40 border-rose-800/60',
};

const FILTERS: ('all' | Difficulty)[] = ['all', 'easy', 'medium', 'hard'];

export const ProblemList: React.FC<ProblemListProps> = ({ problems, solvedIds, onOpen }) => {
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState<'all' | Difficulty>('all');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return problems.filter((p) => {
      if (difficulty !== 'all' && p.difficulty !== difficulty) return false;
      if (!q) return true;
      return p.title.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.tags.some((t) => t.includes(q));
    });
  }, [problems, query, difficulty]);

  return (
    <div className="flex flex-col gap-4 p-5 overflow-y-auto">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, code, or topic"
            aria-label="Search problems"
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 outline-none"
          />
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setDifficulty(f)}
              className={`btn btn-secondary text-xs capitalize ${ difficulty === f ? 'bg-indigo-600 border-indigo-500 text-canvas' : 'border-slate-800 text-slate-400 hover:text-white hover:border-slate-700' }`}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-slate-500">
          {solvedIds.size} of {problems.length} solved
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {visible.map((p) => {
          const solved = solvedIds.has(p.id);
          return (
            <button
              key={p.id}
              onClick={() => onOpen(p)}
              className="btn btn-content btn-secondary text-left flex flex-col gap-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-sans tabular-nums text-[11px] text-slate-500">#{p.code}</span>
                {solved && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Solved
                  </span>
                )}
              </div>
              <span className="text-sm font-semibold text-white">{p.title}</span>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border capitalize ${DIFFICULTY_STYLE[p.difficulty]}`}>
                  {p.difficulty}
                </span>
                {p.tags.slice(0, 2).map((t) => (
                  <span key={t} className="px-2 py-0.5 text-[10px] rounded-md border border-slate-800 text-slate-400">
                    {t}
                  </span>
                ))}
              </div>
              <span className="text-[11px] text-slate-500">
                {p.languages.map((l: Language) => LANGUAGE_META[l].label).join(' · ')}
              </span>
            </button>
          );
        })}
        {visible.length === 0 && (
          <div className="col-span-full">
            <StatePanel
              icon={<Search className="h-5 w-5" />}
              title="No problems match these filters"
              body="Try another difficulty, or search by a topic such as sorting or recursion."
              action={{ label: 'Clear filters', onClick: () => { setQuery(''); setDifficulty('all'); } }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
