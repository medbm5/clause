import { CONFIG } from '@/lib/config';
import { embedBatch } from '@/lib/openai';
import type { Clause } from '@/lib/types';

/** Shape of the committed lib/kb/embeddings.json. */
export interface EmbeddingFile {
  /** Embedding model used, prefixed `pseudo:` when generated without a key. */
  model: string;
  dim: number;
  vectors: Record<string, number[]>;
}

/**
 * Loaded lazily so that a missing or malformed embeddings file degrades to
 * "no retrieval" rather than taking down the route at import time.
 */
let cached: EmbeddingFile | null = null;

export async function loadKbEmbeddings(): Promise<EmbeddingFile> {
  if (cached) return cached;
  const imported = (await import('@/lib/kb/embeddings.json')) as {
    default: EmbeddingFile;
  };
  cached = imported.default;
  return cached;
}

/** True when the committed vectors are the deterministic stand-ins. */
export function isPseudoEmbeddingFile(file: EmbeddingFile): boolean {
  return file.model.startsWith('pseudo:');
}

/** One batched embeddings call for every clause, in clause order. */
export async function embedClauses(clauses: Clause[]): Promise<number[][]> {
  if (clauses.length === 0) return [];
  return embedBatch(
    CONFIG.models.embed,
    clauses.map((clause) => clause.text.slice(0, 6_000)),
  );
}
