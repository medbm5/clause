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

## Phase 3

- The document preview in the hero rendered as an empty card at first: the
  `u-paper` background is absolutely positioned and came earlier in the DOM than
  the clause lines, so it painted over them. Absolutely positioned siblings sit
  above static ones — the content wrapper needs `relative` too. Worth
  remembering for the report's document column, which uses the same technique.
- Verified the UI by driving real Chrome with Playwright, installed **outside**
  the repo (in the job's scratch directory) so the project keeps its clean
  dependency list — the brief rules out a test framework, but not looking at the
  thing with your own eyes.
- Two false alarms from the harness, both the same mistake: `.u-mono` applies
  `text-transform: uppercase`, and Playwright's `innerText` returns *rendered*
  text, so assertions against "16 clauses · 11 flagged" silently failed until
  they were made case-insensitive. Not a product bug.
- Measured on a warm dev server: sample click → first flag counted at 3.3 s,
  full report at 8.4 s, no console or page errors.

## Phase 4

- `eslint-config-next` in Next 16 carries React Compiler rules that reject two
  things I had written: a `setState` called synchronously inside an effect, and a
  counter mutated during render to stagger the flag fly-in. Both were genuine
  smells — the first became a derived value, the second a precomputed
  `arrivalOrder` map. Worth knowing the linter enforces this now.
- First pass at the pipeline layout left a large empty block at the top of the
  document column, because the gutter's stage list shared a grid row with it and
  sized that row. Fixed by lifting the stage list out of the marked page into a
  header row that uses the same shared `PAGE_GRID` geometry.
- The scan line initially spanned both columns; clipped to the document column.
- Verified in Chrome mid-run: 16 clauses on screen, 4 flags landed, 4 underline
  groups, a two-line wrapping quote underlined correctly across both fragments,
  and the gutter flag aligned to its clause. No console errors.

## Phase 5

- Reading the generated print PDF caught a bug no screenshot would have: the
  eleventh gutter flag and its finding were entirely absent from page 12. Cause
  was the uncapped `index * 180ms` fly-in delay, not anything print-specific.
  Printing turns out to be a good test of "is everything actually rendered".
- Counting PDF pages by the first `/Count n` in the file is wrong — the page tree
  is nested, and this document reports `/Count 8`, `/Count 4`, `/Count 12`. The
  real total was 12, so an early "output is truncated" conclusion was wrong.
- Playwright's `locator.count()` counts DOM presence, not visibility, so
  `[data-finding-panel]` legitimately reads 11 on screen: ten hidden print-only
  copies plus one expanded.
- Verified: report at 1280px and 380px with no horizontal scroll at either, and a
  12-page print PDF with every finding expanded inline, underlines preserved in
  severity colour, and the disclaimer plus demo-data notice on the last page.

## Phase 6 — what the live runs actually showed

Three real bugs, all found by running documents through rather than by reading code.

1. **Page footers became clause headings.** pdf-lib writes the running footer
   before the page body in the content stream, so "RENTAL AGREEMENT — Page 2"
   arrived ahead of clause 7 and was parsed as a Title-Case heading. Clause 7
   lost its real heading ("NOTICE PERIOD") and a spurious 18th clause appeared,
   which in turn produced a duplicate finding attributed to an unnumbered clause.
   The original furniture stripper counted identical lines, and these lines are
   unique per page — so it never had a chance. Fixed by also counting
   digit-collapsed stems ("… — Page #") and requiring the line to read as a page
   stamp before stripping.
2. **A numbered line's own heading could be discarded.** The rule that folds a
   bare heading line into the following numbered line did not check whether the
   numbered line carried a heading of its own. It now does.
3. **A `str.replace` in a scripted edit silently did nothing** when the target
   text did not match exactly, and the "fix" appeared to be applied while the file
   was unchanged — which sent me chasing a phantom regex bug. Anything scripted
   must assert it changed the file; the Edit tool fails loudly instead.

Measured retrieval, both samples, unfiltered top-1 per clause:

    rental    substantive clauses 0.646–0.875 · recitals/title/execution 0.422–0.536
    insurance substantive clauses 0.626–0.891 · title block 0.481 · preamble 0.408

Per-clause match counts by floor (rental, topK 5): 0.28 → 5.0/clause, 0 clauses
with no match; 0.45 → 4.5/clause, 2 clauses with none (both recitals); 0.55 →
2.7/clause and real signal starting to drop. Hence 0.45.

Live results after tuning:

| run | clauses | findings | critical | confidence | quotes verbatim | clauseIds |
|---|---|---|---|---|---|---|
| rental sample (PDF) | 18 | 15 | 2 | 0.85–0.95 | all | all valid |
| insurance sample (PDF) | 15 | 14 | 3 | 0.75–0.90 | all | all valid |
| phone photo (JPEG, OCR) | 7 | 5 | 1 | 0.85–0.95 | all | all valid |

Every problem deliberately planted in the samples was found: ten-month deposit
with discretionary deductions, nine-month lock-in forfeiting the whole deposit,
entry without notice, all repairs on the tenant, 3-months-against-15-days notice;
and 48-month PED wait, 1% room-rent cap, proportionate deduction, 20% co-pay
above 60, per-procedure sub-limits, 24-hour/15-day claim deadlines, no-claim
bonus reset, 15-day free look, non-disclosure voiding the policy. Deliberately
fair clauses (utilities and outgoings, scheduled premises, recitals) are
correctly unflagged.

The "phone photo" is a synthesised one, and worth being precise about: a rendered
page photographed under simulated conditions — 1.6° rotation, slight perspective,
a lighting gradient across the sheet, sub-pixel blur, JPEG quality 72, on a dark
desk background. Not a capture from a real handset. It exercises the real vision
OCR path end to end, and the quotes it produced are verbatim against the
transcription, which is the invariant that matters.

Scores saturate at 99 for both samples. That is the intended behaviour of the
exponential — these are genuinely bad documents with two or three critical
findings each — but it does mean the score cannot distinguish "very bad" from
"appalling". Noted in NEXT_STEPS.md rather than retuned, because lowering the
saturation constant would compress the useful middle of the range where real
documents mostly sit.

## Phase 7

- The fair-document control was the most useful single test of the build. It
  found two bugs nothing else did: the reassuring-findings problem (four "findings"
  whose own headlines said the clauses were fair) and a numbered clause being
  swallowed by the fragment-merge rule. Both are invisible on a bad document,
  because on a bad document everything gets flagged anyway.
- Two harness false alarms, both mine, both worth remembering:
  `locator.count()` counts DOM presence rather than visibility, so the ten hidden
  print-only finding panels made "one panel open" read as twelve; and asserting a
  dialog is gone 300ms after Escape races the exit animation. Escape, backdrop
  click and focus restoration all work correctly with a proper wait.
- Verified in a real browser after every change above, at 1280px and 380px:
  intake, scan, report, expanded finding, empty state, print. No horizontal
  scroll at either width, no console or page errors on any screen.
- The score dial mid-spring reads lower than the final value — worth knowing when
  asserting on it. It settles to 97 for the rental fixture.
