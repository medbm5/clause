import { z } from 'zod';
import { CONFIG } from '@/lib/config';
import { completeJson } from '@/lib/openai';
import type { DocType } from '@/lib/types';

const SYSTEM = `You identify Indian consumer documents. Given the opening of a document, decide which of these it is and give it a title the person who uploaded it would recognise.

docType:
- "rental" for residential or commercial tenancy documents: rent agreements, lease deeds, leave-and-licence agreements.
- "health_insurance" for health or medical insurance: policy wordings, policy schedules, certificates of insurance, family floater plans.
- "other" for anything else.

title: a short descriptive line, not a filename and not a sentence. Include the details a person would use to recognise their own document — the kind of document, its term, its city, or the plan name and cover — but only details actually present in the text. Examples of the right shape: "Residential rental agreement — 11 months, Bengaluru", "Family floater health policy — Rs. 5 lakh cover, 2 adults + 1 child". Never invent a figure or a place that is not in the text.`;

const ResultSchema = z.object({
  docType: z.enum(['rental', 'health_insurance', 'other']),
  title: z.string().min(1).max(140),
});

const JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    docType: { type: 'string', enum: ['rental', 'health_insurance', 'other'] },
    title: { type: 'string' },
  },
  required: ['docType', 'title'],
  additionalProperties: false,
};

export interface Classification {
  docType: DocType;
  title: string;
}

/** A fallback title, used when the classify call fails, so the run continues. */
function fallbackTitle(text: string): Classification {
  const lower = text.toLowerCase();
  const rentalHits = /lessor|lessee|tenant|landlord|rent|tenancy|licensee/g;
  const healthHits = /insured|policyholder|sum insured|premium|hospitalisation|hospitalization|irdai/g;
  const rentalScore = (lower.match(rentalHits) ?? []).length;
  const healthScore = (lower.match(healthHits) ?? []).length;

  if (rentalScore === 0 && healthScore === 0) {
    return { docType: 'other', title: 'Uploaded document' };
  }
  return rentalScore >= healthScore
    ? { docType: 'rental', title: 'Rental agreement' }
    : { docType: 'health_insurance', title: 'Health insurance policy' };
}

/** One cheap call on the opening of the document. */
export async function classifyDocument(text: string): Promise<Classification> {
  const head = text.slice(0, 3_000);

  try {
    const result = await completeJson({
      model: CONFIG.models.classify,
      system: SYSTEM,
      user: head,
      schemaName: 'document_classification',
      schema: JSON_SCHEMA,
      parse: (value) => ResultSchema.parse(value),
      temperature: 0,
      maxOutputTokens: 200,
      label: 'classify',
    });
    return { docType: result.docType, title: result.title.trim() };
  } catch {
    // Classification is a convenience, not a gate — keyword fallback and carry on.
    return fallbackTitle(head);
  }
}
