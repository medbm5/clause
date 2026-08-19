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

## Phase 1 — Knowledge base

- **The brief's required rental topics map 1:1 onto the 17 rental patterns, and
  its health topics onto the 17 health patterns.** Two bullets each name two
  concerns ("security deposit size *and* deduction discretion";
  "specific-illness *and* maternity waiting periods"), and each is written as a
  single pattern rather than two. That is not a compromise to hit the count: a
  real deposit clause states the amount and the discretion in the same breath
  ("ten months' rent … refundable after such deductions as the Lessor may deem
  fit"), and policies list maternity inside the same waiting-period schedule, so
  one pattern matching one clause is the correct granularity.
- **`patternEmbeddingInput()` lives in `patterns.ts`, not in the script.** The
  embedding input string is part of the knowledge base's contract; if the script
  owned it, a future re-embed could silently use a different formula than the
  committed vectors were built with.
- **Vectors are rounded to 6 decimal places in the committed JSON.** Cosine
  similarity is unchanged at that precision and the file drops to ~490 KB.
- **Pseudo-embeddings are seeded from the pattern's own text** (FNV-1a hash into
  xorshift32, then normalised to a unit vector) rather than from its index, so
  the fallback file is deterministic across machines and no two patterns collide.
  The model field is written as `pseudo:text-embedding-3-small` so any consumer
  can detect mock-quality retrieval — `isPseudoEmbeddingFile()` reads it.
- **`kb:embed` and `samples` run via `node --env-file-if-exists=.env.local
  --import tsx`.** Avoids adding a dotenv dependency or a shared script helper,
  and `-if-exists` means the keyless path stays the no-config default.
- **Retrieval floor left at the brief's `0.28` for now, with a measurement
  recorded for Phase 6.** Eleven hand-written probe clauses (deliberately worded
  unlike `typicalLanguage`) retrieve the intended pattern at rank 1 in 10/10
  scoreable cases; true positives score 0.62–0.78 while an irrelevant recital
  clause tops out at 0.45. So 0.28 admits noise, and the evidence points at
  ~0.45. Tuning belongs in Phase 6 against whole real documents, not against
  probes.
