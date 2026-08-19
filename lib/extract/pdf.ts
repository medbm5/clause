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

/**
 * Drops short lines that recur across the document — running headers, footers,
 * and "Page 3 of 8" stamps. A line has to appear at least three times and on a
 * meaningful share of pages before it is treated as furniture, so a genuinely
 * repeated clause heading survives.
 */
function stripRepeatedFurniture(text: string): string {
  const lines = text.split('\n');
  const counts = new Map<string, number>();

  for (const line of lines) {
    const key = line.trim();
    if (!key || key.length > 80) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const threshold = Math.max(3, Math.ceil(lines.length / 60));
  const furniture = new Set<string>();
  for (const [key, count] of counts) {
    if (count < threshold) continue;
    // Page numbers and short all-caps stamps are furniture; a repeated sentence
    // with real punctuation is probably content.
    const looksStructural = /^(page\s*)?\d+(\s*(of|\/)\s*\d+)?$/i.test(key) || key.length <= 60;
    if (looksStructural) furniture.add(key);
  }

  return lines
    .filter((line) => {
      const key = line.trim();
      if (!furniture.has(key)) return true;
      // Never strip something that carries clause-like structure.
      return /^\d+(\.\d+)*[.)]\s+\S/.test(key);
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
