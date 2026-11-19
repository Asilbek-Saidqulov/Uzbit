import React from 'react';
import type { NavGroup } from '../lib/navGroups';
import type { AppTab } from '../lib/routes';

interface MobileNavProps {
  groups: NavGroup[];
  activeTab: AppTab;
  onSelect: (tab: AppTab) => void;
}

/** Bottom tab bar for phones, where the header has no room for labelled navigation. */
export const MobileNav: React.FC<MobileNavProps> = ({ groups, activeTab, onSelect }) => (
  <nav
    aria-label="Main"
    className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-800 bg-slate-950/95 backdrop-blur-md sm:hidden"
    style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
  >
    <ul className="mx-auto grid max-w-md grid-cols-4">
      {groups.map((group) => {
        const active = group.tabs.includes(activeTab);
        return (
          <li key={group.id}>
            <button
              type="button"
              onClick={() => onSelect(group.tabs[0])}
              aria-current={active ? 'page' : undefined}
              className={`flex h-14 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                active ? 'text-accent' : 'text-slate-400 hover:text-white'
              }`}
            >
              <group.icon className="h-5 w-5" aria-hidden="true" />
              {group.label}
            </button>
          </li>
        );
      })}
    </ul>
  </nav>
);
