import React, { useState } from 'react';
import { LogIn, LogOut } from 'lucide-react';
import { useAuth } from './AuthProvider';

/** Header control: "Sign in" when signed out, the account initial and "Sign out" when signed in. Hidden when no backend is configured. */
export const AuthButton: React.FC = () => {
  const { configured, user, loading, signIn, signUp, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!configured || loading) return null;

  if (user) {
    const initial = (user.email ?? '?').charAt(0).toUpperCase();
    return (
      <div className="flex items-center gap-2">
        <span
          title={user.email ?? 'Signed in'}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-subtle text-xs font-semibold text-accent"
        >
          {initial}
        </span>
        <button onClick={() => signOut()} className="btn btn-ghost btn-sm">
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Sign out
        </button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = mode === 'in' ? await signIn(email, password) : await signUp(email, password, name);
    setBusy(false);
    if (result) {
      setError(result);
      return;
    }
    if (mode === 'up') {
      setNotice('Account created. Check your email to confirm it, then sign in.');
      setMode('in');
      return;
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="btn btn-secondary btn-sm" aria-expanded={open}>
        <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
        Sign in
      </button>
      {open && (
        <form
          onSubmit={submit}
          className="absolute right-0 top-10 z-50 flex w-72 flex-col gap-3 rounded-2xl border border-line bg-panel p-4 shadow-2xl"
        >
          <div className="flex gap-1">
            {(['in', 'up'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`btn btn-ghost btn-sm flex-1 ${mode === m ? 'is-active' : ''}`}
              >
                {m === 'in' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>
          {mode === 'up' && (
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              aria-label="Your name"
              className="field"
            />
          )}
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            aria-label="Email"
            autoComplete="email"
            className="field"
          />
          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (at least 6 characters)"
            aria-label="Password"
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            className="field"
          />
          {error && <p role="alert" className="text-xs text-danger">{error}</p>}
          {notice && <p role="status" className="text-xs text-accent">{notice}</p>}
          <button type="submit" disabled={busy} className="btn btn-primary">
            {busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      )}
    </div>
  );
};
