'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

/**
 * A side panel for secondary explanation — how the score is built, what each
 * severity means. Slides in from the right on wide screens and up from the
 * bottom on narrow ones, which is why it is a sheet rather than a modal.
 *
 * Focus moves into the panel on open and back to the trigger on close, Escape
 * closes it, and the page behind is inert while it is open.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="print-hide fixed inset-0 z-50 flex items-end justify-end sm:items-stretch">
          <motion.button
            type="button"
            aria-label="Close panel"
            className="absolute inset-0 bg-[color-mix(in_srgb,var(--ink)_38%,transparent)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.16 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className="relative flex max-h-[86vh] w-full flex-col border border-[var(--rule)] bg-[var(--surface)] sm:max-h-none sm:w-[400px] sm:border-y-0 sm:border-r-0"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24, y: 24 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24, y: 24 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 320, damping: 32 }
            }
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--rule)] px-5 py-4">
              <h2 className="u-display text-21 text-[var(--ink)]">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1 -mt-1 rounded-[2px] p-1 text-[var(--ink-soft)] transition-colors duration-[120ms] hover:text-[var(--registrar)]"
              >
                <X size={16} strokeWidth={1.75} aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
