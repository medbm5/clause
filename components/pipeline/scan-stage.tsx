'use client';

import { StageList } from '@/components/pipeline/stage-list';
import { MarkedPage, PAGE_GRID } from '@/components/report/marked-page';
import type { Clause, Finding, StageId } from '@/lib/types';
import type { StageState } from '@/lib/use-analysis';
import { cn } from '@/lib/utils/cn';

/**
 * The analysing screen. It is deliberately the *same* marked page the report
 * uses, with the scan running — so when the run finishes, the document does not
 * move. Nothing here is a loading state standing in for content: the clause text
 * on screen is the real extracted text, and the flags are real findings landing
 * one at a time.
 *
 * The stage list sits in the gutter beside the heading rather than beside the
 * first clause: putting it in a grid row with the document column made that row
 * as tall as the stage list and opened a dead gap above the first clause.
 */
export function ScanStage({
  title,
  clauses,
  findings,
  stages,
}: {
  title: string;
  clauses: Clause[];
  findings: Finding[];
  stages: Record<StageId, StageState>;
}) {
  return (
    <div>
      <div className={cn(PAGE_GRID, 'items-start')}>
        <div>
          <p className="u-mono text-[var(--registrar)]">Reading your document</p>
          <h1 className="u-display mt-3 max-w-[30ch] text-28 text-[var(--ink)] sm:text-40">
            {title}
          </h1>
        </div>

        <div className="lg:pt-1">
          <StageList
            stages={stages}
            clauseCount={clauses.length}
            findingCount={findings.length}
          />
        </div>
      </div>

      <div className="mt-8 sm:mt-10">
        {clauses.length === 0 ? (
          <div className="u-paper flex min-h-[220px] items-center justify-center px-6 py-16 lg:mr-[328px]">
            <p className="u-mono text-[var(--ink-soft)]">
              Pulling the text out of your document
            </p>
          </div>
        ) : (
          <MarkedPage clauses={clauses} findings={findings} scanning />
        )}
      </div>
    </div>
  );
}
