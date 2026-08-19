# NEXT_STEPS

What I would do next, roughly in the order I would do it. Everything here is a
known limitation of the current build rather than a bug — the §12 acceptance
checklist passes as it stands.

## Accuracy and calibration

- **The score saturates too early for genuinely awful documents.** Both sample
  documents land on 99, and so would anything with two criticals and a handful of
  highs. The exponential is deliberately saturating so that a pile of small
  niggles can never outrank two dangerous clauses, but the top of the range has
  no resolution left. Worth trying a per-severity cap (say, the score cannot
  exceed 85 without a critical) or a mild logarithmic tail instead of retuning
  the saturation constant, which would compress the useful middle where most real
  documents sit.
- **Confidence is model-reported, not measured.** Banded prompt guidance moved it
  from a flat 0.90–1.00 to a calibrated 0.75–0.95, which is better but still
  self-assessed. A real calibration would compare confidence against agreement
  between two independent passes over the same clause, and rescale from that.
- **No evaluation set.** Every accuracy claim in `NOTES.md` comes from three
  documents I wrote myself plus one fair control. The next real step is 20–30 real
  agreements and policies with human-labelled findings, and a script that reports
  precision and recall per pattern. That is what would justify tuning anything
  further.
- **`retrievalMinScore` is tuned on two documents.** 0.45 is well supported by
  the measurements in `NOTES.md`, but the noise floor will differ for documents
  with unusual drafting, and a document type outside the two supported ones has
  no patterns at all.

## Coverage

- **Only two document types.** The knowledge base has 17 rental and 17 health
  patterns. Employment contracts, personal loan and gold loan agreements, and
  builder-buyer agreements are the obvious next three for the same audience, and
  the pattern shape needs no change to support them.
- **`docType: 'other'` proceeds but retrieves nothing,** because there are no
  general patterns in the knowledge base. A dozen cross-cutting patterns —
  unilateral amendment, one-sided indemnity, arbitration cost, jurisdiction —
  filed under `other` would make unrecognised documents genuinely useful instead
  of merely not broken.
- **No multi-page photo upload.** A phone user with a six-page agreement can
  currently only send one page at a time. Accepting several images in one request
  and concatenating the transcriptions in order is a small change to
  `extract/index.ts` and the drop zone, and is probably the single highest-value
  addition for the actual audience.
- **Regional languages.** Agreements are routinely executed in Hindi, Marathi,
  Tamil and Kannada. The OCR path would mostly cope; the knowledge base and every
  string in the UI would not.

## Product

- **Nothing is saved, by design — but a shareable read-only report link** (with
  an explicit opt-in and an expiry) is what a tenant actually wants next, so they
  can send the marked-up copy to whoever is on the other side of the table.
- **The suggested action is not yet a message you can send.** A "draft an email
  asking for these five changes" action, built from the findings already
  computed, is a short step from `buildSummaryText`.
- **No history within a session.** Reviewing a second document discards the first,
  which is surprising if you are comparing two flats.

## Engineering

- **No test suite.** The invariants that most deserve unit tests are pure and
  ready for them: `verifyQuote`, `segmentHeuristically`, `cosineSimilarity`,
  `scoreFindings`/`verdictFor`, and the furniture stripper in `extract/pdf.ts`.
  Several of the bugs found in Phase 6 would have been caught by a test over
  `segmentHeuristically` with a footer in the input.
- **A long document silently loses its tail.** Past 40 clauses the rest are
  dropped; the report says it was truncated but does not say which clauses went.
  Analysing in two passes, or ranking clauses by retrieval score before capping,
  would be more honest than taking the first 40.
- **The in-memory concurrency guard is per-instance,** so it does nothing across
  a fleet. Fine for a demo, wrong for anything public.
- **An expanded finding stretches its grid row,** leaving whitespace beside it in
  the document column when the annotation is longer than the clause. Floating the
  panel over the following rows would fix it but needs care near the end of the
  document.
- **Print pagination leaves gaps.** Keeping each clause with its findings
  (`break-inside: avoid`) sometimes pushes a tall clause to a fresh page and
  leaves a third of the previous one empty. Legibility is the right trade here,
  but a smarter rule could split the finding panel instead of the pair.
