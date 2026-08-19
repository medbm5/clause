/**
 * Every model name and tunable lives here so they can be swapped in one place.
 */
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
    /**
     * Tuned in Phase 6 against both sample documents, not guessed. Measured on
     * real clause text: the intended pattern is top-1 for every substantive
     * clause at 0.626–0.891, while non-clause material (title block, recitals,
     * execution block) peaks at 0.54. A floor of 0.45 therefore drops noise from
     * the analyser's evidence without losing a single real pattern — the same 17
     * distinct patterns are retrieved at 0.45 as at 0.28 — and leaves recitals
     * correctly matching nothing. Above 0.55 real signal starts disappearing.
     */
    retrievalMinScore: 0.45,
  },
} as const;

/** Dimensionality of `text-embedding-3-small`. */
export const EMBED_DIM = 1536;

/** A PDF whose text layer is shorter than this is treated as a scan. */
export const MIN_TEXT_LAYER_CHARS = 200;

export const ACCEPTED_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

/**
 * The bundled sample documents. `pages` and `clauses` describe the generated
 * PDFs and are asserted by `scripts/make-samples.ts`, so the labels shown in the
 * sample picker cannot drift away from the files they describe.
 */
export const SAMPLE_DOCS = {
  rental: {
    file: 'rental-agreement-bengaluru.pdf',
    label: '11-month rental agreement, Bengaluru',
    pages: 3,
    clauses: 16,
  },
  insurance: {
    file: 'health-policy-family-floater.pdf',
    label: 'Family floater health policy',
    pages: 3,
    clauses: 14,
  },
} as const;

/**
 * Mock mode is active when there is no key to call, or when it is forced.
 * Read through a function so route handlers see the value at request time.
 */
export function isMockMode(): boolean {
  return process.env.MOCK_MODE === '1' || !process.env.OPENAI_API_KEY;
}
