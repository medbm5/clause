import { CONFIG } from '@/lib/config';
import { completeText } from '@/lib/openai';
import {
  EMPTY_COUNTS,
  SEVERITY_WEIGHT,
  type Finding,
  type Severity,
  type Verdict,
} from '@/lib/types';

/**
 * Scoring is deterministic and documented, because a number a user is asked to
 * act on should be reproducible and explainable.
 *
 *   raw   = Σ (severity weight × confidence)
 *   score = round(100 × (1 − e^(−raw / 180)))
 *
 * The exponential saturates: it means a pile of moderate niggles can never
 * outrank a couple of genuinely dangerous clauses. Two criticals at full
 * confidence give raw 200 → 67; twelve moderates at full confidence give raw
 * 480 → 93 but can only get there by being twelve real findings, and any single
 * critical forces the worst verdict regardless of the number. Confidence is a
 * multiplier so a hedged finding moves the score less than a certain one.
 */

const SATURATION = 180;

export function countBySeverity(findings: Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { ...EMPTY_COUNTS };
  for (const finding of findings) counts[finding.severity] += 1;
  return counts;
}

export function rawRisk(findings: Finding[]): number {
  return findings.reduce(
    (total, finding) =>
      total + SEVERITY_WEIGHT[finding.severity] * clamp01(finding.confidence),
    0,
  );
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function scoreFindings(findings: Finding[]): number {
  const raw = rawRisk(findings);
  return Math.round(100 * (1 - Math.exp(-raw / SATURATION)));
}

export function verdictFor(score: number, findings: Finding[]): Verdict {
  const hasCritical = findings.some((finding) => finding.severity === 'critical');
  if (score >= 70 || hasCritical) return 'do_not_sign_as_is';
  if (score >= 40) return 'negotiate_first';
  if (score >= 15) return 'sign_with_caution';
  return 'looks_fair';
}

const SUMMARY_SYSTEM = `You write the two- or three-sentence summary that opens a contract risk report for an ordinary person in India who is about to sign.

Rules:
- Lead with the single worst thing in the document, naming the concrete consequence in rupees or in time where the findings give you one.
- Then the next most important one or two points, or the overall shape of the document.
- Plain language. No legal jargon, no "herein", no hedging phrases like "it appears that".
- Never state law as certainty and never tell them what the law entitles them to. These are risks and norms.
- No greeting, no sign-off, no bullet points. Two or three sentences of prose.
- Do not recommend a lawyer; the interface says that already.`;

/** A summary that needs no model. Used when the summary call fails, or in the
 * degenerate cases where there is nothing for a model to add. */
export function deterministicSummary(
  findings: Finding[],
  clauseCount: number,
  docTypeIsOther: boolean,
): string {
  if (findings.length === 0) {
    return `We found nothing materially unfair in these ${clauseCount} clauses. That's rarer than it should be — read the summary of what we checked, and keep your copy of the signed document.`;
  }

  const worst = [...findings].sort(
    (a, b) =>
      SEVERITY_WEIGHT[b.severity] * b.confidence -
      SEVERITY_WEIGHT[a.severity] * a.confidence,
  )[0];

  const counts = countBySeverity(findings);
  const serious = counts.critical + counts.high;
  const prefix = docTypeIsOther
    ? "This doesn't look like a rental agreement or a health policy, so treat the review as general. "
    : '';

  return `${prefix}The most serious problem is ${lowerFirst(worst.headline)} — ${lowerFirst(
    worst.whyItMatters,
  )} Across ${clauseCount} clauses we flagged ${findings.length} issue${
    findings.length === 1 ? '' : 's'
  }${serious > 0 ? `, ${serious} of them serious` : ''}. Start with the flagged clauses in the margin and work down the list.`;
}

function lowerFirst(value: string): string {
  if (!value) return value;
  // Only lowercase a plain word — never a proper noun, an acronym or "Rs.".
  const [first, second] = [value[0], value[1] ?? ''];
  if (first !== first.toLowerCase() && second === second.toLowerCase()) {
    return first.toLowerCase() + value.slice(1);
  }
  return value;
}

/**
 * The final summary call. Falls back to the deterministic summary on any
 * failure — the report is already complete by this point and must not be lost
 * to a flaky last request.
 */
export async function summariseFindings(options: {
  findings: Finding[];
  clauseCount: number;
  title: string;
  docTypeIsOther: boolean;
}): Promise<string> {
  const { findings, clauseCount, title, docTypeIsOther } = options;

  if (findings.length === 0) {
    return deterministicSummary(findings, clauseCount, docTypeIsOther);
  }

  const ranked = [...findings].sort(
    (a, b) =>
      SEVERITY_WEIGHT[b.severity] * b.confidence -
      SEVERITY_WEIGHT[a.severity] * a.confidence,
  );

  const body = ranked
    .slice(0, 12)
    .map(
      (finding) =>
        `- [${finding.severity}] ${finding.headline}: ${finding.whyItMatters}`,
    )
    .join('\n');

  const user = [
    `Document: ${title}`,
    docTypeIsOther
      ? 'Note: this document was not recognised as a rental agreement or a health insurance policy. Say so in the first sentence.'
      : '',
    `Clauses reviewed: ${clauseCount}`,
    '',
    'Findings, worst first:',
    body,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    return await completeText({
      model: CONFIG.models.classify,
      system: SUMMARY_SYSTEM,
      user,
      temperature: 0.3,
      maxOutputTokens: 300,
      label: 'summary',
    });
  } catch {
    return deterministicSummary(findings, clauseCount, docTypeIsOther);
  }
}
