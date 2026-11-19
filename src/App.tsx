import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { KaTeX } from './components/KaTeX.tsx';
import { expressionToTex } from './lib/tex.ts';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { AccountMenu } from './auth/AccountMenu.tsx';
import { AuthPage } from './auth/AuthPage.tsx';
import GraphingLab from '@/modules/graphing/GraphingLab.tsx';
import { GeometryCalculator } from './components/GeometryCalculator.tsx';
import { CodeLearningSpace } from './components/CodeLearningSpace.tsx';
import { ThreeHeroScene } from './components/ThreeHeroScene.tsx';
import { FormulaReference } from './components/FormulaReference.tsx';
import { Breadcrumb } from './components/Breadcrumb.tsx';
import { Footer } from './components/Footer.tsx';
import { MobileNav } from './components/MobileNav.tsx';
import { Landing } from './components/Landing.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { LearnOverview } from './components/lessons/LearnOverview.tsx';
import { LessonPage } from './components/lessons/LessonPage.tsx';
import { LiveBackground } from './components/LiveBackground.tsx';
import { getLesson, getTrack, nextIncompleteLesson } from './data/mathLessons.ts';
import { NAV_GROUPS, sectionTabsFor } from './lib/navGroups.ts';
import { useProgressData } from './lib/ProgressProvider.tsx';
import {
  fromState,
  graphPath,
  lessonPath,
  PAGE_PATHS,
  resolveRoute,
  type AppTab,
  type NavFrom,
} from './lib/routes.ts';
import { loadWallpaper, saveWallpaper, WALLPAPERS, type WallpaperTheme } from './lib/wallpapers.ts';

export type { AppTab } from './lib/routes.ts';
export type { WallpaperTheme } from './lib/wallpapers.ts';

/** Opens a track at the first lesson the learner has not finished. */
const TrackRedirect: React.FC<{ trackId: string }> = ({ trackId }) => {
  const { doneLessons } = useProgressData();
  const track = getTrack(trackId);
  const target = track && (nextIncompleteLesson((id) => doneLessons.has(id), track) ?? track.lessons[0]);
  return <Navigate to={target ? lessonPath(target.trackId, target.slug) : PAGE_PATHS.curriculum} replace />;
};

/** Pages that are not tied to one address of their own (lessons and tracks) go to their parent. */
const pathForTab = (tab: AppTab): string => (tab === 'lesson' || tab === 'track' ? PAGE_PATHS.curriculum : PAGE_PATHS[tab]);

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const route = resolveRoute(location.pathname);
  const activeTab = route?.tab ?? null;
  const setActiveTab = useCallback((tab: AppTab) => navigate(pathForTab(tab)), [navigate]);

  // Scroll to the top whenever the page changes.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // The live network is the default. Obsidian is the still option. The choice is remembered.
  const [wallpaper, setWallpaper] = useState<WallpaperTheme>(() => loadWallpaper('field'));
  const changeWallpaper = (theme: WallpaperTheme) => {
    setWallpaper(theme);
    saveWallpaper(theme);
  };

  // Plotted expressions travel in the address: /explore/graph?expr=...&expr=...
  const graphExpressions = searchParams.getAll('expr');
  // Where the learner came from, so the graph can offer a way back.
  const backLink = (location.state as { from?: NavFrom } | null)?.from;
  // What the graph currently shows; display only, so it never re-adds rows in the graph.
  const [liveExpression, setLiveExpression] = useState<string>('');

  const handlePlotInGraphing = (expression: string) => {
    navigate(graphPath([expression]), { state: fromState(PAGE_PATHS.reference, 'Formulas') });
  };

  if (activeTab === null) {
    return <Navigate to="/" replace />;
  }

  const lesson = route?.tab === 'lesson' && route.trackId && route.lessonSlug ? getLesson(route.trackId, route.lessonSlug) : undefined;
  const lessonCrumbs = lesson ? { trackTitle: getTrack(lesson.trackId)?.title ?? '', lessonTitle: lesson.title } : undefined;
  // Moving between lessons is a page change, so it gets a fresh page.
  const pageKey = activeTab === 'lesson' ? location.pathname : activeTab;

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-slate-950 font-sans text-slate-100 selection:bg-indigo-600 selection:text-canvas">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-ink"
      >
        Skip to content
      </a>

      {/* Background wallpapers */}
      {WALLPAPERS[wallpaper].live && <LiveBackground mode={WALLPAPERS[wallpaper].live!} />}
      {/* Soft gradient radial scrim for legibility */}
      <div
        className={`pointer-events-none fixed inset-0 z-0 bg-radial ${
          WALLPAPERS[wallpaper].live ? 'from-slate-950/10 via-slate-950/40 to-slate-950/85' : 'from-slate-950/30 via-slate-950/75 to-slate-950'
        }`}
      />

      {/* Global header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="container-shell flex items-center justify-between gap-3 py-2.5">
          {/* Brand */}
          <Link to={PAGE_PATHS.overview} className="group flex shrink-0 items-center gap-2.5 text-left" title="Uzbit home">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-500/30 bg-indigo-600/20 text-indigo-400 shadow-inner transition-colors group-hover:bg-indigo-600 group-hover:text-canvas">
              <span className="font-sans text-sm font-bold tabular-nums">U</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-white">Uzbit</span>
                <span className="hidden rounded border border-brand/30 px-1 py-px text-[10px] font-semibold text-brand sm:inline">Academy</span>
              </div>
              <span className="hidden text-[10px] leading-none text-slate-400 xl:inline">Interactive Math &amp; Computer Science</span>
            </div>
          </Link>

          {/* Main navigation (phones use the bottom bar instead) */}
          <nav aria-label="Main" className="hidden min-w-0 items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/90 p-1 sm:flex">
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
                  <group.icon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden md:inline">{group.label}</span>
                </button>
              );
            })}
          </nav>

          <AccountMenu />
        </div>
      </header>

      {/* Where you are, and the tools in this section */}
      <Breadcrumb
        activeTab={activeTab}
        onNavigateTab={setActiveTab}
        graphExpression={liveExpression || graphExpressions[0]}
        lesson={lessonCrumbs}
        sectionTabs={sectionTabsFor(activeTab)}
      />

      <main id="main" key={pageKey} className="page-enter container-shell relative z-10 flex w-full flex-1 flex-col gap-8 py-6 lg:py-8">
        <ErrorBoundary onHome={() => setActiveTab('overview')}>
          {activeTab === 'overview' && <Landing />}

          {activeTab === 'dashboard' && <Dashboard />}

          {activeTab === 'login' && <AuthPage mode="login" />}
          {activeTab === 'signup' && <AuthPage mode="signup" />}

          {activeTab === 'curriculum' && (
            <div className="flex flex-col gap-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Learning paths</h1>
                <p className="mt-1 max-w-2xl text-xs text-slate-400">
                  Short lessons, each with something to play with and a question to check. Work through them in order, or jump to any topic.
                </p>
              </div>
              <LearnOverview />
            </div>
          )}

          {activeTab === 'track' && route?.trackId && <TrackRedirect trackId={route.trackId} />}

          {activeTab === 'lesson' && route?.trackId && route.lessonSlug && <LessonPage trackId={route.trackId} slug={route.lessonSlug} />}

          {activeTab === 'reference' && <FormulaReference onPlotInGraphing={handlePlotInGraphing} />}

        {activeTab === 'graphing' && (
          <div className="flex flex-col gap-4">
            {backLink && (
              <Link to={backLink.path} className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-accent hover:underline">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Back to {backLink.label}
              </Link>
            )}
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
                    <KaTeX math={expressionToTex(liveExpression || graphExpressions[0] || '')} />
                  </span>
                </div>
              </div>
            </div>

            {/* Complete Graphing Lab Viewport */}
            <div className="h-[calc(100vh-10rem)] min-h-[720px] w-full rounded-2xl border border-line bg-panel/90 shadow-2xl overflow-hidden backdrop-blur-md">
              <GraphingLab theme="dark" initialExpressions={graphExpressions} onPrimaryExpressionChange={setLiveExpression} />
            </div>
          </div>
        )}

        {activeTab === 'geometry' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Geometry calculator
                </h1>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                  Work out areas, volumes, and lengths for flat shapes and 3D solids, such as the cube, tetrahedron, octahedron, icosahedron, pyramid, cylinder and sphere. Drag the solid to rotate it and change any length, with every step shown.
                </p>
              </div>
            </div>
            <GeometryCalculator />
          </div>
        )}

        {activeTab === 'threed' && (
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-2">
              <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">3D shapes</h1>
              <p className="text-sm text-slate-400 max-w-2xl">Drag to rotate. Choose a shape, then switch between solid and wireframe views.</p>
            </section>
            <ThreeHeroScene />
          </div>
        )}
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

        </ErrorBoundary>
      </main>

      <Footer wallpaper={wallpaper} onWallpaperChange={changeWallpaper} />
      <MobileNav groups={NAV_GROUPS} activeTab={activeTab} onSelect={setActiveTab} />
    </div>
  );
}
