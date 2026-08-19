'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Chip } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Disclaimer, PrivacyNote } from '@/components/intake/disclaimer';
import { DropZone } from '@/components/intake/drop-zone';
import { Hero } from '@/components/intake/hero';
import { SamplePicker } from '@/components/intake/sample-picker';
import { ScanStage } from '@/components/pipeline/scan-stage';
import { ReportView } from '@/components/report/report-view';
import { useAnalysis } from '@/lib/use-analysis';
import type { SampleId } from '@/lib/types';

const SAMPLE_NAMES: Record<SampleId, string> = {
  rental: '11-month rental agreement, Bengaluru',
  insurance: 'Family floater health policy',
};

/**
 * One route, three states, cross-faded. This component owns which state is on
 * screen; `useAnalysis` owns everything the stream says.
 */
export function Experience({ mock }: { mock: boolean }) {
  const { state, start, reset } = useAnalysis();
  const reduceMotion = useReducedMotion();

  const screen =
    state.status === 'idle'
      ? 'intake'
      : state.status === 'error'
        ? 'error'
        : state.status === 'done'
          ? 'report'
          : 'pipeline';

  const fade = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: reduceMotion ? 0 : 0.22 },
  };

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-[var(--rule)]">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <span className="u-mono text-[var(--ink)]">Clause</span>
          {mock ? (
            <Chip tone="registrar" title="No API key is configured, so this run replays a written-out example rather than analysing a live document.">
              Demo data
            </Chip>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 py-12 sm:px-8 sm:py-16">
        <AnimatePresence mode="wait">
          {screen === 'intake' ? (
            <motion.div key="intake" {...fade}>
              <Hero />

              <div className="mt-12 grid gap-8 md:mt-14 md:grid-cols-[1.15fr_1fr] md:gap-14">
                <div className="space-y-6">
                  <DropZone
                    onFile={(file) => void start({ file, name: file.name })}
                  />
                  <SamplePicker
                    onSelect={(sample) =>
                      void start({ sample, name: SAMPLE_NAMES[sample] })
                    }
                  />
                </div>
                <div className="space-y-3 md:pt-1">
                  <Disclaimer />
                  <PrivacyNote />
                </div>
              </div>
            </motion.div>
          ) : null}

          {screen === 'pipeline' ? (
            <motion.div key="pipeline" {...fade}>
              <ScanStage
                title={state.title ?? state.submittedName ?? 'Your document'}
                clauses={state.clauses}
                findings={state.findings}
                stages={state.stages}
              />
            </motion.div>
          ) : null}

          {screen === 'report' && state.report ? (
            <motion.div key="report" {...fade}>
              <ReportView report={state.report} onReset={reset} />
            </motion.div>
          ) : null}

          {screen === 'error' && state.error ? (
            <motion.div key="error" {...fade} className="max-w-[52ch]">
              <p className="u-mono text-[var(--flag-high)]">
                {state.error.recoverable ? "Can't read this one" : 'Something broke'}
              </p>
              <h1 className="u-display mt-3 text-28 text-[var(--ink)]">
                {state.error.message}
              </h1>
              <Button className="mt-7" variant="primary" onClick={reset}>
                Try another document
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {/* Screen only: on paper the report carries its own disclaimer block, and
          two copies at the end of a printout reads as a mistake. */}
      <footer className="print-hide border-t border-[var(--rule)]">
        <div className="mx-auto w-full max-w-[1180px] px-5 py-5 sm:px-8">
          <Disclaimer />
        </div>
      </footer>
    </div>
  );
}
