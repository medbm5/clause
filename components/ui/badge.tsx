import type { ReactNode } from 'react';
import { SEVERITY_LABEL, type Severity } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

/**
 * The single source of severity colour for the whole UI. Everything that paints
 * a severity — the gutter flag, the clause underline, the score dial, the key —
 * reads from here, so a severity can never be one colour in the margin and
 * another in the header.
 */
export const SEVERITY_COLOR: Record<Severity, string> = {
  critical: 'var(--flag-crit)',
  high: 'var(--flag-high)',
  moderate: 'var(--flag-mod)',
  low: 'var(--flag-low)',
  fair: 'var(--flag-fair)',
};

/** A small filled square in the severity colour. The severity's whole identity. */
export function SeverityMark({
  severity,
  className,
}: {
  severity: Severity;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn('inline-block h-[9px] w-[9px] shrink-0 rounded-[1px]', className)}
      style={{ backgroundColor: SEVERITY_COLOR[severity] }}
    />
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className="u-mono inline-flex items-center gap-1.5 text-[var(--ink-soft)]">
      <SeverityMark severity={severity} />
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

/** The mono utility chip: `Demo data`, counts, stage labels, meta values. */
export function Chip({
  children,
  tone = 'neutral',
  className,
  title,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'registrar';
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        'u-mono inline-flex items-center gap-1.5 rounded-[2px] border px-2 py-[3px]',
        tone === 'registrar'
          ? 'border-[var(--registrar)] text-[var(--registrar)]'
          : 'border-[var(--rule)] text-[var(--ink-soft)]',
        className,
      )}
    >
      {children}
    </span>
  );
}
