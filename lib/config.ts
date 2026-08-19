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
    retrievalMinScore: 0.28,
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
 * Mock mode is active when there is no key to call, or when it is forced.
 * Read through a function so route handlers see the value at request time.
 */
export function isMockMode(): boolean {
  return process.env.MOCK_MODE === '1' || !process.env.OPENAI_API_KEY;
}
