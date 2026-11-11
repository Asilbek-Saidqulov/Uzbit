import { KaTeX } from './components/KaTeX.tsx';
import { expressionToTex } from './lib/tex.ts';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { AuthButton } from './auth/AuthButton.tsx';
import GraphingLab from '@/modules/graphing/GraphingLab.tsx';
import { GeometryCalculator } from './components/GeometryCalculator.tsx';
import { MathCurriculum } from './components/MathCurriculum.tsx';
import { CodeLearningSpace } from './components/CodeLearningSpace.tsx';
import { ThreeHeroScene } from './components/ThreeHeroScene.tsx';
import { FormulaReference } from './components/FormulaReference.tsx';
import { Breadcrumb } from './components/Breadcrumb.tsx';
import { Footer } from './components/Footer.tsx';
import { LiveBackground, type LiveMode } from './components/LiveBackground.tsx';
import {
  LineChart,
  Compass,
  Calculator,
  Code2,
  BookOpen,
  Bookmark,
  Sparkles,
  ArrowRight,
  ChevronDown,
  Layers,
  Palette,
} from 'lucide-react';

export type AppTab =
  | 'overview'
  | 'curriculum'
  | 'reference'
  | 'graphing'
  | 'geometry'
  | 'threed'
  | 'code';

export type WallpaperTheme = 'field' | 'waves' | 'orbit' | 'minimal';

const WALLPAPERS: Record<WallpaperTheme, { name: string; tag: string; color: string; live?: LiveMode }> = {
  field: { name: 'Live network', tag: 'Network', color: '#2DD4BF', live: 'field' },
  waves: { name: 'Live waves', tag: 'Waves', color: '#5EEAD4', live: 'waves' },
  orbit: { name: 'Live sphere', tag: 'Sphere', color: '#99F6E4', live: 'orbit' },
  minimal: { name: 'Obsidian', tag: 'Still', color: '#161A23' },
};

const CHIP =
  'px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors ';

/** Top-level navigation: each group is a learning intent, and its tabs are the tools inside it. */
const NAV_GROUPS: { id: string; label: string; icon: React.ComponentType<{ className?: string }>; tabs: AppTab[] }[] = [
  { id: 'learn', label: 'Learn', icon: BookOpen, tabs: ['curriculum', 'reference'] },
  { id: 'explore', label: 'Explore', icon: LineChart, tabs: ['graphing', 'geometry', 'threed'] },
  { id: 'practice', label: 'Practice', icon: Code2, tabs: ['code'] },
];

/** Tools inside each group, shown as a second row under the breadcrumb. */
const SECTION_TABS: Partial<Record<AppTab, { id: AppTab; label: string }[]>> = {
  curriculum: [{ id: 'curriculum', label: 'Learning paths' }, { id: 'reference', label: 'Formulas' }],
  reference: [{ id: 'curriculum', label: 'Learning paths' }, { id: 'reference', label: 'Formulas' }],
  graphing: [{ id: 'graphing', label: 'Graph' }, { id: 'geometry', label: 'Geometry' }, { id: 'threed', label: '3D' }],
  geometry: [{ id: 'graphing', label: 'Graph' }, { id: 'geometry', label: 'Geometry' }, { id: 'threed', label: '3D' }],
  threed: [{ id: 'graphing', label: 'Graph' }, { id: 'geometry', label: 'Geometry' }, { id: 'threed', label: '3D' }],
};


/** Every page has an address, so refresh, the back button, and shared links all work. */
const PAGE_PATHS: Record<AppTab, string> = {
  overview: '/',
  curriculum: '/learn',
  reference: '/learn/formulas',
  graphing: '/explore/graph',
  geometry: '/explore/geometry',
  threed: '/explore/3d',
  code: '/practice',
};

const PATH_TABS: Record<string, AppTab> = Object.fromEntries(
  Object.entries(PAGE_PATHS).map(([tab, path]) => [path, tab as AppTab])
);

function tabFromPath(pathname: string): AppTab | null {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return PATH_TABS[clean] ?? null;
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = tabFromPath(location.pathname);
  const setActiveTab = useCallback((tab: AppTab) => navigate(PAGE_PATHS[tab]), [navigate]);
  // Scroll to the top whenever the page changes.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  // The live network is the default. Obsidian is the still option.
  const [wallpaper, setWallpaper] = useState<WallpaperTheme>('field');
  const [wallpaperMenuOpen, setWallpaperMenuOpen] = useState(false);
  // A plotted formula travels in the address: /explore/graph?expr=...
  const graphExpression = searchParams.get('expr') ?? undefined;
  // What the graph currently shows; display only, so it never re-adds rows in the graph.
  const [liveExpression, setLiveExpression] = useState<string>('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close wallpaper dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setWallpaperMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePlotInGraphing = (expression: string) => {
    navigate(`${PAGE_PATHS.graphing}?expr=${encodeURIComponent(expression)}`);
  };

  if (activeTab === null) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden selection:bg-indigo-600 selection:text-canvas">
      {/* Background wallpapers: every image stays mounted and only its opacity changes,
          so switching themes cross-fades instead of snapping to the new image. */}
      {WALLPAPERS[wallpaper].live && <LiveBackground mode={WALLPAPERS[wallpaper].live!} />}
      {/* Soft gradient radial scrim for legibility */}
      <div
        className={`fixed inset-0 z-0 pointer-events-none bg-radial ${
          WALLPAPERS[wallpaper].live
            ? 'from-slate-950/10 via-slate-950/40 to-slate-950/85'
            : 'from-slate-950/30 via-slate-950/75 to-slate-950'
        }`}
      />

      {/* Global Architectural Navigation Header */}
      <header className="sticky top-0 z-50 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md">
        <div className="container-shell flex items-center justify-between gap-3 py-2.5">
          {/* Zone 1: Brand Logo & Identification */}
          <button
            onClick={() => setActiveTab('overview')}
            className="btn btn-ghost h-auto px-0 py-0 hover:bg-transparent flex items-center gap-2.5 text-left group shrink-0"
            title="Return to 3D Overview"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:text-canvas group-hover:bg-indigo-600 transition-colors shadow-inner ">
              <span className="font-sans tabular-nums font-bold text-sm">V</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-white tracking-tight">Uzbit</span>
                <span className="hidden sm:inline text-[10px] font-semibold text-brand border border-brand/30 px-1 py-px rounded">
                  Academy
                </span>
              </div>
              <span className="text-[10px] text-slate-400 hidden lg:inline leading-none">
                Interactive Math &amp; Computer Science
              </span>
            </div>
          </button>

          {/* Zone 2: Three groups, named by what the learner wants to do */}
          <nav aria-label="Main" className="flex items-center gap-1 p-1 min-w-0 bg-slate-900/90 rounded-xl border border-slate-800">
            {NAV_GROUPS.map((group) => {
              const active = group.tabs.includes(activeTab);
              return (
                <button
                  key={group.id}
                  aria-label={group.label}
                  onClick={() => setActiveTab(group.tabs[0])}
                  aria-current={active ? 'page' : undefined}
                  className={`tab ${active ? 'is-active' : ''}`}
                >
                  <group.icon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">{group.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Account (only when the backend is configured), then the theme switcher */}
          <AuthButton />
          {/* Luxury Compact Theme / Wallpaper Switcher */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setWallpaperMenuOpen(!wallpaperMenuOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-300 hover:text-white shadow-sm glow-btn"
              title="Appearance"
              aria-label={`Background: ${WALLPAPERS[wallpaper].name}`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full ring-2 ring-slate-800"
                style={{ backgroundColor: WALLPAPERS[wallpaper].color }}
              />
              <Palette className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${wallpaperMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {wallpaperMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 py-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 backdrop-blur-md animate-dropdown">
                <div className="px-3 py-1 text-[10px] font-sans tabular-nums uppercase tracking-wider text-slate-500 border-b border-slate-800/80 mb-1">
                  Background
                </div>
                {(['field', 'waves', 'orbit', 'minimal'] as WallpaperTheme[]).map((themeKey) => (
                  <button
                    key={themeKey}
                    onClick={() => {
                      setWallpaper(themeKey);
                      setWallpaperMenuOpen(false);
                    }}
                    className={`btn btn-content btn-ghost w-full text-xs text-left flex items-center justify-between ${ wallpaper === themeKey ? 'bg-indigo-600/20 text-indigo-400 font-semibold glow-item' : 'text-slate-300 hover:bg-slate-800/60 hover:text-white glow-item' }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: WALLPAPERS[themeKey].color }}
                      />
                      <span>{WALLPAPERS[themeKey].name}</span>
                    </span>
                    {wallpaper === themeKey && <span className="text-[10px] text-indigo-400 font-sans tabular-nums">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Subtle Orientation Breadcrumb Subheader */}
      <Breadcrumb
        activeTab={activeTab}
        onNavigateTab={setActiveTab}
        graphExpression={liveExpression || graphExpression}
      />
      {/* Tools inside the current group */}
      {SECTION_TABS[activeTab] && (
        <div className="container-shell w-full py-3">
          <nav aria-label="Tools in this section" className="flex w-full justify-start gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SECTION_TABS[activeTab]!.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                aria-current={activeTab === t.id ? 'page' : undefined}
                className={`tab ${activeTab === t.id ? 'is-active' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Main Architectural Stage */}
      <main key={activeTab} className="page-enter relative z-10 flex-1 container-shell w-full py-6 lg:py-8 flex flex-col gap-8">
        <ErrorBoundary onHome={() => setActiveTab('overview')}>
        {/* TAB 1: Graphing Engine (Copied TIF-Space Engine) */}
        {activeTab === 'graphing' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    Graph a function
                  </h1>
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-math/10 text-math border border-math/20 rounded-md">
                    Live graph
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  Type an equation, then see its slope, a tangent line, and the area under the curve. Drag points to explore.
                </p>
              </div>

              {/* Quick Math Shortcuts / Quick Jump Guide */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 hidden sm:inline">Current function:</span>
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-sans tabular-nums">
                  <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg">
                    <KaTeX math={expressionToTex(liveExpression || graphExpression || '')} />
                  </span>
                </div>
              </div>
            </div>

            {/* Complete Graphing Lab Viewport */}
            <div className="h-[calc(100vh-10rem)] min-h-[720px] w-full rounded-2xl border border-line bg-panel/90 shadow-2xl overflow-hidden backdrop-blur-md">
              <GraphingLab theme="dark" initialExpression={graphExpression} onPrimaryExpressionChange={setLiveExpression} />
            </div>
          </div>
        )}

        {/* TAB 2: Geometry Analytical Laboratory */}
        {activeTab === 'geometry' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Geometry calculator
                </h1>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  Work out areas, perimeters, and lengths for triangles, circles, polygons, and cones, with every step shown.
                </p>
              </div>
            </div>
            <GeometryCalculator />
          </div>
        )}

        {/* TAB 4: Computational Code Studio */}
        {activeTab === 'code' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Coding practice
                </h1>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  Practice math algorithms in Python, JavaScript, TypeScript, C++, or Rust. Run your code and see which tests pass.
                </p>
              </div>
            </div>
            <CodeLearningSpace />
          </div>
        )}

        {/* TAB 5: Thematic Math Curriculum */}
        {activeTab === 'curriculum' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Learning paths
                </h1>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  Work through six math tracks with interactive simulators, proof walkthroughs, and quizzes.
                </p>
              </div>
            </div>
            <MathCurriculum />
          </div>
        )}

        {/* TAB 6: Formulas & Invariants (Typeset with KaTeX) */}
        {activeTab === 'reference' && (
          <FormulaReference onPlotInGraphing={handlePlotInGraphing} />
        )}

        {/* TAB 7: Home: learner-first overview */}
        {/* HOME: headline, three groups, then the key facts */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-16">
            <section className="max-w-3xl mx-auto text-center flex flex-col items-center pt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand mb-4">
                Interactive math &amp; computer science
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-balance leading-[1.05]">
                Learn by changing things.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
                Change a value, watch the graph respond, then try it yourself.
              </p>
              <div className="mt-9 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button onClick={() => setActiveTab('curriculum')} className="btn btn-primary btn-lg">
                  Start learning
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <button onClick={() => setActiveTab('graphing')} className="btn btn-secondary btn-lg">
                  Explore graphs
                </button>
                <button onClick={() => setActiveTab('code')} className="btn btn-secondary btn-lg">
                  Practice coding
                </button>
              </div>
            </section>

            <section aria-labelledby="groups-heading" className="flex flex-col gap-6">
              <h2 id="groups-heading" className="text-2xl font-semibold text-white">
                Where do you want to start?
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    group: 'Learn',
                    title: 'Understand the ideas',
                    body: 'Step-by-step learning paths in algebra, calculus, and probability, with formulas explained.',
                    links: [
                      { label: 'Learning paths', tab: 'curriculum' as AppTab },
                      { label: 'Formulas', tab: 'reference' as AppTab },
                    ],
                  },
                  {
                    group: 'Explore',
                    title: 'See it change',
                    body: 'Graph functions, measure shapes, and rotate 3D objects. Every value can be changed.',
                    links: [
                      { label: 'Graph a function', tab: 'graphing' as AppTab },
                      { label: 'Geometry calculator', tab: 'geometry' as AppTab },
                      { label: '3D shapes', tab: 'threed' as AppTab },
                    ],
                  },
                  {
                    group: 'Practice',
                    title: 'Test yourself',
                    body: 'Solve problems in Python, JavaScript, TypeScript, C++, or Rust, and see which tests pass.',
                    links: [{ label: 'Coding problems', tab: 'code' as AppTab }],
                  },
                ].map((card) => (
                  <div key={card.group} className="flex flex-col justify-between gap-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition-colors hover:border-slate-700 glow-card">
                    <div className="flex flex-col gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-brand">{card.group}</span>
                      <h3 className="text-xl font-semibold text-white">{card.title}</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">{card.body}</p>
                    </div>
                    <div className="flex flex-col items-start gap-1">
                      {card.links.map((l) => (
                        <button key={l.label} onClick={() => setActiveTab(l.tab)} className="btn btn-ghost btn-sm -ml-3 group">
                          {l.label}
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8 border-y border-slate-800/80">
              {[
                ['6', 'Learning tracks'],
                ['15', 'Coding problems'],
                ['5', 'Programming languages'],
                ['3D', 'Interactive shapes'],
              ].map(([value, label]) => (
                <div key={label} className="flex flex-col gap-1">
                  <span className="text-3xl font-semibold text-white tabular-nums">{value}</span>
                  <span className="text-xs text-slate-400">{label}</span>
                </div>
              ))}
            </section>
          </div>
        )}

        {/* 3D SHAPES: its own page under Explore */}
        {activeTab === 'threed' && (
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-2">
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">3D shapes</h1>
              <p className="text-sm text-slate-400 max-w-2xl">Drag to rotate. Choose a shape, then switch between solid and wireframe views.</p>
            </section>
            <ThreeHeroScene />
          </div>
        )}
        </ErrorBoundary>
      </main>

      {/* Global Minimal Footer */}
      <Footer />
    </div>
  );
}
