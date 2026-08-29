/* ═══════════════════════════════════════════════════════════
   CP523 RESEARCH PACK — authoritative IRS sources.

   Every source here is a REAL, VERIFIED IRS publication
   or official resource. URLs were verified against live
   IRS.gov content on 2026-08-19.

   The pack separates SOURCE FACT (what the IRS says) from
   INTERPRETATION (what the system infers) from
   USER-SPECIFIC ANALYSIS (what applies to this case).

   Authoritative source for CP523:
   https://www.irs.gov/individuals/understanding-your-cp523-notice
   ═══════════════════════════════════════════════════════════ */

import {
  createSource,
  createCitation,
  type AuthoritativeSource,
  type SourceCitation,
  type ResearchPack,
} from "./source-provenance";

// ── Verified IRS Sources for CP523 ──────────────────────────

export const CP523_SOURCES: AuthoritativeSource[] = [
  createSource({
    type: "government_website",
    title: "Understanding Your CP523 Notice",
    url: "https://www.irs.gov/individuals/understanding-your-cp523-notice",
    organization: "Internal Revenue Service (IRS)",
    description: "Official IRS page explaining the CP523 notice, what it means, what to do, and how to respond.",
    covers: ["cp523_overview", "default_on_installment", "intent_to_levy", "response_process", "reinstatement", "cdp_hearing_rights"],
    verificationStatus: "verified",
    verifiedAt: "2026-08-19T00:00:00Z",
  }),
  createSource({
    type: "government_publication",
    title: "Publication 1 — Your Rights as a Taxpayer",
    url: "https://www.irs.gov/pub/irs-pdf/p1.pdf",
    organization: "Internal Revenue Service (IRS)",
    description: "Describes taxpayer rights including the right to appeal and the right to finality.",
    covers: ["taxpayer_rights", "appeal_rights"],
    verificationStatus: "verified",
    verifiedAt: "2026-08-19T00:00:00Z",
  }),
  createSource({
    type: "government_publication",
    title: "Publication 1660 — Collection Appeal Rights",
    url: "https://www.irs.gov/pub/irs-pdf/p1660.pdf",
    organization: "Internal Revenue Service (IRS)",
    description: "Explains collection appeal rights including CDP hearings and the Collection Appeals Program (CAP).",
    covers: ["cdp_hearing", "collection_appeals", "appeal_process", "levy_appeal"],
    verificationStatus: "verified",
    verifiedAt: "2026-08-19T00:00:00Z",
  }),
  createSource({
    type: "government_publication",
    title: "Publication 594 — The IRS Collection Process",
    url: "https://www.irs.gov/pub/irs-pdf/p594.pdf",
    organization: "Internal Revenue Service (IRS)",
    description: "Overview of the IRS collection process including installment agreements, levies, and liens.",
    covers: ["collection_process", "installment_agreements", "levy_process", "lien_process"],
    verificationStatus: "verified",
    verifiedAt: "2026-08-19T00:00:00Z",
  }),
  createSource({
    type: "government_form",
    title: "Form 9465 — Installment Agreement Request",
    url: "https://www.irs.gov/pub/irs-pdf/f9465.pdf",
    organization: "Internal Revenue Service (IRS)",
    description: "Form used to request a monthly installment plan if you cannot pay the full amount you owe.",
    covers: ["installment_agreement_request", "reinstatement", "new_agreement"],
    verificationStatus: "verified",
    verifiedAt: "2026-08-19T00:00:00Z",
  }),
  createSource({
    type: "government_publication",
    title: "Notice 746 — Information About Your Notice, Penalty and Interest",
    url: "https://www.irs.gov/pub/irs-pdf/n746.pdf",
    organization: "Internal Revenue Service (IRS)",
    description: "IRS notice explaining penalty and interest information.",
    covers: ["penalties", "interest"],
    verificationStatus: "verified",
    verifiedAt: "2026-08-19T00:00:00Z",
  }),
  createSource({
    type: "government_publication",
    title: "Publication 5341 — Installment Agreements",
    url: "https://www.irs.gov/pub/irs-access/p5341_accessible.pdf",
    organization: "Internal Revenue Service (IRS)",
    description: "IRS publication on installment agreements including default and reinstatement procedures.",
    covers: ["installment_agreements", "default_process", "reinstatement_process"],
    verificationStatus: "verified",
    verifiedAt: "2026-08-19T00:00:00Z",
  }),
  createSource({
    type: "government_website",
    title: "Taxpayer Advocate Service — Notice of Intent to Levy",
    url: "https://www.taxpayeradvocate.irs.gov/notices/notice-of-intent-to-levy/",
    organization: "Taxpayer Advocate Service (TAS)",
    description: "Independent taxpayer advocate information about notices of intent to levy and CDP rights.",
    covers: ["intent_to_levy", "cdp_hearing", "taxpayer_advocate", "get_help"],
    verificationStatus: "verified",
    verifiedAt: "2026-08-19T00:00:00Z",
  }),
];

// ── Known Facts from IRS Sources ─────────────────────────────
// Verified against the live IRS CP523 page on 2026-08-19.

export const CP523_KNOWN_FACTS: SourceCitation[] = [
  createCitation({
    sourceId: CP523_SOURCES[0].id,
    fact: "If you received a CP523, CP523 (SP) or CP623 notice, the IRS is informing you of the intent to terminate your installment agreement and seize (levy) your assets. You have defaulted on your agreement.",
    interpretation: "The CP523 is a default notice for an installment agreement. It is not a bill — it is a notice of intent to terminate and levy.",
    userSpecificAnalysis: "Your CP523 was sent because the IRS determined you defaulted on your installment agreement. The notice should state the reason for default.",
    isSourceStatement: true,
  }),
  createCitation({
    sourceId: CP523_SOURCES[0].id,
    fact: "Make your payment before your termination date to prevent your installment agreement from being terminated.",
    interpretation: "Making the missed payment before the termination date can prevent the agreement from being terminated.",
    isSourceStatement: true,
  }),
  createCitation({
    sourceId: CP523_SOURCES[0].id,
    fact: "Contact the IRS right away to see if you can reinstate your agreement. You may have to pay a fee to reinstate it or you may have to pay any new tax liability in full.",
    interpretation: "Reinstatement is possible but may require a fee and/or payment of any new tax liability. Contacting the IRS immediately is critical.",
    isSourceStatement: true,
  }),
  createCitation({
    sourceId: CP523_SOURCES[0].id,
    fact: "If you don't respond, we will terminate your installment agreement and begin taking collection action, which can include filing a federal tax lien or seizing (levying) your wages and/or bank accounts.",
    interpretation: "Failure to respond results in automatic termination and collection action including levy. This is a consequential deadline.",
    isSourceStatement: true,
  }),
  createCitation({
    sourceId: CP523_SOURCES[0].id,
    fact: "You should contact us as soon as possible but no later than 30 days from the date of the notice.",
    interpretation: "The response deadline is 30 days from the notice date. This is a hard deadline — do not miss it.",
    isSourceStatement: true,
  }),
  createCitation({
    sourceId: CP523_SOURCES[0].id,
    fact: "If you don't agree with our reason for terminating your installment agreement, contact us at the number printed at the top of the notice. If after talking with us you still do not agree, you have the right to file an appeal and can request a hearing with the IRS Independent Office of Appeals.",
    interpretation: "Taxpayers have the right to appeal the termination and request a hearing with the IRS Independent Office of Appeals. This is a CDP right.",
    isSourceStatement: true,
  }),
  createCitation({
    sourceId: CP523_SOURCES[0].id,
    fact: "This notice also explains the denial or revocation of a United States passport. The Fixing America's Surface Transportation (FAST) Act legislation, which generally prohibits the State Department from issuing or renewing a passport to a taxpayer with seriously delinquent tax debt.",
    interpretation: "Seriously delinquent tax debt may affect passport status under the FAST Act. This is an additional consequence of non-response.",
    isSourceStatement: true,
  }),
  createCitation({
    sourceId: CP523_SOURCES[2].id,
    fact: "Publication 1660 explains collection appeal rights including CDP hearings and the Collection Appeals Program (CAP).",
    interpretation: "Taxpayers can use either CDP hearings or the Collection Appeals Program to contest collection actions. CDP hearings require a written request within 30 days.",
    isSourceStatement: true,
  }),
  createCitation({
    sourceId: CP523_SOURCES[3].id,
    fact: "Publication 594 describes the IRS collection process, including how installment agreements work and what happens when they default.",
    interpretation: "The IRS collection process follows a specific sequence. Understanding this process helps determine the appropriate response strategy.",
    isSourceStatement: true,
  }),
  createCitation({
    sourceId: CP523_SOURCES[1].id,
    fact: "Taxpayers have the right to appeal a decision and the right to finality.",
    interpretation: "The right to appeal includes the right to request a CDP hearing when the IRS issues a notice of intent to levy.",
    isSourceStatement: true,
  }),
];

// ── Research Pack ────────────────────────────────────────────

export function getCP523ResearchPack(): ResearchPack {
  return {
    sources: CP523_SOURCES,
    knownFacts: CP523_KNOWN_FACTS,
  };
}

// ── Citation Helpers ─────────────────────────────────────────

export function citeCP523Source(sourceId: string): AuthoritativeSource | undefined {
  return CP523_SOURCES.find((s) => s.id === sourceId);
}

// ── Re-export types used by case model ──
export type { AuthoritativeSource as IRSSource, SourceCitation };
