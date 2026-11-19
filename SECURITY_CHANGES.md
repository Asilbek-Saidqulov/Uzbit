# Security and build fixes

## Server (server.ts)
- **Calculus endpoint no longer uses `new Function`.** The expression is now parsed by the existing
  AST-based `compileExpr` (src/lib/expr.ts), which never generates JavaScript source. Verified: the
  original server executed attacker-supplied JS (confirmed by a probe that wrote to stdout once per
  sample); the new one rejects that input with a 400.
- **Removed `/api/code/execute`.** The frontend never called it; student code already runs in the
  browser via `executeSnippet`. Running untrusted code inside the Express process cannot be made safe
  with `new Function`. If server-side grading is needed later, use a real isolated runner (separate
  container or worker with CPU/memory/time limits and no network).
- Input validation: finite-number checks for bounds, subdivisions limited to 2..10000 (prevents CPU
  DoS), expression length capped at 300 chars, only `x` allowed as a variable, undefined integrals
  return 400 instead of a silent `0`.
- Request bodies capped at 32kb.
- `/api/math/geometry` now defaults `params` to `{}` so a missing object no longer throws.

## Build (package.json)
- `esbuild` bumped from `^0.25.0` to `^0.27.0`. `vite@8` requires esbuild `^0.27 || ^0.28` as a peer,
  so `npm install` failed with ERESOLVE on a clean clone.

## Verified
- `npm install` succeeds; `vite build` succeeds.
- Existing tests: 12/12 pass (mathEngine, graphParser, codeRunner).
- Endpoint checks: valid integrals, injection and constructor-escape attempts, syntax errors, `y` use,
  oversized subdivision counts, non-numeric bounds, oversized bodies, and unchanged quadratic and
  geometry endpoints all behave as expected.

## Not yet addressed (from the review)
- Expression parser still transforms input to JS for in-browser graphing (src/utils/graphParser.ts
  `compileExpression`). Lower risk client-side, but should move to the AST evaluator.
- Real sandbox for student code if server-side grading is added.
- `npm start` runs `node server.ts`, which needs Node's TypeScript flags or `tsx`. Use `tsx server.ts`.
