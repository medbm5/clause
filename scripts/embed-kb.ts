/**
 * Generates lib/kb/embeddings.json from the pattern knowledge base.
 *
 * Run with `npm run kb:embed`. The output is committed, because production must
 * never re-embed the knowledge base at request time — that would add a second
 * of latency and a point of failure to every analysis for a file that only
 * changes when a human edits patterns.ts.
 *
 * With no API key the script still writes a usable file, using deterministic
 * hash-seeded unit vectors, and says loudly that retrieval is now mock quality.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CONFIG, EMBED_DIM } from '@/lib/config';
import { PATTERNS, patternEmbeddingInput } from '@/lib/kb/patterns';
import { embedBatch, hasApiKey } from '@/lib/openai';
import type { EmbeddingFile } from '@/lib/pipeline/embed';

const OUT_PATH = resolve(process.cwd(), 'lib/kb/embeddings.json');

/** xorshift32 — small, fast, and identical across runs and machines. */
function seededRandom(seed: number): () => number {
  let state = seed | 0 || 0x9e3779b9;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 1_000_000) / 1_000_000;
  };
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * A deterministic stand-in vector. Seeded from the pattern's own text so
 * patterns with similar wording do not collide, and normalised so cosine
 * similarity stays in range — the shape is right even though the semantics are
 * meaningless.
 */
function pseudoEmbedding(text: string): number[] {
  const random = seededRandom(hashString(text));
  const vector = Array.from({ length: EMBED_DIM }, () => random() - 0.5);
  const norm = Math.hypot(...vector) || 1;
  return vector.map((value) => value / norm);
}

async function main(): Promise<void> {
  const inputs = PATTERNS.map(patternEmbeddingInput);
  const mock = !hasApiKey();

  let vectorList: number[][];

  if (mock) {
    console.warn(
      [
        '',
        '  !!  No OPENAI_API_KEY found.',
        '  !!  Writing DETERMINISTIC PSEUDO-EMBEDDINGS instead.',
        '  !!  The app will build and run, but pattern retrieval is MOCK QUALITY:',
        '  !!  similarity scores will be meaningless. Set OPENAI_API_KEY and',
        '  !!  re-run `npm run kb:embed` before trusting any retrieval output.',
        '',
      ].join('\n'),
    );
    vectorList = inputs.map(pseudoEmbedding);
  } else {
    console.log(
      `Embedding ${PATTERNS.length} patterns with ${CONFIG.models.embed} in one batch...`,
    );
    vectorList = await embedBatch(CONFIG.models.embed, inputs);
  }

  const dim = vectorList[0]?.length ?? EMBED_DIM;
  const wrongSize = vectorList.filter((v) => v.length !== dim).length;
  if (wrongSize > 0) {
    throw new Error(`${wrongSize} vector(s) came back with a mismatched dimension`);
  }

  const vectors: Record<string, number[]> = {};
  PATTERNS.forEach((pattern, index) => {
    // Round to 6 decimals: cosine similarity is unaffected at that precision
    // and the committed file is roughly a third smaller.
    vectors[pattern.id] = vectorList[index].map(
      (value) => Math.round(value * 1e6) / 1e6,
    );
  });

  const file: EmbeddingFile = {
    model: mock ? `pseudo:${CONFIG.models.embed}` : CONFIG.models.embed,
    dim,
    vectors,
  };

  writeFileSync(OUT_PATH, `${JSON.stringify(file)}\n`, 'utf8');

  console.log(
    `Wrote ${Object.keys(vectors).length} vectors (dim ${dim}, model ${file.model}) to lib/kb/embeddings.json`,
  );
}

main().catch((error: unknown) => {
  console.error('kb:embed failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
