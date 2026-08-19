import type { Severity } from '@/lib/types';
import { SEVERITY_COLOR } from '@/components/ui/badge';

/**
 * The thesis of the product is the marked-up document, so the intake screen
 * shows one: a miniature agreement page with three annotations already drawn in
 * the margin. It is built from the same tokens and the same margin geometry as
 * the real report, so it reads as a preview rather than as an illustration.
 */

interface PreviewBlock {
  /** Line widths as percentages, standing in for wrapped clause text. */
  lines: number[];
  flag?: { number: string; severity: Severity; label: string };
}

const BLOCKS: PreviewBlock[] = [
  { lines: [96, 88, 62] },
  {
    lines: [94, 78],
    flag: { number: '4.1', severity: 'high', label: 'Deposit' },
  },
  { lines: [92, 86, 54] },
  {
    lines: [90, 72],
    flag: { number: '5', severity: 'critical', label: 'Lock-in' },
  },
  { lines: [95, 60] },
  {
    lines: [93, 80],
    flag: { number: '8', severity: 'moderate', label: 'Entry' },
  },
  { lines: [88, 46] },
];

/** A hand-drawn-feeling underline: the same wobble the report uses, shorter. */
function PreviewUnderline({ severity }: { severity: Severity }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 4"
      preserveAspectRatio="none"
      className="mt-[3px] h-[3px] w-full"
    >
      <path
        d="M0 2.4 C 12 1.2, 24 3.1, 37 2.1 S 62 1.1, 74 2.6 S 92 1.4, 100 2.2"
        fill="none"
        stroke={SEVERITY_COLOR[severity]}
        strokeWidth={1.6}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function MarkedPagePreview() {
  return (
    <div
      role="img"
      aria-label="A miniature rental agreement page with three clauses flagged in the margin: clause 4.1 for the security deposit, clause 5 for the lock-in period, and clause 8 for the landlord's right of entry."
      className="relative grid w-full grid-cols-[1fr_76px] gap-x-3 sm:grid-cols-[1fr_92px]"
    >
      <div className="u-paper absolute inset-y-0 left-0 right-[88px] sm:right-[104px]" aria-hidden />

      {/* `relative` so the clause lines stack above the absolute paper field —
          without it the background paints over its own content. */}
      <div className="relative col-span-2 grid grid-cols-subgrid gap-y-4 py-5">
        <p className="u-mono col-start-1 px-5 text-[9px] text-[var(--ink-soft)]">
          Rental agreement · Bengaluru
        </p>

        {BLOCKS.map((block, blockIndex) => (
          <div key={blockIndex} className="col-span-2 grid grid-cols-subgrid">
            <div className="col-start-1 space-y-[5px] px-5">
              {block.lines.map((width, lineIndex) => {
                const isLast = lineIndex === block.lines.length - 1;
                return (
                  <div key={lineIndex} style={{ width: `${width}%` }}>
                    <div
                      aria-hidden
                      className="h-[4px] rounded-[1px] bg-[var(--rule)]"
                    />
                    {isLast && block.flag ? (
                      <PreviewUnderline severity={block.flag.severity} />
                    ) : null}
                  </div>
                );
              })}
            </div>

            {block.flag ? (
              <div className="col-start-2 flex flex-col gap-[3px] border-l border-[var(--rule)] pl-2">
                <span className="u-mono text-[9px] text-[var(--ink-soft)]">
                  {block.flag.number}
                </span>
                <span className="flex items-center gap-1">
                  <span
                    aria-hidden
                    className="h-[7px] w-[7px] shrink-0 rounded-[1px]"
                    style={{ backgroundColor: SEVERITY_COLOR[block.flag.severity] }}
                  />
                  <span className="text-[10px] leading-none text-[var(--ink)]">
                    {block.flag.label}
                  </span>
                </span>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <div className="grid items-start gap-10 md:grid-cols-[1.15fr_1fr] md:gap-14">
      <div>
        <p className="u-mono text-[var(--registrar)]">
          Clause · Contract review for India
        </p>
        <h1 className="u-display mt-5 text-40 text-[var(--ink)] sm:text-56">
          Find out what you&rsquo;re signing.
        </h1>
        <p className="mt-5 max-w-[46ch] text-17 text-[var(--ink-soft)]">
          Upload a rental agreement or health insurance policy. Get every
          one-sided clause flagged in plain English, with what&rsquo;s normal and
          what to ask for instead.
        </p>
      </div>

      <div className="order-first w-full max-w-[380px] md:order-none md:mt-3 md:justify-self-end">
        <MarkedPagePreview />
      </div>
    </div>
  );
}
