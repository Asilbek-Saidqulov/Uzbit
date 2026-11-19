# Visual and copy changes (from the design review)

## Brand and language
- Header identity: "Uzbit" + "Academy", descriptor "Interactive Math & Computer Science".
- Navigation labels in plain language: Graph, Geometry, Algebra, Coding, Learn, Formulas, 3D.
- Page titles rewritten for students (e.g. "Graph a function", "Geometry calculator", "Learning paths").
- Formula titles use everyday names (Pythagorean Theorem, The Discriminant, Dot Product, ...).
- Footer copy and section names updated to match.

## Home page
- Learner-first headline ("Learn by changing things.") with three primary actions:
  Start learning, Explore graphs, Practice coding.
- 3D scene moved below the actions.
- "What do you want to learn?" topic picker.
- Three tool cards, each in its subject color.
- Technical metrics (e.g. "< 10ms execution latency") replaced with learner-facing facts.

## Color system
- Semantic tokens in src/index.css: brand (indigo), math (cyan), geometry (emerald), coding (amber).
- Used in the new home page, breadcrumb status dots, and the 3D scene label.

## Typography
- Monospace removed from headings, eyebrows, and labels in the home, breadcrumb, and formula pages.

## Navigation and chrome
- Wallpaper switcher is now an icon with an accessible name; it no longer shows a text label in the header.
- Breadcrumbs use plain language. Breadcrumb logic is an exported pure function, and the test
  now exercises that real code (previously it tested a copy).

## Accessibility
- Global :focus-visible outline for every interactive element.
- prefers-reduced-motion disables CSS animations and transitions.
- Decorative icons marked aria-hidden; breadcrumb has proper labelling.

## Performance
- 3D scene stops its render loop when scrolled offscreen or when the tab is hidden, and resumes when visible.
- Pixel ratio capped at 1.5 on phones (2 elsewhere).

## Bug fix
- Wallpapers were loaded from /src/... paths that don't exist in production builds.
  They are now imported through Vite and bundled.

## Not changed (needs a product or design decision)
- Full navigation restructure to Learn / Explore / Practice / Progress.
- Lesson pages, progress tracking, mastery, and hints (learning design, not visual).
- Reduced motion for the 3D scene's auto-rotation (CSS-only support today).
- Mobile bottom navigation (review item 23) is not built.
