'use client';

import { STAGE_LABELS, STAGE_ORDER, type StageId } from '@/lib/types';
import type { StageState } from '@/lib/use-analysis';
import { cn } from '@/lib/utils/cn';

/**
 * The five stages, in mono, in the gutter. Every label says what happened rather
 * than what the system is doing internally — "Splitting into clauses", not
 * "segmentation" — because the person reading it is waiting on their own
 * document, not inspecting a pipeline.
 *
 * `aria-live="polite"` on the list means a screen reader hears each stage as it
 * completes without the announcements interrupting each other.
 */
export function StageList({
  stages,
  clauseCount,
  findingCount,
}: {
  stages: Record<StageId, StageState>;
  clauseCount: number;
  findingCount: number;
}) {
  return (
    <div>
      <p className="u-mono mb-3 text-[var(--registrar)]">Reviewing</p>

      <ol className="space-y-2.5" aria-live="polite">
        {STAGE_ORDER.map((id) => {
          const stage = stages[id];
          const active = stage.status === 'active';
          const done = stage.status === 'done';

          return (
            <li key={id} className="flex items-start gap-2.5">
              <span
                aria-hidden
                className={cn(
                  'mt-[5px] h-[9px] w-[9px] shrink-0 rounded-[1px] border',
                  done && 'border-[var(--registrar)] bg-[var(--registrar)]',
                  active && 'u-breathe border-[var(--registrar)] bg-[var(--registrar)]',
                  !done && !active && 'border-[var(--rule)] bg-transparent',
                )}
              />
              <span className="min-w-0">
                <span
                  className={cn(
                    'block text-13 leading-[1.4]',
                    done || active ? 'text-[var(--ink)]' : 'text-[var(--ink-soft)]',
                  )}
                >
                  {STAGE_LABELS[id]}
                  <span className="sr-only">{done ? ' — done' : active ? ' — in progress' : ' — waiting'}</span>
                </span>
                {stage.detail ? (
                  <span className="u-mono mt-0.5 block text-[var(--ink-soft)]">
                    {stage.detail}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="u-mono mt-4 border-t border-[var(--rule)] pt-3 text-[var(--ink-soft)]">
        {clauseCount} clauses · {findingCount} flagged
      </p>
    </div>
  );
}
