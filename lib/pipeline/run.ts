import { CONFIG, isMockMode, SAMPLE_DOCS } from '@/lib/config';
import { extractDocument, RecoverableExtractError } from '@/lib/extract/index';
import { PATTERNS_BY_ID } from '@/lib/kb/patterns';
import { guessSampleFromFilename, replayFixture } from '@/lib/mock/fixtures';
import { analyseClauses, buildBatches } from '@/lib/pipeline/analyze';
import { classifyDocument } from '@/lib/pipeline/classify';
import { embedClauses, isPseudoEmbeddingFile, loadKbEmbeddings } from '@/lib/pipeline/embed';
import { retrieveForClauses } from '@/lib/pipeline/retrieve';
import { countBySeverity, scoreFindings, summariseFindings, verdictFor } from '@/lib/pipeline/score';
import type { Finding, PatternMatch, PipelineEvent, RiskReport, SampleId } from '@/lib/types';
import type { EmitFn } from '@/lib/utils/stream';

/**
 * Orchestrates one analysis and emits events as it goes. Every stage is
 * wrapped so that a failure degrades rather than aborts: retrieval can come
 * back empty, batches can drop out, the summary can fall back to a computed
 * one. The only unrecoverable failure is having no readable text at all.
 */

export interface RunInput {
  /** An uploaded file, or a bundled sample. */
  file?: { bytes: Uint8Array; mimeType: string; name: string };
  sample?: SampleId;
}

export async function runPipeline(input: RunInput, emit: EmitFn): Promise<void> {
  const started = Date.now();

  // --- mock mode -----------------------------------------------------------
  if (isMockMode()) {
    const sample: SampleId =
      input.sample ?? (input.file ? guessSampleFromFilename(input.file.name) : 'rental');
    await replayFixture(sample, emit);
    return;
  }

  // --- read ----------------------------------------------------------------
  emit({ type: 'stage', id: 'read', status: 'active' });

  let text: string;
  let source: RiskReport['meta']['source'];
  let truncated: boolean;

  try {
    if (input.sample) {
      const loaded = await loadSample(input.sample);
      text = loaded.text;
      truncated = loaded.truncated;
      source = 'sample';
    } else if (input.file) {
      const extracted = await extractDocument(input.file);
      text = extracted.text;
      truncated = extracted.truncated;
      source = extracted.source;
    } else {
      throw new RecoverableExtractError('No document was uploaded.');
    }
  } catch (error) {
    emit({
      type: 'error',
      message:
        error instanceof RecoverableExtractError
          ? error.message
          : "We couldn't read that document. Try a PDF, or photos of the pages as JPG or PNG.",
      recoverable: error instanceof RecoverableExtractError,
    });
    return;
  }

  emit({
    type: 'stage',
    id: 'read',
    status: 'done',
    detail: `${text.length.toLocaleString('en-IN')} characters${truncated ? ' (truncated)' : ''}`,
  });

  // --- classify ------------------------------------------------------------
  emit({ type: 'stage', id: 'segment', status: 'active' });
  const { docType, title } = await classifyDocument(text);
  emit({ type: 'meta', docType, title });

  // --- segment -------------------------------------------------------------
  const { segmentDocument } = await import('@/lib/pipeline/segment');
  const clauses = await segmentDocument(text);

  if (clauses.length === 0) {
    emit({
      type: 'error',
      message:
        "We read the document but couldn't find any clauses in it. If it's a scan, upload photos of the pages as JPG or PNG.",
      recoverable: true,
    });
    return;
  }

  emit({ type: 'clauses', clauses });
  emit({
    type: 'stage',
    id: 'segment',
    status: 'done',
    detail: `${clauses.length} clause${clauses.length === 1 ? '' : 's'}`,
  });

  // --- retrieve ------------------------------------------------------------
  emit({ type: 'stage', id: 'retrieve', status: 'active' });

  let matchesByClause: PatternMatch[][] = clauses.map(() => []);
  let retrievalDetail = 'no patterns matched';

  try {
    const [file, clauseVectors] = await Promise.all([
      loadKbEmbeddings(),
      embedClauses(clauses),
    ]);
    matchesByClause = retrieveForClauses(clauseVectors, docType, file.vectors);
    const matched = new Set(
      matchesByClause.flatMap((set) => set.map((match) => match.patternId)),
    );
    retrievalDetail = isPseudoEmbeddingFile(file)
      ? 'knowledge base not embedded — run npm run kb:embed'
      : `${matched.size} pattern${matched.size === 1 ? '' : 's'} matched`;
  } catch {
    // Retrieval is evidence, not a requirement: the analyser can judge clauses
    // on their own terms, so an embedding failure costs quality, not the run.
    retrievalDetail = 'pattern matching unavailable';
  }

  emit({ type: 'stage', id: 'retrieve', status: 'done', detail: retrievalDetail });

  // --- analyze -------------------------------------------------------------
  emit({ type: 'stage', id: 'analyze', status: 'active' });

  const batches = buildBatches(clauses, matchesByClause, PATTERNS_BY_ID);
  const { findings, failures } = await analyseClauses({
    batches,
    docType,
    onFinding: (finding: Finding) => emit({ type: 'finding', finding }),
  });

  const skipped = failures.length;
  emit({
    type: 'stage',
    id: 'analyze',
    status: 'done',
    detail:
      `${findings.length} issue${findings.length === 1 ? '' : 's'} flagged` +
      (skipped > 0 ? ` · ${skipped} batch${skipped === 1 ? '' : 'es'} skipped` : ''),
  });

  // --- compile -------------------------------------------------------------
  emit({ type: 'stage', id: 'compile', status: 'active' });

  const score = scoreFindings(findings);
  const summary = await summariseFindings({
    findings,
    clauseCount: clauses.length,
    title,
    docTypeIsOther: docType === 'other',
  });

  const report: RiskReport = {
    docType,
    title,
    verdict: verdictFor(score, findings),
    score,
    summary,
    counts: countBySeverity(findings),
    clauses,
    findings,
    meta: {
      source,
      clauseCount: clauses.length,
      model: CONFIG.models.analyze,
      durationMs: Date.now() - started,
      truncated,
    },
  };

  emit({ type: 'stage', id: 'compile', status: 'done' });
  emit({ type: 'done', report } satisfies PipelineEvent);
}

/** Reads a bundled sample PDF off disk and extracts its text. */
async function loadSample(
  sample: SampleId,
): Promise<{ text: string; truncated: boolean }> {
  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const { extractPdf } = await import('@/lib/extract/pdf');

  const path = join(process.cwd(), 'public', 'samples', SAMPLE_DOCS[sample].file);
  const buffer = await readFile(path);
  const text = await extractPdf(new Uint8Array(buffer));
  const truncated = text.length > CONFIG.limits.maxChars;

  return {
    text: truncated ? text.slice(0, CONFIG.limits.maxChars) : text,
    truncated,
  };
}
