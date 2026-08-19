import { ACCEPTED_MIME, CONFIG } from '@/lib/config';
import { runPipeline } from '@/lib/pipeline/run';
import type { SampleId } from '@/lib/types';
import { NDJSON_HEADERS, ndjsonStream } from '@/lib/utils/stream';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * A simple in-memory guard. Not rate limiting in any real sense — it exists so
 * one person hammering the demo cannot run several 60-second analyses at once
 * on the same warm instance. Deliberately not a store, not a KV, not a queue.
 */
const MAX_CONCURRENT = 4;
let inFlight = 0;

function errorStream(message: string, recoverable: boolean): Response {
  return new Response(
    ndjsonStream(async (emit) => {
      emit({ type: 'error', message, recoverable });
    }),
    { status: 200, headers: NDJSON_HEADERS },
  );
}

function parseSample(value: string | null): SampleId | undefined {
  if (value === 'rental') return 'rental';
  if (value === 'insurance') return 'insurance';
  return undefined;
}

export async function POST(request: Request): Promise<Response> {
  if (inFlight >= MAX_CONCURRENT) {
    return errorStream(
      'The demo is busy reviewing other documents right now. Give it a few seconds and try again.',
      true,
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorStream(
      "We couldn't read that upload. Try selecting the file again.",
      true,
    );
  }

  const sample = parseSample(
    typeof formData.get('sample') === 'string' ? (formData.get('sample') as string) : null,
  );
  const uploaded = formData.get('file');
  const file = uploaded instanceof File ? uploaded : null;

  if (!sample && !file) {
    return errorStream(
      'No document was uploaded. Choose a PDF or a photo of the pages, or try one of the samples.',
      true,
    );
  }

  if (file && file.size > CONFIG.limits.maxFileBytes) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return errorStream(
      `That file is ${mb} MB and the limit is 10 MB. Try a smaller export, or upload the pages as separate photos.`,
      true,
    );
  }

  if (file && file.size === 0) {
    return errorStream(
      'That file is empty. Check it opens on your device, then upload it again.',
      true,
    );
  }

  if (file) {
    const mime = file.type.split(';')[0].trim().toLowerCase();
    if (mime && !(ACCEPTED_MIME as readonly string[]).includes(mime)) {
      return errorStream(
        `We can read PDFs and photos (JPG, PNG, WebP), and that file is ${mime}. Export it as a PDF, or photograph the pages.`,
        true,
      );
    }
  }

  // Read the bytes before the stream starts: the request body is not
  // guaranteed to still be readable once we have returned a response.
  let bytes: Uint8Array | undefined;
  if (file) {
    try {
      bytes = new Uint8Array(await file.arrayBuffer());
    } catch {
      return errorStream(
        "We couldn't read that file's contents. Try selecting it again.",
        true,
      );
    }
  }

  inFlight += 1;

  const stream = ndjsonStream(async (emit) => {
    try {
      await runPipeline(
        bytes && file
          ? { file: { bytes, mimeType: file.type, name: file.name } }
          : { sample },
        emit,
      );
    } finally {
      inFlight -= 1;
    }
  });

  return new Response(stream, { status: 200, headers: NDJSON_HEADERS });
}
