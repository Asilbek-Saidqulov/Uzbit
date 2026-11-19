# UX changes

## Structure
- `/` is the landing page. `/dashboard` is new. `/login` and `/signup` are separate pages (the header dropdown is gone).
- The header shows **Log in** and **Sign up** when signed out, and the account initial plus **Log out** when signed in. Nothing shows when no backend is configured.
- Navigation is Dashboard / Learn / Explore / Practice. On phones it is a bottom tab bar with labels.
- The breadcrumb and the section tabs (Learning paths | Formulas, Graph | Geometry | 3D) now share one row.

## Dashboard
- Next lesson and next problem ("Pick up where you left off" when a problem was tried but not solved).
- Streak, lessons done, problems solved, active days.
- Activity grid: one square per day for 26 weeks, shaded by lessons completed plus code submissions. The grid is a single tab stop; arrow keys move between days; selecting a day describes it.
- Progress squares: one per lesson (grouped by track) and one per coding problem (grouped by difficulty). Empty = not started, half = tried, full = done or solved. Every square has a text label.
- Recent submissions.
- A sign-up prompt appears only when accounts are available and the learner is signed out.

## Learn
- The learning page is now 21 lessons in 6 tracks, in a suggested order. Each lesson: plain-language hook, something to play with, one check question, "Go deeper" with the original technical text, then Next.
- "Try it" opens the grapher with the lesson's equations filled in (two lines for the linear-systems lesson). The graph shows "Back to <lesson>".
- The graph is **empty when opened directly**, with no example chips.
- The unit circle demo now draws the circle. Bayes shows the "1,000 people" breakdown. De Morgan has a truth table.

## Practice
- "Recommended next" at the top of the problem list; a square on every problem card.
- `/practice?problem=<id>` opens a problem directly.
- The hint is hidden until the learner asks for it.

## Fixes
- Footer links were old `#anchor` links that went nowhere; they are real links now.
- Page text can be selected and copied (`select-none` removed from the app shell).
- The logo is "U" (it was "V"), and its tooltip no longer says "3D Overview".
- The background picker moved from the header to the footer and is remembered.
- Skip-to-content link; page description rewritten in plain language.
- Progress is merged into the account on sign-in, including work done before signing up. It is cleared from the browser on log out.

## Database
Run `supabase/migrations/0002_lesson_progress.sql` once. Without it, lesson progress still works in the browser; it just does not sync.

## Not done
- Password reset ("forgot password").
- A multi-step hint ladder (hints are one step, behind a button).
- Grouping coding problems into ladders such as Warm-up, Loops, Recursion.
- A loading message for the Python runtime on first run.

## Geometry Lab: 3D solids

- New solids: cube, cuboid, tetrahedron, octahedron, icosahedron, dodecahedron, rectangular pyramid, triangular prism, cylinder, cone and sphere (the existing truncated cone is now labelled "Frustum").
- Every solid is drawn as a shaded, see-through 3D body with bold edges and vertex dots. Drag to rotate, scroll to zoom.
- Lengths, widths and heights are editable three ways: tap the highlighted edge, type in the side panel, or use the new slider under each length.
- Derived lengths (space diagonal, circumradius, slant height, tetrahedron height) are editable too and rescale or recompute the solid.
- Volume, surface area, extra measurements and step-by-step working for each solid.
- Files: `src/geometry3d/solidGeometry.ts` (pure vertex/face data), `models.ts`, `scene.ts`, `src/components/GeometryCalculator.tsx`.
- Tests: `tests/unit/solids.test.ts` checks every formula against the drawn mesh; `tests/unit/scene.test.ts` checks every dimension has a label and tap target.

## Landing page, auth flow and the coding terminal

- Landing (`/`) is for new students. A signed-in user is sent straight to the dashboard; while the session loads, a short status shows instead of a flash of the marketing page. Without a backend, the calls to action become "Start learning" and "Try the coding practice".
- The landing page leads with a live lab (`landing/LandingLab.tsx`): drag a, b, c and the graph and a Python program change together. Setting a to 0 shows the real ZeroDivisionError traceback. `rootsLab.ts` is tested against real Python for every slider setting.
- Also on the page: a real lesson path, a turning 3D solid (lazy-loaded), real practice problems, a three-step start, and a closing call to action.
- Practice terminal (`judge/components/Terminal.tsx`): stdout and stderr in order, commands and exit codes, scrollback for the visit, Copy and Clear. Every `main.py:3:5` style place is a link that moves the editor cursor there.
- Errors now carry file, line and column for Python, JavaScript, TypeScript, C++ and Rust (`engine/diagnostics.ts`). Python tracebacks are Python's own, run through `engine/boot.py`. JavaScript output follows Node's layout with a caret. TypeScript uses tsc's layout and maps runtime errors back through a source map. Compiler output from C++ and Rust is shown as the compiler printed it.
- The editor marks the failing line, underlines the exact spot and shows a dot in the gutter. Marks clear when the code is edited.
- Output now survives a timeout (what the program printed before it was stopped is kept). Function problems report their own harness as `judge.py` or `judge.js`, never as the learner's lines.
- Hidden tests show only the error type and place, never the message, because messages can quote test data.
