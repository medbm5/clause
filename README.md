# Clause

AI risk review for Indian rental agreements and health insurance policies.

Upload a rental agreement or a health policy and get back a **marked-up copy of
your own document**: every risky or one-sided clause flagged in the margin,
explained in plain English, benchmarked against what's normal in India, with a
concrete suggestion for what to ask for instead.

It is built for the person who is about to sign something they don't fully
understand — a tenant, a policyholder — not for a lawyer.

---

## Running it

```bash
npm i
npm run dev
```

Open <http://localhost:3000>. Two sample documents are bundled, so it works with
one click and no setup.

To review real documents, add a key:

```bash
cp .env.example .env.local
# then put your key in .env.local:
# OPENAI_API_KEY=sk-...
```

`.env.local` is gitignored.

## Mock mode

**With no `OPENAI_API_KEY`, the app runs anyway.** This is not a stub — it is a
first-class path:

- The route replays a hand-written report through the *same* NDJSON event stream
  the live pipeline uses, with realistic staggered timing, so every screen and
  every animation is exercised exactly as it would be for real.
- Two fixtures are included, one rental and one health policy, with real clause
  text and findings written to the same standard as live output.
- A **`Demo data`** chip stays visible in the header the whole time, and the
  copied summary and the printed report both carry a "demo data" line. Mock
  output is never presented as real.

Mock mode is active when `OPENAI_API_KEY` is absent, or when `MOCK_MODE=1` is set
to force it even with a key present.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run verify` | `tsc --noEmit && eslint && next build` — the gate everything is held to |
| `npm run kb:embed` | Regenerates `lib/kb/embeddings.json` from the knowledge base |
| `npm run samples` | Regenerates the two sample PDFs in `public/samples/` |
| `npm run build` / `npm start` | Production build and server |

`npm run kb:embed` is only needed after editing `lib/kb/patterns.ts`. The vectors
are committed, so **production never re-embeds the knowledge base at request
time**. Without a key the script still writes a usable file using deterministic
pseudo-embeddings, and says loudly that retrieval is then mock quality.

`npm run samples` asserts the generated PDFs against `SAMPLE_DOCS` in
`lib/config.ts`, so the page and clause counts shown in the UI cannot drift away
from the documents they describe.

## How it works

One Next.js app. Route handlers are the backend; there is no separate service and
no database.

```
POST /api/analyze   multipart in, NDJSON out, one JSON event per line
```

1. **read** — PDF text layer via `unpdf`, or vision OCR for photos. A PDF with no
   text layer is a scan: the user is told to photograph the pages instead, rather
   than the server trying to rasterize on a serverless function.
2. **classify** — one cheap call over the opening 3,000 characters for document
   type and a title the user will recognise.
3. **segment** — regex first, because Indian agreements are heavily numbered and
   the printed clause number is how the reader finds the clause in their own
   copy. An LLM is the fallback only when structure is genuinely absent.
4. **retrieve** — clause embeddings against 34 precomputed risk-pattern vectors,
   cosine top-k. Plain JSON, no vector database.
5. **analyze** — batches of 5 clauses, 4 in parallel, each seeing only the
   patterns retrieved for its own clauses. Strict JSON schema, validated with
   zod. A batch that fails twice is skipped and the run continues.
6. **compile** — a deterministic saturating score, a verdict, and a final
   plain-language summary.

Findings stream to the client as they are validated, so the document visibly
fills in rather than appearing all at once.

### Two invariants worth knowing

- **A quote is never fabricated.** Every quoted span is verified against its own
  clause and, where whitespace differs, mapped back to the source offsets so the
  string rendered is sliced out of the document rather than out of the model's
  reply. If it cannot be located, it is `null` and no quote renders.
- **A fair clause gets no finding.** An unflagged clause is a signal, not a gap,
  and the report says so in words when nothing is flagged.

## Deploying

```bash
npx vercel --prod
```

Then set one environment variable in the Vercel dashboard:

```
OPENAI_API_KEY
```

No `vercel.json` is needed. The analyze route declares `runtime = 'nodejs'` and
`maxDuration = 60`. **A keyless deploy still works** — it runs in mock mode with
the `Demo data` chip visible, which makes it safe to hand to someone before the
key is provisioned.

## What's not in this MVP

Deliberately out of scope, not overlooked:

- **No auth, no accounts, no user history.** Every review is anonymous.
- **No storage of any kind.** No database, no file storage. Your document lives
  in memory for the duration of one request and is never written to disk. There
  is nothing to leak and nothing to delete.
- **No payments** and no usage metering.
- **Single-request pipeline with a 60-second ceiling.** A very long document is
  truncated to 60,000 characters and capped at 40 clauses, and the report says
  when it was truncated. Nothing resumes or runs in the background.
- **A simple in-memory concurrency guard**, not real rate limiting — it only
  stops one person running several analyses at once on the same instance.
- **No test suite.** Verification for this build was done by running documents
  through the live pipeline and driving the UI in a real browser; see `NOTES.md`
  for what that found.
- **English only**, and no dark mode.

## Not legal advice

Clause is not a law firm and this is not legal advice. It is a reading aid.
Findings describe risks and market norms, never rulings, and the disclaimer is
present on every screen including the printed report. Check anything important
with a lawyer.
