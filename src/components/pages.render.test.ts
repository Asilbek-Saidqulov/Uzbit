import test from 'node:test';
import assert from 'node:assert';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthContext, AuthProvider, type AuthState } from '../auth/AuthProvider.tsx';
import { AuthPage } from '../auth/AuthPage.tsx';
import { ProgressProvider } from '../lib/ProgressProvider.tsx';
import { Dashboard } from './Dashboard.tsx';
import { Landing } from './Landing.tsx';
import { Footer } from './Footer.tsx';
import { MobileNav } from './MobileNav.tsx';
import { LearnOverview } from './lessons/LearnOverview.tsx';
import { LessonPage } from './lessons/LessonPage.tsx';
import { ActivityHeatmap } from './progress/ActivityHeatmap.tsx';
import { ALL_LESSONS, TOTAL_LESSONS } from '../data/mathLessons.ts';
import { NAV_GROUPS } from '../lib/navGroups.ts';

/** What React writes into HTML for a piece of text. */
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');

/** Server-renders a page inside the same providers the app uses, to catch crashes without a browser. */
const render = (node: React.ReactNode, path = '/') =>
  renderToString(
    React.createElement(
      MemoryRouter,
      { initialEntries: [path] },
      React.createElement(AuthProvider, null, React.createElement(ProgressProvider, null, node))
    )
  );

test('the dashboard renders for a new learner', () => {
  const html = render(React.createElement(Dashboard), '/dashboard');
  assert.match(html, /Your dashboard/);
  assert.match(html, /Start lesson/);
  assert.match(html, new RegExp(`0/${TOTAL_LESSONS}`));
  assert.match(html, /No submissions yet/);
});

test('the dashboard has a square for every lesson, each with a text label', () => {
  const html = render(React.createElement(Dashboard), '/dashboard');
  for (const l of ALL_LESSONS) assert.ok(html.includes(`${l.title}, not started`), l.id);
});

test('the activity grid renders one labelled button per past day', () => {
  const html = render(React.createElement(ActivityHeatmap, { days: {}, weeks: 4 }));
  const buttons = html.match(/<button/g)?.length ?? 0;
  assert.ok(buttons >= 22 && buttons <= 28, `got ${buttons}`);
  assert.match(html, /no activity/);
  assert.equal((html.match(/tabindex="0"/g) ?? []).length, 1, 'one tab stop for the whole grid');
});

test('the landing page renders', () => {
  const html = render(React.createElement(Landing));
  assert.match(html, /Math you can move\. Code you can break\./);
  // The live lab is on the page, with its program and the terminal command.
  const text = html.replace(/<!-- -->/g, '').replace(/<[^>]*>/g, '');
  assert.match(text, /python3 roots\.py/);
  assert.match(text, /a, b, c = 1, -2, -3/);
  assert.match(text, /3\.0 -1\.0/);
});

test('the learning paths page lists every lesson', () => {
  const html = render(React.createElement(LearnOverview), '/learn');
  for (const l of ALL_LESSONS) assert.ok(html.includes(esc(l.title)), l.id);
});

test('every lesson page renders with its question', () => {
  for (const l of ALL_LESSONS) {
    const html = render(React.createElement(LessonPage, { trackId: l.trackId, slug: l.slug }));
    assert.match(html, /<h1/, l.id);
    assert.match(html, /Check yourself/, l.id);
    for (const opt of l.check.options) assert.ok(html.includes(esc(opt)), `${l.id}: ${opt}`);
  }
});

test('log in and sign up show the accounts-not-set-up message when there is no backend', () => {
  assert.match(render(React.createElement(AuthPage, { mode: 'login' }), '/login'), /Accounts are not switched on yet/);
  assert.match(render(React.createElement(AuthPage, { mode: 'signup' }), '/signup'), /Accounts are not switched on yet/);
});

test('the footer links are real addresses, not old hash anchors', () => {
  const html = render(React.createElement(Footer, { wallpaper: 'field', onWallpaperChange: () => {} }));
  assert.ok(!/href="#/.test(html));
  assert.match(html, /href="\/explore\/graph"/);
  assert.match(html, /Background/);
});

test('the phone bar names every section and marks the current one', () => {
  const html = render(React.createElement(MobileNav, { groups: NAV_GROUPS, activeTab: 'lesson', onSelect: () => {} }));
  for (const g of NAV_GROUPS) assert.ok(html.includes(g.label));
  assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
});

/** Renders the landing route with a made-up auth state, the way the app would at '/'. */
const renderLandingAs = (auth: Partial<AuthState>) => {
  const value: AuthState = {
    configured: true,
    user: null,
    loading: false,
    signIn: async () => null,
    signUp: async () => null,
    signOut: async () => {},
    ...auth,
  };
  return renderToString(
    React.createElement(
      MemoryRouter,
      { initialEntries: ['/'] },
      React.createElement(
        AuthContext.Provider,
        { value },
        React.createElement(
          ProgressProvider,
          null,
          React.createElement(Routes, null, React.createElement(Route, { path: '/', element: React.createElement(Landing) }))
        )
      )
    )
  );
};

test('a new visitor sees the landing page with sign-up and log-in', () => {
  const html = renderLandingAs({});
  assert.match(html, /Math you can move/);
  assert.match(html, /href="\/signup"[^>]*>Create a free account/);
  assert.match(html, /href="\/login"[^>]*>Log in/);
});

test('a signed-in learner never sees the landing page: it hands over to the dashboard', () => {
  const html = renderLandingAs({ user: { id: 'u1', email: 'a@b.c' } as AuthState['user'] });
  assert.ok(!html.includes('Math you can move'), 'the marketing page must not render for a signed-in user');
  assert.ok(!html.includes('Create a free account'));
});

test('while the session is still being checked, the landing page does not flash', () => {
  const html = renderLandingAs({ loading: true });
  assert.ok(!html.includes('Math you can move'));
  assert.match(html, /Opening Uzbit/);
});
