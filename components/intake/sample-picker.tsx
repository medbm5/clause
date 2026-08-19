'use client';

import { FileText } from 'lucide-react';
import type { SampleId } from '@/lib/types';

/**
 * The one-click path. `clauses` is the number of numbered clauses each bundled
 * PDF actually contains, and `pages` its real page count — both are asserted
 * against the generated files by `scripts/make-samples.ts`, so these labels
 * cannot drift away from the documents they describe.
 */
const SAMPLES: Array<{
  id: SampleId;
  title: string;
  pages: number;
  clauses: number;
}> = [
  {
    id: 'rental',
    title: '11-month rental agreement, Bengaluru',
    pages: 4,
    clauses: 16,
  },
  {
    id: 'insurance',
    title: 'Family floater health policy',
    pages: 4,
    clauses: 14,
  },
];

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
                {sample.title}
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
