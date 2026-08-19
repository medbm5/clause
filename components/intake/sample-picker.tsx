'use client';

import { FileText } from 'lucide-react';
import { SAMPLE_DOCS } from '@/lib/config';
import type { SampleId } from '@/lib/types';

/**
 * The one-click path. Page and clause counts come from `SAMPLE_DOCS`, the same
 * constant `scripts/make-samples.ts` asserts its output against, so these labels
 * cannot drift away from the documents they describe.
 */
const SAMPLES = (Object.keys(SAMPLE_DOCS) as SampleId[]).map((id) => ({
  id,
  ...SAMPLE_DOCS[id],
}));

export function SamplePicker({
  onSelect,
  disabled = false,
}: {
  onSelect: (sample: SampleId) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="u-mono mb-2.5 text-[var(--ink-soft)]">Or try one of these</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {SAMPLES.map((sample) => (
          <button
            key={sample.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(sample.id)}
            className="group flex items-start gap-3 rounded-[2px] border border-[var(--rule)] bg-[var(--surface)] p-3.5 text-left transition-colors duration-[120ms] hover:border-[var(--registrar)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FileText
              size={16}
              strokeWidth={1.5}
              aria-hidden
              className="mt-[3px] shrink-0 text-[var(--ink-soft)] transition-colors duration-[120ms] group-hover:text-[var(--registrar)]"
            />
            <span className="min-w-0">
              <span className="block text-15 font-medium leading-[1.35] text-[var(--ink)]">
                {sample.label}
              </span>
              <span className="u-mono mt-1 block text-[var(--ink-soft)]">
                {sample.pages} pages · {sample.clauses} clauses
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
