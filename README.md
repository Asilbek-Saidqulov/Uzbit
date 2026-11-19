# Uzbit

Interactive math and coding platform: a math curriculum with interactive graphs, and a practice code studio with a Python judge.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## Accounts and database (Supabase)

1. Create a project at supabase.com.
2. In the SQL editor, run `supabase/migrations/0001_accounts_and_progress.sql`, then `supabase/migrations/0002_lesson_progress.sql` (lesson progress and the activity grid).
3. Copy the project URL and the anon (public) key into `.env.local`:
   `VITE_SUPABASE_URL=...` and `VITE_SUPABASE_ANON_KEY=...`
4. Rebuild. The header shows "Log in" and "Sign up", which open their own pages (`/login`, `/signup`). Submissions and lesson progress are saved to the account.

Without these variables the app runs as before, in the browser only. The anon key is public by design: row level security in the database controls what each user can read and write.

## Deploying

Uzbit is a static site. Build it with `npm run build`, then host the `dist` folder on any static host.
`public/_redirects` (Netlify) and `vercel.json` (Vercel) send every address to `index.html`, so links such as `/learn/formulas` work when opened directly.

Without an account, progress and drafts are stored in each browser. With one, progress is kept in the account too. When someone signs in, what this browser already holds is merged into the account. On log out this browser's progress is cleared, so the next person starts clean (the account keeps everything).

## Pages

| Address | What it is |
| --- | --- |
| `/` | Landing page |
| `/dashboard` | Personal dashboard: what to do next, activity grid, progress squares, recent submissions |
| `/login`, `/signup` | Account pages. `?next=/some/path` sends the learner there afterwards (same-site paths only) |
| `/learn` | Learning paths: six tracks, a square per lesson |
| `/learn/<track>/<lesson>` | A lesson: hook, something to play with, one check question |
| `/learn/<track>` | Opens the track at its first unfinished lesson |
| `/learn/formulas` | Formula reference |
| `/explore/graph`, `/explore/geometry`, `/explore/3d` | Tools. The graph is empty when opened directly; `?expr=` (repeatable) fills it |
| `/practice`, `/practice?problem=<id>` | Coding problems, optionally opening one directly |

Lesson content lives in `src/data/mathLessons.ts`. Progress logic is in `src/lib/progress.ts`; the shared store is `src/lib/ProgressProvider.tsx`.

## Testing

- `npm test` runs the unit tests (maths, formulas, the coding judge, geometry, breadcrumbs, routes, progress, lesson content) and a server-render smoke test of every new page. No browser needed.
- `npm run test:e2e` runs browser tests against the production build: every page, deep links, navigation, the graph, and the phone layout, plus accessibility checks (axe).
  - Run `npm run build` first.
  - If Playwright cannot find a browser, set `PW_CHROMIUM_PATH` to a Chromium binary.
- `npm run test:all` runs both.

