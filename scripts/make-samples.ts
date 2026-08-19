/**
 * Generates the two bundled sample PDFs into public/samples/.
 *
 * Run with `npm run samples`. The output is committed, because the demo has to
 * work on a fresh clone with no key and no build step beyond `next build`.
 *
 * The documents are written as real Indian instruments — formal register, rupee
 * figures, clause numbering — and they deliberately contain the problems the
 * pipeline is supposed to find, so a live run against them is a genuine test of
 * the knowledge base and not a rehearsal.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { SAMPLE_DOCS } from '@/lib/config';
import type { SampleId } from '@/lib/types';

const A4: [number, number] = [595.28, 841.89];
const MARGIN_X = 62;
const MARGIN_TOP = 68;
const MARGIN_BOTTOM = 62;
const BODY_SIZE = 9.6;
const LEADING = 13.2;

interface Clause {
  /** Printed number. Null for the title block and the recitals. */
  number: string | null;
  heading: string | null;
  body: string[];
}

interface SampleSpec {
  title: string;
  subtitle: string[];
  clauses: Clause[];
  execution: string[];
}

// ---------------------------------------------------------------------------
// Rental agreement — Bengaluru, 11 months. Plants: ten-month deposit,
// nine-month lock-in forfeiting the whole deposit, entry without notice, all
// repairs on the tenant, three-month notice against fifteen days.
// ---------------------------------------------------------------------------

const RENTAL: SampleSpec = {
  title: 'RENTAL AGREEMENT',
  subtitle: [
    'THIS RENTAL AGREEMENT is made and executed at Bengaluru on this the 1st day of April 2025.',
    'BETWEEN Mr. Suresh Kumar Reddy, S/o late Sri K. Venkata Reddy, aged about 54 years, residing at No. 12, 4th Cross, Jayanagar 3rd Block, Bengaluru 560011, hereinafter referred to as the LESSOR, of the ONE PART;',
    'AND Ms. Anita Rao, D/o Sri M. Rao, aged about 29 years, presently employed at Bengaluru and residing at No. 8, 2nd Main, Koramangala 6th Block, Bengaluru 560095, hereinafter referred to as the LESSEE, of the OTHER PART.',
    'WHEREAS the Lessor is the absolute owner of the premises more fully described in the Schedule hereunder and the Lessee has approached the Lessor to take the same on lease for residential purposes, and the Lessor has agreed to grant the same on the terms and conditions hereinafter appearing.',
  ],
  clauses: [
    {
      number: '1',
      heading: 'SCHEDULED PREMISES',
      body: [
        'The Lessor hereby lets out to the Lessee Flat No. 402 on the fourth floor of Sai Prestige Apartments, situated at Survey No. 47/2, 7th Main Road, HSR Layout Sector 2, Bengaluru 560102, being a two-bedroom residential flat admeasuring about 1,150 square feet of super built-up area together with one covered car parking slot bearing No. B-14, hereinafter referred to as the Scheduled Premises, together with the fittings and fixtures presently existing therein.',
      ],
    },
    {
      number: '2',
      heading: 'TERM',
      body: [
        'The tenancy hereby created shall be for a period of eleven (11) months commencing from the 1st day of April 2025 and expiring on the 28th day of February 2026. The tenancy may be renewed thereafter for a further term of eleven months at the sole option and discretion of the Lessor, upon such terms and at such rent as the Lessor may then stipulate, and the Lessee shall have no right to insist upon renewal.',
      ],
    },
    {
      number: '3',
      heading: 'RENT AND ESCALATION',
      body: [
        'The Lessee shall pay to the Lessor a monthly rent of Rs. 45,000/- (Rupees Forty Five Thousand only) on or before the 5th day of each English calendar month in advance, by way of electronic transfer to such account as the Lessor may designate. The monthly rent shall stand enhanced by fifteen percent (15%) on completion of every eleven (11) months, and such enhanced rent shall be payable for the renewed term without any further agreement in writing between the parties.',
      ],
    },
    {
      number: '4',
      heading: 'SECURITY DEPOSIT',
      body: [
        "The Lessee has, simultaneously with the execution hereof, paid to the Lessor a sum of Rs. 4,50,000/- (Rupees Four Lakh Fifty Thousand only), being an amount equivalent to ten (10) months' rent, by way of an interest-free refundable security deposit, the receipt whereof the Lessor doth hereby admit and acknowledge. The said security deposit shall not carry any interest whatsoever for any period.",
        'The said security deposit shall be refunded to the Lessee upon the Lessee vacating and handing over vacant possession of the Scheduled Premises, after deducting therefrom such amounts as the Lessor may deem fit and proper towards arrears of rent, damages, repairs, unpaid charges and any other dues, and the decision of the Lessor in this regard shall be final and binding upon the Lessee.',
      ],
    },
    {
      number: '5',
      heading: 'REFUND OF DEPOSIT',
      body: [
        'The refund of the security deposit, subject to the deductions aforesaid, shall be made within a period of ninety (90) days from the date on which the Lessee hands over vacant and peaceful possession of the Scheduled Premises together with all keys and access cards to the Lessor. No interest, damages or compensation shall be payable by the Lessor to the Lessee for any period of delay in effecting such refund.',
      ],
    },
    {
      number: '6',
      heading: 'LOCK-IN PERIOD',
      body: [
        'It is expressly agreed between the parties that there shall be a lock-in period of nine (9) months reckoned from the date of commencement of this Agreement, during which period the Lessee shall not vacate the Scheduled Premises under any circumstances whatsoever. In the event the Lessee vacates the Scheduled Premises at any time before the expiry of the said lock-in period, whether with notice or otherwise, the entire security deposit paid hereunder shall stand forfeited absolutely in favour of the Lessor, and the Lessee shall in addition remain liable for the rent for the unexpired portion of the lock-in period. The lock-in period stipulated herein shall not apply to the Lessor.',
      ],
    },
    {
      number: '7',
      heading: 'NOTICE PERIOD',
      body: [
        "The Lessee shall give to the Lessor three (3) months' prior notice in writing of its intention to vacate the Scheduled Premises, failing which the Lessee shall be liable to pay rent in lieu of the shortfall in such notice period. The Lessor may terminate this Agreement at any time by giving the Lessee fifteen (15) days' notice in writing, and the Lessee shall thereupon vacate the Scheduled Premises without demur. Notice once given by the Lessee shall be irrevocable.",
      ],
    },
    {
      number: '8',
      heading: 'MAINTENANCE AND REPAIRS',
      body: [
        'The Lessee shall at its own cost and expense keep and maintain the Scheduled Premises and all fittings, fixtures, sanitary ware, woodwork and appliances therein in good repair, order and working condition. All repairs of whatsoever nature, whether minor or major, structural or otherwise, including without limitation plumbing, electrical wiring, waterproofing, seepage, dampness, roof and wall repairs, shall be attended to and borne by the Lessee at its own expense.',
        'The Lessee shall further bear the cost of periodic servicing, repair and, where necessary, replacement of the two split air-conditioners, the geyser, the modular chimney and the water purifier presently installed in the Scheduled Premises by the Lessor.',
      ],
    },
    {
      number: '9',
      heading: 'RIGHT OF ENTRY AND INSPECTION',
      body: [
        'The Lessor or his authorised representative shall be entitled to enter upon and inspect the Scheduled Premises at any time and without prior notice to the Lessee, in order to satisfy himself that the same is being properly maintained and that the terms and conditions hereof are being duly complied with. The Lessor shall retain with him a duplicate set of keys to the Scheduled Premises. The Lessee shall further permit inspection of the Scheduled Premises by prospective tenants or purchasers at such times as the Lessor may in his discretion decide.',
      ],
    },
    {
      number: '10',
      heading: 'USE AND RESTRICTIONS',
      body: [
        'The Scheduled Premises shall be used by the Lessee for residential purposes only and for no other purpose whatsoever. No guest or visitor shall be permitted to stay overnight in the Scheduled Premises without the prior written permission of the Lessor. The Lessee shall not cook, store or consume non-vegetarian food in the Scheduled Premises. No pets or animals of any kind shall be kept or harboured therein. The Lessee shall not cause any nuisance or annoyance to the other occupants of the building. Breach of any of the foregoing shall entitle the Lessor to terminate this Agreement forthwith.',
      ],
    },
    {
      number: '11',
      heading: 'PAINTING AND CLEANING CHARGES',
      body: [
        "At the time of the Lessee vacating the Scheduled Premises, an amount equivalent to two (2) months' rent shall be deducted from the security deposit towards painting, whitewashing, pest control and deep cleaning charges, irrespective of the condition in which the Scheduled Premises are handed over by the Lessee, and such deduction shall be made without any requirement of production of bills, estimates or vouchers by the Lessor.",
      ],
    },
    {
      number: '12',
      heading: 'UTILITIES AND OUTGOINGS',
      body: [
        'The Lessee shall pay the charges for electricity and water consumed in the Scheduled Premises as per the meter readings and the bills raised by the concerned authorities, and shall pay the monthly society maintenance charges of Rs. 3,200/- directly to the Sai Prestige Apartment Owners Association. The property tax and other statutory outgoings in respect of the Scheduled Premises shall be borne by the Lessor.',
      ],
    },
    {
      number: '13',
      heading: 'SUBLETTING AND ASSIGNMENT',
      body: [
        'The Lessee shall not sublet, assign, underlet, part with possession of or permit any other person to occupy or use the Scheduled Premises or any part thereof. Any person residing in the Scheduled Premises other than the Lessee named herein shall be deemed to constitute an act of subletting for the purposes of this clause. Any breach of this clause shall result in immediate termination of this Agreement and forfeiture of the entire security deposit.',
      ],
    },
    {
      number: '14',
      heading: 'DEFAULT IN PAYMENT',
      body: [
        'In the event the monthly rent is not paid on or before the 5th day of the month, the Lessee shall be liable to pay interest thereon at the rate of twenty-four percent (24%) per annum together with a late payment charge of Rs. 500/- per day until the amount is paid in full. Non-payment of rent for a period exceeding seven (7) days shall entitle the Lessor to terminate this Agreement forthwith and to forfeit the security deposit.',
      ],
    },
    {
      number: '15',
      heading: 'TERMINATION AND RE-ENTRY',
      body: [
        'Notwithstanding anything contained hereinabove, the Lessor may terminate this Agreement at any time without assigning any reason whatsoever, whereupon the Lessee shall vacate and hand over peaceful possession of the Scheduled Premises forthwith. Upon such termination, the Lessor shall be entitled to re-enter the Scheduled Premises, to take possession thereof and to remove therefrom the belongings of the Lessee, and to disconnect the supply of electricity and water thereto. The Lessee shall have no right whatsoever to terminate this Agreement prior to the expiry of the term hereof.',
      ],
    },
    {
      number: '16',
      heading: 'STAMP DUTY AND JURISDICTION',
      body: [
        'The stamp duty, registration charges, brokerage and all incidental expenses in connection with this Agreement and any renewal thereof shall be borne solely by the Lessee. Brokerage equivalent to one (1) month’s rent shall be payable by the Lessee to the broker introduced by the Lessor, and shall be payable afresh upon each renewal. All disputes arising out of or in connection with this Agreement shall be referred to a sole arbitrator appointed by the Lessor, whose decision shall be final and binding, and the costs of such arbitration shall be borne equally by the parties.',
      ],
    },
  ],
  execution: [
    'IN WITNESS WHEREOF the parties hereto have set their respective hands to this Agreement on the day, month and year first above written.',
    'LESSOR                                                                    LESSEE',
    'Mr. Suresh Kumar Reddy                                    Ms. Anita Rao',
    'WITNESSES:   1.                                                      2.',
  ],
};

// ---------------------------------------------------------------------------
// Health policy — family floater. Plants: 48-month PED wait, 1% room-rent cap
// with proportionate deduction, 20% co-pay above 60, 24-hour/15-day claim
// deadlines, tight per-procedure sub-limits.
// ---------------------------------------------------------------------------

const INSURANCE: SampleSpec = {
  title: 'SURAKSHA FAMILY FLOATER HEALTH INSURANCE POLICY',
  subtitle: [
    'POLICY WORDING AND SCHEDULE OF BENEFITS. Policy No. SFH/2025/BLR/0084512. Issued at Bengaluru.',
    'Insured Persons: Mr. Rajesh Menon (aged 61 years, proposer), Mrs. Latha Menon (aged 57 years, spouse), Master Arjun Menon (aged 14 years, dependent child).',
    'Sum Insured: Rs. 5,00,000 (Rupees Five Lakh only) on individual floater basis. Policy Period: 12 months from 00:00 hours on 1st May 2025 to midnight on 30th April 2026. Annual Premium: Rs. 32,480 inclusive of Goods and Services Tax.',
    'This Policy is a contract of insurance issued on the basis of the statements made in the proposal form and the declaration signed by the proposer, which form the basis of this contract. The terms defined in the Definitions section carry the meanings there assigned wherever used in this Policy.',
  ],
  clauses: [
    {
      number: '1',
      heading: 'SCOPE OF COVER',
      body: [
        'We shall indemnify the Medical Expenses reasonably and necessarily incurred by an Insured Person on Hospitalisation during the Policy Period following an Illness or Injury that first occurs or manifests itself during the Policy Period, up to the Sum Insured specified in the Schedule, provided that such Hospitalisation is for a minimum period of twenty-four (24) consecutive hours and is medically necessary as certified by the treating Medical Practitioner. Expenses which in Our opinion are not medically necessary, or are not consistent with the diagnosis, shall not be payable.',
      ],
    },
    {
      number: '2',
      heading: 'ROOM RENT AND ICU LIMITS',
      body: [
        'Room rent shall be limited to one percent (1%) of the Sum Insured per day and Intensive Care Unit charges to two percent (2%) of the Sum Insured per day. Eligibility is restricted to a Single Private Air-Conditioned Room of the lowest such category available in the Hospital. For the avoidance of doubt, room rent shall be deemed to include nursing charges, resident medical officer charges, hospital service charges and administrative charges levied by the Hospital.',
      ],
    },
    {
      number: '3',
      heading: 'PROPORTIONATE DEDUCTION',
      body: [
        'Where the Insured Person is admitted to a room category for which the rent exceeds the eligible limit specified in Clause 2, all Associated Medical Expenses shall be payable only in the proportion which the eligible room rent bears to the actual room rent incurred. Associated Medical Expenses shall include the professional fees of the surgeon, anaesthetist, physician and consultants, operation theatre charges, and investigation and diagnostic charges. The balance shall be borne by the Insured Person. This provision shall apply irrespective of the reason for which the higher category room was occupied.',
      ],
    },
    {
      number: '4',
      heading: 'PRE-EXISTING DISEASES',
      body: [
        'Expenses related to the treatment of a Pre-Existing Disease and its direct complications shall be excluded until the expiry of forty-eight (48) months of continuous coverage after the date of inception of the first policy taken with Us. Pre-Existing Disease means any condition, ailment, injury or disease that is diagnosed by a Medical Practitioner, or for which medical advice or treatment was recommended by or received from a Medical Practitioner, within forty-eight (48) months prior to the effective date of the policy issued by Us.',
      ],
    },
    {
      number: '5',
      heading: 'SPECIFIC WAITING PERIODS',
      body: [
        'Expenses related to the treatment of the following listed conditions are excluded until the expiry of twenty-four (24) consecutive months of coverage: cataract, benign prostatic hypertrophy, hernia of all types, hydrocele, fissures and fistula in anus, haemorrhoids, stones in the biliary and urinary systems, uterine prolapse, fibroids, varicose veins and all types of sinusitis. Total knee replacement and total hip replacement surgery shall be subject to a waiting period of forty-eight (48) months.',
      ],
    },
    {
      number: '6',
      heading: 'CO-PAYMENT',
      body: [
        'A co-payment of twenty percent (20%) shall be applicable on each and every claim in respect of an Insured Person who has attained the age of sixty (60) years at the time of the claim. Such co-payment shall be applied to the admissible claim amount after the application of sub-limits and of proportionate deduction under Clause 3. The said co-payment is mandatory and cannot be waived. A further co-payment of ten percent (10%) shall apply where treatment is availed in a Zone A city notwithstanding the Zone in which the Policy was underwritten.',
      ],
    },
    {
      number: '7',
      heading: 'SUB-LIMITS FOR SPECIFIED PROCEDURES',
      body: [
        'Notwithstanding the Sum Insured, the following limits shall apply per policy year: cataract surgery Rs. 40,000 per eye; total knee replacement Rs. 1,50,000 per joint; total hip replacement Rs. 1,50,000 per joint; treatment of specified cardiac ailments including angioplasty fifty percent (50%) of the Sum Insured; treatment of specified cancers fifty percent (50%) of the Sum Insured. The above limits are within and not in addition to the Sum Insured, and shall be applied before any co-payment.',
      ],
    },
    {
      number: '8',
      heading: 'NON-MEDICAL AND EXCLUDED EXPENSES',
      body: [
        'Expenses listed in the Schedule of Non-Medical Expenses annexed hereto shall not be payable, including gloves, masks, personal protective equipment kits, nebulisation kits, thermometers, spacers and similar consumables. Admission fees, registration charges, documentation charges, service charges, telephone charges, toiletries, attendant charges and food for attendants are not payable. Any Hospitalisation primarily for diagnostic, evaluation or investigative purposes where no active treatment is given is excluded. Treatments which are unproven or experimental are excluded.',
      ],
    },
    {
      number: '9',
      heading: 'PRE AND POST HOSPITALISATION',
      body: [
        'Medical Expenses incurred up to thirty (30) days immediately before the date of admission and up to sixty (60) days immediately after the date of discharge shall be payable, subject to a maximum of ten percent (10%) of the admitted claim amount, and provided that such expenses relate to the same condition for which the Insured Person was Hospitalised and that the Hospitalisation claim has been admitted by Us. Follow-up consultations beyond the said period shall not be payable.',
      ],
    },
    {
      number: '10',
      heading: 'CLAIM INTIMATION AND DOCUMENTS',
      body: [
        'Notice of claim must be given to Us or to Our Third Party Administrator within twenty-four (24) hours of Hospitalisation in the case of an emergency admission, and at least forty-eight (48) hours prior to a planned admission. All documents in support of the claim, including original bills, payment receipts, discharge summary and investigation reports, shall be submitted to Us within fifteen (15) days from the date of discharge. Compliance with the provisions of this clause is a condition precedent to any liability of the Company, and failure to comply shall result in forfeiture of the claim.',
      ],
    },
    {
      number: '11',
      heading: 'CASHLESS FACILITY',
      body: [
        'Cashless facility is available only at Network Providers and is subject to pre-authorisation by Us or Our Third Party Administrator. The list of Network Providers is available on Our website and is subject to change at Our sole discretion without prior notice to the Insured Person. Where treatment is availed at a Non-Network Provider, the claim shall be processed on a reimbursement basis and shall be subject to an additional co-payment of ten percent (10%). Pre-authorisation once granted may be withdrawn or modified at the time of final settlement.',
      ],
    },
    {
      number: '12',
      heading: 'CUMULATIVE BONUS',
      body: [
        'A cumulative bonus of five percent (5%) of the Sum Insured shall be added at each renewal in respect of every claim-free policy year, subject to a maximum of fifty percent (50%) of the Sum Insured. In the event of a claim being made in any policy year, the cumulative bonus accrued shall stand reduced to nil at the next renewal. The cumulative bonus is within the Sum Insured and shall not increase the overall limit of indemnity under this Policy. Cumulative bonus shall be forfeited if the Policy is not renewed within the Grace Period.',
      ],
    },
    {
      number: '13',
      heading: 'FREE LOOK PERIOD AND CANCELLATION',
      body: [
        'The Insured Person shall have a free look period of fifteen (15) days from the date of receipt of the policy document to review the terms and conditions of this Policy. If the Insured Person is not agreeable to any of the provisions stated herein, the Policy may be returned to Us for cancellation, in which event We shall refund the premium paid after deduction of stamp duty charges, the expenses incurred on medical examination and the proportionate risk premium for the period of cover. The free look period shall not be applicable at the time of renewal.',
      ],
    },
    {
      number: '14',
      heading: 'RENEWAL, REVISION AND NON-DISCLOSURE',
      body: [
        'This Policy is ordinarily renewable for life provided it is renewed within the Grace Period of thirty (30) days from the date of expiry and the premium then applicable is paid. We may revise the premium rates and the terms of this Policy with the prior approval of the Authority, and may apply a risk loading on the premium payable at renewal based on the claims experience or health status of the Insured Person.',
        'If any untrue or incorrect statement has been made in the proposal form, or if any material fact has been suppressed or not disclosed, this Policy shall be void from inception and all premium paid shall stand forfeited to the Company, and the Insured Person shall be liable to refund all amounts already paid by Us in respect of previous claims.',
      ],
    },
  ],
  execution: [
    'For and on behalf of the Company. Authorised Signatory. Issued at Bengaluru on 25th April 2025.',
    'Grievances may be addressed to the Grievance Redressal Officer at the address stated in the Schedule, and thereafter to the Insurance Ombudsman having jurisdiction.',
  ],
};

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

interface Fonts {
  body: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
}

/** Greedy word wrap against real glyph widths. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
  }
  if (line) lines.push(line);

  return lines;
}

class Layout {
  private page: PDFPage;
  private y: number;
  private pageNumber = 1;

  constructor(
    private readonly doc: PDFDocument,
    private readonly fonts: Fonts,
    private readonly documentTitle: string,
  ) {
    this.page = doc.addPage(A4);
    this.y = A4[1] - MARGIN_TOP;
    this.stampFooter();
  }

  get contentWidth(): number {
    return A4[0] - MARGIN_X * 2;
  }

  get pages(): number {
    return this.pageNumber;
  }

  private stampFooter(): void {
    // Running footer on every page — exactly the sort of furniture the text
    // normaliser has to strip before segmentation.
    this.page.drawText(`${this.documentTitle} — Page ${this.pageNumber}`, {
      x: MARGIN_X,
      y: 36,
      size: 7.4,
      font: this.fonts.italic,
      color: rgb(0.42, 0.42, 0.42),
    });
  }

  private newPage(): void {
    this.page = this.doc.addPage(A4);
    this.pageNumber += 1;
    this.y = A4[1] - MARGIN_TOP;
    this.stampFooter();
  }

  private ensure(space: number): void {
    if (this.y - space < MARGIN_BOTTOM) this.newPage();
  }

  space(amount: number): void {
    this.y -= amount;
  }

  text(
    content: string,
    options: {
      font?: PDFFont;
      size?: number;
      leading?: number;
      indent?: number;
      align?: 'left' | 'center';
    } = {},
  ): void {
    const font = options.font ?? this.fonts.body;
    const size = options.size ?? BODY_SIZE;
    const leading = options.leading ?? LEADING;
    const indent = options.indent ?? 0;
    const width = this.contentWidth - indent;

    for (const line of wrap(content, font, size, width)) {
      this.ensure(leading);
      const x =
        options.align === 'center'
          ? (A4[0] - font.widthOfTextAtSize(line, size)) / 2
          : MARGIN_X + indent;
      this.page.drawText(line, { x, y: this.y, size, font, color: rgb(0.08, 0.09, 0.1) });
      this.y -= leading;
    }
  }

  /** Keeps a clause heading with at least the first line of its body. */
  clauseHeading(label: string): void {
    this.ensure(LEADING * 3);
    this.space(5);
    this.text(label, { font: this.fonts.bold, size: BODY_SIZE });
    this.space(1.5);
  }
}

function render(doc: PDFDocument, fonts: Fonts, spec: SampleSpec): number {
  const layout = new Layout(doc, fonts, spec.title);

  layout.text(spec.title, { font: fonts.bold, size: 13.5, leading: 18, align: 'center' });
  layout.space(10);

  for (const paragraph of spec.subtitle) {
    layout.text(paragraph);
    layout.space(4);
  }

  layout.space(6);

  for (const clause of spec.clauses) {
    const label = [clause.number, clause.heading].filter(Boolean).join('. ');
    layout.clauseHeading(label);
    clause.body.forEach((paragraph, index) => {
      layout.text(paragraph, { indent: index > 0 ? 14 : 0 });
      if (index < clause.body.length - 1) layout.space(3);
    });
  }

  layout.space(14);
  for (const line of spec.execution) {
    layout.text(line);
    layout.space(5);
  }

  return layout.pages;
}

async function build(spec: SampleSpec): Promise<{ bytes: Uint8Array; pages: number }> {
  const doc = await PDFDocument.create();
  doc.setTitle(spec.title);
  doc.setProducer('Clause sample generator');
  doc.setCreator('Clause sample generator');

  const fonts: Fonts = {
    body: await doc.embedFont(StandardFonts.TimesRoman),
    bold: await doc.embedFont(StandardFonts.TimesRomanBold),
    italic: await doc.embedFont(StandardFonts.TimesRomanItalic),
  };

  const pages = render(doc, fonts, spec);
  return { bytes: await doc.save(), pages };
}

async function main(): Promise<void> {
  const outDir = resolve(process.cwd(), 'public/samples');
  mkdirSync(outDir, { recursive: true });

  const specs: Record<SampleId, SampleSpec> = { rental: RENTAL, insurance: INSURANCE };
  const problems: string[] = [];

  for (const id of Object.keys(specs) as SampleId[]) {
    const spec = specs[id];
    const expected = SAMPLE_DOCS[id];
    const { bytes, pages } = await build(spec);
    const path = resolve(outDir, expected.file);
    writeFileSync(path, bytes);

    const numbered = spec.clauses.filter((clause) => clause.number !== null).length;
    console.log(
      `${expected.file}: ${pages} pages, ${numbered} numbered clauses, ${(bytes.byteLength / 1024).toFixed(0)} KB`,
    );

    // The sample picker advertises these numbers, so a mismatch is a bug in the
    // label rather than a cosmetic detail.
    if (pages !== expected.pages) {
      problems.push(`${expected.file}: SAMPLE_DOCS says ${expected.pages} pages, generated ${pages}`);
    }
    if (numbered !== expected.clauses) {
      problems.push(
        `${expected.file}: SAMPLE_DOCS says ${expected.clauses} clauses, spec has ${numbered}`,
      );
    }
  }

  if (problems.length > 0) {
    console.error(`\nSAMPLE METADATA MISMATCH:\n  ${problems.join('\n  ')}`);
    console.error('\nUpdate SAMPLE_DOCS in lib/config.ts, or adjust the document content.');
    process.exit(1);
  }

  console.log('\nSamples written to public/samples/ and metadata matches SAMPLE_DOCS.');
}

main().catch((error: unknown) => {
  console.error('samples failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
