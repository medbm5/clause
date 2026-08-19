import type { DocType, RiskPattern } from '@/lib/types';

/**
 * The risk-pattern knowledge base: 17 rental patterns, 17 health-insurance
 * patterns, grounded in what actually goes wrong for consumers in India.
 *
 * `typicalLanguage` is the retrieval surface — those strings are phrases as a
 * real document prints them, not paraphrases of the title, because a pattern's
 * embedding is built from title + category + description + typicalLanguage.
 * Vague paraphrases here quietly degrade every retrieval downstream.
 *
 * `reference` is a pointer for the curious, never an assertion of law. The
 * Model Tenancy Act 2021 is a model statute individual states adopt or adapt,
 * and IRDAI circulars are periodically superseded, so `fairBenchmark` is
 * written as "what is normal, and what the regulator has pushed towards"
 * rather than "what you are entitled to".
 */

const RENTAL_PATTERNS: RiskPattern[] = [
  {
    id: 'rental.deposit.excessive',
    docType: 'rental',
    category: 'Security deposit',
    title: "Huge deposit, deducted at the owner's discretion",
    description:
      "The deposit runs to many months of rent, is explicitly interest-free, and the agreement lets the landlord alone decide what may be taken out of it — usually with wording that makes their decision final and not open to challenge.",
    typicalLanguage: [
      "The Lessee shall pay an interest-free refundable security deposit equivalent to ten (10) months' rent, i.e. Rs. 4,50,000/-",
      'refundable without interest after deducting such amounts as the Lessor may deem fit and proper',
      'The decision of the Lessor as regards deductions towards damages, dues and repairs shall be final and binding on the Lessee',
      "adjustment of any amount the Owner considers payable, at the Owner's sole discretion",
    ],
    whyRisky:
      "A ten-month deposit on a Rs. 45,000 flat locks up Rs. 4,50,000 of your money earning nothing, and 'sole discretion' leaves you no agreed yardstick to argue a deduction against. Getting your own money back becomes a favour rather than an obligation.",
    fairBenchmark:
      'Two months’ rent is the norm the Model Tenancy Act 2021 sets for homes, and one to three months is usual across Indian cities. Deductions should be limited to a written list — unpaid rent, unpaid bills, repair of specified damage beyond normal wear and tear — and backed by actual bills.',
    baseSeverity: 'high',
    reference: 'Model Tenancy Act 2021, s.11 (security deposit cap)',
  },
  {
    id: 'rental.deposit.refund_delay',
    docType: 'rental',
    category: 'Security deposit',
    title: 'No deadline for returning your deposit',
    description:
      'The agreement sets no date for refund, sets a long one, or ties the refund to something outside your control — most often the landlord finding a replacement tenant.',
    typicalLanguage: [
      'The security deposit shall be refunded within ninety (90) days from the date of handing over vacant possession',
      'The deposit shall be returned to the Lessee as and when the Lessor secures a new tenant for the said premises',
      "refund shall be made after final settlement of all accounts, the timing of which shall be at the Lessor's convenience",
      'no interest shall be payable for any period of delay in refund of the deposit',
    ],
    whyRisky:
      'You normally need this money for the deposit on your next home. A 90-day wait, or a wait until a stranger signs a lease, means funding two deposits at once — and with no interest and no penalty for delay, nothing pushes the landlord to pay.',
    fairBenchmark:
      'Refund when you hand over possession, or within 15 to 30 days of it, with an itemised statement of any deductions. Refund should never depend on a new tenant being found — that is the owner’s commercial risk, not yours.',
    baseSeverity: 'high',
    reference: 'Model Tenancy Act 2021, s.11(2) (refund on handover)',
  },
  {
    id: 'rental.lockin.forfeiture',
    docType: 'rental',
    category: 'Lock-in period',
    title: 'Leave early and lose the entire deposit',
    description:
      'A long minimum stay is imposed on the tenant, and breaking it forfeits the whole deposit rather than the rent for the unexpired months — sometimes while still owing rent for the rest of the period.',
    typicalLanguage: [
      'There shall be a lock-in period of nine (9) months from the date of commencement, during which the Lessee shall not vacate the premises',
      'In the event the Lessee vacates before expiry of the lock-in period, the entire security deposit shall stand forfeited to the Lessor',
      'the Lessee shall remain liable to pay rent for the balance unexpired portion of the lock-in period notwithstanding vacation of the premises',
      'The lock-in period shall not apply to the Lessor, who may terminate this Agreement at any time',
    ],
    whyRisky:
      'A job change, a transfer or a family emergency in month three costs you the full deposit — several lakh rupees — no matter how much notice you give. A lock-in that binds only you is not a mutual commitment, it is a penalty.',
    fairBenchmark:
      'If there is a lock-in at all it should be short (three to six months), bind both sides, and cap the cost of leaving early at rent for the notice period or the unexpired months — not the whole deposit. Forfeiture far in excess of the owner’s actual loss is the classic definition of a penalty rather than compensation.',
    baseSeverity: 'critical',
    reference: 'Indian Contract Act 1872, s.74 (penalty vs. actual loss)',
  },
  {
    id: 'rental.notice.asymmetry',
    docType: 'rental',
    category: 'Notice period',
    title: 'You give long notice, the owner gives almost none',
    description:
      'The notice the tenant must give is materially longer than the notice the landlord must give, or the tenant pays rent in lieu of short notice while the landlord owes nothing for a short-notice eviction.',
    typicalLanguage: [
      "The Lessee shall give three (3) months' prior written notice of intention to vacate; the Lessor may terminate by giving fifteen (15) days' notice",
      'failing which the Lessee shall pay rent in lieu of the shortfall in the notice period',
      'The Lessor reserves the right to terminate this Agreement forthwith without assigning any reason',
      'Notice once given by the Lessee shall be irrevocable',
    ],
    whyRisky:
      'Fifteen days is not enough time to find a home, raise a fresh deposit and move in an Indian metro, so the short end of the asymmetry lands entirely on you. Meanwhile the three months on your side is three months of rent even if you leave in week one.',
    fairBenchmark:
      "Equal notice both ways — one month is the common norm for homes, two at the outside. Any 'rent in lieu of notice' term should apply to the landlord too.",
    baseSeverity: 'high',
    reference: 'Model Tenancy Act 2021, s.21 (termination and notice)',
  },
  {
    id: 'rental.escalation.steep',
    docType: 'rental',
    category: 'Rent escalation',
    title: 'Rent rises faster than the market does',
    description:
      'An automatic increase well above the customary range, sometimes compounding, sometimes with no number at all because the landlord fixes it later.',
    typicalLanguage: [
      'The monthly rent shall stand enhanced by fifteen percent (15%) on completion of every eleven (11) months',
      'The rent shall be increased annually at such rate as may be intimated by the Lessor',
      'escalation of 10% compounded annually over the rent then prevailing',
      'The Lessor shall be entitled to revise the rent in line with prevailing market rates at the time of renewal',
    ],
    whyRisky:
      "A 15% bump every 11 months compounds: Rs. 45,000 becomes about Rs. 59,500 after two years. And 'as may be intimated by the Lessor' is not an escalation clause at all — it is a blank cheque, signed at the moment you have already sunk moving costs and a deposit into the flat.",
    fairBenchmark:
      "Five to ten percent a year is the customary residential range across Indian cities, written as a fixed figure you can calculate yourself. A 'market rate' revision should at least carry a ceiling.",
    baseSeverity: 'moderate',
  },
  {
    id: 'rental.repairs.tenant_burden',
    docType: 'rental',
    category: 'Repairs and maintenance',
    title: "You pay for repairs that are the owner's job",
    description:
      "All maintenance and repair — including structural work, waterproofing and the owner's own appliances — is pushed onto the tenant, with no threshold separating a leaking tap from a leaking roof.",
    typicalLanguage: [
      'The Lessee shall at its own cost keep and maintain the premises, its fittings, fixtures and appliances in good repair and working condition',
      'all repairs, whether minor or major, structural or otherwise, shall be the responsibility of the Lessee',
      'The Lessee shall bear the cost of servicing, repair and replacement of the air-conditioners, geysers and water purifier',
      'seepage, dampness and water leakage shall be attended to by the Lessee at its own expense',
    ],
    whyRisky:
      'Structural work, waterproofing, plumbing inside the walls or a failed geyser each run into tens of thousands of rupees — on a flat you do not own and will hand back. You end up paying to improve someone else’s asset.',
    fairBenchmark:
      'The split in the Model Tenancy Act is the usual reference: the owner takes structural repairs, whitewashing, external plumbing and wiring, and the appliances they supplied; the tenant takes day-to-day items — drain cleaning, switches and sockets, broken glass panes, minor fittings. A rupee threshold, say Rs. 2,000 per incident, draws the line cleanly.',
    baseSeverity: 'high',
    reference: 'Model Tenancy Act 2021, Schedule II (division of repairs)',
  },
  {
    id: 'rental.entry.no_notice',
    docType: 'rental',
    category: 'Right of entry',
    title: 'The owner can walk in without telling you',
    description:
      "Entry at will, or on vague terms like 'reasonable times', with no written-notice requirement — often alongside the landlord keeping a duplicate set of keys.",
    typicalLanguage: [
      'The Lessor or his authorised representative shall be entitled to enter and inspect the premises at any time without prior notice',
      'The Lessor shall retain a duplicate set of keys to the said premises',
      'The Lessee shall permit inspection by prospective tenants or purchasers at such times as the Lessor may decide',
      'The Lessor may enter the premises at all reasonable hours to verify compliance with the terms hereof',
    ],
    whyRisky:
      'You are paying for exclusive possession — that is what renting is. Unannounced entry means no privacy for you or your family, and it makes any later dispute about damage or missing belongings impossible to settle.',
    fairBenchmark:
      'Twenty-four hours’ written notice, daytime hours, and a stated purpose such as a repair or an agreed inspection — the standard the Model Tenancy Act sets. Genuine emergencies are the sensible exception. A landlord holding keys to an occupied home is not normal.',
    baseSeverity: 'high',
    reference: "Model Tenancy Act 2021, s.24 (entry on 24 hours' notice)",
  },
  {
    id: 'rental.restrictions.personal_conduct',
    docType: 'rental',
    category: 'Restrictions on use',
    title: 'Rules about who may visit and how you may live',
    description:
      'Conditions that reach past the property into private life: bans on overnight guests, on non-vegetarian cooking, on pets, on visitors of the opposite sex, or terms tied to marital status, religion or diet — with termination as the penalty.',
    typicalLanguage: [
      'No guests shall be permitted to stay overnight in the premises without the prior written permission of the Lessor',
      'The Lessee shall not cook or consume non-vegetarian food in the said premises',
      'No pets of any kind shall be kept in the premises',
      'The premises are let to the Lessee as a bachelor and no member of the opposite sex shall be permitted to visit or reside therein',
    ],
    whyRisky:
      'These clauses turn ordinary life — a parent visiting, cooking dinner, a partner staying over — into a documented breach the landlord can terminate on. They are also the clauses most often enforced selectively, which is exactly why they are worth deleting before signing rather than arguing about later.',
    fairBenchmark:
      'Restrictions should attach to the property and the neighbours, not to the person: no unlawful or commercial use, no structural changes, no nuisance, and compliance with society rules. Conditions based on diet, gender, marital status or religion are widely contested as discriminatory and are not a normal price of housing.',
    baseSeverity: 'moderate',
  },
  {
    id: 'rental.exit.painting_charges',
    docType: 'rental',
    category: 'Exit charges',
    title: 'Fixed painting and cleaning charges, whatever the condition',
    description:
      "A pre-agreed sum — commonly one or two months' rent — comes out of the deposit for painting, deep cleaning or 'restoration', with no reference to actual condition, actual cost, or any bill.",
    typicalLanguage: [
      "An amount equivalent to two (2) months' rent shall be deducted from the security deposit towards painting and whitewashing charges at the time of vacating",
      'Deep cleaning and pest control charges of Rs. 15,000/- shall be borne by the Lessee irrespective of the condition of the premises',
      'The Lessee shall hand over the premises freshly painted to the satisfaction of the Lessor',
      'The above deduction shall be made without requirement of production of bills or estimates',
    ],
    whyRisky:
      'Repainting a 2BHK runs roughly Rs. 15,000 to Rs. 25,000, but two months of Rs. 45,000 rent is Rs. 90,000 — the gap is not a repair, it is a charge. Waiving bills removes the only check on the number.',
    fairBenchmark:
      'Painting is periodic upkeep of the owner’s asset, so it is normally prorated against how long you stayed — nothing after a long tenancy, a share after a short one — or charged at actual cost against a bill, with normal wear and tear expressly excluded.',
    baseSeverity: 'moderate',
  },
  {
    id: 'rental.costs.brokerage_stamp',
    docType: 'rental',
    category: 'Transaction costs',
    title: 'Every transaction cost lands on you',
    description:
      "Brokerage, stamp duty, registration and drafting charges are all made the tenant's liability — including brokerage for a broker the landlord engaged, and again on every renewal.",
    typicalLanguage: [
      'The stamp duty, registration charges and incidental expenses in connection with this Agreement shall be borne solely by the Lessee',
      "Brokerage equivalent to one (1) month's rent shall be paid by the Lessee to the broker introduced by the Lessor",
      "Charges for drafting, stamping and notarisation of this Agreement and of any renewal thereof shall be to the Lessee's account",
      'Brokerage shall also be payable by the Lessee on each renewal of this Agreement',
    ],
    whyRisky:
      'On a Rs. 45,000 flat that is about Rs. 45,000 of brokerage plus stamp duty before you have spent a night there — and brokerage repeating at every 11-month renewal is a recurring fee for a service nobody performs again.',
    fairBenchmark:
      'Stamp duty and registration are commonly shared equally, and each side pays the broker it engaged. Brokerage on renewal is not standard. (The 11-month term exists precisely to sit below the one-year threshold at which registration becomes compulsory, which is what keeps these amounts small.)',
    baseSeverity: 'low',
    reference: 'Registration Act 1908, s.17(1)(d) (leases of a year or more)',
  },
  {
    id: 'rental.subletting.absolute_bar',
    docType: 'rental',
    category: 'Subletting and assignment',
    title: 'A house guest could count as subletting',
    description:
      'The bar on subletting is drafted so widely that ordinary sharing — a flatmate, a relative staying a few weeks, replacing a roommate — falls inside it, with forfeiture or immediate termination as the consequence.',
    typicalLanguage: [
      'The Lessee shall not sublet, assign, part with possession of or permit any other person to occupy or use the premises or any part thereof',
      'Any person residing in the premises other than those named in the Schedule hereto shall be deemed to be an act of subletting',
      'Any breach of this clause shall result in immediate termination and forfeiture of the entire security deposit',
      'Change of any occupant shall require fresh execution of this Agreement and payment of applicable charges',
    ],
    whyRisky:
      "If your parents stay a month, or one flatmate leaves and another moves in, a 'deemed subletting' clause converts that into grounds for eviction and forfeiture. In shared flats — the normal arrangement for young renters in Indian cities — it is triggered constantly.",
    fairBenchmark:
      "A bar on letting the flat out to a third party for rent is standard and reasonable. It should carve out named occupants, immediate family and genuine guests, and swapping a flatmate should need written consent, not a new agreement and a new fee.",
    baseSeverity: 'moderate',
  },
  {
    id: 'rental.termination.landlord_convenience',
    docType: 'rental',
    category: 'Termination',
    title: 'The owner can end it for any reason; you cannot',
    description:
      'A right to terminate at will, without cause, reserved to the landlord alone — sometimes effective immediately, sometimes with a right to re-enter and remove the tenant’s belongings without any court order.',
    typicalLanguage: [
      'Notwithstanding anything contained herein, the Lessor may terminate this Agreement at any time without assigning any reason whatsoever',
      'Upon such termination the Lessee shall vacate and hand over peaceful possession forthwith',
      'The Lessor shall be entitled to re-enter the premises and take possession thereof, and to remove the belongings of the Lessee therefrom',
      'The Lessee shall have no right to terminate this Agreement prior to expiry of the term',
    ],
    whyRisky:
      'Read together with a lock-in on your side, this means you are committed and the landlord is not. The re-entry wording is the more dangerous half: taking possession of an occupied home, or putting a tenant’s belongings out, is not a remedy a landlord gets to grant themselves.',
    fairBenchmark:
      'Termination rights should mirror each other, and ending it mid-term should need a stated ground — non-payment, unlawful use, or a breach left uncured after written notice. Recovering possession follows the notice period or the process under the applicable state rent law, never self-help.',
    baseSeverity: 'critical',
    reference: 'Model Tenancy Act 2021, s.21–22 (grounds for eviction)',
  },
  {
    id: 'rental.latefee.punitive',
    docType: 'rental',
    category: 'Late payment',
    title: 'Late-rent charges that snowball',
    description:
      'Interest or a per-day penalty far above commercial lending rates, with no grace period, and termination available almost as soon as payment is late.',
    typicalLanguage: [
      'Interest at 24% per annum shall be payable on any amount of rent not paid by the 5th day of the month',
      'A late payment charge of Rs. 500/- per day shall apply until the rent is paid in full',
      'Non-payment of rent for a period exceeding seven (7) days shall entitle the Lessor to terminate this Agreement and forfeit the security deposit',
      'The Lessor may adjust unpaid rent and interest thereon against the security deposit at its discretion',
    ],
    whyRisky:
      'Rs. 500 a day is Rs. 15,000 a month — a third of the rent again — for a delay a salary date or a failed bank transfer can cause. A seven-day fuse to termination leaves no room for an honest mistake.',
    fairBenchmark:
      'A grace period of five to seven days, then interest in the 12 to 18 percent a year range, is the usual commercial shape. Termination for non-payment should follow written notice and a chance to pay, typically 15 days, and normally needs a sustained default of two or three months.',
    baseSeverity: 'moderate',
  },
  {
    id: 'rental.disputes.venue_arbitration',
    docType: 'rental',
    category: 'Disputes',
    title: 'Disputes go where it suits the owner, at your cost',
    description:
      'Jurisdiction is fixed to a city the tenant has no connection with, or disputes go to a sole arbitrator the landlord appoints, with fees shared or borne by the tenant.',
    typicalLanguage: [
      'All disputes shall be subject to the exclusive jurisdiction of the courts at Mumbai',
      'Any dispute shall be referred to a sole arbitrator appointed by the Lessor, whose decision shall be final and binding',
      'The costs and fees of the arbitration shall be borne equally by the parties',
      'The Lessee waives any objection to the venue and to the appointment so made',
    ],
    whyRisky:
      'A tenant in Bengaluru cannot realistically litigate in Mumbai over a deposit. An arbitrator chosen by the other side, in a private process where you pay half the fees, routinely costs more than the deposit you are trying to recover — which is usually the point of the clause.',
    fairBenchmark:
      'Jurisdiction where the property is, because that is where the tenancy and the witnesses are. If there is arbitration, the arbitrator should be jointly appointed or named by a neutral institution — a unilateral appointment by one side is the exact practice Indian arbitration law was amended to curb. Rent authorities and consumer forums are the cheaper routes and are not worth signing away.',
    baseSeverity: 'moderate',
    reference:
      'Arbitration and Conciliation Act 1996, s.12(5) (unilateral appointment)',
  },
  {
    id: 'rental.charges.utilities_society',
    docType: 'rental',
    category: 'Utilities and society charges',
    title: 'Open-ended society, utility and corpus charges',
    description:
      "The tenant picks up not just metered usage but society maintenance, sinking fund, corpus and club charges, any future levy the association invents, and sometimes the owner's property tax.",
    typicalLanguage: [
      'The Lessee shall pay all charges for electricity, water, gas, internet, society maintenance, sinking fund and any other charges levied by the Association',
      'Any increase in maintenance charges or any special levy imposed by the Association during the term shall be to the account of the Lessee',
      'The Lessee shall pay a non-refundable corpus / club membership charge of Rs. 25,000/- to the Association',
      'Property tax and other statutory outgoings in respect of the premises shall be reimbursed by the Lessee',
    ],
    whyRisky:
      "Sinking funds, corpus and special levies pay for the building's long-term capital — a new lift, a facade repair — which stays with the owner after you leave. And 'any other charges' means you have agreed to a bill nobody has written yet.",
    fairBenchmark:
      'You pay what you consume — metered electricity, water, gas, internet — and often the routine monthly society maintenance where that is local custom. Property tax, sinking fund, corpus and one-time capital levies sit with the owner. A cap or a closed list is normal.',
    baseSeverity: 'low',
  },
  {
    id: 'rental.condition.as_is_no_inventory',
    docType: 'rental',
    category: 'Condition of premises',
    title: "You accept the flat 'as is' with nothing written down",
    description:
      'The tenant acknowledges the premises and every fitting to be in good condition — with no inventory, no photographs and no joint inspection — while agreeing to return everything in that same condition.',
    typicalLanguage: [
      "The Lessee has inspected the premises and accepts the same on an 'as is where is' basis in good and tenantable condition",
      'The Lessee shall hand over the premises together with all fittings and fixtures in the same good condition as at the commencement of this Agreement',
      'The Lessee acknowledges that all appliances, fittings and fixtures are in perfect working order as on the date hereof',
      'No claim shall lie against the Lessor in respect of the condition of the premises or of any fitting therein',
    ],
    whyRisky:
      'With nothing recorded at move-in, every scratch, stained wall and failed appliance is arguably yours at move-out — and you have already signed a statement saying it was all perfect. This is the clause that makes an arbitrary exit deduction stick.',
    fairBenchmark:
      'A signed inventory annexed to the agreement listing fittings and appliances with their condition, dated photographs taken by both sides at handover, and an express carve-out for normal wear and tear and fair depreciation. Pre-existing defects get listed and fixed by the owner.',
    baseSeverity: 'moderate',
  },
  {
    id: 'rental.amendment.unilateral',
    docType: 'rental',
    category: 'Changes to the agreement',
    title: 'Terms can be changed without your agreement',
    description:
      'The landlord reserves the right to amend the agreement, add rules or revise charges by notice alone, with continued occupation treated as your acceptance.',
    typicalLanguage: [
      'The Lessor reserves the right to amend, modify or add to the terms of this Agreement at any time by written intimation to the Lessee',
      'Continued occupation of the premises after such intimation shall be deemed to be acceptance of the revised terms',
      'The Lessee shall abide by all rules and regulations as may be framed by the Lessor or the Association from time to time',
      'Any such revision shall take effect from the date specified in the intimation',
    ],
    whyRisky:
      "This makes every other protection in the document provisional: a term you negotiated can be replaced by a letter, and your only way to refuse is to move out. 'Deemed acceptance' means silence counts as your signature.",
    fairBenchmark:
      "Changes by written agreement signed by both parties, and nothing else. Society rules can reasonably bind you, but the landlord's own terms — rent, charges, restrictions — should be fixed for the term.",
    baseSeverity: 'high',
  },
];

const HEALTH_PATTERNS: RiskPattern[] = [
  {
    id: 'health.waiting.pre_existing',
    docType: 'health_insurance',
    category: 'Waiting periods',
    title: 'Existing conditions not covered for years',
    description:
      'Anything you already live with — diabetes, hypertension, thyroid, a past surgery — is excluded for a long initial period, sometimes 48 months, and the definition of "pre-existing" reaches back years before the policy started.',
    typicalLanguage: [
      'Expenses related to the treatment of a pre-existing disease (PED) and its direct complications shall be excluded until the expiry of 48 months of continuous coverage',
      'Pre-existing disease means any condition, ailment, injury or disease that is diagnosed by a physician within 48 months prior to the effective date of the policy',
      'or for which medical advice or treatment was recommended by, or received from, a physician within 48 months prior to the effective date',
      'Code-Excl01',
    ],
    whyRisky:
      'A 48-month wait means four years of premiums before the illness you most expect to be treated for is covered. If you are 55 with controlled diabetes, this is the single term that decides whether the policy is worth anything to you.',
    fairBenchmark:
      'IRDAI capped the pre-existing waiting period at 36 months of continuous coverage, and competitive retail plans now sell 24 or even 12 months. Anything longer than 36 months, or a definition looking back further than the regulator allows, is worth challenging before you pay.',
    baseSeverity: 'critical',
    reference: 'IRDAI Master Circular on Health Insurance, 2024 (36-month PED cap)',
  },
  {
    id: 'health.waiting.specific_illness_maternity',
    docType: 'health_insurance',
    category: 'Waiting periods',
    title: 'Common illnesses and maternity wait two to four years',
    description:
      'A named list of very ordinary conditions — cataract, hernia, piles, gallstones, fibroids, knee replacement — is excluded for the first 24 to 48 months whether or not you had any sign of them when you bought, and maternity waits as long again, with a cap well below what a delivery costs.',
    typicalLanguage: [
      'Expenses related to the treatment of the following listed conditions are excluded until the expiry of 24 consecutive months of coverage: cataract, benign prostatic hypertrophy, hernia, hydrocele, fissures and/or fistula in anus, haemorrhoids, stones in the biliary and urinary system, uterine prolapse, fibroids and all types of sinusitis',
      'Joint replacement surgery shall be subject to a waiting period of 48 months',
      'Maternity expenses shall be payable only after 48 months of continuous coverage with the Company, subject to a limit of Rs. 50,000 for normal delivery and Rs. 75,000 for caesarean section, limited to two deliveries during the lifetime of the Insured Person',
      'Expenses incurred in connection with the new born baby shall be covered from the 91st day',
    ],
    whyRisky:
      'These are among the commonest reasons an Indian family is hospitalised at all. A cataract at 58 or a knee replacement at 62 landing inside a two- or four-year wait means paying Rs. 60,000 to Rs. 3,00,000 yourself while holding a policy. On the maternity side, a caesarean in a private metro hospital runs Rs. 1,00,000 to Rs. 2,50,000, so a Rs. 75,000 cap four years away is close to no benefit at all.',
    fairBenchmark:
      '24 months is the standard specific-illness waiting period, and IRDAI treats it as the outer edge for most listed conditions — a separate 48-month wait for joint replacement, or a list running to dozens of entries, is on the harsh side of the market. Maternity waits of 9 to 24 months are normal in plans that sell the benefit seriously, with newborn cover from day one.',
    baseSeverity: 'high',
    reference: 'IRDAI standard exclusion Code-Excl02 (specified diseases)',
  },
  {
    id: 'health.limits.room_rent_cap',
    docType: 'health_insurance',
    category: 'Room rent and ICU limits',
    title: 'A daily room-rent cap decided by your sum insured',
    description:
      'Room rent is limited to a small percentage of the sum insured per day, with a separate ICU cap, so the hospital room you are entitled to is fixed by arithmetic rather than by what is available.',
    typicalLanguage: [
      'Room rent shall be limited to 1% of the Sum Insured per day and ICU charges to 2% of the Sum Insured per day',
      'Eligibility is restricted to a Single Private Air-Conditioned Room of the lowest category available in the hospital',
      'In the event the Insured Person opts for a room category higher than the eligible category, the provisions of proportionate deduction shall apply',
      'Room rent shall include nursing charges, RMO charges and service charges levied by the hospital',
    ],
    whyRisky:
      'On a Rs. 5,00,000 policy, 1% is Rs. 5,000 a day — below the single-room tariff at most private hospitals in Mumbai, Delhi or Bengaluru. The cap is not just a room charge: exceeding it triggers proportionate deduction across the whole bill.',
    fairBenchmark:
      'No room-rent cap at all, or entitlement to a single private room without a percentage limit, is the norm in mainstream retail plans now. If a cap exists, it should be a rupee figure you can check against your local hospital, and IRDAI has barred proportionate deduction on ICU charges.',
    baseSeverity: 'high',
    reference: 'IRDAI Master Circular on Health Insurance, 2024',
  },
  {
    id: 'health.limits.proportionate_deduction',
    docType: 'health_insurance',
    category: 'Proportionate deduction',
    title: 'Pick a costlier room and your whole bill is cut',
    description:
      'If the room you occupy exceeds your entitlement, the insurer pays only a proportion of every associated charge — surgeon, anaesthetist, operation theatre, investigations — in the ratio of eligible room rent to actual room rent.',
    typicalLanguage: [
      'Where the Insured Person is admitted to a room category higher than the eligible category, all Associated Medical Expenses shall be payable in the proportion which the eligible room rent bears to the actual room rent incurred',
      'Associated Medical Expenses shall include professional fees of surgeon, anaesthetist and consultants, operation theatre charges, investigations and diagnostics',
      'Proportionate deduction shall apply irrespective of the reason for occupying the higher category room',
      'The balance shall be borne by the Insured Person',
    ],
    whyRisky:
      'This is the clause that turns a Rs. 4,00,000 claim into a Rs. 2,40,000 payout. The room upgrade might cost Rs. 3,000 a day, but the deduction applies across surgeon and theatre charges too — and it bites when the hospital simply had no room in your category.',
    fairBenchmark:
      "IRDAI's 2024 master circular narrowed this sharply: no proportionate deduction where the insured occupies a room within entitlement, and none at all on ICU charges. Plans without any room capping cannot apply it. Where a policy keeps it, it should be waived when the hospital had no eligible room free.",
    baseSeverity: 'critical',
    reference: 'IRDAI Master Circular on Health Insurance, 2024',
  },
  {
    id: 'health.limits.copayment',
    docType: 'health_insurance',
    category: 'Co-payment',
    title: 'You pay a fixed share of every claim',
    description:
      'A percentage of each admissible claim is yours to pay, often rising with age or triggered on entry after 60, and sometimes stacked on top of a room-rent cap and sub-limits.',
    typicalLanguage: [
      'A co-payment of 20% shall be applicable on each and every claim where the Insured Person is aged 60 years or above at the time of claim',
      'The co-payment shall apply to the admissible claim amount after application of sub-limits and proportionate deduction',
      'A co-payment of 10% shall apply where treatment is taken in a Zone A city notwithstanding the Zone of underwriting',
      'This co-payment is mandatory and cannot be waived',
    ],
    whyRisky:
      'A 20% co-pay on a Rs. 6,00,000 cardiac admission is Rs. 1,20,000 in cash, at exactly the age when income has usually stopped. Because it applies after sub-limits and deductions, it is a share of the reduced figure, not of the hospital bill.',
    fairBenchmark:
      'Mainstream retail plans bought before 60 carry no co-payment. Where it exists it is typically 10 to 20 percent in senior-citizen products, and many insurers offer a voluntary co-pay for a lower premium — a choice you make, not a term that appears at claim time.',
    baseSeverity: 'high',
  },
  {
    id: 'health.limits.disease_sublimits',
    docType: 'health_insurance',
    category: 'Disease sub-limits',
    title: 'Per-illness caps far below the real cost',
    description:
      'Named treatments carry their own monetary ceilings — cataract, knee replacement, cardiac procedures, hernia — independent of the sum insured, so a Rs. 10,00,000 policy pays Rs. 40,000 for a cataract.',
    typicalLanguage: [
      'Cataract surgery shall be limited to Rs. 40,000 per eye',
      'Total knee replacement shall be subject to a sub-limit of Rs. 1,50,000 per joint',
      'Treatment of specified cardiac ailments shall be limited to 50% of the Sum Insured or Rs. 2,00,000, whichever is lower',
      'The above limits are within and not in addition to the Sum Insured',
    ],
    whyRisky:
      'A knee replacement in a private hospital costs Rs. 2,50,000 to Rs. 4,00,000 per joint, so a Rs. 1,50,000 sub-limit leaves a lakh or two with you — on the very procedures people buy a large sum insured for. The headline cover figure becomes decorative.',
    fairBenchmark:
      'Comprehensive plans apply no disease-wise sub-limits, or restrict them to genuinely elective procedures. Where they exist they should be listed in the brochure and the policy schedule in rupees, not buried in the wording, and should be reviewed against current hospital tariffs.',
    baseSeverity: 'high',
  },
  {
    id: 'health.exclusions.non_medical_items',
    docType: 'health_insurance',
    category: 'Non-payable items',
    title: 'Consumables and supplies are not covered',
    description:
      'A long schedule of non-medical expenses — gloves, syringes, PPE kits, nebuliser masks, admission and registration fees, documentation charges — is excluded, and these run to a real fraction of an Indian hospital bill.',
    typicalLanguage: [
      'Expenses listed in the Schedule of Non-Medical Expenses (List I of Items for which coverage is not available in the policy) shall not be payable',
      'gloves, masks, PPE kits, nebulisation kits, thermometers, spacers, and similar consumables shall be borne by the Insured Person',
      'Admission fee, registration charges, documentation charges, service charges and telephone charges are not payable',
      'Toiletries, attendant charges and food for attendants are excluded',
    ],
    whyRisky:
      'Consumables and non-medical items commonly make up 5 to 15 percent of a hospital bill — Rs. 20,000 to Rs. 60,000 on a Rs. 4,00,000 admission — payable in cash at discharge, when you have least appetite to argue line items.',
    fairBenchmark:
      "IRDAI standardised the non-payable list, so some exclusion here is normal and honest. What differs is whether the insurer sells a consumables cover add-on and whether it is included by default — increasingly it is, and it is worth asking for.",
    baseSeverity: 'moderate',
    reference: 'IRDAI list of optional and non-medical items',
  },
  {
    id: 'health.claims.intimation_deadline',
    docType: 'health_insurance',
    category: 'Claim procedure',
    title: 'Miss a paperwork deadline and lose the claim',
    description:
      'Tight windows for telling the insurer about an admission and for submitting documents, with wording that makes the deadline a condition of payment rather than a procedural step.',
    typicalLanguage: [
      'Notice of claim must be given to the Company within 24 hours of hospitalisation in case of emergency admission and 48 hours prior to a planned admission',
      'All documents in support of the claim shall be submitted within 15 days from the date of discharge',
      'Failure to comply with the above shall result in forfeiture of the claim',
      'Compliance with the terms and conditions relating to intimation and submission is a condition precedent to any liability of the Company',
    ],
    whyRisky:
      'The 24-hour window falls exactly when a family is dealing with an emergency admission, and 15 days for hospital documents assumes the hospital releases them promptly. Losing a Rs. 3,00,000 claim over a late intimation is a paperwork outcome, not a medical one.',
    fairBenchmark:
      'The deadlines themselves are standard, but IRDAI has been explicit that a claim should not be rejected for delayed intimation or submission where the delay is for reasons beyond the insured’s control, and insurers are expected to consider the merits. Look for wording that says delay will be condoned for good reason — and intimate by any channel, immediately, even before you have documents.',
    baseSeverity: 'high',
    reference: 'IRDAI Master Circular on Health Insurance, 2024 (condonation of delay)',
  },
  {
    id: 'health.network.cashless_restriction',
    docType: 'health_insurance',
    category: 'Cashless and network hospitals',
    title: 'Cashless only inside the network, on their terms',
    description:
      'Cashless treatment is confined to empanelled hospitals, the network can change without notice, and treatment outside it drops to reimbursement — sometimes at a reduced percentage or with a higher co-pay.',
    typicalLanguage: [
      'Cashless facility is available only at Network Providers and is subject to pre-authorisation by the Company or its TPA',
      'The list of Network Providers is subject to change at the sole discretion of the Company without prior notice',
      'Where treatment is availed at a Non-Network Provider, the claim shall be processed on a reimbursement basis subject to an additional co-payment of 10%',
      'Pre-authorisation once granted may be withdrawn or modified at the time of final settlement',
    ],
    whyRisky:
      'The hospital nearest you in an emergency is the one you go to, not the one on a list — and networks get de-empanelled mid-year, sometimes over a tariff dispute. Reimbursement means finding Rs. 4,00,000 in cash first and waiting weeks for it back.',
    fairBenchmark:
      "IRDAI has pushed hard the other way: cashless authorisation within about an hour of request, final authorisation around discharge, and a 'cashless everywhere' arrangement so any hospital can offer it. Check that emergency admissions at non-network hospitals are covered without a penalty co-pay.",
    baseSeverity: 'moderate',
    reference: 'IRDAI Master Circular on Health Insurance, 2024 (cashless timelines)',
  },
  {
    id: 'health.cover.pre_post_hospitalisation',
    docType: 'health_insurance',
    category: 'Pre- and post-hospitalisation',
    title: 'Short windows for the costs around an admission',
    description:
      'Consultations, tests and medicines before and after the hospital stay are covered only inside narrow day-windows, sometimes with a rupee cap, and only if directly related to the admitted condition.',
    typicalLanguage: [
      'Pre-hospitalisation medical expenses incurred up to 15 days immediately before the date of admission shall be covered',
      'Post-hospitalisation medical expenses incurred up to 30 days immediately after the date of discharge shall be covered, subject to a maximum of 10% of the claim amount',
      'provided such expenses relate to the same condition for which the Insured Person was hospitalised',
      'Follow-up consultations beyond the said period shall not be payable',
    ],
    whyRisky:
      'Recovery does not respect a 30-day window. Post-operative physiotherapy, follow-up scans and medication after a cardiac or orthopaedic procedure often run three months, and a 10% cap on top means the tail of the treatment is largely yours.',
    fairBenchmark:
      '30 days before and 60 days after is the standard market shape; better plans give 60 and 90 days or more with no percentage cap. The percentage cap is the term to negotiate away first, because it bites hardest on large claims.',
    baseSeverity: 'moderate',
  },
  {
    id: 'health.freelook.short_window',
    docType: 'health_insurance',
    category: 'Free-look and cancellation',
    title: 'A short window to change your mind, with deductions',
    description:
      'The period for reviewing the policy and walking away is stated narrowly, and the refund is reduced by stamp duty, medical-examination costs and proportionate risk premium — while later cancellation is on the insurer’s terms.',
    typicalLanguage: [
      'The Insured Person shall have a free-look period of 15 days from the date of receipt of the policy document to review the terms and conditions',
      'refund of premium shall be subject to deduction of stamp duty charges, expenses incurred on medical examination and proportionate risk premium for the period of cover',
      'The free-look period shall not be applicable at the time of renewal of the policy',
      'The Company may cancel the policy on grounds of misrepresentation, fraud, non-disclosure or non-cooperation by giving 15 days notice',
    ],
    whyRisky:
      'Fifteen days is not long to read fifty pages of wording, notice a 48-month waiting period and act on it — and the free-look is the one moment you can leave without penalty. After it closes, cancelling usually returns a short-rate refund, not a pro-rata one.',
    fairBenchmark:
      'IRDAI extended the free-look period to 30 days for policies sold through any channel. Deducting stamp duty, medical-test costs and risk premium for days covered is normal. Use the window: it is the only cost-free exit in the contract.',
    baseSeverity: 'low',
    reference: 'IRDAI Master Circular on Health Insurance, 2024 (30-day free look)',
  },
  {
    id: 'health.repudiation.non_disclosure',
    docType: 'health_insurance',
    category: 'Non-disclosure and moratorium',
    title: 'The policy can be voided years later over a form',
    description:
      'Wide wording lets the insurer cancel the policy, decline a claim or forfeit all premium for any non-disclosure or misstatement in the proposal — without limiting it to something material or fraudulent, and with no end date.',
    typicalLanguage: [
      'If any untrue or incorrect statement has been made in the proposal form or any material fact has been suppressed, this policy shall be void and all premium paid shall be forfeited to the Company',
      'The Company may at any time cancel this policy on grounds of misrepresentation, non-disclosure of material facts, fraud or non-cooperation by the Insured Person',
      'The Insured Person shall be liable to refund all amounts already paid by the Company in respect of previous claims',
      'The onus of proving compliance with the duty of disclosure shall be on the Insured Person',
    ],
    whyRisky:
      'This is the clause behind most large-claim rejections: a thyroid tablet not mentioned on a form five years ago becomes the reason a Rs. 8,00,000 cancer claim is declined and the policy is torn up. Because it is not limited to material or deliberate non-disclosure, it turns an honest omission into total loss of cover.',
    fairBenchmark:
      "IRDAI's moratorium rule is the protection to look for: after five years of continuous coverage, a policy cannot be contested on grounds of non-disclosure or misrepresentation except for established fraud. Under insurance law generally, non-disclosure must be of a material fact to have that effect. Declare everything on the proposal form, keep a copy, and check the moratorium clause is stated at five years, not eight.",
    baseSeverity: 'critical',
    reference: 'IRDAI Master Circular on Health Insurance, 2024 (5-year moratorium)',
  },
  {
    id: 'health.ncb.reset_on_claim',
    docType: 'health_insurance',
    category: 'No-claim bonus',
    title: 'The bonus you built up vanishes with one claim',
    description:
      'The accumulated no-claim bonus is cut back or wiped out entirely when a claim is made, and it sits inside the sum insured rather than adding to it, or lapses if a renewal is late.',
    typicalLanguage: [
      'A cumulative bonus of 5% of the Sum Insured shall be added for each claim-free year, subject to a maximum of 50% of the Sum Insured',
      'In the event of a claim, the cumulative bonus accrued shall stand reduced to nil at the next renewal',
      'The cumulative bonus shall be available only if the policy is renewed within the Grace Period',
      'Cumulative bonus is within the Sum Insured and shall not increase the overall limit of indemnity',
    ],
    whyRisky:
      'Six claim-free years can build Rs. 1,50,000 of extra cover on a Rs. 5,00,000 policy — and a single Rs. 30,000 claim erases the lot. That is a real incentive not to use the insurance you are paying for, which is the opposite of the point.',
    fairBenchmark:
      'Better plans step the bonus down gradually rather than resetting it to zero, or keep it intact regardless of claims. A bonus that adds to the sum insured is worth more than one carved out of it. Also check the grace period: 15 to 30 days is normal, and a late renewal should not wipe out accumulated benefits.',
    baseSeverity: 'moderate',
  },
  {
    id: 'health.renewal.premium_revision',
    docType: 'health_insurance',
    category: 'Renewal and premium',
    title: 'Premiums can be revised and renewal loaded',
    description:
      'The insurer reserves the right to revise premium rates, terms and benefits at renewal, to load the premium for an individual’s claim history or health, and to withdraw the product altogether.',
    typicalLanguage: [
      'The Company reserves the right to revise the premium rates and/or the terms and conditions of this policy with the prior approval of the Authority',
      'The Company may apply a risk loading on the premium payable at renewal based on the claims experience or health status of the Insured Person',
      'The Company may withdraw this product, in which event the Insured Person shall be offered a substitute product then available',
      'Renewal shall not be denied except on grounds of fraud, moral hazard or misrepresentation',
    ],
    whyRisky:
      'The risk of this contract sits almost entirely on the renewal: you build up waiting periods and a moratorium with one insurer, so a steep hike at 65 is very hard to walk away from — porting resets nothing on paper but does put you through fresh underwriting. Product withdrawal moves you to whatever is then on the shelf.',
    fairBenchmark:
      'Lifelong renewability is mandated, and premium revisions need regulatory approval and cannot normally be made more than once in three years for a product. IRDAI has also pressed insurers not to raise senior-citizen premiums by more than about 10 percent a year without consultation. Individual claim-based loading at renewal is not permitted the way this wording implies — check the exact words.',
    baseSeverity: 'moderate',
    reference: 'IRDAI (Health Insurance) Regulations — lifelong renewability',
  },
  {
    id: 'health.cover.daycare_domiciliary',
    docType: 'health_insurance',
    category: 'Day-care and home treatment',
    title: 'The 24-hour rule leaves modern treatment out',
    description:
      'Cover requires a minimum 24 hours of hospitalisation, with only a closed list of day-care procedures excepted, and home treatment is either excluded or hedged with conditions that are hard to satisfy.',
    typicalLanguage: [
      'Hospitalisation for a minimum period of 24 consecutive hours is a condition precedent to admissibility of a claim',
      'Day-care procedures shall be limited to those specified in Annexure II to this policy',
      'Domiciliary hospitalisation shall be payable only where the condition is such that the Insured Person could not be removed to a hospital, or where a hospital bed was unavailable, and the treatment continues for at least three days',
      'Treatment taken at home on the advice of a medical practitioner otherwise than as above shall not be payable',
    ],
    whyRisky:
      'Chemotherapy, dialysis, cataract surgery and many endoscopic procedures now finish in a few hours. If they are not on the annexure, the 24-hour rule turns routine modern care into an uninsured expense, and you find out at the counter.',
    fairBenchmark:
      'Current plans typically cover 500 or more day-care procedures, or drop the closed list and cover any procedure requiring anaesthesia and hospital facilities. Domiciliary cover and OPD or home-care benefits appear in better products. Read the annexure — the treatments you are most likely to need should be on it.',
    baseSeverity: 'moderate',
  },
  {
    id: 'health.cover.restoration_limits',
    docType: 'health_insurance',
    category: 'Restoration of cover',
    title: 'Restored cover you probably cannot use',
    description:
      'The sum insured is reinstated after exhaustion, but only once a year, only for an unrelated illness, only for a different person, or only after the original cover is fully spent — which is precisely when you need it.',
    typicalLanguage: [
      'The Sum Insured shall be restored once during the policy year upon complete exhaustion of the Sum Insured and cumulative bonus',
      'The restored Sum Insured shall be available only for an illness or injury unrelated to that for which the earlier claim was made',
      'Restoration shall not be available for the same Insured Person in respect of the same illness during the policy year',
      'The restored Sum Insured cannot be carried forward to the next policy year',
    ],
    whyRisky:
      "The 'unrelated illness' condition removes the benefit in the case that actually exhausts a policy — one long illness with repeated admissions, like cancer or a cardiac event. Restoration then looks like extra cover on the brochure while paying nothing in the year you need it.",
    fairBenchmark:
      'Unlimited restoration, available for related and unrelated illnesses, triggering on partial exhaustion rather than full, and shared across the whole family floater. That combination exists in the market — the brochure word "restoration" tells you nothing without those four details.',
    baseSeverity: 'moderate',
  },
  {
    id: 'health.exclusions.broad_list',
    docType: 'health_insurance',
    category: 'Exclusions',
    title: 'An exclusions list broad enough to swallow a claim',
    description:
      'Beyond the standard exclusions, wording that is elastic enough to decline many ordinary claims: anything "not medically necessary", unproven treatment, hazardous activity, self-inflicted injury read broadly, or admissions "primarily for evaluation".',
    typicalLanguage: [
      'Expenses which in the opinion of the Company are not medically necessary or are not consistent with the diagnosis shall not be payable',
      'Any hospitalisation primarily for diagnostic, evaluation or investigative purposes, where no active treatment is given, is excluded',
      'Treatments which are unproven, experimental or not based on established medical practice are excluded',
      'Injury or illness arising out of participation in hazardous or adventure sports, or attributable to alcohol or substance use, is excluded',
    ],
    whyRisky:
      'Every one of these turns on the insurer’s opinion after the fact. "Not medically necessary" and "primarily for evaluation" are the grounds used to decline admissions your own doctor ordered — leaving you to argue clinical judgement with a claims desk while holding the bill.',
    fairBenchmark:
      'IRDAI standardised the core exclusions with fixed codes and wording, so a policy should track that language rather than adding open-ended tests of its own. Anything resting on "in the opinion of the Company" is worth a written question before you buy, and a specialist’s note on file before you are admitted.',
    baseSeverity: 'high',
    reference: 'IRDAI standard exclusions (Code-Excl01 to Code-Excl18)',
  },
];

/** All 34 patterns: 17 rental, 17 health insurance. */
export const PATTERNS: RiskPattern[] = [...RENTAL_PATTERNS, ...HEALTH_PATTERNS];

export const PATTERNS_BY_ID: ReadonlyMap<string, RiskPattern> = new Map(
  PATTERNS.map((p) => [p.id, p]),
);

/**
 * Patterns eligible for a document of this type: the type's own patterns plus
 * any general ones filed under 'other'.
 */
export function patternsForDocType(docType: DocType): RiskPattern[] {
  return PATTERNS.filter((p) => p.docType === docType || p.docType === 'other');
}

/** The exact string embedded for a pattern. Kept here so the script and any
 * future re-embedding can never drift from each other. */
export function patternEmbeddingInput(pattern: RiskPattern): string {
  return `${pattern.title}. ${pattern.category}. ${pattern.description} ${pattern.typicalLanguage.join(' ')}`;
}
