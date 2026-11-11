import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import type { AppTab } from '../App.tsx';

interface BreadcrumbProps {
  activeTab: AppTab;
  onNavigateTab: (tab: AppTab) => void;
  graphExpression?: string;
}

export interface CrumbSpec {
  label: string;
  /** Tab to navigate to. Omitted for the current page. */
  tab?: AppTab;
}

export interface BreadcrumbTrail {
  items: CrumbSpec[];
  statusText: string;
  /** Tailwind background class from the semantic color tokens in index.css */
  statusColor: string;
}

/**
 * Plain-language breadcrumb for each tab. The last item is the current page.
 * The home icon above the trail already links to the home page.
 */
export function getBreadcrumbTrail(activeTab: AppTab, graphExpression?: string): BreadcrumbTrail {
  switch (activeTab) {
    case 'graphing':
      return {
        items: [
          { label: 'Explore', tab: 'graphing' },
          { label: graphExpression ? `Graph: ${graphExpression}` : 'Graph' },
        ],
        statusText: 'Live graph',
        statusColor: 'bg-math',
      };
    case 'geometry':
      return {
        items: [{ label: 'Explore', tab: 'geometry' }, { label: 'Geometry' }],
        statusText: 'Live figures',
        statusColor: 'bg-geometry',
      };
    case 'code':
      return {
        items: [{ label: 'Practice', tab: 'code' }, { label: 'Coding' }],
        statusText: 'Run and test',
        statusColor: 'bg-coding',
      };
    case 'curriculum':
      return {
        items: [{ label: 'Learn', tab: 'curriculum' }, { label: 'Learning paths' }],
        statusText: '6 tracks',
        statusColor: 'bg-brand',
      };
    case 'reference':
      return {
        items: [{ label: 'Learn', tab: 'reference' }, { label: 'Formulas' }],
        statusText: 'Formula library',
        statusColor: 'bg-brand',
      };
    case 'threed':
      return {
        items: [{ label: 'Explore', tab: 'threed' }, { label: '3D shapes' }],
        statusText: 'Drag to rotate',
        statusColor: 'bg-brand',
      };
    case 'overview':
    default:
      return {
        items: [{ label: 'Home' }],
        statusText: 'Start here',
        statusColor: 'bg-brand',
      };
  }
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ activeTab, onNavigateTab, graphExpression }) => {
  const { items, statusText, statusColor } = getBreadcrumbTrail(activeTab, graphExpression);

  return (
    <nav
      aria-label="Breadcrumb"
      className="sticky top-[49px] z-40 bg-slate-950/75 border-b border-slate-900 backdrop-blur-md transition-colors"
    >
      <div className="container-shell flex items-center justify-between gap-3 py-1.5 text-xs">
        <ol className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-400 min-w-0 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <li className="flex items-center shrink-0">
            <button
              onClick={() => onNavigateTab('overview')}
              className="btn btn-icon p-0.5"
              aria-label="Home"
            >
              <Home className="w-3 h-3" aria-hidden="true" />
            </button>
          </li>

          {items.map((crumb, idx) => {
            const isCurrent = idx === items.length - 1;
            return (
              <li key={`${idx}-${crumb.label}`} className="flex items-center gap-1.5 shrink-0">
                <ChevronRight className="w-3 h-3 text-slate-600 shrink-0 select-none" aria-hidden="true" />
                {isCurrent || !crumb.tab ? (
                  <span
                    className="font-medium text-slate-200 select-text truncate max-w-[200px] sm:max-w-[320px]"
                    aria-current="page"
                  >
                    {crumb.label}
                  </span>
                ) : (
                  <button
                    onClick={() => onNavigateTab(crumb.tab!)}
                    className="btn btn-ghost truncate max-w-[160px] sm:max-w-none"
                  >
                    {crumb.label}
                  </button>
                )}
              </li>
            );
          })}
        </ol>

        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0 select-none">
          <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} aria-hidden="true" />
          <span>{statusText}</span>
        </div>
      </div>
    </nav>
  );
};
