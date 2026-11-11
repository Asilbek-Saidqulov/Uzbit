<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/4c970f91-79aa-4b04-bf82-7c0c36782ca3

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## Accounts and database (Supabase)

1. Create a project at supabase.com.
2. In the SQL editor, run `supabase/migrations/0001_accounts_and_progress.sql`.
3. Copy the project URL and the anon (public) key into `.env.local`:
   `VITE_SUPABASE_URL=...` and `VITE_SUPABASE_ANON_KEY=...`
4. Rebuild. The header shows "Sign in", and submissions are saved to the account.

Without these variables the app runs as before, in the browser only. The anon key is public by design: row level security in the database controls what each user can read and write.

## Deploying

Uzbit is a static site. Build it with `npm run build`, then host the `dist` folder on any static host.
`public/_redirects` (Netlify) and `vercel.json` (Vercel) send every address to `index.html`, so links such as `/learn/formulas` work when opened directly.

Progress and drafts are stored in each browser for now. Accounts and a database are planned for later.

## Testing

- `npm test` runs the unit tests (maths, formulas, the coding judge, geometry, breadcrumbs). No browser needed.
- `npm run test:e2e` runs browser tests against the production build: every page, deep links, navigation, the graph, and the phone layout, plus accessibility checks (axe).
  - Run `npm run build` first.
  - If Playwright cannot find a browser, set `PW_CHROMIUM_PATH` to a Chromium binary.
- `npm run test:all` runs both.

