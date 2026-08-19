'use client';

import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { SEVERITY_COLOR } from '@/components/ui/badge';
import { ClauseBlock, findingKey } from '@/components/report/clause-block';
import { FindingPanel } from '@/components/report/finding-panel';
import type { Clause, Finding } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

/**
 * The signature surface, shared by the pipeline screen and the report so the
 * document never jumps between them: a `--surface` column of real clause text,
 * and a fixed-width gutter holding the annotations.
 *
 * The two columns are one CSS grid, and every clause row uses `grid-cols-subgrid`
 * so a flag sits at its clause's vertical position by construction — no
 * measuring, no absolute offsets, nothing to fall out of sync when text reflows.
 * Below `lg` the grid collapses to one column and each flag renders directly
 * beneath its clause.
 */

/** Seconds for one full sweep of the column. Steady, not urgent. */
const SWEEP_SECONDS = 5.5;

function GutterFlag({
  finding,
  clause,
  expanded,
  highlighted,
  onToggle,
  onHover,
  index,
}: {
  finding: Finding;
  clause: Clause | undefined;
  expanded: boolean;
  highlighted: boolean;
  onToggle: () => void;
  onHover: (key: string | null) => void;
  index: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 420, damping: 34, delay: index * 0.18 }
      }
      className={cn(
        'border-l-2 pl-3 transition-colors duration-[120ms]',
        highlighted || expanded ? 'border-l-[var(--registrar)]' : 'border-l-[var(--rule)]',
      )}
      onMouseEnter={() => onHover(findingKey(finding))}
      onMouseLeave={() => onHover(null)}
    >
      <button
        type="button"
        data-finding-flag
        aria-expanded={expanded}
        onClick={onToggle}
        className="block w-full text-left"
      >
        <span className="u-mono block text-[var(--ink-soft)]">
          {clause?.number ?? clause?.id ?? finding.clauseId}
        </span>
        <span className="mt-1 flex items-start gap-2">
          <span
            aria-hidden
            className="mt-[5px] inline-block h-[9px] w-[9px] shrink-0 rounded-[1px]"
            style={{ backgroundColor: SEVERITY_COLOR[finding.severity] }}
          />
          <span
            className={cn(
              'text-13 font-medium leading-[1.4] transition-colors duration-[120ms]',
              expanded || highlighted ? 'text-[var(--registrar)]' : 'text-[var(--ink)]',
            )}
          >
            {finding.headline}
          </span>
        </span>
      </button>

      {/* Print expands every finding; on screen only one is open at a time. */}
      <div className="hidden print:block">
        <FindingPanel finding={finding} />
      </div>
      <div className="print:hidden">
        <AnimatePresence initial={false}>
          {expanded ? <FindingPanel finding={finding} /> : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/** The 2px registrar line that sweeps the document column while analysing. */
function ScanLine({ active }: { active: boolean }) {
  const progress = useMotionValue(0);
  const top = useTransform(progress, [0, 1], ['0%', '100%']);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!active || reduceMotion) return;
    const controls = animate(progress, 1, {
      duration: SWEEP_SECONDS,
      ease: 'linear',
      repeat: Infinity,
      repeatType: 'loop',
    });
    return () => controls.stop();
  }, [active, reduceMotion, progress]);

  if (!active || reduceMotion) return null;

  return (
    <motion.div
      data-scanline
      aria-hidden
      style={{ top }}
      className="pointer-events-none absolute left-0 right-0 h-[2px] bg-[var(--registrar)] lg:right-[328px]"
    >
      <div className="absolute inset-x-0 -top-10 h-10 bg-gradient-to-b from-transparent to-[color-mix(in_srgb,var(--registrar)_10%,transparent)]" />
    </motion.div>
  );
}

/**
 * Tracks how far the sweep has travelled and reports how many clauses it has
 * passed. Monotonic: the first pass reveals the column, later passes are just
 * the line moving.
 */
function useRevealedCount(active: boolean, total: number): number {
  const [swept, setSwept] = useState(0);
  const reduceMotion = useReducedMotion();
  const highest = useRef(0);

  useEffect(() => {
    if (!active || reduceMotion || total === 0) return;

    highest.current = 0;
    const started = performance.now();
    let frame = 0;

    const tick = (now: number): void => {
      const fraction = Math.min(1, (now - started) / (SWEEP_SECONDS * 1000));
      const passed = Math.ceil(fraction * total);
      if (passed > highest.current) {
        highest.current = passed;
        setSwept(passed);
      }
      if (fraction < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, reduceMotion, total]);

  // Derived, not stored: with no sweep running everything is simply revealed.
  return active && !reduceMotion ? swept : total;
}

/**
 * The shared two-column geometry. Screens that put something in the gutter
 * beside their heading (the stage list, the severity key) use this so their
 * gutter lines up with the flags below it.
 */
export const PAGE_GRID =
  'grid grid-cols-1 gap-y-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-x-7';

export function MarkedPage({
  clauses,
  findings,
  scanning,
}: {
  clauses: Clause[];
  findings: Finding[];
  /** True while the analysis is still running: sweeps the line, dims ahead. */
  scanning: boolean;
}) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const columnRef = useRef<HTMLDivElement>(null);

  const revealed = useRevealedCount(scanning, clauses.length);

  const byClause = new Map<string, Finding[]>();
  for (const finding of findings) {
    const list = byClause.get(finding.clauseId) ?? [];
    list.push(finding);
    byClause.set(finding.clauseId, list);
  }

  // Underlines draw as their finding arrives; once drawn they stay drawn.
  const drawnKeys = new Set(findings.map(findingKey));

  // Arrival order, precomputed: the fly-in stagger needs a stable index and a
  // counter mutated during render is not one.
  const arrivalOrder = new Map(findings.map((finding, index) => [findingKey(finding), index]));

  return (
    /* One grid: single column below `lg`, document + gutter above it. The
       columns must come from utility classes rather than an inline style,
       because an inline `grid-template-columns` cannot be overridden at a
       breakpoint and the mobile collapse would silently never happen. */
    <div className="relative grid grid-cols-1 gap-y-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-x-7 lg:gap-y-0">
      {/* The paper field spans only the document column. 328px = gutter + gap. */}
      <div
        aria-hidden
        className="u-paper absolute inset-y-0 left-0 right-0 lg:right-[328px]"
      />

      <div
        ref={columnRef}
        className="relative lg:col-span-2 lg:grid lg:grid-cols-subgrid"
      >
        <ScanLine active={scanning} />

        {clauses.map((clause, index) => {
          const clauseFindings = byClause.get(clause.id) ?? [];
          return (
            <div
              key={clause.id}
              className="border-b border-[var(--rule)] last:border-b-0 lg:col-span-2 lg:grid lg:grid-cols-subgrid lg:border-b-0"
            >
              <div className="relative lg:col-start-1 lg:border-b lg:border-[var(--rule)]">
                <ClauseBlock
                  clause={clause}
                  findings={clauseFindings}
                  dimmed={scanning && index >= revealed}
                  highlightedKey={hoveredKey}
                  drawnKeys={drawnKeys}
                  onHover={setHoveredKey}
                />
              </div>

              {clauseFindings.length > 0 ? (
                <div className="space-y-4 px-5 pb-5 sm:px-7 lg:col-start-2 lg:px-0 lg:py-5">
                  {clauseFindings.map((finding) => {
                    const key = findingKey(finding);
                    return (
                      <GutterFlag
                        key={key}
                        finding={finding}
                        clause={clause}
                        index={arrivalOrder.get(key) ?? 0}
                        expanded={expandedKey === key}
                        highlighted={hoveredKey === key}
                        onHover={setHoveredKey}
                        onToggle={() =>
                          setExpandedKey((current) => (current === key ? null : key))
                        }
                      />
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
