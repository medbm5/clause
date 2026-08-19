/**
 * Single source of truth for every contract crossing the server/client boundary.
 * Both the route handler and the React tree import from here.
 */

export type DocType = 'rental' | 'health_insurance' | 'other';
export type Severity = 'critical' | 'high' | 'moderate' | 'low' | 'fair';

export const SEVERITIES: readonly Severity[] = [
  'critical',
  'high',
  'moderate',
  'low',
  'fair',
];

export interface RiskPattern {
  /** Stable dotted id, e.g. 'rental.deposit.excessive'. */
  id: string;
  docType: DocType;
  /** Consumer-facing grouping, e.g. 'Security deposit'. */
  category: string;
  title: string;
  /** What the unfair version of this clause looks like. */
  description: string;
  /** 2-4 phrasings as they appear in real documents. Drives retrieval. */
  typicalLanguage: string[];
  whyRisky: string;
  /** What is standard or normal in India. */
  fairBenchmark: string;
  baseSeverity: Severity;
  /** e.g. 'Model Tenancy Act 2021, s.11' | 'IRDAI (Health Insurance) Regulations'. */
  reference?: string;
}

export interface Clause {
  /** 'c-07' */
  id: string;
  index: number;
  /** '4.2' exactly as printed in the document, or null when unnumbered. */
  number: string | null;
  heading: string | null;
  text: string;
}

export interface PatternMatch {
  patternId: string;
  title: string;
  /** Cosine similarity, 0..1. */
  similarity: number;
}

export interface Finding {
  clauseId: string;
  severity: Severity;
  /** 0..100 */
  riskScore: number;
  /** 0..1 */
  confidence: number;
  category: string;
  /** <= 60 chars, plain language, names the problem. */
  headline: string;
  plainLanguage: string;
  whyItMatters: string;
  /** What is normal. Empty string when not applicable. */
  standardPractice: string;
  suggestedAction: string;
  /** Verbatim span from the clause, <= 180 chars. Null when unverifiable. */
  quote: string | null;
  matches: PatternMatch[];
}

export type Verdict =
  | 'sign_with_caution'
  | 'negotiate_first'
  | 'do_not_sign_as_is'
  | 'looks_fair';

export type ReportSource = 'pdf' | 'image' | 'sample' | 'mock';

export interface RiskReport {
  docType: DocType;
  /** Inferred, e.g. 'Residential rental agreement — 11 months, Bengaluru'. */
  title: string;
  verdict: Verdict;
  /** 0..100, higher = riskier. */
  score: number;
  summary: string;
  counts: Record<Severity, number>;
  clauses: Clause[];
  findings: Finding[];
  meta: {
    source: ReportSource;
    clauseCount: number;
    model: string;
    durationMs: number;
    truncated: boolean;
  };
}

export type StageId = 'read' | 'segment' | 'retrieve' | 'analyze' | 'compile';

export type PipelineEvent =
  | { type: 'stage'; id: StageId; status: 'active' | 'done'; detail?: string }
  | { type: 'meta'; docType: DocType; title: string }
  | { type: 'clauses'; clauses: Clause[] }
  | { type: 'finding'; finding: Finding }
  | { type: 'done'; report: RiskReport }
  | { type: 'error'; message: string; recoverable: boolean };

/** Stage labels say what happened, not what the system is doing internally. */
export const STAGE_LABELS: Record<StageId, string> = {
  read: 'Reading the document',
  segment: 'Splitting into clauses',
  retrieve: 'Matching known risk patterns',
  analyze: 'Reviewing each clause',
  compile: 'Compiling your report',
};

export const STAGE_ORDER: readonly StageId[] = [
  'read',
  'segment',
  'retrieve',
  'analyze',
  'compile',
];

export const VERDICT_SENTENCE: Record<Verdict, string> = {
  do_not_sign_as_is: "Don't sign this as is.",
  negotiate_first: 'Negotiate these points first.',
  sign_with_caution: 'Sign with your eyes open.',
  looks_fair: 'This one looks fair.',
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  moderate: 'Moderate',
  low: 'Low',
  fair: 'Fair',
};

/** Severity weights used by the aggregate score. Documented in lib/pipeline/score.ts. */
export const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 100,
  high: 70,
  moderate: 40,
  low: 15,
  fair: 0,
};

export const EMPTY_COUNTS: Record<Severity, number> = {
  critical: 0,
  high: 0,
  moderate: 0,
  low: 0,
  fair: 0,
};

/** The sample documents bundled with the demo. */
export type SampleId = 'rental' | 'insurance';
