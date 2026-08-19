import { verifyQuote } from '@/lib/pipeline/analyze';
import { countBySeverity, deterministicSummary, scoreFindings, verdictFor } from '@/lib/pipeline/score';
import { sleep } from '@/lib/utils/stream';
import type {
  Clause,
  DocType,
  Finding,
  PatternMatch,
  PipelineEvent,
  RiskReport,
  SampleId,
  Severity,
} from '@/lib/types';

/**
 * Hand-written fixtures for MOCK_MODE.
 *
 * These are not placeholders: with no API key this is the product, and it is
 * quite possibly what the client sees first, so the clause text is real
 * agreement prose and the findings are written to the same standard the live
 * pipeline is held to.
 *
 * Two invariants are enforced in code rather than trusted:
 *   - every quote is passed through `verifyQuote` against its own clause, so a
 *     typo here becomes a missing quote, never a fabricated one;
 *   - the score, verdict and counts are computed by `score.ts` from the
 *     findings, so a fixture can never claim a verdict its findings don't support.
 */

interface FixtureFinding {
  clauseId: string;
  severity: Severity;
  riskScore: number;
  confidence: number;
  category: string;
  headline: string;
  plainLanguage: string;
  whyItMatters: string;
  standardPractice: string;
  suggestedAction: string;
  quote: string | null;
  matches: PatternMatch[];
}

interface Fixture {
  docType: DocType;
  title: string;
  clauses: Array<{ number: string | null; heading: string | null; text: string }>;
  findings: FixtureFinding[];
  summary: string;
}

// ---------------------------------------------------------------------------
// Rental — 11-month agreement, Bengaluru. Verdict: do_not_sign_as_is.
// ---------------------------------------------------------------------------

const RENTAL: Fixture = {
  docType: 'rental',
  title: 'Residential rental agreement — 11 months, Bengaluru',
  clauses: [
    {
      number: null,
      heading: 'RENTAL AGREEMENT',
      text: 'This Rental Agreement is made at Bengaluru on this 1st day of April 2025 between Mr. Suresh Kumar Reddy, aged about 54 years, residing at No. 12, 4th Cross, Jayanagar 3rd Block, Bengaluru 560011, hereinafter called the LESSOR, and Ms. Anita Rao, aged about 29 years, presently employed at Bengaluru, hereinafter called the LESSEE.',
    },
    {
      number: '1',
      heading: 'SCHEDULED PREMISES',
      text: 'The Lessor hereby lets out to the Lessee Flat No. 402, Sai Prestige Apartments, 7th Main, HSR Layout Sector 2, Bengaluru 560102, being a 2BHK residential flat measuring about 1,150 square feet with one covered car parking slot, hereinafter referred to as the Scheduled Premises.',
    },
    {
      number: '2',
      heading: 'TERM',
      text: 'The tenancy shall be for a period of eleven (11) months commencing from 1st April 2025 and ending on 28th February 2026. The tenancy may be renewed thereafter for a further term of eleven months at the sole option and discretion of the Lessor upon such terms as the Lessor may then stipulate.',
    },
    {
      number: '3',
      heading: 'RENT AND ESCALATION',
      text: 'The Lessee shall pay to the Lessor a monthly rent of Rs. 45,000/- (Rupees Forty Five Thousand only) on or before the 5th day of each English calendar month in advance. The monthly rent shall stand enhanced by fifteen percent (15%) on completion of every eleven (11) months, and such enhanced rent shall be payable for the renewed term without any further agreement in writing.',
    },
    {
      number: '4.1',
      heading: 'SECURITY DEPOSIT',
      text: "The Lessee has this day paid to the Lessor a sum of Rs. 4,50,000/- (Rupees Four Lakh Fifty Thousand only) equivalent to ten (10) months' rent as an interest-free refundable security deposit, the receipt whereof the Lessor hereby acknowledges. The said deposit shall be refunded to the Lessee upon vacating the Scheduled Premises after deducting such amounts as the Lessor may deem fit and proper towards arrears of rent, damages, repairs and other dues, and the decision of the Lessor in this regard shall be final and binding on the Lessee.",
    },
    {
      number: '4.2',
      heading: null,
      text: 'The refund of the security deposit shall be made within ninety (90) days from the date on which the Lessee hands over vacant and peaceful possession of the Scheduled Premises together with all keys, and no interest shall be payable by the Lessor for any period of delay in such refund.',
    },
    {
      number: '5',
      heading: 'LOCK-IN PERIOD',
      text: 'It is expressly agreed that there shall be a lock-in period of nine (9) months from the date of commencement of this Agreement during which the Lessee shall not vacate the Scheduled Premises under any circumstances whatsoever. In the event the Lessee vacates the Scheduled Premises before the expiry of the said lock-in period, the entire security deposit shall stand forfeited to the Lessor absolutely. The lock-in period shall not apply to the Lessor.',
    },
    {
      number: '6',
      heading: 'NOTICE PERIOD',
      text: "The Lessee shall give the Lessor three (3) months' prior notice in writing of its intention to vacate the Scheduled Premises, failing which the Lessee shall pay rent in lieu of the shortfall in such notice period. The Lessor may terminate this Agreement by giving the Lessee fifteen (15) days' notice in writing.",
    },
    {
      number: '7',
      heading: 'MAINTENANCE AND REPAIRS',
      text: 'The Lessee shall at its own cost keep and maintain the Scheduled Premises and all fittings, fixtures, sanitary ware and appliances therein in good repair and working condition. All repairs of whatsoever nature, whether minor or major, structural or otherwise, including plumbing, electrical wiring, waterproofing, seepage and dampness, shall be attended to by the Lessee at its own expense. The Lessee shall also bear the cost of servicing, repair and replacement of the two air-conditioners, the geyser and the water purifier provided by the Lessor.',
    },
    {
      number: '8',
      heading: 'RIGHT OF ENTRY',
      text: 'The Lessor or his authorised representative shall be entitled to enter upon and inspect the Scheduled Premises at any time without prior notice to satisfy himself that the same is being properly maintained and that the terms hereof are being complied with. The Lessor shall retain a duplicate set of keys to the Scheduled Premises. The Lessee shall further permit inspection of the Scheduled Premises by prospective tenants at such times as the Lessor may decide.',
    },
    {
      number: '9',
      heading: 'USE AND RESTRICTIONS',
      text: 'The Scheduled Premises shall be used for residential purposes only. No guest shall be permitted to stay overnight in the Scheduled Premises without the prior written permission of the Lessor. The Lessee shall not cook or consume non-vegetarian food in the Scheduled Premises. No pets of any kind shall be kept. Breach of any of the above shall entitle the Lessor to terminate this Agreement forthwith.',
    },
    {
      number: '10',
      heading: 'PAINTING AND CLEANING',
      text: "At the time of vacating the Scheduled Premises an amount equivalent to two (2) months' rent shall be deducted from the security deposit towards painting, whitewashing and deep cleaning charges, irrespective of the condition in which the Scheduled Premises are handed over, and such deduction shall be made without requirement of production of bills or estimates.",
    },
    {
      number: '11',
      heading: 'TERMINATION',
      text: 'Notwithstanding anything contained hereinabove, the Lessor may terminate this Agreement at any time without assigning any reason whatsoever, whereupon the Lessee shall vacate and hand over peaceful possession of the Scheduled Premises forthwith. Upon such termination the Lessor shall be entitled to re-enter the Scheduled Premises, take possession thereof and remove the belongings of the Lessee therefrom. The Lessee shall have no right to terminate this Agreement prior to the expiry of the term.',
    },
    {
      number: '12',
      heading: 'UTILITIES AND OUTGOINGS',
      text: 'The Lessee shall pay the charges for electricity and water consumed in the Scheduled Premises as per the meter readings and the bills raised by the concerned authorities, and shall pay the monthly society maintenance charges of Rs. 3,200/- directly to the Sai Prestige Apartment Owners Association.',
    },
    {
      number: '13',
      heading: 'CONDITION OF PREMISES',
      text: 'The Lessee has inspected the Scheduled Premises and accepts the same on an "as is where is" basis in good and tenantable condition and acknowledges that all appliances, fittings and fixtures therein are in perfect working order as on the date hereof. The Lessee shall hand over the Scheduled Premises together with all fittings and fixtures in the same good condition as at the commencement of this Agreement.',
    },
    {
      number: '14',
      heading: 'JURISDICTION',
      text: 'All disputes arising out of or in connection with this Agreement shall be subject to the jurisdiction of the competent courts at Bengaluru, being the place where the Scheduled Premises are situate.',
    },
  ],
  findings: [
    {
      clauseId: 'c-04',
      severity: 'moderate',
      riskScore: 52,
      confidence: 0.8,
      category: 'Rent escalation',
      headline: 'Rent jumps 15% every 11 months, automatically',
      plainLanguage:
        'Your rent is Rs. 45,000 now, but the agreement raises it by 15% at the end of every 11-month term without anyone having to sign anything new.',
      whyItMatters:
        'That takes the rent to about Rs. 51,750 in the second term and about Rs. 59,500 in the third — roughly Rs. 1.7 lakh a year more than you pay today, on a flat you may have furnished and settled into.',
      standardPractice:
        'Five to ten percent a year is the customary range in Bengaluru and across most Indian cities, written as a fixed figure you can calculate for yourself.',
      suggestedAction:
        'Ask for the escalation to be reduced to 5–7%, and for it to apply annually rather than every 11 months.',
      quote:
        'The monthly rent shall stand enhanced by fifteen percent (15%) on completion of every eleven (11) months',
      matches: [
        { patternId: 'rental.escalation.steep', title: 'Rent rises faster than the market does', similarity: 0.741 },
      ],
    },
    {
      clauseId: 'c-05',
      severity: 'high',
      riskScore: 82,
      confidence: 0.92,
      category: 'Security deposit',
      headline: 'Rs. 4.5 lakh deposit, deductions decided by owner',
      plainLanguage:
        "You are handing over ten months' rent — Rs. 4,50,000 — with no interest, and the agreement says the Lessor alone decides what comes out of it when you leave, with his decision described as final and binding.",
      whyItMatters:
        'That is Rs. 4.5 lakh of your savings held for eleven months earning nothing, and no agreed yardstick to measure a deduction against. If he decides Rs. 80,000 of it is for "damages", the clause as written leaves you nothing to point at.',
      standardPractice:
        "Two months' rent is the norm the Model Tenancy Act 2021 sets for homes, and one to three months is usual in Indian cities. Deductions are normally limited to a written list — unpaid rent, unpaid bills, specified damage — and backed by actual bills.",
      suggestedAction:
        'Ask for the deposit to be reduced to two or three months, and for deductions to be limited to a listed set of items supported by bills you get copies of.',
      quote:
        'after deducting such amounts as the Lessor may deem fit and proper towards arrears of rent, damages, repairs and other dues, and the decision of the Lessor in this regard shall be final',
      matches: [
        { patternId: 'rental.deposit.excessive', title: "Huge deposit, deducted at the owner's discretion", similarity: 0.782 },
      ],
    },
    {
      clauseId: 'c-06',
      severity: 'high',
      riskScore: 74,
      confidence: 0.85,
      category: 'Security deposit',
      headline: 'Deposit comes back up to 90 days later',
      plainLanguage:
        'After you hand over the keys, the Lessor has three months to return your Rs. 4,50,000, and owes you nothing extra if he takes longer.',
      whyItMatters:
        'You will need that money for the deposit on your next home. Waiting up to 90 days means funding two deposits at once — often the difference between moving and not being able to.',
      standardPractice:
        'Refund at handover, or within 15 to 30 days of it, with an itemised statement of anything deducted.',
      suggestedAction:
        'Ask for refund within 15 days of handover, with interest at a stated rate for any delay beyond 30 days.',
      quote:
        'The refund of the security deposit shall be made within ninety (90) days from the date on which the Lessee hands over vacant and peaceful possession',
      matches: [
        { patternId: 'rental.deposit.refund_delay', title: 'No deadline for returning your deposit', similarity: 0.803 },
        { patternId: 'rental.deposit.excessive', title: "Huge deposit, deducted at the owner's discretion", similarity: 0.556 },
      ],
    },
    {
      clauseId: 'c-07',
      severity: 'critical',
      riskScore: 95,
      confidence: 0.95,
      category: 'Lock-in period',
      headline: 'Leaving before month 9 costs you Rs. 4.5 lakh',
      plainLanguage:
        'You are committed to staying nine months. If you leave in month three — a transfer, a job change, a family emergency — the entire Rs. 4,50,000 deposit is forfeited. The same lock-in does not apply to the Lessor.',
      whyItMatters:
        'This is the single most expensive clause in the document: it puts your whole deposit at risk for something as ordinary as changing jobs, and it says outright that the restriction binds only you.',
      standardPractice:
        'Where there is a lock-in it is usually three to six months, binds both sides, and caps the cost of leaving early at rent for the notice period or the unexpired months — not the entire deposit.',
      suggestedAction:
        'Ask for the lock-in to be cut to three months and for the consequence of early exit to be one month’s rent, not forfeiture of the deposit — and for it to apply to the Lessor too.',
      quote:
        'the entire security deposit shall stand forfeited to the Lessor absolutely. The lock-in period shall not apply to the Lessor.',
      matches: [
        { patternId: 'rental.lockin.forfeiture', title: 'Leave early and lose the entire deposit', similarity: 0.826 },
      ],
    },
    {
      clauseId: 'c-08',
      severity: 'high',
      riskScore: 76,
      confidence: 0.9,
      category: 'Notice period',
      headline: 'You owe 3 months notice, the owner owes 15 days',
      plainLanguage:
        'To leave, you must give three months of written notice or pay rent instead. To make you leave, the Lessor gives fifteen days.',
      whyItMatters:
        'Fifteen days is not enough time to find a flat, raise a fresh deposit and move in Bengaluru — and the three months on your side means up to Rs. 1,35,000 of rent even if you have already gone.',
      standardPractice:
        'Equal notice on both sides, one month being the common norm for homes, two at the outside.',
      suggestedAction:
        'Ask for one month either way, or two months either way — the point is that the same number appears on both sides of the sentence.',
      quote:
        "The Lessor may terminate this Agreement by giving the Lessee fifteen (15) days' notice in writing.",
      matches: [
        { patternId: 'rental.notice.asymmetry', title: 'You give long notice, the owner gives almost none', similarity: 0.795 },
      ],
    },
    {
      clauseId: 'c-09',
      severity: 'high',
      riskScore: 78,
      confidence: 0.88,
      category: 'Repairs and maintenance',
      headline: 'Every repair is yours, including the structure',
      plainLanguage:
        "You are responsible for all repairs of any kind — plumbing inside the walls, wiring, waterproofing, seepage — plus servicing and replacing the Lessor's two air-conditioners, geyser and water purifier.",
      whyItMatters:
        'Waterproofing a leaking wall runs Rs. 25,000 to Rs. 60,000 and a replacement AC is Rs. 35,000 upwards. This clause makes you fund capital repairs to a flat you will hand back, with no rupee threshold anywhere.',
      standardPractice:
        'The owner normally handles structural repairs, waterproofing, external plumbing and wiring, and the appliances they supplied; the tenant handles day-to-day items like drain cleaning, switches and broken glass. A Rs. 2,000-per-incident threshold is a clean way to split it.',
      suggestedAction:
        'Ask for structural work, seepage and waterproofing to stay with the Lessor, for his appliances to be his to repair, and for a rupee threshold above which he pays.',
      quote:
        'All repairs of whatsoever nature, whether minor or major, structural or otherwise, including plumbing, electrical wiring, waterproofing, seepage and dampness, shall be attended to by the Lessee',
      matches: [
        { patternId: 'rental.repairs.tenant_burden', title: "You pay for repairs that are the owner's job", similarity: 0.812 },
      ],
    },
    {
      clauseId: 'c-10',
      severity: 'high',
      riskScore: 72,
      confidence: 0.85,
      category: 'Right of entry',
      headline: 'Owner may enter any time and keeps your keys',
      plainLanguage:
        'The Lessor can come into your home at any time without telling you first, holds a duplicate set of keys, and can bring prospective tenants through whenever he chooses.',
      whyItMatters:
        'You are paying Rs. 45,000 a month for exclusive possession, and this clause removes it. It also makes any later dispute about damage or a missing item impossible to resolve, because anyone could have been in the flat.',
      standardPractice:
        "Twenty-four hours' written notice, entry in daytime hours, and only for a stated purpose such as a repair or an agreed inspection. A landlord keeping keys to an occupied home is not normal.",
      suggestedAction:
        'Ask for 24 hours’ written notice and daytime visits, for the duplicate keys to be handed to you for the term, and for viewings to be limited to the notice period.',
      quote:
        'entitled to enter upon and inspect the Scheduled Premises at any time without prior notice',
      matches: [
        { patternId: 'rental.entry.no_notice', title: 'The owner can walk in without telling you', similarity: 0.774 },
      ],
    },
    {
      clauseId: 'c-11',
      severity: 'moderate',
      riskScore: 58,
      confidence: 0.75,
      category: 'Restrictions on use',
      headline: 'No overnight guests, no non-veg, no pets',
      plainLanguage:
        'The agreement bars anyone from staying overnight without written permission, bars non-vegetarian cooking, and bars pets — and makes breaking any of these grounds to end the tenancy immediately.',
      whyItMatters:
        'Your parents staying for a week becomes a documented breach the Lessor can terminate on. Clauses like these are rarely enforced evenly, which is exactly why they are worth removing now rather than arguing about later.',
      standardPractice:
        'Restrictions normally attach to the property and the neighbours — no unlawful or commercial use, no structural changes, no nuisance, society rules to be followed — not to what you eat or who visits.',
      suggestedAction:
        'Ask for the guest and food restrictions to be deleted, and for any breach to require written notice and a chance to put it right before termination.',
      quote:
        'No guest shall be permitted to stay overnight in the Scheduled Premises without the prior written permission of the Lessor. The Lessee shall not cook or consume non-vegetarian food',
      matches: [
        { patternId: 'rental.restrictions.personal_conduct', title: 'Rules about who may visit and how you may live', similarity: 0.758 },
      ],
    },
    {
      clauseId: 'c-12',
      severity: 'moderate',
      riskScore: 60,
      confidence: 0.8,
      category: 'Exit charges',
      headline: 'Rs. 90,000 for painting, condition irrelevant',
      plainLanguage:
        "Two months' rent — Rs. 90,000 — comes out of your deposit for painting and cleaning when you leave, however well you have kept the flat, and the Lessor does not have to show a bill.",
      whyItMatters:
        'Repainting a 2BHK in Bengaluru costs about Rs. 15,000 to Rs. 25,000. The rest of that Rs. 90,000 is not a repair, it is a charge — and waiving bills removes the only check on the figure.',
      standardPractice:
        'Painting is the owner’s periodic upkeep, so it is usually prorated against how long you stayed, or charged at actual cost against a bill, with normal wear and tear excluded.',
      suggestedAction:
        'Ask for painting to be charged at actual cost against a bill, prorated for tenure, with normal wear and tear expressly excluded.',
      quote:
        "an amount equivalent to two (2) months' rent shall be deducted from the security deposit towards painting, whitewashing and deep cleaning charges, irrespective of the condition",
      matches: [
        { patternId: 'rental.exit.painting_charges', title: 'Fixed painting and cleaning charges, whatever the condition', similarity: 0.788 },
      ],
    },
    {
      clauseId: 'c-13',
      severity: 'critical',
      riskScore: 92,
      confidence: 0.9,
      category: 'Termination',
      headline: 'Owner can end it any time and clear the flat',
      plainLanguage:
        'The Lessor may terminate at any time for no reason, you must leave immediately, and he claims the right to re-enter, take possession and remove your belongings. You have no matching right to end the agreement early.',
      whyItMatters:
        'Read with the nine-month lock-in, you are bound and he is not. The re-entry wording is the more serious half — putting a tenant’s belongings out of an occupied home is not a step a landlord gets to take on his own.',
      standardPractice:
        'Termination rights normally mirror each other, and ending a tenancy mid-term normally needs a stated ground — non-payment, unlawful use, or a breach left uncured after written notice. Recovering possession follows the notice period or the state rent-law process.',
      suggestedAction:
        'Ask for this clause to be deleted and replaced with mutual termination on the same notice, and for the re-entry and removal-of-belongings sentence to come out entirely.',
      quote:
        'the Lessor may terminate this Agreement at any time without assigning any reason whatsoever',
      matches: [
        { patternId: 'rental.termination.landlord_convenience', title: 'The owner can end it for any reason; you cannot', similarity: 0.837 },
        { patternId: 'rental.notice.asymmetry', title: 'You give long notice, the owner gives almost none', similarity: 0.612 },
      ],
    },
    {
      clauseId: 'c-15',
      severity: 'moderate',
      riskScore: 48,
      confidence: 0.7,
      category: 'Condition of premises',
      headline: 'You certify the flat is perfect, with no inventory',
      plainLanguage:
        'You are signing a statement that the flat and every appliance in it are in perfect working order, and agreeing to return them that way — with no inventory, no photographs and no joint inspection attached.',
      whyItMatters:
        'With nothing recorded at move-in, every mark on a wall and every appliance that fails becomes arguably yours at move-out, and you have already certified it was all perfect. This is the clause that makes the painting deduction stick.',
      standardPractice:
        'A signed inventory listing fittings and appliances with their condition, dated photographs taken by both sides at handover, and an express carve-out for normal wear and tear.',
      suggestedAction:
        'Before you sign, walk through with the Lessor, photograph everything, and attach a dated inventory noting existing defects as an annexure.',
      quote:
        'accepts the same on an "as is where is" basis in good and tenantable condition and acknowledges that all appliances, fittings and fixtures therein are in perfect working order',
      matches: [
        { patternId: 'rental.condition.as_is_no_inventory', title: "You accept the flat 'as is' with nothing written down", similarity: 0.769 },
      ],
    },
  ],
  summary:
    "Two clauses here can cost you the whole Rs. 4,50,000 deposit: leaving before month nine forfeits all of it, and the Lessor can end the agreement at any time for no reason while you cannot. On top of that you carry every repair including structural work, he can enter without notice and keeps a spare key, and Rs. 90,000 is already earmarked for painting whatever condition you leave the flat in. The rent, the utilities split and the Bengaluru jurisdiction clause are all normal — it is the deposit, lock-in and termination terms that need to change before you sign.",
};

// ---------------------------------------------------------------------------
// Health insurance — family floater. Verdict: negotiate_first.
// ---------------------------------------------------------------------------

const INSURANCE: Fixture = {
  docType: 'health_insurance',
  title: 'Family floater health policy — Rs. 5 lakh cover, 2 adults + 1 child',
  clauses: [
    {
      number: null,
      heading: 'POLICY SCHEDULE',
      text: 'Suraksha Family Floater Health Insurance Policy. Policy No. SFH/2025/BLR/0084512. Insured Persons: Mr. Rajesh Menon (aged 61), Mrs. Latha Menon (aged 57), Master Arjun Menon (aged 14). Sum Insured: Rs. 5,00,000 on floater basis. Policy Period: 12 months from 1st May 2025 to 30th April 2026. Annual Premium: Rs. 32,480 including GST.',
    },
    {
      number: '1',
      heading: 'SCOPE OF COVER',
      text: 'We shall indemnify the Medical Expenses incurred by an Insured Person on Hospitalisation during the Policy Period following an Illness or Injury that occurs during the Policy Period, up to the Sum Insured, provided that Hospitalisation is for a minimum period of twenty four consecutive hours or the treatment is a Day Care Procedure listed in Annexure II, and is medically necessary as certified by a Medical Practitioner.',
    },
    {
      number: '2',
      heading: 'ROOM RENT AND ICU LIMITS',
      text: 'Room rent shall be limited to 1% of the Sum Insured per day and Intensive Care Unit charges to 2% of the Sum Insured per day. Eligibility is restricted to a Single Private Air-Conditioned Room of the lowest such category available in the Hospital. Room rent shall be deemed to include nursing charges, resident medical officer charges and hospital service charges.',
    },
    {
      number: '3',
      heading: 'PROPORTIONATE DEDUCTION',
      text: 'Where the Insured Person is admitted to a room category for which the rent exceeds the eligible limit specified in Clause 2, all Associated Medical Expenses shall be payable in the proportion which the eligible room rent bears to the actual room rent incurred. Associated Medical Expenses shall include professional fees of the surgeon, anaesthetist and consultants, operation theatre charges, and investigation and diagnostic charges. The balance shall be borne by the Insured Person.',
    },
    {
      number: '4',
      heading: 'PRE-EXISTING DISEASES',
      text: 'Expenses related to the treatment of a Pre-Existing Disease and its direct complications shall be excluded until the expiry of forty eight (48) months of continuous coverage after the date of inception of the first policy with Us. Pre-Existing Disease means any condition, ailment, injury or disease that is diagnosed by a Medical Practitioner, or for which medical advice or treatment was recommended by or received from a Medical Practitioner, within forty eight months prior to the effective date of the policy.',
    },
    {
      number: '5',
      heading: 'SPECIFIC WAITING PERIODS',
      text: 'Expenses related to the treatment of the following listed conditions are excluded until the expiry of twenty four (24) consecutive months of coverage: cataract, benign prostatic hypertrophy, hernia, hydrocele, fissures and fistula in anus, haemorrhoids, stones in the biliary and urinary systems, uterine prolapse, fibroids and all types of sinusitis. Total knee and hip replacement surgery shall be subject to the same waiting period of twenty four (24) months.',
    },
    {
      number: '6',
      heading: 'CO-PAYMENT',
      text: 'A co-payment of twenty percent (20%) shall be applicable on each and every claim in respect of an Insured Person who has attained the age of sixty (60) years at the time of the claim. Such co-payment shall be applied to the admissible claim amount after application of sub-limits and proportionate deduction, and is mandatory and cannot be waived.',
    },
    {
      number: '7',
      heading: 'PRE AND POST HOSPITALISATION',
      text: 'Medical Expenses incurred up to thirty (30) days immediately before the date of admission and up to sixty (60) days immediately after the date of discharge shall be payable, provided such expenses relate to the same condition for which the Insured Person was Hospitalised and the Hospitalisation claim has been admitted by Us.',
    },
    {
      number: '8',
      heading: 'CLAIM INTIMATION AND DOCUMENTS',
      text: 'Notice of claim must be given to Us or to Our Third Party Administrator within twenty four (24) hours of Hospitalisation in the case of an emergency admission, and at least forty eight (48) hours prior to a planned admission. All documents in support of the claim, including original bills, discharge summary and investigation reports, shall be submitted within fifteen (15) days from the date of discharge.',
    },
    {
      number: '9',
      heading: 'CASHLESS FACILITY',
      text: 'Cashless facility is available only at Network Providers and is subject to pre-authorisation by Us or Our Third Party Administrator. The list of Network Providers is available on Our website and is subject to change. Where treatment is availed at a Non-Network Provider, the claim shall be processed on a reimbursement basis upon submission of original documents.',
    },
    {
      number: '10',
      heading: 'CUMULATIVE BONUS',
      text: 'A cumulative bonus of 5% of the Sum Insured shall be added at each renewal for every claim-free policy year, subject to a maximum of 50% of the Sum Insured. In the event of a claim in any policy year, the cumulative bonus accrued shall be reduced by 5% of the Sum Insured at the next renewal and not forfeited in full. Cumulative bonus is in addition to the Sum Insured for the policy year in which it is available.',
    },
    {
      number: '11',
      heading: 'FREE LOOK PERIOD',
      text: 'The Insured Person shall have a free look period of fifteen (15) days from the date of receipt of the policy document to review the terms and conditions of this Policy. If the Insured Person is not agreeable to any of the provisions stated in the Policy, the Policy may be returned for cancellation, in which event We shall refund the premium paid after deduction of stamp duty charges, expenses incurred on medical examination and proportionate risk premium for the period of cover.',
    },
    {
      number: '12',
      heading: 'MORATORIUM PERIOD',
      text: 'After the expiry of sixty (60) continuous months of coverage under this Policy, no claim shall be contestable by Us on grounds of non-disclosure or misrepresentation, except on grounds of established fraud. This period of sixty months shall apply to the Sum Insured of the first policy and, in the case of enhancement of Sum Insured, shall apply afresh to the enhanced limits.',
    },
    {
      number: '13',
      heading: 'RENEWAL',
      text: 'This Policy is ordinarily renewable for life provided the Policy is renewed within the Grace Period of thirty (30) days from the date of expiry and the premium then applicable is paid. We may revise the premium rates and the terms of this Policy with the prior approval of the Insurance Regulatory and Development Authority of India.',
    },
  ],
  findings: [
    {
      clauseId: 'c-03',
      severity: 'moderate',
      riskScore: 68,
      confidence: 0.9,
      category: 'Room rent and ICU limits',
      headline: 'Rs. 5,000-a-day room cap on a Rs. 5 lakh policy',
      plainLanguage:
        'Your room is capped at 1% of the Rs. 5,00,000 sum insured — Rs. 5,000 a day — and ICU at Rs. 10,000 a day, and you are entitled only to the cheapest single private AC room the hospital has.',
      whyItMatters:
        'A single private room in a mid-tier private hospital in Bengaluru or Mumbai is Rs. 6,000 to Rs. 12,000 a day, so you are likely over the cap on admission. Because the cap also sweeps in nursing and hospital service charges, you cross it faster than the tariff sheet suggests — and crossing it triggers the proportionate deduction in the next clause.',
      standardPractice:
        'Mainstream retail plans now sell no room-rent cap at all, or entitlement to a single private room without a percentage limit.',
      suggestedAction:
        'Ask what the same insurer charges for a variant with no room-rent capping, and compare that premium against the deduction you would face on one admission.',
      quote:
        'Room rent shall be limited to 1% of the Sum Insured per day and Intensive Care Unit charges to 2% of the Sum Insured per day.',
      matches: [
        { patternId: 'health.limits.room_rent_cap', title: 'A daily room-rent cap decided by your sum insured', similarity: 0.834 },
        { patternId: 'health.limits.proportionate_deduction', title: 'Pick a costlier room and your whole bill is cut', similarity: 0.681 },
      ],
    },
    {
      clauseId: 'c-04',
      severity: 'high',
      riskScore: 85,
      confidence: 0.9,
      category: 'Proportionate deduction',
      headline: 'A costlier room cuts your whole bill, not just the room',
      plainLanguage:
        'If your room costs more than Rs. 5,000 a day, the insurer pays only that fraction of the surgeon’s fees, the anaesthetist, the operation theatre and the investigations too — not just the room difference.',
      whyItMatters:
        'On a Rs. 4,00,000 surgery in a Rs. 10,000-a-day room, the eligible-to-actual ratio is half, so roughly Rs. 1,75,000 of the bill lands on you — for choosing a room, or for the hospital having nothing cheaper free.',
      standardPractice:
        'IRDAI narrowed this sharply in 2024: no proportionate deduction where the room is within entitlement, and none at all on ICU charges. Plans without room capping cannot apply it, and better wordings waive it when no eligible room was available.',
      suggestedAction:
        'Ask in writing whether the deduction is waived when the hospital has no eligible room free, and get the answer on the policy, not in an email.',
      quote:
        'all Associated Medical Expenses shall be payable in the proportion which the eligible room rent bears to the actual room rent incurred',
      matches: [
        { patternId: 'health.limits.proportionate_deduction', title: 'Pick a costlier room and your whole bill is cut', similarity: 0.871 },
      ],
    },
    {
      clauseId: 'c-05',
      severity: 'moderate',
      riskScore: 68,
      confidence: 0.85,
      category: 'Waiting periods',
      headline: 'Existing conditions wait four years, not three',
      plainLanguage:
        'Anything any of you was diagnosed with, or took advice for, in the four years before this policy started is not covered until you have held the policy for 48 continuous months.',
      whyItMatters:
        'For a 61-year-old, this is the term that decides whether the policy is worth anything: four years of premiums — about Rs. 1,30,000 at the current rate — before the conditions you most expect to be treated for are covered.',
      standardPractice:
        'IRDAI capped the pre-existing waiting period at 36 months of continuous coverage, and competitive retail plans sell 24 or even 12 months.',
      suggestedAction:
        'Ask the insurer to confirm the pre-existing waiting period in writing against the current 36-month cap, and ask what a 24-month variant would cost.',
      quote:
        'shall be excluded until the expiry of forty eight (48) months of continuous coverage after the date of inception of the first policy with Us',
      matches: [
        { patternId: 'health.waiting.pre_existing', title: 'Existing conditions not covered for years', similarity: 0.842 },
      ],
    },
    {
      clauseId: 'c-07',
      severity: 'moderate',
      riskScore: 66,
      confidence: 0.9,
      category: 'Co-payment',
      headline: '20% of every claim is yours after age 60',
      plainLanguage:
        'Mr. Menon is 61, so one fifth of every admissible claim for him is payable by you — and it is calculated after the sub-limits and the proportionate deduction have already reduced the figure.',
      whyItMatters:
        'On a Rs. 6,00,000 cardiac admission the co-payment alone is over a lakh in cash, at the age when income has usually stopped. Stacked on the room-rent cap and the deduction, the three together can halve what a Rs. 5 lakh policy actually pays.',
      standardPractice:
        'Plans bought before 60 usually carry no co-payment. Where it exists, 10 to 20 percent is the senior-citizen norm — and many insurers offer it as a voluntary choice for a lower premium rather than a fixed term.',
      suggestedAction:
        'Ask whether a no-co-payment variant is available for Mr. Menon at this age, and what it adds to the Rs. 32,480 premium.',
      quote:
        'A co-payment of twenty percent (20%) shall be applicable on each and every claim in respect of an Insured Person who has attained the age of sixty (60) years',
      matches: [
        { patternId: 'health.limits.copayment', title: 'You pay a fixed share of every claim', similarity: 0.798 },
      ],
    },
    {
      clauseId: 'c-09',
      severity: 'low',
      riskScore: 42,
      confidence: 0.85,
      category: 'Claim procedure',
      headline: '24 hours to report, 15 days to send documents',
      plainLanguage:
        'You must tell the insurer within 24 hours of an emergency admission, 48 hours before a planned one, and get every original bill and report to them within 15 days of discharge.',
      whyItMatters:
        'The 24-hour window falls exactly when a family is dealing with an emergency, and the 15 days assume the hospital releases records promptly. It is worth knowing before you need it, not after.',
      standardPractice:
        'These deadlines are standard, and IRDAI has been explicit that claims should not be rejected for delayed intimation or submission where the delay was outside the insured’s control.',
      suggestedAction:
        'Save the TPA number in your phone now and intimate by phone or app the moment anyone is admitted, even before you have any documents.',
      quote:
        'Notice of claim must be given to Us or to Our Third Party Administrator within twenty four (24) hours of Hospitalisation in the case of an emergency admission',
      matches: [
        { patternId: 'health.claims.intimation_deadline', title: 'Miss a paperwork deadline and lose the claim', similarity: 0.816 },
      ],
    },
    {
      clauseId: 'c-12',
      severity: 'low',
      riskScore: 38,
      confidence: 0.85,
      category: 'Free-look and cancellation',
      headline: 'Only 15 days stated to change your mind',
      plainLanguage:
        'The policy gives you fifteen days from receiving the document to read it and return it for a refund, less stamp duty, medical-test costs and premium for the days you were covered.',
      whyItMatters:
        'This is the one cost-free exit in the contract, and fifteen days is not long to get through fifty pages, notice the 48-month waiting period and act on it.',
      standardPractice:
        'IRDAI extended the free-look period to 30 days for policies sold through any channel, so a 15-day window in the wording is worth querying. The deductions themselves are normal.',
      suggestedAction:
        'Ask the insurer to confirm the free-look period against the current 30-day rule, and diarise the deadline the day the policy arrives.',
      quote:
        'a free look period of fifteen (15) days from the date of receipt of the policy document',
      matches: [
        { patternId: 'health.freelook.short_window', title: 'A short window to change your mind, with deductions', similarity: 0.789 },
        { patternId: 'health.renewal.premium_revision', title: 'Premiums can be revised and renewal loaded', similarity: 0.421 },
      ],
    },
  ],
  summary:
    'Three clauses work together to shrink what this Rs. 5 lakh policy actually pays: a Rs. 5,000-a-day room cap you will probably exceed on admission, a proportionate deduction that then cuts the surgeon and theatre charges in the same ratio, and a 20% co-payment on every claim for Mr. Menon at 61 — on a Rs. 4,00,000 surgery those three together can leave well over Rs. 2,00,000 with you. The 48-month pre-existing waiting period also sits above the 36-month cap the regulator now applies, which matters most for the oldest person on the policy. The day-care cover, the 30-and-60-day hospitalisation windows, the five-year moratorium and lifelong renewability are all sound — it is the caps, the co-payment and that waiting period to take back to the insurer before you renew.',
};

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

function buildClauses(fixture: Fixture): Clause[] {
  return fixture.clauses.map((clause, index) => ({
    id: `c-${String(index + 1).padStart(2, '0')}`,
    index,
    number: clause.number,
    heading: clause.heading,
    text: clause.text,
  }));
}

function buildReport(fixture: Fixture): RiskReport {
  const clauses = buildClauses(fixture);
  const byId = new Map(clauses.map((clause) => [clause.id, clause]));

  const findings: Finding[] = fixture.findings
    .filter((finding) => byId.has(finding.clauseId))
    .map((finding) => ({
      ...finding,
      // Verified against the clause, exactly as a live finding would be.
      quote: verifyQuote(byId.get(finding.clauseId)!.text, finding.quote),
    }));

  const score = scoreFindings(findings);

  return {
    docType: fixture.docType,
    title: fixture.title,
    verdict: verdictFor(score, findings),
    score,
    summary: fixture.summary || deterministicSummary(findings, clauses.length, fixture.docType),
    counts: countBySeverity(findings),
    clauses,
    findings,
    meta: {
      source: 'mock',
      clauseCount: clauses.length,
      model: 'mock',
      durationMs: 0,
      truncated: false,
    },
  };
}

let cache: Record<SampleId, RiskReport> | null = null;

export function getFixtureReport(sample: SampleId): RiskReport {
  cache ??= { rental: buildReport(RENTAL), insurance: buildReport(INSURANCE) };
  return cache[sample];
}

/** Which fixture an upload maps to in mock mode, guessed from the filename. */
export function guessSampleFromFilename(name: string): SampleId {
  const lower = name.toLowerCase();
  if (/(policy|insur|health|mediclaim|floater|irdai)/.test(lower)) return 'insurance';
  return 'rental';
}

/**
 * Replays a fixture through the real event stream with realistic pacing, so the
 * pipeline screen and the report screen exercise exactly the same code path
 * they do against the live API.
 */
export async function replayFixture(
  sample: SampleId,
  emit: (event: PipelineEvent) => void,
): Promise<RiskReport> {
  const started = Date.now();
  const report = getFixtureReport(sample);

  emit({ type: 'stage', id: 'read', status: 'active' });
  await sleep(900);
  emit({
    type: 'stage',
    id: 'read',
    status: 'done',
    detail: `${report.clauses.reduce((total, clause) => total + clause.text.length, 0).toLocaleString('en-IN')} characters`,
  });
  emit({ type: 'meta', docType: report.docType, title: report.title });

  emit({ type: 'stage', id: 'segment', status: 'active' });
  await sleep(1_200);
  emit({ type: 'clauses', clauses: report.clauses });
  emit({
    type: 'stage',
    id: 'segment',
    status: 'done',
    detail: `${report.clauses.length} clauses`,
  });

  emit({ type: 'stage', id: 'retrieve', status: 'active' });
  await sleep(700);
  const matched = new Set(
    report.findings.flatMap((finding) => finding.matches.map((match) => match.patternId)),
  );
  emit({
    type: 'stage',
    id: 'retrieve',
    status: 'done',
    detail: `${matched.size} patterns matched`,
  });

  emit({ type: 'stage', id: 'analyze', status: 'active' });
  for (const finding of report.findings) {
    // 300-600ms apart: fast enough to feel like work, slow enough to watch.
    await sleep(300 + Math.round(Math.random() * 300));
    emit({ type: 'finding', finding });
  }
  emit({
    type: 'stage',
    id: 'analyze',
    status: 'done',
    detail: `${report.findings.length} issues flagged`,
  });

  emit({ type: 'stage', id: 'compile', status: 'active' });
  await sleep(600);
  emit({ type: 'stage', id: 'compile', status: 'done' });

  const finalReport: RiskReport = {
    ...report,
    meta: { ...report.meta, durationMs: Date.now() - started },
  };
  emit({ type: 'done', report: finalReport });
  return finalReport;
}
