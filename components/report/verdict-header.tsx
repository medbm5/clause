'use client';

import { useSpring, useTransform, useReducedMotion, motion } from 'motion/react';
import { useEffect } from 'react';
import { SEVERITY_COLOR } from '@/components/ui/badge';
import {
  SEVERITIES,
  SEVERITY_LABEL,
  VERDICT_SENTENCE,
  type RiskReport,
  type Severity,
  type Verdict,
} from '@/lib/types';

/**
 * The verdict colour is the severity colour of the worst thing the verdict
 * implies, so the dial, the sentence and the margin flags all speak the same
 * five-colour language.
 */
const VERDICT_TONE: Record<Verdict, Severity> = {
  do_not_sign_as_is: 'critical',
  negotiate_first: 'high',
  sign_with_caution: 'moderate',
  looks_fair: 'fair',
};

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The one round thing in the product — everything else is a 2px radius. It
 * counts up on a spring, because the number is the answer to the question the
 * user came with and it should feel like it is being arrived at.
 */
function ScoreDial({ score, tone }: { score: number; tone: Severity }) {
  const reduceMotion = useReducedMotion();
  const value = useSpring(reduceMotion ? score : 0, {
    stiffness: 70,
    damping: 18,
    restDelta: 0.01,
  });

  const rounded = useTransform(value, (current) => Math.round(current));
  const offset = useTransform(
    value,
    (current) => CIRCUMFERENCE * (1 - Math.min(100, Math.max(0, current)) / 100),
  );

  useEffect(() => {
    if (reduceMotion) {
      value.jump(score);
      return;
    }
    value.set(score);
  }, [score, value, reduceMotion]);

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[100px] w-[100px] shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle
            cx={50}
            cy={50}
            r={RADIUS}
            fill="none"
            stroke="var(--rule)"
            strokeWidth={3}
          />
          <motion.circle
            cx={50}
            cy={50}
            r={RADIUS}
            fill="none"
            stroke={SEVERITY_COLOR[tone]}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            style={{ strokeDashoffset: offset }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            data-score
            className="u-display text-28 leading-none text-[var(--ink)]"
            aria-hidden
          >
            {rounded}
          </motion.span>
          <span className="u-mono mt-1 text-[9px] text-[var(--ink-soft)]">/ 100</span>
        </div>
      </div>

      <div>
        <p className="u-mono text-[var(--ink-soft)]">Risk score</p>
        <p className="mt-1 text-13 leading-[1.45] text-[var(--ink-soft)]">
          Higher is riskier. <span className="sr-only">{score} out of 100.</span>
          Weighted by how serious each issue is and how sure the review is.
        </p>
      </div>
    </div>
  );
}

export function VerdictHeader({ report }: { report: RiskReport }) {
  const tone = VERDICT_TONE[report.verdict];
  const present = SEVERITIES.filter((severity) => report.counts[severity] > 0);

  return (
    <div>
      <p className="u-mono text-[var(--registrar)]">
        {report.docType === 'rental'
          ? 'Rental agreement · reviewed'
          : report.docType === 'health_insurance'
            ? 'Health policy · reviewed'
            : 'Document · reviewed'}
      </p>

      <h1 className="u-display mt-3 max-w-[30ch] text-28 text-[var(--ink)] sm:text-40">
        {report.title}
      </h1>

      <p
        data-verdict
        className="u-display mt-5 text-21 sm:text-28"
        style={{ color: SEVERITY_COLOR[tone] }}
      >
        {VERDICT_SENTENCE[report.verdict]}
      </p>

      <p className="mt-4 max-w-[60ch] text-17 leading-[1.6] text-[var(--ink)]">
        {report.summary}
      </p>

      {present.length > 0 ? (
        <ul className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          {present.map((severity) => (
            <li key={severity} className="u-mono flex items-center gap-1.5 text-[var(--ink-soft)]">
              <span
                aria-hidden
                className="inline-block h-[9px] w-[9px] rounded-[1px]"
                style={{ backgroundColor: SEVERITY_COLOR[severity] }}
              />
              {report.counts[severity]} {SEVERITY_LABEL[severity]}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="u-mono mt-4 text-[var(--ink-soft)]">
        {report.meta.clauseCount} clauses read ·{' '}
        {report.findings.length === 0 ? 'nothing flagged' : `${report.findings.length} flagged`}
        {report.meta.truncated ? ' · document truncated to fit' : ''}
      </p>
    </div>
  );
}

export { ScoreDial };
