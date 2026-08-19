'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SEVERITY_COLOR } from '@/components/ui/badge';
import type { Clause, Finding, Severity } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

/** Stable identity for a finding across renders and re-orderings. */
export function findingKey(finding: Finding): string {
  return `${finding.clauseId}|${finding.headline}`;
}

interface Segment {
  text: string;
  finding?: Finding;
}

/**
 * Splits clause text around each finding's verified quote so the quoted span can
 * be underlined in place. Overlapping quotes are skipped rather than nested — a
 * second underline through the same words would be unreadable, and the gutter
 * still lists both findings.
 */
export function segmentClauseText(text: string, findings: Finding[]): Segment[] {
  const spans: Array<{ start: number; end: number; finding: Finding }> = [];

  for (const finding of findings) {
    if (!finding.quote) continue;
    const start = text.indexOf(finding.quote);
    if (start === -1) continue;
    const end = start + finding.quote.length;
    if (spans.some((span) => start < span.end && end > span.start)) continue;
    spans.push({ start, end, finding });
  }

  if (spans.length === 0) return [{ text }];

  spans.sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start > cursor) segments.push({ text: text.slice(cursor, span.start) });
    segments.push({ text: text.slice(span.start, span.end), finding: span.finding });
    cursor = span.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });

  return segments;
}

interface Rect {
  left: number;
  top: number;
  width: number;
}

/**
 * A quote that wraps produces several inline fragments, and an absolutely
 * positioned child of the span would only ever cover the first one. So the
 * fragments are measured with `getClientRects()` and one underline is drawn per
 * line — which is also what a person with a pen would do.
 */
function useFragmentRects(
  spanRef: React.RefObject<HTMLElement | null>,
  containerRef: React.RefObject<HTMLElement | null>,
): Rect[] {
  const [rects, setRects] = useState<Rect[]>([]);

  const measure = useCallback(() => {
    const span = spanRef.current;
    const container = containerRef.current;
    if (!span || !container) return;

    const base = container.getBoundingClientRect();
    const next = Array.from(span.getClientRects()).map((rect) => ({
      left: rect.left - base.left,
      top: rect.bottom - base.top,
      width: rect.width,
    }));

    setRects((previous) =>
      previous.length === next.length &&
      previous.every(
        (rect, index) =>
          Math.abs(rect.left - next[index].left) < 0.5 &&
          Math.abs(rect.top - next[index].top) < 0.5 &&
          Math.abs(rect.width - next[index].width) < 0.5,
      )
        ? previous
        : next,
    );
  }, [spanRef, containerRef]);

  useEffect(() => {
    measure();

    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(measure);
    observer.observe(container);

    // Web fonts land after first paint and reflow the text under the underline.
    if ('fonts' in document) void document.fonts.ready.then(measure);
    window.addEventListener('resize', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, containerRef]);

  return rects;
}

/** The wobble. Deterministic in the fragment's width, so it never re-draws itself
 * differently on a re-render. */
function wobblePath(width: number): string {
  const w = Math.max(width, 8);
  const points = [
    [0, 3.4],
    [w * 0.18, 2.2],
    [w * 0.34, 4.1],
    [w * 0.52, 2.7],
    [w * 0.68, 4.0],
    [w * 0.84, 2.5],
    [w, 3.5],
  ] as const;

  return points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(2)}`)
    .join(' ');
}

function QuoteUnderlines({
  severity,
  rects,
  drawn,
  emphasis,
}: {
  severity: Severity;
  rects: Rect[];
  drawn: boolean;
  emphasis: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <span data-underline aria-hidden className="pointer-events-none absolute inset-0">
      {rects.map((rect, index) => (
        <svg
          key={index}
          className="absolute overflow-visible"
          style={{ left: rect.left, top: rect.top - 1, width: rect.width, height: 7 }}
          viewBox={`0 0 ${Math.max(rect.width, 8)} 7`}
          preserveAspectRatio="none"
        >
          <motion.path
            d={wobblePath(rect.width)}
            fill="none"
            stroke={SEVERITY_COLOR[severity]}
            strokeWidth={emphasis ? 2.4 : 1.8}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1 1"
            initial={{ strokeDashoffset: reduceMotion ? 0 : 1 }}
            animate={{ strokeDashoffset: drawn ? 0 : 1 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.45, ease: 'easeOut', delay: index * 0.06 }
            }
          />
        </svg>
      ))}
    </span>
  );
}

/** One underlined quote inside the clause text. */
function QuoteSpan({
  text,
  finding,
  containerRef,
  drawn,
  emphasis,
  onEnter,
  onLeave,
}: {
  text: string;
  finding: Finding;
  containerRef: React.RefObject<HTMLElement | null>;
  drawn: boolean;
  emphasis: boolean;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const rects = useFragmentRects(spanRef, containerRef);

  return (
    <>
      <span
        ref={spanRef}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        className="transition-colors duration-[120ms]"
        style={
          emphasis
            ? {
                backgroundColor: `color-mix(in srgb, ${SEVERITY_COLOR[finding.severity]} 12%, transparent)`,
              }
            : undefined
        }
      >
        {text}
      </span>
      <QuoteUnderlines
        severity={finding.severity}
        rects={rects}
        drawn={drawn}
        emphasis={emphasis}
      />
    </>
  );
}

export function ClauseBlock({
  clause,
  findings,
  dimmed,
  highlightedKey,
  drawnKeys,
  onHover,
}: {
  clause: Clause;
  findings: Finding[];
  /** True while the scan line has not yet reached this clause. */
  dimmed: boolean;
  highlightedKey: string | null;
  /** Findings whose underline should be drawn. */
  drawnKeys: ReadonlySet<string>;
  onHover: (key: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const segments = segmentClauseText(clause.text, findings);
  const label = [clause.number, clause.heading].filter(Boolean).join(' · ');

  // A finding whose quote could not be located still needs to be visible on the
  // clause, so the block carries a severity rule instead of an underline.
  const unquoted = findings.filter(
    (finding) => !finding.quote || !clause.text.includes(finding.quote),
  );

  return (
    <div
      data-clause-block
      data-clause-id={clause.id}
      className={cn(
        'print-break-avoid relative px-5 py-4 transition-opacity sm:px-7 sm:py-5',
        dimmed ? 'opacity-45' : 'opacity-100',
      )}
      style={{ transitionDuration: dimmed ? '0ms' : '420ms' }}
    >
      {unquoted.length > 0 ? (
        <span
          aria-hidden
          className="absolute inset-y-4 left-0 w-[2px]"
          style={{ backgroundColor: SEVERITY_COLOR[unquoted[0].severity] }}
        />
      ) : null}

      {label ? (
        <p className="u-mono mb-1.5 text-[var(--ink-soft)]">{label}</p>
      ) : null}

      <div ref={containerRef} className="relative text-15 leading-[1.62] text-[var(--ink)]">
        {segments.map((segment, index) =>
          segment.finding ? (
            <QuoteSpan
              key={index}
              text={segment.text}
              finding={segment.finding}
              containerRef={containerRef}
              drawn={drawnKeys.has(findingKey(segment.finding))}
              emphasis={highlightedKey === findingKey(segment.finding)}
              onEnter={() => onHover(findingKey(segment.finding!))}
              onLeave={() => onHover(null)}
            />
          ) : (
            <span key={index}>{segment.text}</span>
          ),
        )}
      </div>
    </div>
  );
}
