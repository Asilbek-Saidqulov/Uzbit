'use client';

import { useEffect, type ReactNode } from 'react';

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export default function BottomSheet({ title, onClose, children }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="btn btn-ghost absolute inset-0"
      />
      <div className="sheet-enter absolute inset-x-0 bottom-0 mx-auto flex max-h-[86dvh] w-full max-w-3xl flex-col rounded-t-2xl border-t border-line bg-panel pb-[env(safe-area-inset-bottom)] shadow-2xl sm:bottom-4 sm:rounded-2xl sm:border">
        <div className="flex justify-center pt-2">
          <div className="h-1.5 w-10 rounded-full bg-line" />
        </div>
        <div className="flex items-center justify-between px-5 pb-1 pt-2">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost text-sm"
          >
            Done
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}