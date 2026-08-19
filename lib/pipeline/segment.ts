import { z } from 'zod';
import { CONFIG } from '@/lib/config';
import { completeJson } from '@/lib/openai';
import type { Clause } from '@/lib/types';

/**
 * Segmentation is heuristics first, LLM only as a fallback. Indian agreements
 * are heavily numbered, so a regex pass gets the printed clause numbers exactly
 * right — which matters more than it sounds, because the report shows that
 * number and it is how the reader finds the clause in their own copy. An LLM
 * would paraphrase or renumber; it is only worth calling when structure is
 * genuinely absent.
 */

const MIN_CLAUSE_CHARS = 200;
const MAX_CLAUSE_CHARS = 2_500;
const MIN_HEURISTIC_CLAUSES = 4;

interface Draft {
  number: string | null;
  heading: string | null;
  body: string[];
}

/** `1.`, `1.1`, `4.2.1`, `12)` — the dominant form in Indian agreements. */
const NUMBERED = /^(\d{1,2}(?:\.\d{1,2}){0,3})\s*[.)\]:-]?\s+(.*)$/;
/** `(a)`, `(ii)`, `(A)` sub-items. */
const LETTERED = /^\(\s*([a-zA-Z]|[ivxlcdmIVXLCDM]{1,5})\s*\)\s+(.*)$/;
/** `Clause 4`, `ARTICLE V`, `Section 3.2`, `Para 7`. */
const KEYWORD_NUMBERED =
  /^(?:clause|article|section|schedule|annexure|para(?:graph)?)\s+([\dIVXLCDM]{1,6}(?:\.\d{1,2})*)\s*[.:)-]?\s*(.*)$/i;
/** Recitals and execution blocks read as clause boundaries in practice. */
const RECITAL = /^(WHEREAS|NOW THEREFORE|IN WITNESS WHEREOF|AND WHEREAS)\b(.*)$/i;

function isAllCapsHeading(line: string): boolean {
  if (line.length < 3 || line.length > 90) return false;
  if (/[.;]$/.test(line)) return false;
  const letters = line.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 3) return false;
  return letters === letters.toUpperCase();
}

function isTitleCaseHeading(line: string): boolean {
  if (line.length < 3 || line.length > 70) return false;
  if (/[.,;:]$/.test(line)) return false;
  const words = line.split(/\s+/);
  if (words.length > 8) return false;
  const capitalised = words.filter((word) => /^[A-Z(]/.test(word)).length;
  return capitalised / words.length >= 0.6;
}

interface Boundary {
  number: string | null;
  heading: string | null;
  rest: string;
}

/** Does this line begin a new clause? Returns what it contributes if so. */
function boundaryFor(line: string): Boundary | null {
  const numbered = NUMBERED.exec(line);
  if (numbered) {
    const rest = numbered[2].trim();
    const headingOnly = rest.length > 0 && rest.length <= 70 && !/[.;]$/.test(rest) && isTitleCaseHeading(rest);
    return {
      number: numbered[1],
      heading: headingOnly ? rest : null,
      rest: headingOnly ? '' : rest,
    };
  }

  const keyword = KEYWORD_NUMBERED.exec(line);
  if (keyword) {
    const rest = keyword[2].trim();
    return { number: keyword[1], heading: null, rest };
  }

  const lettered = LETTERED.exec(line);
  if (lettered) {
    return { number: `(${lettered[1]})`, heading: null, rest: lettered[2].trim() };
  }

  const recital = RECITAL.exec(line);
  if (recital) {
    return { number: null, heading: null, rest: line };
  }

  if (isAllCapsHeading(line) || isTitleCaseHeading(line)) {
    return { number: null, heading: line, rest: '' };
  }

  return null;
}

function draftText(draft: Draft): string {
  return draft.body.join(' ').replace(/\s+/g, ' ').trim();
}

/** Step 1: walk the lines and cut at every boundary the regexes recognise. */
function splitOnBoundaries(text: string): Draft[] {
  const drafts: Draft[] = [];
  let current: Draft | null = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    const boundary = boundaryFor(line);

    if (boundary) {
      // A heading line immediately followed by a numbered line belongs to that
      // clause, not to a clause of its own.
      if (current && current.body.length === 0 && current.heading && !current.number && boundary.number) {
        current.number = boundary.number;
        if (boundary.rest) current.body.push(boundary.rest);
        continue;
      }

      if (current && (current.body.length > 0 || current.heading || current.number)) {
        drafts.push(current);
      }
      current = {
        number: boundary.number,
        heading: boundary.heading,
        body: boundary.rest ? [boundary.rest] : [],
      };
      continue;
    }

    if (!current) {
      current = { number: null, heading: null, body: [line] };
      continue;
    }
    current.body.push(line);
  }

  if (current && (current.body.length > 0 || current.heading)) drafts.push(current);
  return drafts;
}

/**
 * Step 2a: fold fragments into the clause above them. A sub-item like "(b) at
 * his own cost" is not a clause on its own — it is part of the obligation it
 * hangs under, and analysing it in isolation loses the context that makes it
 * risky.
 */
function mergeFragments(drafts: Draft[]): Draft[] {
  const merged: Draft[] = [];

  for (const draft of drafts) {
    const text = draftText(draft);
    const previous = merged[merged.length - 1];

    if (previous && text.length < MIN_CLAUSE_CHARS) {
      const label = draft.number ? `${draft.number} ` : '';
      const heading = draft.heading ? `${draft.heading}. ` : '';
      previous.body.push(`${label}${heading}${text}`.trim());
      continue;
    }

    merged.push({ ...draft, body: [text] });
  }

  return merged.filter((draft) => draftText(draft).length > 0);
}

/** Step 2b: break an over-long clause at sentence boundaries, never mid-sentence. */
function splitLongClauses(drafts: Draft[]): Draft[] {
  const result: Draft[] = [];

  for (const draft of drafts) {
    const text = draftText(draft);
    if (text.length <= MAX_CLAUSE_CHARS) {
      result.push({ ...draft, body: [text] });
      continue;
    }

    const sentences = text.split(/(?<=[.;:])\s+/);
    let chunk = '';
    const chunks: string[] = [];

    for (const sentence of sentences) {
      if (chunk.length > 0 && chunk.length + sentence.length + 1 > MAX_CLAUSE_CHARS) {
        chunks.push(chunk.trim());
        chunk = sentence;
      } else {
        chunk = chunk ? `${chunk} ${sentence}` : sentence;
      }
    }
    if (chunk.trim()) chunks.push(chunk.trim());

    for (const part of chunks) {
      result.push({
        // The printed number and heading stay on every part: it is one clause
        // in the reader's copy, and that is what they will look for.
        number: draft.number,
        heading: draft.heading,
        body: [part],
      });
    }
  }

  return result;
}

function toClauses(drafts: Draft[]): Clause[] {
  return drafts.slice(0, CONFIG.limits.maxClauses).map((draft, index) => ({
    id: `c-${String(index + 1).padStart(2, '0')}`,
    index,
    number: draft.number,
    heading: draft.heading,
    text: draftText(draft),
  }));
}

/** The heuristic pass on its own. Exported because it is pure and worth testing. */
export function segmentHeuristically(text: string): Clause[] {
  return toClauses(splitLongClauses(mergeFragments(splitOnBoundaries(text))));
}

const LlmSchema = z.object({
  clauses: z
    .array(
      z.object({
        number: z.string(),
        heading: z.string(),
        text: z.string().min(1),
      }),
    )
    .min(1),
});

const LLM_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    clauses: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          number: { type: 'string' },
          heading: { type: 'string' },
          text: { type: 'string' },
        },
        required: ['number', 'heading', 'text'],
        additionalProperties: false,
      },
    },
  },
  required: ['clauses'],
  additionalProperties: false,
};

const LLM_SYSTEM = `You split contracts and insurance policies into their individual clauses.

Rules:
- Copy the clause text verbatim from the input. Never summarise, reword, correct or shorten it.
- Keep the clause number exactly as printed ("4.2", "(c)", "Article V"). Use an empty string when a clause is genuinely unnumbered.
- Use the printed heading if there is one, otherwise an empty string. Do not invent headings.
- Return clauses in the order they appear.
- Ignore page furniture, signature blocks and witness lines.`;

/**
 * Segments a document. Heuristics first; the LLM is called only when the regex
 * pass found almost no structure, and its output is treated as untrusted (empty
 * strings become nulls, text is trimmed, the cap still applies).
 */
export async function segmentDocument(text: string): Promise<Clause[]> {
  const heuristic = segmentHeuristically(text);
  if (heuristic.length >= MIN_HEURISTIC_CLAUSES) return heuristic;

  try {
    const result = await completeJson({
      model: CONFIG.models.segment,
      system: LLM_SYSTEM,
      user: text.slice(0, 40_000),
      schemaName: 'clause_segmentation',
      schema: LLM_JSON_SCHEMA,
      parse: (value) => LlmSchema.parse(value),
      temperature: 0,
      maxOutputTokens: 12_000,
      label: 'segment',
    });

    const drafts: Draft[] = result.clauses.map((clause) => ({
      number: clause.number.trim() || null,
      heading: clause.heading.trim() || null,
      body: [clause.text.trim()],
    }));

    const clauses = toClauses(splitLongClauses(drafts.filter((d) => draftText(d).length > 0)));
    return clauses.length > heuristic.length ? clauses : heuristic;
  } catch {
    // Better a coarse segmentation than no report at all.
    return heuristic;
  }
}
