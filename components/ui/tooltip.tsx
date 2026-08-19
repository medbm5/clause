'use client';

import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * A hover/focus explainer for the numbers the report shows in mono — confidence
 * and pattern similarity. Opens on focus as well as hover, so it is reachable
 * by keyboard, and is described by `aria-describedby` rather than a title
 * attribute so screen readers get the full sentence.
 */
export function Tooltip({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className={cn('relative inline-flex', className)}>
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        className="inline-flex cursor-help items-center gap-1 border-b border-dotted border-[var(--rule)] text-left"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((value) => !value)}
      >
        {children}
      </button>
      {open ? (
        <span
          role="tooltip"
          id={id}
          className="u-paper absolute bottom-[calc(100%+6px)] left-0 z-20 w-[240px] p-2.5 text-13 leading-[1.45] text-[var(--ink-soft)] normal-case tracking-normal"
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
