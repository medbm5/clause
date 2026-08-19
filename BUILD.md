# BUILD.md — "Clause" · AI risk review for Indian rental & health-insurance documents

You are the sole engineer and design lead on this build. Read this entire file before writing code, then build the whole thing end to end.

---

## 0. How to work

**Work autonomously. Do not stop to ask me questions.** If something is ambiguous, pick the option that best serves a fast, reliable client demo, write the choice and one-line rationale into `DECISIONS.md`, and keep going.

Rules:

1. **Never block on secrets.** `OPENAI_API_KEY` may not exist on this machine. Build `MOCK_MODE` (§6.7) as a first-class path so the app runs and demos perfectly with no key. Do not stub it in later — build it in Phase 2.
2. **Commit at every phase gate** in §11 with a real message. Small, working commits.
3. **Gate every phase on `npm run verify`** (`tsc --noEmit && next lint && next build`). If it fails, fix it before moving on. Never leave the repo red.
4. **No `any`.** No `@ts-ignore`. No commented-out code. No `TODO` left behind except in `NEXT_STEPS.md`.
5. **Never invent library APIs.** If unsure of a signature, read the installed package's `.d.ts` in `node_modules` before using it.
6. **Keep a running `NOTES.md`** of what you tried that didn't work, so you don't repeat it.
7. When done, print a short summary + the deploy command. Nothing else.

---

## 1. What this is

A single-page web product where a consumer in India uploads a rental agreement or a health-insurance policy and gets back a **marked-up copy of their own document**: every risky or one-sided clause flagged in the margin, explained in plain English, benchmarked against what's normal, with a concrete suggestion for what to ask for instead.

Audience: an ordinary tenant or policyholder, not a lawyer. They are about to sign something they don't understand and they are slightly scared. The product's job is to make them feel informed and equipped in under 60 seconds.

This is a **demo build for a client**. Ruthlessly scoped:

**In scope:** upload → text extraction → clause segmentation → embedding retrieval against a risk-pattern knowledge base → LLM analysis with confidence → streamed structured risk report → marked-up report UI. Two bundled sample documents so the client can see it work with one click.

**Out of scope — do not build:** auth, user accounts, payments, databases, file storage, admin dashboard, multi-tenancy, rate limiting beyond a simple in-memory guard, tests beyond §12, i18n, dark mode.

**Everything is one Next.js app.** No monorepo, no separate Python service. Route handlers are the backend. Deploys to Vercel with zero config.

---

## 2. Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js (latest, App Router, TypeScript, `src/` off) | `create-next-app` |
| Styling | Tailwind CSS v4 | tokens as CSS vars in `globals.css` |
| Motion | `motion` (Framer Motion v11+ package name) | `import { motion } from 'motion/react'` |
| Icons | `lucide-react` | use sparingly |
| LLM | OpenAI Node SDK (`openai`) | chat completions + strict JSON schema |
| Embeddings | `text-embedding-3-small` | 1536-dim |
| PDF text | `unpdf` | serverless-safe pdfjs wrapper |
| Image OCR | OpenAI vision (same SDK) | no second OCR vendor |
| Validation | `zod` | validate every LLM payload |
| Vector search | plain cosine over a precomputed JSON | **no database** |
| Hosting | Vercel | Node runtime |

Put every model name and tunable in `lib/config.ts` so they can be swapped in one place:

```ts
export const CONFIG = {
  models: {
    classify: 'gpt-4o-mini',
    segment: 'gpt-4o-mini',
    analyze: 'gpt-4o',
    ocr: 'gpt-4o',
    embed: 'text-embedding-3-small',
  },
  limits: {
    maxFileBytes: 10 * 1024 * 1024,
    maxChars: 60_000,
    maxClauses: 40,
    analysisBatchSize: 5,
    analysisConcurrency: 4,
    retrievalTopK: 5,
    retrievalMinScore: 0.28,
  },
} as const;
```

---

## 3. File tree

Build exactly this shape. Add files only if genuinely needed.

```
app/
  layout.tsx                 fonts, metadata, <body> shell
  page.tsx                   the whole experience (intake → pipeline → report)
  globals.css                tokens, base type, keyframes
  api/analyze/route.ts       POST multipart → NDJSON event stream
components/
  intake/
    hero.tsx                 headline + thesis line
    drop-zone.tsx            drag/drop + file picker + validation
    sample-picker.tsx        two bundled sample docs
    disclaimer.tsx
  pipeline/
    scan-stage.tsx           the signature animation (§8.3)
    stage-list.tsx           five stages, live status
  report/
    report-view.tsx          layout orchestrator
    verdict-header.tsx       document title, verdict, count-up score
    marked-page.tsx          paper column of clauses + margin flags
    clause-block.tsx         one clause, its underline, its flag
    finding-panel.tsx        expanded finding detail
    severity-key.tsx
    report-actions.tsx       copy summary / print / start over
  ui/                        button.tsx, badge.tsx, sheet.tsx, tooltip.tsx — hand-rolled, no shadcn CLI
lib/
  config.ts
  types.ts                   single source of truth for contracts (§4)
  openai.ts                  client + retry + strict-JSON helper
  extract/
    index.ts                 dispatch by mime
    pdf.ts                   unpdf text layer
    image.ts                 vision OCR
  pipeline/
    run.ts                   orchestrates and emits events
    classify.ts
    segment.ts
    embed.ts
    retrieve.ts              cosine top-k
    analyze.ts               batched LLM analysis
    score.ts                 aggregate score + verdict
  kb/
    patterns.ts              the knowledge base (typed, §5)
    embeddings.json          generated — committed
  mock/
    fixtures.ts              two full RiskReports + timing simulation
  utils/
    stream.ts                NDJSON writer / client reader
    cn.ts
scripts/
  embed-kb.ts                writes lib/kb/embeddings.json
  make-samples.ts            writes public/samples/*.pdf
public/samples/
  rental-agreement-bengaluru.pdf
  health-policy-family-floater.pdf
DECISIONS.md  NOTES.md  NEXT_STEPS.md  README.md
```

---

## 4. Data contracts

`lib/types.ts` is authoritative. Server and client both import from it. Write it first, before any feature code.

```ts
export type DocType = 'rental' | 'health_insurance' | 'other';
export type Severity = 'critical' | 'high' | 'moderate' | 'low' | 'fair';

export interface RiskPattern {
  id: string;                 // 'rental.deposit.excessive'
  docType: DocType;
  category: string;           // 'Security deposit'
  title: string;              // short, consumer-facing
  description: string;        // what the unfair version looks like
  typicalLanguage: string[];  // 2-4 phrasings as they appear in real documents
  whyRisky: string;           // consumer impact, one or two sentences
  fairBenchmark: string;      // what's standard/normal in India
  baseSeverity: Severity;
  reference?: string;         // e.g. 'Model Tenancy Act 2021, s.11' | 'IRDAI (Health Insurance) Regulations'
}

export interface Clause {
  id: string;                 // 'c-07'
  index: number;
  number: string | null;      // '4.2' as printed in the document
  heading: string | null;
  text: string;
}

export interface PatternMatch {
  patternId: string;
  title: string;
  similarity: number;         // 0..1
}

export interface Finding {
  clauseId: string;
  severity: Severity;
  riskScore: number;          // 0..100
  confidence: number;         // 0..1
  category: string;
  headline: string;           // <= 60 chars, plain language, names the problem
  plainLanguage: string;      // what this clause actually means for you
  whyItMatters: string;       // the concrete consequence
  standardPractice: string;   // what's normal — '' if not applicable
  suggestedAction: string;    // what to ask for / do next
  quote: string | null;       // verbatim span from the clause, <= 180 chars
  matches: PatternMatch[];
}

export interface RiskReport {
  docType: DocType;
  title: string;              // inferred, e.g. 'Residential rental agreement — 11 months, Bengaluru'
  verdict: 'sign_with_caution' | 'negotiate_first' | 'do_not_sign_as_is' | 'looks_fair';
  score: number;              // 0..100, higher = riskier
  summary: string;            // 2-3 sentences, plain language
  counts: Record<Severity, number>;
  clauses: Clause[];
  findings: Finding[];
  meta: {
    source: 'pdf' | 'image' | 'sample' | 'mock';
    clauseCount: number;
    model: string;
    durationMs: number;
    truncated: boolean;
  };
}

export type StageId = 'read' | 'segment' | 'retrieve' | 'analyze' | 'compile';

export type PipelineEvent =
  | { type: 'stage'; id: StageId; status: 'active' | 'done'; detail?: string }
  | { type: 'meta'; docType: DocType; title: string }
  | { type: 'clauses'; clauses: Clause[] }
  | { type: 'finding'; finding: Finding }
  | { type: 'done'; report: RiskReport }
  | { type: 'error'; message: string; recoverable: boolean };
```

Invariants:
- Every `Finding.clauseId` resolves to a `Clause.id`. Drop any that don't.
- `quote` must be a verbatim substring of the clause text — verify in code, set to `null` if it isn't. Never let a hallucinated quote render.
- Clauses with no material risk get **no** finding. An unflagged clause is a signal, not a gap.

---

## 5. The knowledge base

`lib/kb/patterns.ts` exports `PATTERNS: RiskPattern[]`. **Write 34 patterns: 17 rental, 17 health insurance.** This is the substance of the product — do not phone it in, and do not pad it with near-duplicates. Ground it in real Indian consumer reality: rupee amounts, Indian legal and regulatory vocabulary, the things that actually go wrong.

Rental must cover at least: security deposit size and deduction discretion, deposit refund timing, lock-in period with full-deposit forfeiture, notice period asymmetry between landlord and tenant, annual escalation, maintenance and repair burden pushed to tenant, landlord entry without notice, restrictions (visitors, cooking, pets, gender/marital status), painting and cleaning charges at exit, brokerage and stamp-duty allocation, subletting and assignment, termination for convenience by landlord only, penalty and interest on late rent, dispute resolution venue and arbitration cost, utilities and society charges, "as is" condition with no inventory, unilateral amendment rights.

Health insurance must cover at least: pre-existing disease waiting period, specific-illness and maternity waiting periods, room-rent and ICU capping, proportionate deduction, co-payment (especially age-linked), disease-wise sub-limits, non-medical expense exclusions, claim intimation and document submission deadlines, network vs non-network cashless treatment, pre/post-hospitalisation cover windows, free-look period, moratorium and non-disclosure-based repudiation, no-claim bonus mechanics and reset, renewal and premium-revision rights, day-care and domiciliary treatment, restoration/refill limits, exclusions list breadth.

For each pattern write `typicalLanguage` as phrases a real document contains — that array is what drives retrieval quality, so make the phrasings concrete and varied, not paraphrases of the title.

`scripts/embed-kb.ts`:
- embedding input per pattern: `` `${title}. ${category}. ${description} ${typicalLanguage.join(' ')}` ``
- one batched embeddings call, writes `{ model, dim, vectors: Record<patternId, number[]> }` to `lib/kb/embeddings.json`
- **commit that JSON.** Production must never re-embed the KB at runtime.
- if no API key: write a deterministic pseudo-embedding file (hash-seeded unit vectors) so the app still builds and runs, and log loudly that retrieval is in mock quality.
- add `npm run kb:embed`.

---

## 6. Pipeline

One request, one stream. `POST /api/analyze` accepts `multipart/form-data` with either `file` or `sample=rental|insurance`. Route config: `export const runtime = 'nodejs'; export const maxDuration = 60;`

### 6.1 read
Dispatch on mime type.
- **PDF** → `unpdf`: `getDocumentProxy` + `extractText(doc, { mergePages: true })`. Normalise whitespace, strip repeated headers/footers, collapse 3+ newlines to 2.
- **Image** (`image/png|jpeg|webp`) → vision OCR: base64 data URL, prompt: *"Transcribe all text in this document image exactly. Preserve clause numbering, headings and paragraph breaks. Output only the transcription."* Set `meta.source = 'image'`.
- **Scanned PDF** (text layer under 200 chars) → emit a recoverable error: `"This PDF has no readable text layer — it's a scan. Upload photos of the pages as JPG or PNG instead."` Do **not** try to rasterize PDFs on serverless.
- Truncate to `maxChars`, set `meta.truncated`.

### 6.2 classify
One cheap call on the first 3000 characters → strict JSON `{ docType, title }`. Title should read like something the user recognises: `"Residential rental agreement — 11 months, Bengaluru"`. If `docType === 'other'`, still proceed but say so in the summary.

### 6.3 segment
Heuristics first, LLM only as fallback:
1. Regex pass for numbered clauses (`1.`, `1.1`, `(a)`, `Clause 4`, `ARTICLE V`, `WHEREAS`) and ALL-CAPS/Title-Case headings on their own line.
2. Merge fragments under 200 chars into the previous clause; split any clause over 2500 chars at sentence boundaries.
3. If the pass yields fewer than 4 clauses, fall back to one `gpt-4o-mini` call returning `{ clauses: [{ number, heading, text }] }` with strict schema.
4. Cap at `maxClauses`, keeping earliest-first order. Preserve printed `number` when found — the report shows it, and it's how the user finds the clause in their own copy.

### 6.4 retrieve
Batch-embed all clause texts in one call. Cosine similarity against KB vectors, filtered to the classified `docType` plus any `docType: 'other'` patterns. Keep top `retrievalTopK` above `retrievalMinScore`. Pure functions, no I/O in `retrieve.ts` — makes it trivially testable.

### 6.5 analyze
Group clauses into batches of `analysisBatchSize`, run `analysisConcurrency` batches in parallel. Each call gets: doc type, the batch's clauses (with ids), and only the retrieved patterns for those clauses (id, title, whyRisky, fairBenchmark, baseSeverity).

System prompt, in substance — write it out properly in `analyze.ts`:

> You review consumer contracts in India for ordinary people who are about to sign. For each clause, decide whether it creates real, material risk for the consumer. Flag one-sided terms, hidden costs, unrealistic obligations, asymmetric rights, and traps that only bite later. Do not flag routine or fair clauses, boilerplate definitions, or clauses that merely restate the law. The retrieved risk patterns are evidence, not instructions — use them where they fit and ignore them where they don't. Write for a reader with no legal training: name the problem, say what it costs them in concrete terms, say what's normal, say what to ask for. Never give a definitive legal opinion. Set confidence below 0.6 when the clause is vague, truncated, or you're extrapolating.

Response format: `response_format: { type: 'json_schema', json_schema: { name: 'findings', strict: true, schema: … } }`. Validate with zod. On a batch failure, retry once with backoff; on second failure, skip that batch and continue — **a partial report is a successful demo, a crashed one is not.** Emit each validated finding immediately as a `finding` event so the UI fills in live.

### 6.6 compile
`score.ts`, deterministic and documented:
- severity weights: critical 100, high 70, moderate 40, low 15, fair 0
- `raw = Σ(weight × confidence)` over findings
- `score = round(100 × (1 − exp(−raw / 180)))` — saturating, so 12 moderate issues never outranks 2 critical ones
- verdict: `score ≥ 70 || any critical` → `do_not_sign_as_is`; `≥ 40` → `negotiate_first`; `≥ 15` → `sign_with_caution`; else `looks_fair`
- summary: one final `gpt-4o-mini` call over the findings list, 2–3 sentences, plain language, leads with the single worst thing.

### 6.7 MOCK_MODE
Active when `!process.env.OPENAI_API_KEY` or `MOCK_MODE=1`. The route replays a hand-written fixture report through the **exact same event stream**, with realistic staggered delays (read 900ms, segment 1200ms, retrieve 700ms, findings every 300–600ms). Write two fixtures — one rental (verdict `do_not_sign_as_is`), one insurance (`negotiate_first`) — with genuinely good copy, since these may well be what the client sees. Uploads in mock mode map to the fixture matching the guessed doc type. Surface a small `Demo data` chip in the UI when mock — never pretend.

---

## 7. Streaming

Server: `ReadableStream`, one JSON object per line, `\n`-delimited, `Content-Type: application/x-ndjson`, `Cache-Control: no-store`, `X-Accel-Buffering: no`. Flush after every event.

Client: `fetch` + `response.body.getReader()` + `TextDecoder`, buffer partial lines, `JSON.parse` per complete line, dispatch into a reducer. One `useAnalysis()` hook owning `{ status, stages, docType, title, clauses, findings, report, error }`. No state library.

Never `await` the whole stream before painting. The point is that the user watches their document get marked up.

---

## 8. Design

Read this section as the brief. Do not substitute a generic look.

### 8.1 Direction — "marked-up stamp paper"

The artifact at the centre of this product is a specific physical object: an Indian agreement printed on pale ₹-stamp paper, and the thing we're simulating is a good lawyer sitting down with a red pen and annotating your copy in the margin. The interface **is** that marked-up document. Institutional, precise, quiet — with all colour spent on the annotations.

Explicitly avoid: warm cream + serif + terracotta accent; near-black + acid green; newspaper broadsheet columns. This is cool-toned, official, form-like paper.

### 8.2 Tokens

Define in `globals.css` as CSS vars, use via Tailwind arbitrary values. No other colours anywhere.

```
--paper        #E6E9E2   page field — cool stamp-paper grey-green
--surface      #F6F7F3   raised cards, the document column
--ink          #16191B   primary text
--ink-soft     #5A6169   secondary text, labels
--rule         #C6CBC1   hairlines, borders
--registrar    #24406E   structure: eyebrows, links, focus rings, stage progress
--flag-fair    #2F6F55
--flag-low     #6B7A2E
--flag-mod     #A8761A
--flag-high    #B14A1D
--flag-crit    #8C1D1D
```

Type — three roles, loaded via `next/font/google`:
- **Newsreader** — display. Document titles, verdict line, hero. Weights 400/500, tight leading, `-0.02em` at large sizes. Never for UI chrome.
- **IBM Plex Sans** — body and UI. 400/500/600. This is the "official form" voice.
- **IBM Plex Mono** — utility only: clause numbers, similarity and confidence values, stage labels, the demo chip. Uppercase, `0.08em` tracking, 11–12px.

Scale: 13 / 15 / 17 / 21 / 28 / 40 / 56. Body 17px at 1.6. Radius: 2px on everything except the score dial. Shadows: none — use hairline rules and a 1px inset highlight for the paper edge instead.

### 8.3 Signature element

**The margin.** Desktop layout is a two-column reading surface: a `--surface` document column holding the real extracted clause text, and a fixed-width right gutter holding the annotations.

- Flagged clause text gets a hand-drawn-feeling underline in its severity colour: an inline SVG path with a slight vertical wobble, `stroke-linecap: round`, drawn via `stroke-dasharray` animation over ~450ms. Not a CSS border-bottom.
- Its flag sits in the gutter at the clause's vertical position: a mono clause number, the severity as a small filled square, and the `headline`. Click → expands into the full finding (`plainLanguage`, `whyItMatters`, `standardPractice`, `suggestedAction`, matched patterns with similarity in mono, confidence). One expanded at a time; hovering a flag tints its clause, and vice versa.
- **The scan.** While analysing, a 2px `--registrar` horizontal line sweeps down the document column at a steady pace. Clause text ahead of the line is at 45% opacity; text it has passed sits at full opacity. Findings' underlines draw and flags fly into the gutter (spring, 12px x-offset, 180ms stagger) as their events arrive. This one orchestrated moment carries the whole design — build it properly and keep everything else still.
- Mobile: gutter collapses; each flag renders directly beneath its clause. The scan line still sweeps.

Motion budget beyond that: staged fade-up on intake (60ms stagger), spring on the count-up score dial, 120ms hover/press transitions. Nothing else moves. Honour `prefers-reduced-motion`: no scan sweep, no underline draw, no fly-in — instant final state, opacity fades only.

### 8.4 Screens

One route, three states in `page.tsx`, cross-faded.

**Intake.** The thesis is the document, so show one: a small rendered agreement page with three margin flags already drawn, sitting beside the headline. Copy:

> eyebrow (mono): `CLAUSE · CONTRACT REVIEW FOR INDIA`
> H1 (Newsreader 56): `Find out what you're signing.`
> Sub (17px, ink-soft): `Upload a rental agreement or health insurance policy. Get every one-sided clause flagged in plain English, with what's normal and what to ask for instead.`

Drop zone: `Drop your agreement here` / `PDF, or photos of the pages · up to 10 MB · nothing is stored`. Sample picker as two labelled cards: `11-month rental agreement, Bengaluru` and `Family floater health policy`, each with a mono sub-label (`8 pages · 23 clauses`). Disclaimer, small, honest: `Clause is not a law firm and this is not legal advice. It's a reading aid — check anything important with a lawyer.`

**Pipeline.** Document column populates with real clause text as segmentation returns; the five stages listed in mono in the gutter with live status. Every stage label is what happened, not jargon: `Reading the document` → `Splitting into clauses` → `Matching known risk patterns` → `Reviewing each clause` → `Compiling your report`.

**Report.** Verdict header: the inferred title in Newsreader, the verdict as a plain sentence (`Don't sign this as is.` / `Negotiate these points first.` / `Sign with your eyes open.` / `This one looks fair.`), the score dial counting up, and the severity counts in mono. Then the marked page. `report-actions`: `Copy summary`, `Print`, `Review another document`. Print stylesheet: expand every finding inline, drop the gutter, keep the underlines, black on white.

Empty and failure states get direction, not mood: OCR failure says exactly what to do instead; zero findings says `We found nothing materially unfair in these 23 clauses. That's rarer than it should be.`

Quality floor, unannounced: responsive to 380px, visible `--registrar` focus rings, real `<button>`/`<label>` semantics, `aria-live="polite"` on stage status, keyboard-operable flags, `alt` text everywhere.

---

## 9. Samples

`scripts/make-samples.ts` uses `pdf-lib` to generate two realistic multi-page documents into `public/samples/`. Write genuine content — clause-numbered, formal, India-specific, with real rupee figures — and deliberately plant a spread of problems the pipeline should catch: in the rental doc a 10-month deposit, a 9-month lock-in forfeiting the whole deposit, landlord entry without notice, tenant liable for all repairs, one-sided 3-month notice; in the policy a 48-month PED wait, 1% room-rent cap with proportionate deduction, 20% co-pay above age 60, 30-day claim intimation, tight sub-limits. `npm run samples`. Commit the PDFs.

---

## 10. Deploy

- `.env.example` with `OPENAI_API_KEY=` and `MOCK_MODE=`. `.env.local` gitignored.
- No `vercel.json` unless something actually requires it.
- `README.md`: what it is, `npm i && npm run dev`, how mock mode works, `npm run kb:embed`, deploy steps, and a short honest "what's not in this MVP" list (no auth, no storage, no payments, single-request pipeline, 60s ceiling).
- Confirm `npm run build` passes with **no** `OPENAI_API_KEY` present, so a keyless Vercel deploy still demos.
- Final output: print `npx vercel --prod` plus the one env var to set in the dashboard.

---

## 11. Phases

Gate each on `npm run verify` + a commit.

| # | Phase | Done when |
|---|---|---|
| 0 | Scaffold: `create-next-app`, deps, `verify` script, `config.ts`, `types.ts`, tokens + fonts in `globals.css`, empty `DECISIONS.md` | blank styled page builds |
| 1 | Knowledge base: 34 patterns, `embed-kb.ts`, committed `embeddings.json` | `npm run kb:embed` works with and without a key |
| 2 | Pipeline core: extract, classify, segment, embed, retrieve, analyze, score, `run.ts`, NDJSON route, **MOCK_MODE + both fixtures** | `curl -N -F sample=rental localhost:3000/api/analyze` streams a full valid report in mock mode |
| 3 | Intake screen: hero, drop zone, sample picker, disclaimer, `useAnalysis()` hook | selecting a sample starts a real stream |
| 4 | Pipeline screen: document column, stage list, **the scan animation** | watching it feels like the doc is being reviewed |
| 5 | Report screen: verdict header + score dial, marked page, underlines, gutter flags, finding panel, actions, print CSS | full mock run reads well end to end |
| 6 | Real-key pass: `make-samples`, run both sample PDFs and one phone photo through the live pipeline, tune `retrievalMinScore` and prompts on what you observe, log findings in `NOTES.md`. If no key is available, say so in the summary and stop here. | real reports are accurate and specific |
| 7 | Polish: 380px sweep, keyboard pass, reduced-motion pass, error states, README, `NEXT_STEPS.md`, remove dead code | §12 fully checked |

---

## 12. Acceptance checklist

Verify each by actually doing it, not by reading the code:

- [ ] `npm run build` passes with no API key set
- [ ] Both samples produce a complete report in mock mode
- [ ] With a key: rental sample yields ≥ 6 findings, ≥ 1 critical, every quote verbatim, every `clauseId` valid
- [ ] Findings appear progressively — first flag lands well before the last
- [ ] A corrupt file, a 12 MB file, and a scanned PDF each produce a clear, actionable message and no crash
- [ ] One LLM batch failing still yields a usable report
- [ ] Usable at 380px wide; no horizontal scroll
- [ ] Full flow operable by keyboard with visible focus
- [ ] `prefers-reduced-motion` removes the sweep and fly-ins
- [ ] Print output is legible with all findings expanded
- [ ] Nothing in the UI is Lorem, placeholder, or a rounded-corner gradient card
- [ ] `grep -rn "TODO\|any\|@ts-ignore" app lib components` is clean

---

## 13. Non-negotiables

1. **Never fabricate a quote.** Verbatim-verify or `null`.
2. **Never state law as certainty.** Findings are risks and norms, not rulings. The disclaimer is present on every screen including print.
3. **Never claim to store or protect data** beyond the truth: nothing is persisted, files live in memory for the duration of one request.
4. **Never let the demo hard-fail.** Degrade to partial results, then to mock, before showing an error screen.
5. **Never label mock output as real.** The `Demo data` chip stays visible whenever `MOCK_MODE` is on.
