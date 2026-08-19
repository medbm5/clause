'use client';

import { Disclaimer } from '@/components/intake/disclaimer';
import { MarkedPage, PAGE_GRID } from '@/components/report/marked-page';
import { ReportActions } from '@/components/report/report-actions';
import { SeverityKey } from '@/components/report/severity-key';
import { ScoreDial, VerdictHeader } from '@/components/report/verdict-header';
import type { RiskReport } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

/**
 * Layout orchestrator. Uses the same `PAGE_GRID` as the pipeline screen so the
 * gutter column lines up between the two: when the run finishes, the document
 * column does not move under the reader.
 */
export function ReportView({
  report,
  onReset,
}: {
  report: RiskReport;
  onReset: () => void;
}) {
  const nothingFound = report.findings.length === 0;

  return (
    <div data-report-root>
      <div className={cn(PAGE_GRID, 'items-start')}>
        <VerdictHeader report={report} />

        <div className="space-y-6 lg:pt-1">
          <ScoreDial
            score={report.score}
            tone={
              report.verdict === 'do_not_sign_as_is'
                ? 'critical'
                : report.verdict === 'negotiate_first'
                  ? 'high'
                  : report.verdict === 'sign_with_caution'
                    ? 'moderate'
                    : 'fair'
            }
          />
          <SeverityKey />
          <ReportActions report={report} onReset={onReset} />
        </div>
      </div>

      {nothingFound ? (
        <div className="u-paper mt-8 px-5 py-6 sm:px-7 lg:mr-[328px]">
          <p className="text-17 leading-[1.6] text-[var(--ink)]">
            We found nothing materially unfair in these {report.meta.clauseCount}{' '}
            clauses. That&rsquo;s rarer than it should be.
          </p>
          <p className="mt-2 text-15 leading-[1.55] text-[var(--ink-soft)]">
            The full text is below, as read. Nothing flagged is a signal, not a
            gap &mdash; but keep your signed copy, and check anything that turns on
            a figure you were told verbally.
          </p>
        </div>
      ) : null}

      <div className="mt-8 sm:mt-10">
        <MarkedPage
          clauses={report.clauses}
          findings={report.findings}
          scanning={false}
        />
      </div>

      {/* On paper the reader has no header or footer chrome, so the honesty
          statement has to travel with the document itself. */}
      <div className="mt-8 hidden border-t border-[var(--rule)] pt-4 print:block">
        <Disclaimer />
        {report.meta.source === 'mock' ? (
          <p className="u-mono mt-2 text-[var(--ink-soft)]">
            Demo data — not a review of a real document
          </p>
        ) : null}
      </div>
    </div>
  );
}
