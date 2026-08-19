'use client';

import { useState } from 'react';
import { SEVERITY_COLOR } from '@/components/ui/badge';
import { Sheet } from '@/components/ui/sheet';
import { SEVERITIES, SEVERITY_LABEL, SEVERITY_WEIGHT, type Severity } from '@/lib/types';

/**
 * What the five colours mean, and — behind "How this is scored" — how the number
 * on the dial is actually arrived at. A score a person is asked to act on should
 * be explainable, not oracular.
 */
const MEANING: Record<Severity, string> = {
  critical:
    'You could lose a large sum, your home, or your cover. Worth refusing to sign until it changes.',
  high: 'Seriously one-sided, and it will cost you real money or rights if it is ever used.',
  moderate: 'A genuine cost or restriction, but a bounded one. Worth asking to change.',
  low: 'Minor or merely annoying. Useful to know about before you sign.',
  fair: 'Noted for context, not a risk.',
};

/**
 * A legend, not a tally. The counts for this document are already stated in the
 * verdict header; repeating them here would be the same numbers twice on one
 * screen. What this adds is the whole scale — including the levels this document
 * happens not to contain — so the colours in the margin are readable at a glance.
 */
export function SeverityKey() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <p className="u-mono mb-2.5 text-[var(--ink-soft)]">Severity scale</p>
      <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {SEVERITIES.map((severity) => (
          <li key={severity} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-[9px] w-[9px] shrink-0 rounded-[1px]"
              style={{ backgroundColor: SEVERITY_COLOR[severity] }}
            />
            <span className="text-13 text-[var(--ink-soft)]">
              {SEVERITY_LABEL[severity]}
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="u-mono print-hide mt-3 text-[var(--registrar)] underline decoration-[var(--rule)] underline-offset-[3px] transition-colors duration-[120ms] hover:decoration-[var(--registrar)]"
      >
        How this is scored
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="How this is scored">
        <div className="space-y-5">
          <div>
            <p className="u-mono mb-2 text-[var(--registrar)]">The five levels</p>
            <ul className="space-y-2.5">
              {SEVERITIES.map((severity) => (
                <li key={severity} className="flex gap-2.5">
                  <span
                    aria-hidden
                    className="mt-[6px] inline-block h-[9px] w-[9px] shrink-0 rounded-[1px]"
                    style={{ backgroundColor: SEVERITY_COLOR[severity] }}
                  />
                  <span>
                    <span className="block text-13 font-medium text-[var(--ink)]">
                      {SEVERITY_LABEL[severity]}
                      <span className="u-mono-num ml-2 text-11 font-normal text-[var(--ink-soft)]">
                        weight {SEVERITY_WEIGHT[severity]}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-13 leading-[1.5] text-[var(--ink-soft)]">
                      {MEANING[severity]}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="u-mono mb-2 text-[var(--registrar)]">The number</p>
            <p className="text-13 leading-[1.55] text-[var(--ink-soft)]">
              Each finding contributes its severity weight multiplied by how
              confident the review is in it. Those contributions are added up, then
              flattened onto a 0&ndash;100 scale that saturates &mdash; so a long
              list of small niggles can never outrank two genuinely dangerous
              clauses, and a hedged finding moves the number less than a certain
              one.
            </p>
            <p className="mt-2.5 text-13 leading-[1.55] text-[var(--ink-soft)]">
              A single critical finding forces the strongest verdict whatever the
              score works out to. Above 70, or any critical:{' '}
              <em>don&rsquo;t sign as is</em>. From 40:{' '}
              <em>negotiate first</em>. From 15: <em>sign with your eyes open</em>.
              Below that, it looks fair.
            </p>
          </div>

          <div>
            <p className="u-mono mb-2 text-[var(--registrar)]">What it is not</p>
            <p className="text-13 leading-[1.55] text-[var(--ink-soft)]">
              It is not a legal opinion and not a prediction of what a court would
              do. It is a reading of how one-sided the document is compared with
              what is normal in India for this kind of agreement.
            </p>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
