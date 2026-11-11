import React, { useState, useMemo } from 'react';
import { KaTeX } from './KaTeX.tsx';
import { StatePanel } from './StatePanel.tsx';
import {
  Search,
  Copy,
  Check,
  TrendingUp,
  Bookmark,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';

export interface FormulaItem {
  id: string;
  category: 'algebra' | 'geometry' | 'calculus' | 'algorithms' | 'probability' | 'vectors';
  title: string;
  latex: string;
  description: string;
  graphExpression?: string; // If plottable in the Graphing Engine
}

const FORMULAS_DATA: FormulaItem[] = [
  // Algebra
  {
    id: 'quadratic-formula',
    category: 'algebra',
    title: 'Quadratic Formula',
    latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
    description: 'Finds the exact real or complex roots of any second-degree polynomial ax² + bx + c = 0.',
    graphExpression: 'y = x^2 - 4'
  },
  {
    id: 'discriminant',
    category: 'algebra',
    title: 'The Discriminant',
    latex: '\\Delta = b^2 - 4ac',
    description: 'Determines the bifurcation: Δ > 0 yields 2 distinct real roots, Δ = 0 a single repeated tangent, Δ < 0 complex conjugates.'
  },
  {
    id: 'vertex-form',
    category: 'algebra',
    title: 'Parabola Vertex',
    latex: 'h = -\\frac{b}{2a}, \\quad k = c - \\frac{b^2}{4a}',
    description: 'Coordinates (h, k) marking the global extremum of the quadratic curve.',
    graphExpression: 'y = (x - 2)^2 - 1'
  },

  // Geometry
  {
    id: 'pythagoras',
    category: 'geometry',
    title: 'Pythagorean Theorem',
    latex: 'c^2 = a^2 + b^2 \\iff c = \\sqrt{a^2 + b^2}',
    description: 'Fundamental Euclidean metric relating the legs and hypotenuse of a right-angled triangle.',
    graphExpression: 'y = \\sqrt{25 - x^2}'
  },
  {
    id: 'triangle-inradius',
    category: 'geometry',
    title: 'Right Triangle Inradius',
    latex: 'r = \\frac{a + b - c}{2} = \\frac{ab}{a + b + c}',
    description: 'Radius of the unique circle inscribed inside a right triangle of sides a, b and hypotenuse c.'
  },
  {
    id: 'circle-metrics',
    category: 'geometry',
    title: 'Circle Area & Circumference',
    latex: 'A = \\pi r^2, \\quad C = 2\\pi r',
    description: 'Euclidean circle invariants relating linear perimeter and quadratic area through Archimedes constant π.'
  },

  // Calculus
  {
    id: 'derivative-def',
    category: 'calculus',
    title: 'Definition of the Derivative',
    latex: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}",
    description: 'Instantaneous rate of change and slope of the continuous tangent line.',
    graphExpression: 'y = 2*x'
  },
  {
    id: 'tangent-line',
    category: 'calculus',
    title: 'Point-Slope Tangent Equation',
    latex: 'y - f(x_0) = f^{\\prime}(x_0)(x - x_0)',
    description: 'First-order Taylor approximation linearizing any smooth manifold around a point x₀.'
  },
  {
    id: 'ftc',
    category: 'calculus',
    title: 'Fundamental Theorem of Calculus',
    latex: '\\int_a^b f(x)\\,dx = F(b) - F(a)',
    description: 'Connects differentiation and integration: the definite integral equals the antiderivative change.',
    graphExpression: 'y = x^2'
  },

  // Algorithms
  {
    id: 'binary-search',
    category: 'algorithms',
    title: 'Binary Search Divide & Conquer',
    latex: 'T(n) = T(n/2) + O(1) \\implies O(\\log_2 n)',
    description: 'Optimal search in ordered collections by recursively halving the remaining search space.'
  },
  {
    id: 'merge-sort',
    category: 'algorithms',
    title: 'Merge Sort Master Theorem',
    latex: 'T(n) = 2T(n/2) + O(n) \\implies O(n \\log n)',
    description: 'Optimal comparison sorting bound utilizing stable divide, sort, and merge partitions.'
  },
  {
    id: 'euclidean-gcd',
    category: 'algorithms',
    title: "Greatest Common Divisor",
    latex: '\\gcd(a, b) = \\gcd(b, a \\bmod b)',
    description: 'Logarithmic step algorithm computing the greatest common divisor of two integers.'
  },

  // Probability & Combinatorics
  {
    id: 'combinations',
    category: 'probability',
    title: 'Binomial Combinations (n choose k)',
    latex: '\\binom{n}{k} = \\frac{n!}{k!(n - k)!}',
    description: 'Number of unique subsets of k items chosen from n elements without regard to order.'
  },
  {
    id: 'bayes',
    category: 'probability',
    title: "Bayes' Conditional Theorem",
    latex: 'P(A \\mid B) = \\frac{P(B \\mid A) \\cdot P(A)}{P(B)}',
    description: 'Formal foundation of probabilistic belief updating and Bayesian machine learning.'
  },

  // Vectors & Linear Algebra
  {
    id: 'euclidean-distance-2d',
    category: 'vectors',
    title: 'Vector Length',
    latex: '\\|\\mathbf{u} - \\mathbf{v}\\| = \\sqrt{\\sum_{i=1}^n (u_i - v_i)^2}',
    description: 'L2 norm measuring the straight-line distance between spatial coordinates.'
  },
  {
    id: 'dot-product',
    category: 'vectors',
    title: 'Dot Product',
    latex: '\\mathbf{u} \\cdot \\mathbf{v} = \\sum u_i v_i = \\|\\mathbf{u}\\|\\|\\mathbf{v}\\|\\cos\\theta',
    description: 'Projects vector u onto v; vanishes to 0 precisely when vectors are orthogonal (perpendicular).'
  }
];

const CATEGORIES: { id: string; label: string; color: string }[] = [
  { id: 'all', label: 'All Fields', color: 'indigo' },
  { id: 'algebra', label: 'Algebra', color: 'indigo' },
  { id: 'geometry', label: 'Geometry', color: 'emerald' },
  { id: 'calculus', label: 'Calculus', color: 'cyan' },
  { id: 'algorithms', label: 'Algorithms', color: 'amber' },
  { id: 'probability', label: 'Probability', color: 'rose' },
  { id: 'vectors', label: 'Vectors', color: 'purple' }
];

interface FormulaReferenceProps {
  onPlotInGraphing?: (expression: string) => void;
}

export const FormulaReference: React.FC<FormulaReferenceProps> = ({ onPlotInGraphing }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredFormulas = useMemo(() => {
    return FORMULAS_DATA.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.latex.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand mb-1">
            <span>Formula library</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Key formulas, explained
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            The formulas that come up most in algebra, calculus, geometry, and algorithms. Copy them, or plot them in the grapher to see how they behave.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search formulas or keywords..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-900/90 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 border border-slate-800/80 rounded-xl overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`btn btn-ghost text-xs whitespace-nowrap shrink-0 ${ selectedCategory === cat.id ? 'bg-indigo-600 text-canvas shadow-xs' : 'text-slate-400 hover:text-white' }`}
          >
            {cat.label}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-slate-500 pr-3 hidden sm:inline font-sans tabular-nums">
          {filteredFormulas.length} formulas
        </span>
      </div>

      {/* Formulas Grid */}
      {filteredFormulas.length === 0 ? (
        <StatePanel
          icon={<Search className="h-5 w-5" />}
          title={searchQuery ? `No formulas match “${searchQuery}”` : 'No formulas in this topic yet'}
          body="Try a topic such as derivative, pythagoras, or quadratic, or clear the search to see everything."
          action={{ label: 'Clear search', onClick: () => { setSearchQuery(''); setSelectedCategory('all'); } }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFormulas.map((item) => (
            <div
              key={item.id}
              className="group bg-slate-900/70 hover:bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-6 flex flex-col justify-between transition-all duration-200 shadow-lg backdrop-blur-sm"
            >
              <div>
                {/* Header Kicker */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-sans tabular-nums uppercase tracking-wider text-indigo-400/90 font-semibold">
                    {item.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopy(item.id, item.latex)}
                      title="Copy LaTeX code"
                      className="btn btn-ghost p-1.5 text-xs flex items-center gap-1"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[10px] text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-sm font-semibold text-white tracking-tight mb-3">
                  {item.title}
                </h2>

                {/* Rendered KaTeX Equation Box */}
                <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-xl flex items-center justify-center min-h-[64px] text-slate-100 group-hover:border-indigo-500/30 transition-colors">
                  <KaTeX math={item.latex} block className="text-sm sm:text-base" />
                </div>

                {/* Description */}
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Action: Plot in Graphing Engine if plottable */}
              {item.graphExpression && onPlotInGraphing && (
                <button
                  onClick={() => onPlotInGraphing(item.graphExpression!)}
                  className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors group/btn"
                >
                  <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Plot in the grapher</span>
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
