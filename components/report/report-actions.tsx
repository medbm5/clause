'use client';

import { Check, Copy, Printer, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SEVERITY_WEIGHT, VERDICT_SENTENCE, type RiskReport } from '@/lib/types';

/**
 * Plain text, worst-first, ready to paste into a message to a landlord, a broker
 * or an insurer — which is the actual next thing a user does with this. The
 * disclaimer travels with it, because the text will be read away from the page.
 */
export function buildSummaryText(report: RiskReport): string {
  const ranked = [...report.findings].sort(
    (a, b) =>
      SEVERITY_WEIGHT[b.severity] * b.confidence -
      SEVERITY_WEIGHT[a.severity] * a.confidence,
  );

  const lines: string[] = [
    report.title,
    VERDICT_SENTENCE[report.verdict],
    `Risk score ${report.score}/100 · ${report.meta.clauseCount} clauses reviewed · ${report.findings.length} flagged`,
    '',
    report.summary,
  ];

  if (ranked.length > 0) {
    lines.push('', 'POINTS TO RAISE, most serious first:');
    ranked.forEach((finding, index) => {
      const clause = report.clauses.find((item) => item.id === finding.clauseId);
      const reference = clause?.number ? `Clause ${clause.number}` : 'Unnumbered clause';
      lines.push(
        '',
        `${index + 1}. ${reference} — ${finding.headline} [${finding.severity}]`,
        `   What it means: ${finding.plainLanguage}`,
        `   Why it matters: ${finding.whyItMatters}`,
        ...(finding.standardPractice ? [`   What's normal: ${finding.standardPractice}`] : []),
        `   Ask for: ${finding.suggestedAction}`,
        ...(finding.quote ? [`   Quoted: "${finding.quote}"`] : []),
      );
    });
  }

  lines.push(
    '',
    '—',
    'Reviewed with Clause. Clause is not a law firm and this is not legal advice.',
    'It is a reading aid — check anything important with a lawyer.',
  );

  if (report.meta.source === 'mock') {
    lines.push('NOTE: this is demo data, not a review of a real document.');
  }

  return lines.join('\n');
}

export function ReportActions({
  report,
  onReset,
}: {
  report: RiskReport;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(buildSummaryText(report));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard access can be refused; the print path still works.
      setCopied(false);
    }
  };

  return (
    <div className="print-hide flex flex-wrap gap-2">
      <Button size="sm" onClick={() => void copy()} aria-live="polite">
        {copied ? (
          <Check size={14} strokeWidth={1.75} aria-hidden />
        ) : (
          <Copy size={14} strokeWidth={1.75} aria-hidden />
        )}
        {copied ? 'Copied' : 'Copy summary'}
      </Button>

      <Button size="sm" onClick={() => window.print()}>
        <Printer size={14} strokeWidth={1.75} aria-hidden />
        Print
      </Button>

      <Button size="sm" variant="ghost" onClick={onReset}>
        <RotateCcw size={14} strokeWidth={1.75} aria-hidden />
        Review another document
      </Button>
    </div>
  );
}
