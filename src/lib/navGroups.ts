import type React from 'react';
import { BookOpen, Code2, LayoutDashboard, LineChart } from 'lucide-react';
import type { AppTab } from './routes';

export interface NavGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Pages that belong to this group. The first one is where the group's button goes. */
  tabs: AppTab[];
}

/** Top-level navigation: your own space first, then what to do. Used by the header and the phone bar. */
export const NAV_GROUPS: NavGroup[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, tabs: ['dashboard'] },
  { id: 'learn', label: 'Learn', icon: BookOpen, tabs: ['curriculum', 'track', 'lesson', 'reference'] },
  { id: 'explore', label: 'Explore', icon: LineChart, tabs: ['graphing', 'geometry', 'threed'] },
  { id: 'practice', label: 'Practice', icon: Code2, tabs: ['code'] },
];

const LEARN_TOOLS: { id: AppTab; label: string }[] = [
  { id: 'curriculum', label: 'Learning paths' },
  { id: 'reference', label: 'Formulas' },
];
const EXPLORE_TOOLS: { id: AppTab; label: string }[] = [
  { id: 'graphing', label: 'Graph' },
  { id: 'geometry', label: 'Geometry' },
  { id: 'threed', label: '3D' },
];

/** The tools inside the current group, shown beside the breadcrumb. Empty when the group has just one page. */
export function sectionTabsFor(tab: AppTab): { id: AppTab; label: string }[] {
  if (tab === 'curriculum' || tab === 'track' || tab === 'lesson' || tab === 'reference') return LEARN_TOOLS;
  if (tab === 'graphing' || tab === 'geometry' || tab === 'threed') return EXPLORE_TOOLS;
  return [];
}

/** Which section tab to show as current. A lesson sits inside Learning paths. */
export function currentSectionTab(tab: AppTab): AppTab {
  return tab === 'lesson' || tab === 'track' ? 'curriculum' : tab;
}
