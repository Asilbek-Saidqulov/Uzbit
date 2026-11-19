import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useProgressData } from '../lib/ProgressProvider';
import { PAGE_PATHS } from '../lib/routes';

/**
 * Header account area. Signed out: "Log in" and "Sign up" go to their own pages.
 * Signed in: the account initial (links to the dashboard) and "Log out".
 * Hidden when no backend is configured, because there are no accounts to use.
 */
export const AccountMenu: React.FC = () => {
  const { configured, user, loading, signOut } = useAuth();
  const { resetLocal } = useProgressData();
  const navigate = useNavigate();

  if (!configured || loading) return null;

  if (!user) {
    return (
      <div className="flex shrink-0 items-center gap-1.5">
        <Link to={PAGE_PATHS.login} className="btn btn-ghost btn-sm hidden sm:inline-flex">
          Log in
        </Link>
        <Link to={PAGE_PATHS.signup} className="btn btn-primary btn-sm">
          Sign up
        </Link>
      </div>
    );
  }

  const initial = (user.email ?? '?').charAt(0).toUpperCase();
  const logOut = async () => {
    await signOut();
    // The next person on this browser starts clean; the account keeps everything.
    resetLocal();
    navigate(PAGE_PATHS.overview);
  };

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Link
        to={PAGE_PATHS.dashboard}
        title={user.email ?? 'Your dashboard'}
        aria-label="Your dashboard"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-subtle text-xs font-semibold text-accent"
      >
        {initial}
      </Link>
      <button type="button" onClick={logOut} className="btn btn-ghost btn-sm" aria-label="Log out">
        <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Log out</span>
      </button>
    </div>
  );
};
