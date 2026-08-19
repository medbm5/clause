'use client';

import { motion, useReducedMotion } from 'motion/react';
import { SEVERITY_COLOR } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { SEVERITY_LABEL, type Finding } from '@/lib/types';

/**
 * The expanded finding. Four questions in a fixed order, because a reader who is
 * anxious wants them in that order: what does this mean, what does it cost me,
 * what's normal, what do I say. The evidence — matched patterns with their real
 * similarity, and the model's confidence — sits last, small, in mono.
 */
export function FindingPanel({ finding }: { finding: Finding }) {
  const reduceMotion = useReducedMotion();

  const rows: Array<{ label: string; body: string }> = [
    { label: 'What it means', body: finding.plainLanguage },
    { label: 'Why it matters', body: finding.whyItMatters },
    ...(finding.standardPractice
      ? [{ label: "What's normal", body: finding.standardPractice }]
      : []),
    { label: 'What to ask for', body: finding.suggestedAction },
  ];

  return (
    <motion.div
      data-finding-panel
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      <div className="mt-2.5 space-y-3 border-t border-[var(--rule)] pt-3">
        <p className="u-mono flex items-center gap-1.5 text-[var(--ink-soft)]">
          <span
            aria-hidden
            className="inline-block h-[9px] w-[9px] rounded-[1px]"
            style={{ backgroundColor: SEVERITY_COLOR[finding.severity] }}
          />
          {SEVERITY_LABEL[finding.severity]} · {finding.category}
        </p>

        {rows.map((row) => (
          <div key={row.label}>
            <p className="u-mono text-[var(--registrar)]">{row.label}</p>
            <p className="mt-1 text-13 leading-[1.55] text-[var(--ink)]">{row.body}</p>
          </div>
        ))}

        {finding.quote ? (
          <blockquote className="border-l-2 border-[var(--rule)] pl-3 text-13 italic leading-[1.5] text-[var(--ink-soft)]">
            &ldquo;{finding.quote}&rdquo;
          </blockquote>
        ) : null}

        <div className="space-y-1.5 border-t border-[var(--rule)] pt-2.5">
          {finding.matches.length > 0 ? (
            <>
              <p className="u-mono text-[var(--ink-soft)]">Matched patterns</p>
              <ul className="space-y-1">
                {finding.matches.map((match) => (
                  <li
                    key={match.patternId}
                    className="flex items-baseline justify-between gap-3 text-13 text-[var(--ink-soft)]"
                  >
                    <span className="min-w-0">{match.title}</span>
                    <span className="u-mono-num shrink-0 text-11 text-[var(--ink-soft)]">
                      {match.similarity.toFixed(3)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <p className="u-mono pt-0.5 text-[var(--ink-soft)]">
            <Tooltip
              label={
                finding.confidence < 0.6
                  ? 'How sure the review is about this reading. Below 0.6 means the clause is vague or truncated and this is partly an extrapolation — worth checking the wording yourself.'
                  : 'How sure the review is about this reading, from 0 to 1. Higher means the clause says this plainly.'
              }
            >
              <span className="u-mono text-[var(--ink-soft)]">
                Confidence{' '}
                <span className="u-mono-num text-11">{finding.confidence.toFixed(2)}</span>
              </span>
            </Tooltip>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
