import React from 'react';
import { Link } from 'react-router-dom';
import { PAGE_PATHS } from '../lib/routes';
import { WALLPAPERS, WALLPAPER_ORDER, type WallpaperTheme } from '../lib/wallpapers';

interface FooterProps {
  wallpaper: WallpaperTheme;
  onWallpaperChange: (theme: WallpaperTheme) => void;
}

const LINK = 'transition-colors hover:text-white';
const HEADING = 'text-[11px] font-semibold uppercase tracking-wider text-white';

export const Footer: React.FC<FooterProps> = ({ wallpaper, onWallpaperChange }) => (
  <footer className="border-t border-slate-800 bg-slate-950 px-6 py-12 pb-24 sm:pb-12">
    <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 text-xs text-slate-400 md:flex-row">
      <div className="flex max-w-sm flex-col gap-2">
        <span className="text-base font-bold tracking-tight text-white">Uzbit</span>
        <p className="leading-relaxed text-slate-500">
          Interactive lessons in math and programming. Change ideas, see what happens, and build understanding.
        </p>
      </div>

      <div className="flex flex-wrap gap-8 text-xs font-medium">
        <div className="flex flex-col gap-2">
          <span className={HEADING}>Learn</span>
          <Link to={PAGE_PATHS.curriculum} className={LINK}>Learning paths</Link>
          <Link to={PAGE_PATHS.reference} className={LINK}>Formulas</Link>
          <Link to={PAGE_PATHS.dashboard} className={LINK}>Your dashboard</Link>
        </div>
        <div className="flex flex-col gap-2">
          <span className={HEADING}>Explore</span>
          <Link to={PAGE_PATHS.graphing} className={LINK}>Graph a function</Link>
          <Link to={PAGE_PATHS.geometry} className={LINK}>Geometry calculator</Link>
          <Link to={PAGE_PATHS.threed} className={LINK}>3D shapes</Link>
        </div>
        <div className="flex flex-col gap-2">
          <span className={HEADING}>Practice</span>
          <Link to={PAGE_PATHS.code} className={LINK}>Coding problems</Link>
        </div>
        <div className="flex flex-col gap-2">
          <span className={HEADING} id="appearance-label">Background</span>
          <div role="group" aria-labelledby="appearance-label" className="flex max-w-[15rem] flex-wrap gap-1.5">
            {WALLPAPER_ORDER.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onWallpaperChange(key)}
                aria-pressed={wallpaper === key}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                  wallpaper === key ? 'border-accent/60 bg-accent-subtle text-accent' : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: WALLPAPERS[key].color }} aria-hidden="true" />
                {WALLPAPERS[key].tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-start gap-1.5 text-[11px] tabular-nums text-slate-500 md:items-end">
        <span>&copy; {new Date().getFullYear()} Uzbit. All rights reserved.</span>
        <span>Built with React, Three.js, and JSXGraph.</span>
      </div>
    </div>
  </footer>
);
