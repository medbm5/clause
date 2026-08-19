# DECISIONS

Judgement calls made while building Clause, with a one-line rationale each.
Newest phase last.

## Phase 0 — Scaffold

- **`npm run verify` runs `tsc --noEmit && eslint && next build`, not `next lint`.**
  Next.js 16 removed the `next lint` command; `create-next-app` now scaffolds a
  flat `eslint.config.mjs` and an `eslint` script. Using `eslint` directly keeps
  the intent of the gate (types, lint, build) on the current toolchain.
- **Next.js 16.3.1 / React 19.2 / Tailwind v4 / zod v4 / motion v13.** "Latest"
  as of the build date. `motion` v13 still exposes `motion/react`, so the import
  in the brief is unchanged.
- **Colour is consumed as Tailwind arbitrary values (`text-[var(--ink)]`), not
  mapped into `@theme`.** The brief asks for exactly this, and it has a useful
  side effect: no Tailwind palette colour can leak in unnoticed, because every
  colour in the codebase is grep-able as `var(--…)`.
- **Type scale is exposed as `@theme` sizes named after their pixel value**
  (`text-17`, `text-40`, `text-56`, plus `text-11`/`text-12` for the mono
  utility voice). Removes any ambiguity between the brief's scale and
  Tailwind's default `text-lg`-style names.
- **Fonts are the three named roles via `next/font/google`** with explicit
  weights (Newsreader 400/500, Plex Sans 400/500/600, Plex Mono 400/500) so the
  build downloads only what the design uses.
- **`.gitignore` gets `!.env.example`.** The scaffold ignores `.env*`
  wholesale, which would have silently excluded the committed example file.
- **`MOCK_MODE` is read through `isMockMode()` rather than a module constant.**
  A route handler evaluated at build time would otherwise capture the wrong
  value; a function call reads the environment at request time.
- **An `OPENAI_API_KEY` was supplied mid-build and lives in `.env.local`**
  (gitignored, never committed). Both `gpt-4o` and `gpt-4o-mini` were confirmed
  to accept `response_format: json_schema` with `strict: true`, and
  `text-embedding-3-small` returns 1536 dimensions, so Phase 1 embeds for real
  and Phase 6 runs live. Mock mode is still built as a first-class path in
  Phase 2 and remains the behaviour whenever the key is absent.
