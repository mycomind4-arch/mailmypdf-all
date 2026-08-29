/* ═══════════════════════════════════════════════════════════
   CP14 RESEARCH PACK — authoritative IRS sources.

   Every source here is a REAL, VERIFIED IRS publication
   or official resource relevant to the CP14 Balance Due
   notice.

   The pack separates SOURCE FACT (what the IRS says) from
   INTERPRETATION (what the system infers) from
   USER-SPECIFIC ANALYSIS (what applies to this case).

   ═══════════════════════════════════════════════════════════ */

import {
  createSource,
  createCitation,
  type AuthoritativeSource,
  type SourceCitation,
  type ResearchPack,
} from "./source-provenance";

// ── Verified IRS Sources for CP14 ───────────────────────────

export const CP14_SOURCES: AuthoritativeSource[] = [
  createSource({
    type: "government_website",
    title: "Understanding Your CP14 Notice",
    url: "https://www.irs.gov/individuals/understanding-your-cp14-notice",
    organization: "Internal Revenue Service (IRS)",
    description: "Official IRS page explaining the CP14 notice, what it means, what to do, and how to respond.",
    covers: ["cp14_overview", "response_process", "what_cp14_means", "how_to_respond", "payment_options"],
    verificationStatus: "verified",
    verifiedAt: "2026-08-18T00:00:00Z",
  }),
  createSource({
    type: "government_publication",
    title: "Publication 1 — Your Rights as a Taxpayer",
    url: "https://www.irs.gov/pub/irs-pdf/p1.pdf",
    organization: "Internal Revenue Service (IRS)",
    description: "Describes taxpayer rights including the right to appeal and the right to finality.",
    covers: ["taxpayer_rights", "appeal_rights"],
    verificationStatus: "verified",
    verifiedAt: "2026-08-18T00:00:00Z",
  }),
  createSource({
    type: "government_publication",
    title: "Publication 594 — The IRS Collection Process",
    url: "https://www.irs.gov/pub/irs-pdf/p594.pdf",
    organization: "Internal Revenue Service (IRS)",
    description: "Overview of the IRS collection process if taxes remain unpaid, including liens and levies.",
    covers: ["collection_process", "what_happens_after_no_response", "liens", "levies"],
    verificationStatus: "verified",
    verifiedAt: "2026-08-18T00:00:00Z",
  }),
  createSource({
    type: "government_publication",
    title: "Form 9465 — Installment Agreement Request",
    url: "https://www.irs.gov/pub/irs-pdf/f9465.pdf",
    organization: "Internal Revenue Service (IRS)",
    description: "Form for requesting a monthly payment plan if you cannot pay your tax bill in full.",
    covers: ["installment_agreement", "payment_plan", "form_9465"],
    verificationStatus: "verified",
    verifiedAt: "2026-08-18T00:00:00Z",
  }),
  createSource({
    type: "government_publication",
    title: "Publication 5 — Your Appeal Rights and How to Prepare a Protest If You Don't Agree",
    url: "https://www.irs.gov/pub/irs-pdf/p5.pdf",
    organization: "Internal Revenue Service (IRS)",
    description: "IRS publication on appeal rights when you disagree with an IRS determination.",
    covers: ["appeal_rights", "protest_process"],
    verificationStatus: "verified",
    verifiedAt: "2026-08-18T00:00:00Z",
  }),
  createSource({
    type: "government_publication",
    title: "Notice 746 — Information About Your Notice, Penalty and Interest",
    url: "https://www.irs.gov/pub/irs-pdf/n746.pdf",
    organization: "Internal Revenue Service (IRS)",
    description: "IRS notice explaining penalty and interest information including how they accrue.",
    covers: ["penalties", "interest", "penalty_abatement"],
    verificationStatus: "verified",
    verifiedAt: "2026-08-18T00:00:00Z",
  }),
  createSource({
    type: "government_website",
    title: "IRS — Penalty Relief (First Time Penalty Abatement)",
    url: "https://www.irs.gov/payments/penalty-relief",
    organization: "Internal Revenue Service (IRS)",
    description: "IRS page on penalty relief options including First-Time Penalty Abatement and reasonable cause.",
    covers: ["penalty_abatement", "first_time_abatement", "reasonable_cause", "penalty_relief"],
    verificationStatus: "verified",
    verifiedAt: "2026-08-18T00:00:00Z",
  }),
  createSource({
    type: "government_website",
    title: "Taxpayer Advocate Service — Notice CP14",
    url: "https://www.taxpayeradvocate.irs.gov/notices/cp-14/",
    organization: "Taxpayer Advocate Service (TAS)",
    description: "Independent taxpayer advocate information about CP14 notices.",
    covers: ["cp14_overview", "taxpayer_advocate", "get_help"],
    verificationStatus: "verified",
    verifiedAt: "2026-08-18T00:00:00Z",
  }),
];

// ── Known Facts from IRS Sources ─────────────────────────────

export const CP14_KNOWN_FACTS: SourceCitation[] = [
  createCitation({
    sourceId: CP14_SOURCES[0].id,
    fact: "A CP14 notice is sent to notify you that you have an unpaid balance on your account.",
    interpretation: "The CP14 is an assertion that money is owed — it is a balance due notice, not a proposed change.",
    userSpecificAnalysis: "Your CP14 indicates the IRS believes you have an unpaid tax balance. You need to either pay the balance or explain why it is incorrect.",
    isSourceStatement: true,
  }),
  createCitation({
    sourceId: CP14_SOURCES[0].id,
    fact: "If you agree with the notice, pay the amount due by the payment deadline.",
    interpretation: "If the balance is correct, payment should be made by the deadline to stop further penalties and interest.",
    isSourceStatement: true,
  }),
  createCitation({
    sourceId: CP14_SOURCES[0].id,
    fact: "If you disagree with the notice, respond by the date shown on the notice with supporting documentation.",
    interpretation: "Disagreement requires a written response with documentation before the deadline.",
    isSourceStatement: true,
  }),
  createCitation({
    sourceId: CP14_SOURCES[0].id,
    fact: "If you cannot pay in full, you may be eligible for an installment agreement or other payment options.",
    interpretation: "The IRS offers payment plans for taxpayers who cannot pay in full. Form 9465 is used to request an installment agreement.",
    isSourceStatement: true,
  }),
  createCitation({
    sourceId: CP14_SOURCES[2].id,
    fact: "If you do not respond to the notice or pay the amount due, the IRS may file a Notice of Federal Tax Lien or issue a levy.",
    interpretation: "Failure to respond or pay can result in serious collection actions including liens on property and levies on bank accounts or wages.",
    userSpecificAnalysis: "Ignoring this notice risks enforced collection actions. Respond or pay before the deadline.",
    isSourceStatement: true,
  }),
  createCitation({
    sourceId: CP14_SOURCES[3].id,
    fact: "Form 9465 is used to request a monthly installment plan if you cannot pay the full amount you owe.",
    interpretation: "An installment agreement allows you to pay your tax debt over time in monthly payments.",
    isSourceStatement: true,
  }),
  createCitation({
    sourceId: CP14_SOURCES[6].id,
    fact: "First-Time Penalty Abatement may apply if you have a clean compliance history for the prior 3 years.",
    interpretation: "If you have no penalties (other than estimated tax penalties) in the prior 3 tax years, you may qualify for first-time penalty abatement.",
    isSourceStatement: true,
  }),
  createCitation({
    sourceId: CP14_SOURCES[5].id,
    fact: "Interest is charged on the unpaid tax from the due date of the return until the date the tax is paid in full.",
    interpretation: "Interest cannot typically be abated but stops accruing once the balance is fully paid.",
    isSourceStatement: true,
  }),
];

// ── Research Pack ────────────────────────────────────────────

export function getCP14ResearchPack(): ResearchPack {
  return {
    sources: CP14_SOURCES,
    knownFacts: CP14_KNOWN_FACTS,
  }
}

// ── Citation Helpers ─────────────────────────────────────────

export function citeCP14Source(sourceId: string): AuthoritativeSource | undefined {
  return CP14_SOURCES.find((s) => s.id === sourceId);
}
