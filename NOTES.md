# NOTES

A running log of what was tried, what broke, and what not to try again.

## Phase 0

- `create-next-app` refuses to scaffold into a directory containing `BUILD.md`
  ("contains files that could conflict"). Moved the brief out and back around
  the scaffold rather than fighting the flag set.
- `next lint` no longer exists in Next 16 — running it fails outright. The
  `verify` gate uses the `eslint` binary instead (see DECISIONS.md).
- Read the installed `.d.ts` files before writing any call:
  - `unpdf`: `extractText(docOrData, { mergePages: true })` returns
    `{ totalPages: number; text: string }`. The single-arg / `mergePages: false`
    overload returns `text: string[]`, so the option is load-bearing for typing.
  - `openai` v7: `response_format.json_schema` takes
    `{ name, schema?, strict?, description? }` — `schema` is optional in the
    type, so the wrapper in `lib/openai.ts` must always pass it.
  - `motion` v13 re-exports framer-motion from `motion/react`;
    `useReducedMotion`, `AnimatePresence`, `useSpring`, `useMotionValue` are all
    available from that entry point.
- `next/font/google` needs network at build time. It works here and on Vercel;
  it is unrelated to `OPENAI_API_KEY`, so a keyless build still succeeds.

## Phase 1

- First attempt at `patterns.ts` used a bash heredoc and was silently truncated
  mid-string ("unexpected EOF while looking for matching `''`") — the command
  exceeded the shell's length limit and nothing was written. Large source files
  go through the Write tool from here on; heredocs are fine for small ones.
- `tsx` resolves the `@/*` tsconfig path alias without extra configuration, so
  scripts import from `@/lib/...` exactly like app code.
- Top-level `await` fails under `tsx` for a file outside the project's module
  scope ("not supported with the cjs output format"). Scripts wrap their body in
  `async function main()` — `embed-kb.ts` already does.
- Retrieval measurement with real embeddings (11 probes, wording deliberately
  different from `typicalLanguage`): 10/10 rank-1 hits. Scores — true positives
  0.623–0.784, best-but-wrong match on a pure recital clause 0.453. Conclusion:
  the KB discriminates well, but `retrievalMinScore: 0.28` is far below the
  noise floor. Revisit in Phase 6.

## Phase 2

- Bash heredocs choked again on the fixture file; both large data files
  (`patterns.ts`, `fixtures.ts`) were written with the Write tool.
- Verified against the running dev server rather than by reading code:
  `curl -sN -F sample=rental` yields 24 NDJSON lines — 10 stage, 1 meta,
  1 clauses, 11 finding, 1 done — with `done.report` valid (16 clauses,
  11 findings, score 97, verdict `do_not_sign_as_is`, every clauseId resolving,
  every quote verbatim).
- Progressive delivery measured on the insurance sample: first finding at
  3.28 s, last at 5.70 s, 2.4 s of spread. Nothing is buffered.
- Error paths confirmed live: a 12 MB upload, a `text/plain` upload and a
  request with no file each return a single actionable `error` event and no
  crash. A corrupt PDF cannot be tested in mock mode — the fixture replay never
  reaches extraction — so that one is checked against the live pipeline later.
- `Math.hypot(...vector)` with a 1536-element spread is fine on Node 24, but it
  is worth remembering the argument-count ceiling exists if the dimension ever
  grows.
