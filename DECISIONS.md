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

## Phase 2 — Pipeline core

- **Pattern similarity is measured server-side, never reported by the model.**
  The analyser returns `patternIds` it relied on; `analyze.ts` intersects those
  with the clause's retrieval results and attaches the real cosine score. A
  model-supplied similarity would be a number the UI renders as fact and nobody
  computed.
- **Quotes are verified by mapping back to source offsets.** Models reproduce
  wording faithfully but normalise whitespace, so an exact `includes` check
  alone would null out most valid quotes. `verifyQuote` tries exact first, then
  a whitespace-insensitive search that returns a slice of the *clause*, never of
  the model's reply — so the rendered quote is verbatim by construction.
- **The mock fixtures compute their own score, verdict and counts through
  `score.ts`,** and pass every quote through `verifyQuote`. A fixture therefore
  cannot claim a verdict its findings don't support, and a typo in fixture copy
  degrades to a missing quote rather than a fabricated one.
- **The insurance fixture was rewritten as a genuinely better policy to reach
  its specified `negotiate_first` verdict honestly.** Seven substantial findings
  scored 74, which the thresholds read as `do_not_sign_as_is`. Rather than
  shaving confidences to hit a target — which would have made the numbers
  dishonest — the fixture document itself changed: the disease-wise sub-limit
  clause was removed, the no-claim bonus now steps down instead of resetting to
  nil, joint replacement waits 24 months rather than 48, and day-care cover is
  explicit. It now scores 66 with six findings, and — this is the point — every
  *unflagged* clause in it is genuinely standard practice, so the report's
  silence on them is truthful.
- **`meta.model` is `'mock'` in mock mode.** Reporting a model name for a run
  that called no model would be a small lie in a field a client might read.
- **The in-memory concurrency guard is 4 simultaneous analyses per instance.**
  The brief rules out real rate limiting; this only stops one person opening
  five tabs and stalling a warm instance for a minute.
- **File bytes are read before the stream is returned.** Once a `Response` is
  handed back, the request body is not guaranteed to still be readable, and the
  producer callback runs after that point.
- **Errors are delivered as `error` events inside a 200 NDJSON stream, not as
  HTTP error codes.** The client has one code path for everything the server
  says, and an actionable message always reaches the UI — which is what
  "never let the demo hard-fail" requires.
- **Classification and segmentation both degrade instead of throwing.**
  Classify falls back to keyword counting; segmentation falls back to the
  heuristic pass if the LLM fallback fails or returns less than the heuristics
  found. Only "no readable text at all" ends a run.

## Phase 3 — Intake

- **`app/page.tsx` is a server component that renders `components/experience.tsx`.**
  The brief calls `page.tsx` "the whole experience", but mock mode is a runtime
  fact — no key present, or `MOCK_MODE=1` — and the `Demo data` chip has to be
  truthful on the very first frame, not once a report comes back and reveals it.
  A server page reading `isMockMode()` and passing it down is the only way to do
  that; the client tree needs hooks, so it cannot be the same file. `page.tsx`
  is `force-dynamic` for the same reason: a statically prerendered page would
  bake in whichever mode the build machine happened to have.
- **`useAnalysis` lives in `lib/use-analysis.ts` and reduces over `PipelineEvent`
  directly.** Because the reducer's action type *is* the server's event type,
  there is no second contract to keep in sync — anything the server can say, the
  client can already hold.
- **Duplicate findings are ignored by (clauseId, headline).** A retried batch or
  a replayed stream should not double a flag in the margin.
- **`sheet.tsx` and `tooltip.tsx` earn their place rather than being built
  because the tree lists them:** the sheet becomes the severity/score
  explanation panel on the report, and the tooltip explains the confidence and
  similarity numbers shown in mono. Both are wired up in Phase 5 — nothing is
  built here that nothing uses.
- **Sample sub-labels state real page and clause counts,** which
  `scripts/make-samples.ts` asserts against the PDFs it generates in Phase 6, so
  the label cannot drift from the document it describes.
- **Client-side upload validation duplicates the server's checks on purpose.**
  An obviously wrong file should cost nothing; the server still re-validates
  because a client check is a convenience, not a control.

## Phase 4 — The scan

- **The document column and the gutter are one CSS grid, with each clause row
  using `grid-cols-subgrid`.** A flag therefore sits at its clause's vertical
  position by construction. The alternative — measuring clause offsets with refs
  and absolutely positioning flags — has to be re-run on every reflow, font load
  and expand/collapse, and is wrong for a frame each time. Subgrid is never wrong.
- **Grid columns come from utility classes, never an inline
  `gridTemplateColumns`.** An inline style cannot be overridden at a breakpoint,
  so the mobile single-column collapse would have silently never happened — the
  gutter would have stayed a 300px column at 380px wide.
- **The scan line is clipped to the document column** (`lg:right-[328px]`, the
  gutter plus the gap). A line crossing the gutter reads as a page-wide loading
  bar rather than as something reading the document.
- **Reveal is monotonic.** The sweep repeats while analysis runs, but clause
  opacity only ever increases: the first pass reveals the column, later passes
  are just the line travelling. Re-dimming already-read text on every pass looked
  like a fault.
- **Underlines are measured per line fragment with `getClientRects()`.** A quote
  that wraps produces several inline boxes, and an absolutely positioned child of
  the span would only ever cover the first — so each fragment gets its own SVG
  path, which is also what a person with a pen does. Re-measured on resize and
  on `document.fonts.ready`, because web fonts land after first paint and shift
  the text out from under the line.
- **The wobble is deterministic in the fragment's width.** A random wobble would
  redraw itself differently on every re-render, which reads as jitter.
- **The stage list sits in the gutter beside the heading, not beside the first
  clause.** Putting it in a grid row with the document column made that row as
  tall as the stage list and opened a ~300px dead gap above the first clause.
