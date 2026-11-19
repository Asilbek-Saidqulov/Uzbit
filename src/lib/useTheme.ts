'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Theme } from '@/lib/theme';

const STORAGE_KEY = 'tifspace-theme';
const LEGACY_STORAGE_KEY = 'formulab-theme';

/** Dark by default. The choice is persisted in localStorage. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark');

  // Read the saved preference once on mount.
  useEffect(() => {
    const current = window.localStorage.getItem(STORAGE_KEY);
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    const saved = current === 'light' || current === 'dark' ? current : legacy;
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
      if (current !== saved) window.localStorage.setItem(STORAGE_KEY, saved);
    }
  }, []);

  // Apply the palette class to <html>.
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, [theme]);

  return { theme, toggleTheme };
}