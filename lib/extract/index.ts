import { ACCEPTED_MIME, CONFIG } from '@/lib/config';
import type { ReportSource } from '@/lib/types';

/**
 * An extraction problem the user can actually fix — a scan, a corrupt file, an
 * unreadable photo. The route turns these into a `recoverable: true` error
 * event so the UI can say what to do instead of showing a failure screen.
 */
export class RecoverableExtractError extends Error {
  readonly recoverable = true;
  constructor(message: string) {
    super(message);
    this.name = 'RecoverableExtractError';
  }
}

export interface ExtractResult {
  text: string;
  source: ReportSource;
  truncated: boolean;
}

function isAcceptedMime(mime: string): boolean {
  return (ACCEPTED_MIME as readonly string[]).includes(mime);
}

/**
 * Dispatch on mime type. The PDF and image readers are imported lazily so a
 * PDF upload never pulls in the OCR path and vice versa — worth it on a cold
 * serverless start.
 */
export async function extractDocument(file: {
  bytes: Uint8Array;
  mimeType: string;
  name: string;
}): Promise<ExtractResult> {
  const mime = file.mimeType.split(';')[0].trim().toLowerCase();

  if (!isAcceptedMime(mime)) {
    throw new RecoverableExtractError(
      `We can read PDFs and photos (JPG, PNG, WebP). "${file.name || 'That file'}" is ${
        mime || 'an unrecognised type'
      }. Export it as a PDF, or photograph the pages.`,
    );
  }

  if (file.bytes.byteLength === 0) {
    throw new RecoverableExtractError(
      'That file is empty. Check it opens on your device, then upload it again.',
    );
  }

  let text: string;
  let source: ReportSource;

  if (mime === 'application/pdf') {
    const { extractPdf } = await import('@/lib/extract/pdf');
    text = await extractPdf(file.bytes);
    source = 'pdf';
  } else {
    const { extractImage } = await import('@/lib/extract/image');
    text = await extractImage(file.bytes, mime);
    source = 'image';
  }

  const truncated = text.length > CONFIG.limits.maxChars;

  return {
    text: truncated ? text.slice(0, CONFIG.limits.maxChars) : text,
    source,
    truncated,
  };
}
