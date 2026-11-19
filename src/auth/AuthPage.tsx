import React, { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Check, Eye, EyeOff, MailCheck, UserX } from 'lucide-react';
import { StatePanel } from '../components/StatePanel';
import { PAGE_PATHS, safeNext } from '../lib/routes';
import { useAuth } from './AuthProvider';

const BENEFITS = ['Keep your progress on every device', 'Pick up exactly where you left off', 'Free, with no card needed'];
const MIN_PASSWORD = 6;

const Field: React.FC<{ id: string; label: string; children: React.ReactNode }> = ({ id, label, children }) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-sm font-medium text-slate-200">
      {label}
    </label>
    {children}
  </div>
);

/** Log in or create an account, on a page of its own. After success the learner goes where they were headed. */
export const AuthPage: React.FC<{ mode: 'login' | 'signup' }> = ({ mode }) => {
  const { configured, user, loading, signIn, signUp } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const nextQuery = params.get('next') ? `?next=${encodeURIComponent(next)}` : '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);

  const isSignup = mode === 'signup';

  if (!configured) {
    return (
      <div className="mx-auto w-full max-w-md pt-6">
        <h1 className="mb-4 text-center text-2xl font-semibold text-white">{isSignup ? 'Create your account' : 'Log in'}</h1>
        <StatePanel
          icon={<UserX className="h-5 w-5" />}
          title="Accounts are not switched on yet"
          body="You can still use everything. Your progress is saved in this browser."
        />
        <div className="mt-4 flex justify-center">
          <Link to={PAGE_PATHS.dashboard} className="btn btn-primary">
            Go to your dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-md pt-6" role="status">
        <h1 className="mb-4 text-center text-2xl font-semibold text-white">{isSignup ? 'Create your account' : 'Log in'}</h1>
        <p className="text-center text-sm text-slate-400">Checking your session…</p>
      </div>
    );
  }

  if (user) return <Navigate to={next} replace />;

  if (confirmEmail) {
    return (
      <div className="mx-auto w-full max-w-md pt-6">
        <h1 className="mb-4 text-center text-2xl font-semibold text-white">Almost there</h1>
        <StatePanel
          icon={<MailCheck className="h-5 w-5" />}
          title="Check your email"
          body={`We sent a confirmation link to ${email}. Open it, then log in. Your progress so far is safe and will move to your account.`}
        />
        <div className="mt-4 flex justify-center">
          <Link to={`${PAGE_PATHS.login}${nextQuery}`} className="btn btn-primary">
            Go to log in
          </Link>
        </div>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const failure = isSignup ? await signUp(email.trim(), password, name.trim()) : await signIn(email.trim(), password);
    setBusy(false);
    if (failure) {
      setError(failure);
      return;
    }
    // Signing in sets the user, and this page then redirects. Signing up may need an email click first.
    if (isSignup) setConfirmEmail(true);
  };

  return (
    <div className="mx-auto grid w-full max-w-4xl items-start gap-10 pt-4 lg:grid-cols-2 lg:pt-10">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {isSignup ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="text-base leading-relaxed text-slate-300">
          {isSignup ? 'Save what you learn, and keep going from any device.' : 'Log in to pick up where you left off.'}
        </p>
        {isSignup && (
          <ul className="mt-2 flex flex-col gap-2.5">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-sm text-slate-300">
                <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" /> {b}
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        {isSignup && (
          <Field id="auth-name" label="Your name">
            <input id="auth-name" required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="field" />
          </Field>
        )}
        <Field id="auth-email" label="Email">
          <input id="auth-email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="field" />
        </Field>
        <Field id="auth-password" label="Password">
          <div className="relative">
            <input
              id="auth-password"
              required
              minLength={MIN_PASSWORD}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              aria-describedby={isSignup ? 'auth-password-hint' : undefined}
              className="field w-full pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:text-white"
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
          {isSignup && (
            <p id="auth-password-hint" className="text-xs text-slate-500">
              At least {MIN_PASSWORD} characters.
            </p>
          )}
        </Field>

        {error && (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn btn-primary btn-lg">
          {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}
        </button>

        <p className="text-center text-sm text-slate-400">
          {isSignup ? 'Already have an account?' : 'New to Uzbit?'}{' '}
          <Link to={`${isSignup ? PAGE_PATHS.login : PAGE_PATHS.signup}${nextQuery}`} className="font-medium text-accent hover:underline">
            {isSignup ? 'Log in' : 'Create an account'}
          </Link>
        </p>
      </form>

      <p className="text-center text-sm text-slate-500 lg:col-span-2">
        <Link to={next} className="hover:text-slate-300 hover:underline">
          Continue without an account
        </Link>
      </p>
    </div>
  );
};
