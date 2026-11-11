import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8 text-xs text-slate-400">
        <div className="flex flex-col gap-2 max-w-sm">
          <span className="text-base font-bold text-white tracking-tight">Uzbit</span>
          <p className="leading-relaxed text-slate-500">
            Interactive lessons in math and programming. Change ideas, see what happens, and build understanding.
          </p>
        </div>

        <div className="flex flex-wrap gap-8 text-xs font-medium">
          <div className="flex flex-col gap-2">
            <span className="text-white font-semibold uppercase tracking-wider text-[11px]">
              Explore math
            </span>
            <a href="#geometry" className="hover:text-white transition-colors">
              Geometry calculator
            </a>
            <a href="#algebra" className="hover:text-white transition-colors">
              Graph a function
            </a>
            <a href="#curriculum" className="hover:text-white transition-colors">
              Learning paths
            </a>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-white font-semibold uppercase tracking-wider text-[11px]">
              Coding
            </span>
            <a href="#code" className="hover:text-white transition-colors">
              Python Foundations
            </a>
            <a href="#code" className="hover:text-white transition-colors">
              Algorithms in JavaScript
            </a>
            <a href="#code" className="hover:text-white transition-colors">
              Systems Math with Rust & C++
            </a>
          </div>
        </div>

        <div className="flex flex-col items-start md:items-end gap-1.5 text-[11px] text-slate-500 font-sans tabular-nums">
          <span>&copy; {new Date().getFullYear()} Uzbit. All rights reserved.</span>
          <span>Built with React, Three.js, and JSXGraph.</span>
        </div>
      </div>
    </footer>
  );
};
