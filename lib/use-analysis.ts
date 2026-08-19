'use client';

import { useCallback, useReducer, useRef } from 'react';
import {
  STAGE_ORDER,
  type Clause,
  type DocType,
  type Finding,
  type PipelineEvent,
  type RiskReport,
  type SampleId,
  type StageId,
} from '@/lib/types';
import { readNdjson } from '@/lib/utils/stream';

/**
 * The one piece of client state in the product. A reducer over the pipeline's
 * own event type, so there is nothing to keep in sync: if the server can say
 * it, this can hold it. No state library, no context, no cache.
 */

export type AnalysisStatus = 'idle' | 'running' | 'done' | 'error';
export type StageStatus = 'pending' | 'active' | 'done';

export interface StageState {
  status: StageStatus;
  detail?: string;
}

export interface AnalysisState {
  status: AnalysisStatus;
  stages: Record<StageId, StageState>;
  docType: DocType | null;
  title: string | null;
  clauses: Clause[];
  findings: Finding[];
  report: RiskReport | null;
  error: { message: string; recoverable: boolean } | null;
  /** What was submitted, for the "review another" path and the report header. */
  submittedName: string | null;
}

const IDLE_STAGES: Record<StageId, StageState> = {
  read: { status: 'pending' },
  segment: { status: 'pending' },
  retrieve: { status: 'pending' },
  analyze: { status: 'pending' },
  compile: { status: 'pending' },
};

const INITIAL: AnalysisState = {
  status: 'idle',
  stages: IDLE_STAGES,
  docType: null,
  title: null,
  clauses: [],
  findings: [],
  report: null,
  error: null,
  submittedName: null,
};

type Action =
  | { type: 'start'; name: string }
  | { type: 'event'; event: PipelineEvent }
  | { type: 'transport-error'; message: string }
  | { type: 'reset' };

function reduce(state: AnalysisState, action: Action): AnalysisState {
  switch (action.type) {
    case 'start':
      return { ...INITIAL, status: 'running', submittedName: action.name };

    case 'reset':
      return INITIAL;

    case 'transport-error':
      return { ...state, status: 'error', error: { message: action.message, recoverable: true } };

    case 'event': {
      const event = action.event;
      switch (event.type) {
        case 'stage':
          return {
            ...state,
            stages: {
              ...state.stages,
              [event.id]: { status: event.status, detail: event.detail },
            },
          };

        case 'meta':
          return { ...state, docType: event.docType, title: event.title };

        case 'clauses':
          return { ...state, clauses: event.clauses };

        case 'finding':
          // Guard against a duplicate replay of the same clause+headline.
          return state.findings.some(
            (finding) =>
              finding.clauseId === event.finding.clauseId &&
              finding.headline === event.finding.headline,
          )
            ? state
            : { ...state, findings: [...state.findings, event.finding] };

        case 'done':
          return {
            ...state,
            status: 'done',
            report: event.report,
            clauses: event.report.clauses,
            findings: event.report.findings,
            docType: event.report.docType,
            title: event.report.title,
            stages: STAGE_ORDER.reduce(
              (accumulator, id) => ({
                ...accumulator,
                [id]: { status: 'done', detail: state.stages[id].detail },
              }),
              {} as Record<StageId, StageState>,
            ),
          };

        case 'error':
          return {
            ...state,
            status: 'error',
            error: { message: event.message, recoverable: event.recoverable },
          };
      }
    }
  }
}

export interface StartInput {
  file?: File;
  sample?: SampleId;
  /** Label shown while the run is in flight, before the title arrives. */
  name: string;
}

export function useAnalysis() {
  const [state, dispatch] = useReducer(reduce, INITIAL);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (input: StartInput): Promise<void> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    dispatch({ type: 'start', name: input.name });

    const body = new FormData();
    if (input.file) body.set('file', input.file);
    if (input.sample) body.set('sample', input.sample);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        dispatch({
          type: 'transport-error',
          message:
            'The review service did not respond. Check your connection and try again.',
        });
        return;
      }

      await readNdjson(response, (event) => dispatch({ type: 'event', event }));
    } catch (error) {
      if (controller.signal.aborted) return;
      dispatch({
        type: 'transport-error',
        message:
          error instanceof Error && error.message
            ? error.message
            : 'The connection dropped while reviewing your document. Try again.',
      });
    }
  }, []);

  const reset = useCallback((): void => {
    abortRef.current?.abort();
    dispatch({ type: 'reset' });
  }, []);

  return { state, start, reset };
}
