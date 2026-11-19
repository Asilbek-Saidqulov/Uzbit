import { getLesson, getTrack } from '../data/mathLessons.ts';

/** Every page in the app. "track" and "lesson" carry parameters from the address. */
export type AppTab =
  | 'overview'
  | 'dashboard'
  | 'login'
  | 'signup'
  | 'curriculum'
  | 'track'
  | 'lesson'
  | 'reference'
  | 'graphing'
  | 'geometry'
  | 'threed'
  | 'code';

export interface ResolvedRoute {
  tab: AppTab;
  trackId?: string;
  lessonSlug?: string;
}

/** Fixed addresses. Lessons and tracks are built with lessonPath and trackPath. */
export const PAGE_PATHS: Record<Exclude<AppTab, 'track' | 'lesson'>, string> = {
  overview: '/',
  dashboard: '/dashboard',
  login: '/login',
  signup: '/signup',
  curriculum: '/learn',
  reference: '/learn/formulas',
  graphing: '/explore/graph',
  geometry: '/explore/geometry',
  threed: '/explore/3d',
  code: '/practice',
};

export const lessonPath = (trackId: string, slug: string) => `/learn/${trackId}/${slug}`;
export const trackPath = (trackId: string) => `/learn/${trackId}`;

/** Address for the graph page with expressions already filled in. */
export function graphPath(expressions: string[]): string {
  if (expressions.length === 0) return PAGE_PATHS.graphing;
  const query = expressions.map((e) => `expr=${encodeURIComponent(e)}`).join('&');
  return `${PAGE_PATHS.graphing}?${query}`;
}

const FIXED = new Map<string, AppTab>(
  (Object.entries(PAGE_PATHS) as [Exclude<AppTab, 'track' | 'lesson'>, string][]).map(([tab, path]) => [path, tab])
);

/** Which page an address belongs to, or null when there is no such page. */
export function resolveRoute(pathname: string): ResolvedRoute | null {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const fixed = FIXED.get(clean);
  if (fixed) return { tab: fixed };

  const parts = clean.split('/').filter(Boolean);
  if (parts[0] === 'learn' && parts.length === 2 && getTrack(parts[1])) {
    return { tab: 'track', trackId: parts[1] };
  }
  if (parts[0] === 'learn' && parts.length === 3 && getLesson(parts[1], parts[2])) {
    return { tab: 'lesson', trackId: parts[1], lessonSlug: parts[2] };
  }
  return null;
}

/**
 * Only same-site paths are allowed as a "go here after signing in" target,
 * so a crafted link can never send someone to another website.
 */
export function safeNext(raw: string | null | undefined, fallback = PAGE_PATHS.dashboard): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return fallback;
  if (raw === PAGE_PATHS.login || raw === PAGE_PATHS.signup) return fallback;
  return raw;
}

/** Passed in navigation state so a page can offer a link back to where the learner came from. */
export interface NavFrom {
  path: string;
  label: string;
}

export const fromState = (path: string, label: string): { from: NavFrom } => ({ from: { path, label } });
