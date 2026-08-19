import { CONFIG } from '@/lib/config';
import { RecoverableExtractError } from '@/lib/extract/index';
import { normaliseDocumentText } from '@/lib/extract/pdf';
import { completeText } from '@/lib/openai';

const OCR_SYSTEM =
  'You transcribe photographed and scanned documents. You output only the transcription, never commentary.';

const OCR_INSTRUCTION =
  'Transcribe all text in this document image exactly. Preserve clause numbering, headings and paragraph breaks. Output only the transcription.';

/**
 * Vision OCR through the same SDK as everything else — a second OCR vendor
 * would be another key, another failure mode and another bill for one path.
 */
export async function extractImage(
  bytes: Uint8Array,
  mimeType: string,
): Promise<string> {
  const base64 = Buffer.from(bytes).toString('base64');

  let transcription: string;
  try {
    transcription = await completeText({
      model: CONFIG.models.ocr,
      system: OCR_SYSTEM,
      user: [
        { type: 'text', text: OCR_INSTRUCTION },
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' },
        },
      ],
      temperature: 0,
      maxOutputTokens: 8192,
      label: 'ocr',
    });
  } catch {
    throw new RecoverableExtractError(
      "We couldn't read the text in that image. Try a straight-on photo in good light, with the whole page in frame.",
    );
  }

  const normalised = normaliseDocumentText(transcription);

  if (normalised.length < 200) {
    throw new RecoverableExtractError(
      "We could barely read any text in that photo. Try again with the page flat, well lit, and filling the frame.",
    );
  }

  return normalised;
}
