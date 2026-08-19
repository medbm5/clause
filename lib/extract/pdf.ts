import { extractText, getDocumentProxy } from 'unpdf';
import { MIN_TEXT_LAYER_CHARS } from '@/lib/config';
import { RecoverableExtractError } from '@/lib/extract/index';

/**
 * Collapses the noise a PDF text layer always carries: soft-hyphen line breaks,
 * runs of spaces from justified text, and page-furniture repeated on every page.
 */
export function normaliseDocumentText(raw: string): string {
  let text = raw
    .replace(/\r\n?/g, '\n')
    .replace(/ /g, ' ')
    // A hyphen at end of line is nearly always a broken word, not punctuation.
    .replace(/(\w)-\n(\w)/g, '$1$2')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n');

  text = stripRepeatedFurniture(text);

  return text
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

/** Looks like a clause opening, and so must never be stripped as furniture. */
function isClauseLike(line: string): boolean {
  return /^\d+(\.\d+)*[.)]\s+\S/.test(line);
}

/** Collapses digit runs so "Page 2" and "Page 3" share one stem. */
function stemOf(line: string): string {
  return line.replace(/\d+/g, '#');
}

/** Does this line read as a page stamp once its numbers are collapsed? */
function looksLikePageStamp(line: string): boolean {
  const stem = stemOf(line);
  return (
    /(^|[\s—\-|(\[])page\s*#/i.test(stem) ||
    /^#$/.test(stem) ||
    /^#\s*(of|\/)\s*#$/i.test(stem)
  );
}

/**
 * Drops short lines that recur across the document — running headers, footers
 * and page stamps.
 *
 * Two rules, because one is not enough. Identical lines are caught by counting
 * them. But the commonest real footer is "Some Title — Page 2", which is unique
 * on every page and therefore invisible to counting; those are caught by
 * counting digit-collapsed stems instead. The stem rule is deliberately narrow —
 * the line must also read as a page stamp — because "Annexure 1" and
 * "Annexure 2" share a stem too and are real content.
 */
function stripRepeatedFurniture(text: string): string {
  const lines = text.split('\n');
  const exact = new Map<string, number>();
  const stems = new Map<string, number>();

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.length > 80) continue;
    exact.set(line, (exact.get(line) ?? 0) + 1);
    const stem = stemOf(line);
    stems.set(stem, (stems.get(stem) ?? 0) + 1);
  }

  const repeatThreshold = Math.max(3, Math.ceil(lines.length / 60));

  return lines
    .filter((raw) => {
      const line = raw.trim();
      if (!line || line.length > 80) return true;
      if (isClauseLike(line)) return true;

      const repeatedExactly = (exact.get(line) ?? 0) >= repeatThreshold;
      const repeatedStem =
        (stems.get(stemOf(line)) ?? 0) >= 2 && looksLikePageStamp(line);

      return !(repeatedExactly || repeatedStem);
    })
    .join('\n');
}

/**
 * Pulls the text layer out of a PDF. A PDF with (almost) no text layer is a
 * scan; we say so and tell the user what to do instead rather than trying to
 * rasterize pages, which is not something to attempt on a serverless function.
 */
export async function extractPdf(bytes: Uint8Array): Promise<string> {
  let text: string;
  let totalPages: number;

  try {
    const document = await getDocumentProxy(bytes);
    const result = await extractText(document, { mergePages: true });
    text = result.text;
    totalPages = result.totalPages;
  } catch {
    throw new RecoverableExtractError(
      "We couldn't open that PDF — it may be corrupt, password-protected, or not a PDF at all. Try re-saving it, or upload photos of the pages as JPG or PNG.",
    );
  }

  const normalised = normaliseDocumentText(text);

  if (normalised.length < MIN_TEXT_LAYER_CHARS) {
    throw new RecoverableExtractError(
      `This PDF has no readable text layer — it's a scan${
        totalPages > 0 ? ` of ${totalPages} page${totalPages === 1 ? '' : 's'}` : ''
      }. Upload photos of the pages as JPG or PNG instead.`,
    );
  }

  return normalised;
}
