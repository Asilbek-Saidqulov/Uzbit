import type { LiveMode } from '../components/LiveBackground';

export type WallpaperTheme = 'field' | 'waves' | 'orbit' | 'minimal';

export const WALLPAPERS: Record<WallpaperTheme, { name: string; tag: string; color: string; live?: LiveMode }> = {
  field: { name: 'Live network', tag: 'Network', color: '#2DD4BF', live: 'field' },
  waves: { name: 'Live waves', tag: 'Waves', color: '#5EEAD4', live: 'waves' },
  orbit: { name: 'Live sphere', tag: 'Sphere', color: '#99F6E4', live: 'orbit' },
  minimal: { name: 'Obsidian', tag: 'Still', color: '#161A23' },
};

export const WALLPAPER_ORDER: WallpaperTheme[] = ['field', 'waves', 'orbit', 'minimal'];

const KEY = 'uzbit:wallpaper:v1';

export function loadWallpaper(fallback: WallpaperTheme = 'field'): WallpaperTheme {
  try {
    const v = window.localStorage.getItem(KEY);
    return v && v in WALLPAPERS ? (v as WallpaperTheme) : fallback;
  } catch {
    return fallback;
  }
}

export function saveWallpaper(theme: WallpaperTheme): void {
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
}
