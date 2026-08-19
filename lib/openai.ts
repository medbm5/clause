import OpenAI from 'openai';
import type {
  ChatCompletionContentPart,
  ChatCompletionMessageParam,
} from 'openai/resources/chat/completions';

/**
 * One client, one retry policy, one strict-JSON helper. Everything that talks
 * to OpenAI goes through here so failure handling is uniform: the pipeline's
 * contract with the UI is that a partial report beats a crash, and that starts
 * with knowing exactly which errors are worth retrying.
 */

let client: OpenAI | null = null;

export function hasApiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  client ??= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 0, // retries are handled by withRetry so backoff is observable
    timeout: 55_000,
  });
  return client;
}

/** Errors worth a second attempt: transport blips, rate limits, 5xx. */
function isRetryable(error: unknown): boolean {
  if (error instanceof OpenAI.APIError) {
    const status = error.status;
    return status === undefined || status === 408 || status === 409 || status === 429 || status >= 500;
  }
  return error instanceof Error;
}

export function describeError(error: unknown): string {
  if (error instanceof OpenAI.APIError) {
    return `${error.status ?? 'network'}: ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
}

/**
 * Retry with exponential backoff and jitter. `attempts` counts total tries, so
 * `attempts: 2` is "try once, retry once" — the policy the analysis batches use.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { attempts?: number; baseDelayMs?: number; label?: string } = {},
): Promise<T> {
  const attempts = options.attempts ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 600;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !isRetryable(error)) break;
      const delay = baseDelayMs * 2 ** (attempt - 1) + Math.random() * 250;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(
    `${options.label ?? 'OpenAI call'} failed after ${attempts} attempt(s): ${describeError(lastError)}`,
  );
}

export interface JsonCallOptions<T> {
  model: string;
  system: string;
  /** A plain string, or content parts when an image is involved. */
  user: string | ChatCompletionContentPart[];
  /** Schema name reported to the API; a-z, A-Z, 0-9, _ and - only. */
  schemaName: string;
  /** JSON Schema. Must satisfy the strict-mode subset. */
  schema: Record<string, unknown>;
  /** Validator — pass a zod schema's `.parse`. Throws on mismatch. */
  parse: (value: unknown) => T;
  temperature?: number;
  maxOutputTokens?: number;
  attempts?: number;
  label?: string;
}

/**
 * A strict-JSON chat completion, validated before it is returned. A schema
 * violation or unparseable body is thrown as a normal error so callers can
 * decide between retrying, degrading, or skipping.
 */
export async function completeJson<T>(options: JsonCallOptions<T>): Promise<T> {
  const openai = getOpenAI();
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: options.system },
    { role: 'user', content: options.user },
  ];

  return withRetry(
    async () => {
      const completion = await openai.chat.completions.create({
        model: options.model,
        messages,
        temperature: options.temperature ?? 0.2,
        max_completion_tokens: options.maxOutputTokens ?? 4096,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: options.schemaName,
            strict: true,
            schema: options.schema,
          },
        },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error('empty completion');
      return options.parse(JSON.parse(content) as unknown);
    },
    { attempts: options.attempts ?? 2, label: options.label ?? options.schemaName },
  );
}

/** A plain-text completion. Used for OCR transcription and the final summary. */
export async function completeText(options: {
  model: string;
  system: string;
  user: string | ChatCompletionContentPart[];
  temperature?: number;
  maxOutputTokens?: number;
  attempts?: number;
  label?: string;
}): Promise<string> {
  const openai = getOpenAI();
  return withRetry(
    async () => {
      const completion = await openai.chat.completions.create({
        model: options.model,
        messages: [
          { role: 'system', content: options.system },
          { role: 'user', content: options.user },
        ],
        temperature: options.temperature ?? 0.2,
        max_completion_tokens: options.maxOutputTokens ?? 2048,
      });
      const content = completion.choices[0]?.message?.content?.trim();
      if (!content) throw new Error('empty completion');
      return content;
    },
    { attempts: options.attempts ?? 2, label: options.label ?? 'text completion' },
  );
}

/** Batched embeddings. Order of the returned vectors matches the input order. */
export async function embedBatch(
  model: string,
  inputs: string[],
): Promise<number[][]> {
  if (inputs.length === 0) return [];
  const openai = getOpenAI();
  return withRetry(
    async () => {
      const response = await openai.embeddings.create({ model, input: inputs });
      return response.data
        .slice()
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);
    },
    { attempts: 3, label: 'embeddings' },
  );
}
