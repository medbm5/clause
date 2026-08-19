import { cn } from '@/lib/utils/cn';

/**
 * Present on every screen, including print. Not a legal shield — an honest
 * description of what this is, which is the only way the rest of the product's
 * confidence is earned.
 */
export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={cn('text-13 leading-[1.5] text-[var(--ink-soft)]', className)}>
      Clause is not a law firm and this is not legal advice. It&rsquo;s a reading
      aid — check anything important with a lawyer.
    </p>
  );
}

/** The data-handling line. Says only what is true: nothing is kept. */
export function PrivacyNote({ className }: { className?: string }) {
  return (
    <p className={cn('text-13 leading-[1.5] text-[var(--ink-soft)]', className)}>
      Your document is held in memory for the length of one request and is never
      written to disk or stored.
    </p>
  );
}
