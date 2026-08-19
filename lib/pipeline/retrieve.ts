import { CONFIG } from '@/lib/config';
import { patternsForDocType } from '@/lib/kb/patterns';
import type { DocType, PatternMatch, RiskPattern } from '@/lib/types';

/**
 * Retrieval is deliberately pure: cosine similarity over precomputed vectors,
 * no I/O, no client, no environment. Every input is passed in, which makes the
 * scoring behaviour trivially testable and keeps the tuning knobs
 * (`retrievalTopK`, `retrievalMinScore`) honest.
 */

/** Cosine similarity. Returns 0 for mismatched or zero-length vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dot / denominator;
}

export interface RetrievalOptions {
  topK?: number;
  minScore?: number;
}

/**
 * Top-k patterns for one clause vector, restricted to patterns eligible for
 * this document type and to those scoring above the floor.
 */
export function retrieveForVector(
  clauseVector: number[],
  docType: DocType,
  kbVectors: Record<string, number[]>,
  options: RetrievalOptions = {},
): PatternMatch[] {
  const topK = options.topK ?? CONFIG.limits.retrievalTopK;
  const minScore = options.minScore ?? CONFIG.limits.retrievalMinScore;

  const scored: PatternMatch[] = [];
  for (const pattern of patternsForDocType(docType)) {
    const patternVector = kbVectors[pattern.id];
    if (!patternVector) continue;
    const similarity = cosineSimilarity(clauseVector, patternVector);
    if (similarity < minScore) continue;
    scored.push({
      patternId: pattern.id,
      title: pattern.title,
      similarity: Math.round(similarity * 1000) / 1000,
    });
  }

  return scored.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
}

/** The same, for a whole document: one `PatternMatch[]` per clause vector. */
export function retrieveForClauses(
  clauseVectors: number[][],
  docType: DocType,
  kbVectors: Record<string, number[]>,
  options: RetrievalOptions = {},
): PatternMatch[][] {
  return clauseVectors.map((vector) =>
    retrieveForVector(vector, docType, kbVectors, options),
  );
}

/**
 * The distinct patterns behind a set of matches, in first-seen order. This is
 * what gets sent to the analyser as evidence, so it must dedupe: a batch of
 * five clauses commonly retrieves the same deposit pattern three times.
 */
export function uniquePatterns(
  matchSets: PatternMatch[][],
  byId: ReadonlyMap<string, RiskPattern>,
): RiskPattern[] {
  const seen = new Set<string>();
  const patterns: RiskPattern[] = [];
  for (const matches of matchSets) {
    for (const match of matches) {
      if (seen.has(match.patternId)) continue;
      const pattern = byId.get(match.patternId);
      if (!pattern) continue;
      seen.add(match.patternId);
      patterns.push(pattern);
    }
  }
  return patterns;
}
