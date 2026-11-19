export type Theme = 'dark' | 'light';

export const GRAPH_COLORS: Record<
  Theme,
  { bg: string; grid: string; axis: string; label: string; ink: string }
> = {
  dark: {
    bg: '#0f1117',
    grid: '#1c2130',
    axis: '#4a5165',
    label: '#8b93a7',
    ink: '#e6e9f2',
  },
  light: {
    bg: '#f7f8fb',
    grid: '#e2e6ef',
    axis: '#9aa2b5',
    label: '#5b6378',
    ink: '#1b2030',
  },
};

/** Curve colors, given to expressions in order. Chosen to read well on both backgrounds. */
/** Curve colours: teal family, ink and one lime highlight, from palette A. */
export const PALETTE = ['#2DD4BF', '#E7EAF1', '#D4FF3A', '#5EEAD4', '#B4BBCB', '#14B8A6'];

/** [xmin, ymax, xmax, ymin], JSXGraph's bounding-box order. */
export const DEFAULT_BBOX: [number, number, number, number] = [-10, 7, 10, -7];