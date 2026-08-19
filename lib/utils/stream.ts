import type { PipelineEvent } from '@/lib/types';

/**
 * NDJSON: one JSON object per line, newline-delimited. Chosen over SSE because
 * the payloads are plain objects with no need for event names or reconnection,
 * and a `\n`-delimited body is trivial to read with fetch + a TextDecoder.
 */

export const NDJSON_HEADERS: Record<string, string> = {
  'Content-Type': 'application/x-ndjson; charset=utf-8',
  'Cache-Control': 'no-store, no-transform',
  // Tells nginx-style proxies not to buffer, which would defeat the point of
  // streaming: the user is meant to watch findings land one at a time.
  'X-Accel-Buffering': 'no',
};

export type EmitFn = (event: PipelineEvent) => void;

/**
 * Builds a ReadableStream and hands `producer` an `emit` that writes one event
 * per line. The stream closes when `producer` resolves. A throw is converted
 * into a final `error` event so the client always sees a terminal frame rather
 * than a truncated body.
 */
export function ndjsonStream(
  producer: (emit: EmitFn) => Promise<void>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;

      const emit: EmitFn = (event) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        await producer(emit);
      } catch (error) {
        emit({
          type: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Something went wrong while reviewing the document.',
          recoverable: false,
        });
      } finally {
        closed = true;
        controller.close();
      }
    },
  });
}

/**
 * Client side: reads an NDJSON body and calls `onEvent` per complete line.
 * Partial lines are buffered across chunks — a JSON object can and does get
 * split across network reads.
 */
export async function readNdjson(
  response: Response,
  onEvent: (event: PipelineEvent) => void,
): Promise<void> {
  const body = response.body;
  if (!body) throw new Error('The server sent no response body.');

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const flushLine = (line: string): void => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      onEvent(JSON.parse(trimmed) as PipelineEvent);
    } catch {
      // A malformed line is not worth aborting a nearly-complete report for.
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex = buffer.indexOf('\n');
    while (newlineIndex !== -1) {
      flushLine(buffer.slice(0, newlineIndex));
      buffer = buffer.slice(newlineIndex + 1);
      newlineIndex = buffer.indexOf('\n');
    }
  }

  buffer += decoder.decode();
  flushLine(buffer);
}

/** Used by the mock pipeline to pace its replay. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
