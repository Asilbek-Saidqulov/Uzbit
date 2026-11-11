import { KaTeX } from './KaTeX.tsx';
import React, { useState } from 'react';
import { MATH_THEMES } from '../data/curriculumData.ts';
import { MathThemeId } from '../types/index.ts';
import {
  FunctionSquare,
  Shapes,
  TrendingUp,
  Activity,
  Network,
  BarChart2,
  CheckCircle,
  XCircle,
  HelpCircle,
  Lightbulb,
  ArrowRight
} from 'lucide-react';

export const MathCurriculum: React.FC = () => {
  const [activeThemeId, setActiveThemeId] = useState<MathThemeId>('algebra');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Mini-demo interactive states
  const [unitCircleAngle, setUnitCircleAngle] = useState(45); // degrees
  const [priorProb, setPriorProb] = useState(0.05); // 5%
  const [testSensitivity, setTestSensitivity] = useState(0.95); // 95%
  const [testFalsePositive, setTestFalsePositive] = useState(0.08); // 8%

  const activeTheme = MATH_THEMES.find((t) => t.id === activeThemeId) || MATH_THEMES[0];

  const handleSelectAnswer = (idx: number) => {
    setSelectedAnswer(idx);
    setShowExplanation(true);
  };

  // Bayes posterior calculation: P(D|+) = (Sens * Prior) / (Sens * Prior + FP * (1 - Prior))
  const posterior =
    (testSensitivity * priorProb) /
    (testSensitivity * priorProb + testFalsePositive * (1 - priorProb));

  // Unit circle coords
  const rad = (unitCircleAngle * Math.PI) / 180;
  const cosVal = Math.cos(rad);
  const sinVal = Math.sin(rad);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-6 shadow-2xl">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-sans tabular-nums text-cyan-400 mb-1">
            <span>Rigorous Mathematical Foundations</span>
            <span aria-hidden="true">·</span>
            <span>Theme-by-Theme Curriculum</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Comprehensive Math Thematic Tracks
          </h2>
        </div>

        {/* Theme Segmented Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800/80 overflow-x-auto max-w-full">
          {MATH_THEMES.map((theme) => {
            const isActive = theme.id === activeThemeId;
            return (
              <button
                key={theme.id}
                onClick={() => {
                  setActiveThemeId(theme.id);
                  setSelectedAnswer(null);
                  setShowExplanation(false);
                }}
                className={`btn btn-ghost text-xs whitespace-nowrap shrink-0 ${ isActive ? 'bg-indigo-600 text-canvas shadow-sm' : 'text-slate-400 hover:text-white' }`}
              >
                {theme.title.split(' & ')[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Theme Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
        {/* Left Column: Theme Overview & Topics (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Active Theme Identity Card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs text-indigo-400 font-sans tabular-nums">
              <span>{activeTheme.subtitle}</span>
            </div>
            <h3 className="text-lg font-bold text-white">{activeTheme.title}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{activeTheme.description}</p>
          </div>

          {/* Deep-Dive Topics */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-sans">
              Core Invariants & Theorems
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {activeTheme.topics.map((topic, i) => (
                <div
                  key={i}
                  className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-200">
                      0{i + 1}. {topic.name}
                    </span>
                    <span className="text-indigo-300 bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-800/40 text-sm">
                      <KaTeX math={topic.formula} />
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{topic.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Theme Mini-Interactive Simulation & Practice Problem (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Theme-Specific Interactive Simulation Sandbox */}
          {activeThemeId === 'trigonometry' && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Interactive Unit Circle Projection
              </span>

              {/* Angle Slider */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs font-sans tabular-nums">
                  <span className="text-slate-300">Angle (θ):</span>
                  <span className="text-amber-400 font-semibold">{unitCircleAngle}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="5"
                  value={unitCircleAngle}
                  onChange={(e) => setUnitCircleAngle(parseInt(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                  aria-label="Unit circle angle theta"
                />
              </div>

              {/* Visual Preview */}
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 grid grid-cols-2 gap-2 text-xs font-sans tabular-nums">
                <div className="bg-slate-950 p-2 rounded">
                  <span className="text-slate-500 block text-[10px]">cos(θ) [X-coord]</span>
                  <span className="text-indigo-400 text-sm font-bold tabular-nums">
                    {cosVal.toFixed(4)}
                  </span>
                </div>
                <div className="bg-slate-950 p-2 rounded">
                  <span className="text-slate-500 block text-[10px]">sin(θ) [Y-coord]</span>
                  <span className="text-emerald-400 text-sm font-bold tabular-nums">
                    {sinVal.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeThemeId === 'probability' && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5" />
                Bayesian Posterior Calculator
              </span>

              <div className="flex flex-col gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-300">Prior Base Rate P(H):</span>
                  <span className="font-sans tabular-nums text-rose-400 font-semibold">
                    {(priorProb * 100).toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.30"
                  step="0.01"
                  value={priorProb}
                  onChange={(e) => setPriorProb(parseFloat(e.target.value))}
                  className="w-full accent-rose-400 cursor-pointer"
                  aria-label="Prior probability"
                />

                <div className="flex justify-between pt-1">
                  <span className="text-slate-300">Test False Positive P(+|¬H):</span>
                  <span className="font-sans tabular-nums text-amber-400 font-semibold">
                    {(testFalsePositive * 100).toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.25"
                  step="0.01"
                  value={testFalsePositive}
                  onChange={(e) => setTestFalsePositive(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                  aria-label="Test false positive rate"
                />
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex flex-col gap-1">
                <span className="text-[11px] text-slate-400">Updated Posterior Belief P(H | +):</span>
                <span className="text-xl font-bold font-sans tabular-nums text-white tabular-nums">
                  {(posterior * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          )}

          {/* Practice Question Card */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-5 flex flex-col gap-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Concept Check Challenge</span>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {activeTheme.challenge.question}
            </p>

            <div className="flex flex-col gap-2">
              {activeTheme.challenge.options.map((opt, idx) => {
                const isSelected = selectedAnswer === idx;
                const isCorrect = idx === activeTheme.challenge.correctIndex;
                let btnStyle = 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700';

                if (showExplanation) {
                  if (isCorrect) {
                    btnStyle = 'bg-emerald-950/60 border-emerald-500/80 text-emerald-200';
                  } else if (isSelected && !isCorrect) {
                    btnStyle = 'bg-rose-950/60 border-rose-500/80 text-rose-200';
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectAnswer(idx)}
                    className={`btn btn-content btn-secondary text-left text-xs flex items-start gap-2.5 ${btnStyle}`}
                  >
                    <span className="font-sans tabular-nums text-slate-500 font-bold shrink-0">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <span className="flex-1">{opt}</span>
                    {showExplanation && isCorrect && (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    {showExplanation && isSelected && !isCorrect && (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation card upon answering */}
            {showExplanation && (
              <div className="bg-slate-900/95 border border-indigo-900/40 rounded-lg p-3 text-xs text-slate-300 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-indigo-300">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span>Mathematical Proof Explanation</span>
                </div>
                <p className="leading-relaxed text-slate-400 text-[11px]">
                  {activeTheme.challenge.explanation}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
