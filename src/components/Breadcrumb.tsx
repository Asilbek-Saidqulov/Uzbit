import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import type { AppTab } from '../lib/routes';
import { currentSectionTab } from '../lib/navGroups';

export interface LessonCrumbs {
  trackTitle: string;
  lessonTitle: string;
}

interface BreadcrumbProps {
  activeTab: AppTab;
  onNavigateTab: (tab: AppTab) => void;
  graphExpression?: string;
  lesson?: LessonCrumbs;
  /** Tools in the current section, shown on the right of the same row. */
  sectionTabs?: { id: AppTab; label: string }[];
}

export interface CrumbSpec {
  label: string;
  /** Tab to navigate to. Omitted for the current page and for plain text. */
  tab?: AppTab;
}

export interface BreadcrumbTrail {
  items: CrumbSpec[];
}

/**
 * Plain-language breadcrumb for each page. The last item is the current page.
 * The home icon before the trail already links to the home page.
 * Pages that need no trail (home, log in, sign up) return no items.
 */
export function getBreadcrumbTrail(activeTab: AppTab, graphExpression?: string, lesson?: LessonCrumbs): BreadcrumbTrail {
  switch (activeTab) {
    case 'dashboard':
      return { items: [{ label: 'Dashboard' }] };
    case 'graphing':
      return { items: [{ label: 'Explore', tab: 'graphing' }, { label: graphExpression ? `Graph: ${graphExpression}` : 'Graph' }] };
    case 'geometry':
      return { items: [{ label: 'Explore', tab: 'geometry' }, { label: 'Geometry' }] };
    case 'threed':
      return { items: [{ label: 'Explore', tab: 'threed' }, { label: '3D shapes' }] };
    case 'code':
      return { items: [{ label: 'Practice', tab: 'code' }, { label: 'Coding' }] };
    case 'reference':
      return { items: [{ label: 'Learn', tab: 'reference' }, { label: 'Formulas' }] };
    case 'lesson':
      return {
        items: [
          { label: 'Learn', tab: 'curriculum' },
          ...(lesson ? [{ label: lesson.trackTitle }, { label: lesson.lessonTitle }] : []),
        ],
      };
    case 'curriculum':
    case 'track':
      return { items: [{ label: 'Learn', tab: 'curriculum' }, { label: 'Learning paths' }] };
    case 'overview':
    case 'login':
    case 'signup':
    default:
      return { items: [] };
  }
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ activeTab, onNavigateTab, graphExpression, lesson, sectionTabs = [] }) => {
  const { items } = getBreadcrumbTrail(activeTab, graphExpression, lesson);
  if (items.length === 0) return null;
  const currentTool = currentSectionTab(activeTab);

  return (
    <div className="sticky top-[49px] z-40 border-b border-slate-900 bg-slate-950/75 backdrop-blur-md">
      <div className="container-shell flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1.5 text-xs">
        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex items-center gap-1.5 overflow-x-auto text-[11px] text-slate-400 sm:text-xs [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <li className="flex shrink-0 items-center">
              <button onClick={() => onNavigateTab('overview')} className="btn btn-icon p-0.5" aria-label="Home">
                <Home className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
            {items.map((crumb, idx) => {
              const isCurrent = idx === items.length - 1;
              return (
                <li key={`${idx}-${crumb.label}`} className="flex shrink-0 items-center gap-1.5">
                  <ChevronRight className="h-3 w-3 shrink-0 text-slate-600" aria-hidden="true" />
                  {isCurrent || !crumb.tab ? (
                    <span
                      className={`max-w-[200px] select-text truncate sm:max-w-[320px] ${isCurrent ? 'font-medium text-slate-200' : ''}`}
                      aria-current={isCurrent ? 'page' : undefined}
                    >
                      {crumb.label}
                    </span>
                  ) : (
                    <button onClick={() => onNavigateTab(crumb.tab!)} className="btn btn-ghost max-w-[160px] truncate sm:max-w-none">
                      {crumb.label}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {sectionTabs.length > 0 && (
          <nav aria-label="Tools in this section" className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sectionTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => onNavigateTab(t.id)}
                aria-current={currentTool === t.id ? 'page' : undefined}
                className={`tab ${currentTool === t.id ? 'is-active' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
};
