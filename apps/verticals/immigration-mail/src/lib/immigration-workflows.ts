export type ImmigrationWorkflow = {
  slug: string;
  title: string;
  h1: string;
  description: string;
  intent: string;
  primaryKeyword: string;
  monthlySearchVolume: number;
  cpc: number;
  notes: string[];
  relatedTerms: string[];
};

/**
 * SEO + product registry for Immigration Mail's master workflow family.
 * Search-volume figures are current research snapshots from Keyword.com on
 * 2026-08-21 and are directional; pages must never present them to users.
 */
export const IMMIGRATION_WORKFLOWS: readonly ImmigrationWorkflow[] = [
  {
    slug: "i-797-notice",
    title: "Understand an I-797 / I-797C Notice",
    h1: "What does your I-797 or I-797C mean?",
    description: "Understand a USCIS Notice of Action, identify what it says to do next, and organize the notice into a reviewable response workflow.",
    intent: "I-797 / I-797C notice",
    primaryKeyword: "i 797",
    monthlySearchVolume: 18100,
    cpc: 9.320457,
    notes: ["Separate receipt, approval, rejection, and other Notice of Action purposes.", "Do not infer a deadline from the form number alone."],
    relatedTerms: ["form i 797", "form i 797c", "i 797 notice of action", "i 797 receipt notice", "i 797 what is it"],
  },
  {
    slug: "rfe-response",
    title: "Respond to a USCIS RFE",
    h1: "Respond to a USCIS Request for Evidence (RFE)",
    description: "Turn a USCIS Request for Evidence into a structured response with the requested evidence, source documents, deadlines, and a reviewable cover letter.",
    intent: "RFE response",
    primaryKeyword: "responding to rfe",
    monthlySearchVolume: 170,
    cpc: 22.738413,
    notes: ["Keep every requested item traceable to its supporting evidence.", "Do not invent an RFE deadline; extract it from the notice or flag it for verification."],
    relatedTerms: ["rfe response", "rfe response time", "uscis rfe response", "rfe response letter sample", "cover letter for rfe response"],
  },
  {
    slug: "noid-response",
    title: "Respond to a USCIS Notice of Intent to Deny",
    h1: "Respond to a USCIS Notice of Intent to Deny (NOID)",
    description: "Organize a USCIS NOID, preserve the stated concerns, gather supporting evidence, and prepare a response you can review before submission.",
    intent: "NOID response",
    primaryKeyword: "notice of intent to deny uscis",
    monthlySearchVolume: 170,
    cpc: 0.9633,
    notes: ["A NOID is case-specific; preserve the exact issues raised.", "Do not make legal conclusions that aren't supported by source material."],
    relatedTerms: ["uscis noid", "intent to deny uscis", "uscis notice of intent to deny", "notice of intent to deny i 130", "notice of intent to deny i 485"],
  },
  {
    slug: "uscis-denial-rejection",
    title: "Respond to a USCIS Denial or Rejection",
    h1: "Understand a USCIS denial or rejection and prepare the next response",
    description: "Organize a USCIS denial or rejection, identify the decision and any stated review path, and preserve the record before acting.",
    intent: "USCIS denial / rejection",
    primaryKeyword: "rejection notice uscis",
    monthlySearchVolume: 170,
    cpc: 0,
    notes: ["A denial, rejection, motion, and appeal are different procedural paths.", "The workflow should verify the exact notice before suggesting a next step."],
    relatedTerms: ["i 485 denial notice", "uscis denial notice", "uscis denial notice sample", "appeal uscis denial"],
  },
  {
    slug: "uscis-foia",
    title: "Request USCIS Records by FOIA",
    h1: "File a USCIS FOIA request for your immigration records",
    description: "Prepare an immigration records request for USCIS, organize identity and case details, and preserve a mailing record for the request.",
    intent: "USCIS FOIA request",
    primaryKeyword: "foia uscis",
    monthlySearchVolume: 4400,
    cpc: 6.100901,
    notes: ["Distinguish a first-party records request from third-party records.", "Use agency-specific identity and authorization requirements only when verified."],
    relatedTerms: ["foia request uscis", "uscis foia request online", "uscis g 639", "g 639 uscis", "uscis foia status"],
  },
  {
    slug: "eoir-foia",
    title: "Request Immigration Court Records by FOIA",
    h1: "Prepare an EOIR FOIA request",
    description: "Organize an immigration-court records request with the right identifiers, record scope, and review checkpoints before mailing.",
    intent: "EOIR FOIA request",
    primaryKeyword: "eoir foia",
    monthlySearchVolume: 1900,
    cpc: 0,
    notes: ["Identify the correct EOIR/court record custodian.", "Keep A-number and case identifiers consistent across the request."],
    relatedTerms: ["eoir foia request", "foia immigration court", "eoir foia form", "eoir foia online"],
  },
  {
    slug: "ice-foia",
    title: "Request ICE Records by FOIA",
    h1: "Prepare an ICE FOIA request",
    description: "Prepare a focused ICE records request with identity, case, and record-scope details organized for review and mailing.",
    intent: "ICE FOIA request",
    primaryKeyword: "ice foia request",
    monthlySearchVolume: 260,
    cpc: 0,
    notes: ["Use the subject's identifying information consistently.", "Do not assume the same procedure applies to every DHS component."],
    relatedTerms: ["foia immigration", "foia request for immigration records", "foia immigration records"],
  },
  {
    slug: "g-639-records",
    title: "Prepare Form G-639 / Immigration Records Request",
    h1: "Prepare an immigration records request using Form G-639",
    description: "Organize the information commonly needed for an immigration records request and review the resulting request before submission.",
    intent: "G-639 records request",
    primaryKeyword: "g 639 uscis",
    monthlySearchVolume: 260,
    cpc: 4.469786,
    notes: ["Treat the form and the agency process as authoritative; do not invent filing requirements.", "Keep identifiers and requested records internally consistent."],
    relatedTerms: ["form g 639 uscis", "g 639 form uscis", "g639 form online", "foia g639"],
  },
  {
    slug: "i-130-response",
    title: "Respond to an I-130 RFE, NOID, or Decision",
    h1: "Prepare a response for an I-130 USCIS notice",
    description: "Organize an I-130 notice, identify the exact request or decision, and prepare a source-linked response package for review.",
    intent: "I-130 notice response",
    primaryKeyword: "intent to deny i 130",
    monthlySearchVolume: 10,
    cpc: 0,
    notes: ["Do not assume an I-130 notice has the same response path as an I-485 notice.", "Keep beneficiary and petitioner facts clearly separated."],
    relatedTerms: ["i 130 rfe response", "notice of intent to deny i 130", "i 130 denial"],
  },
  {
    slug: "i-140-rfe-response",
    title: "Respond to an I-140 RFE",
    h1: "Respond to an I-140 Request for Evidence",
    description: "Organize an I-140 RFE, evidence requests, supporting exhibits, and response cover letter before the filing deadline.",
    intent: "I-140 RFE response",
    primaryKeyword: "i 140 rfe response",
    monthlySearchVolume: 40,
    cpc: 0,
    notes: ["Preserve the exact RFE questions and map each answer to evidence.", "Do not assume premium-processing timing from the case type alone."],
    relatedTerms: ["i 140 rfe processing time", "i 140 rfe response time", "cover letter for rfe response"],
  },
  {
    slug: "i-485-rfe-response",
    title: "Respond to an I-485 RFE",
    h1: "Respond to an I-485 Request for Evidence",
    description: "Build an organized I-485 RFE response with document tracking, missing-evidence warnings, and a reviewable submission package.",
    intent: "I-485 RFE response",
    primaryKeyword: "i 485 rfe response time",
    monthlySearchVolume: 20,
    cpc: 0,
    notes: ["Do not infer the deadline; preserve the deadline printed on the notice.", "Medical and identity evidence require particularly careful source tracking."],
    relatedTerms: ["i 485 rfe response", "i 485 medical rfe response time", "response to uscis request for evidence was received 485"],
  },
  {
    slug: "n-400-rfe-response",
    title: "Respond to an N-400 RFE",
    h1: "Respond to an N-400 Request for Evidence",
    description: "Organize a naturalization evidence request, identify missing documents, and prepare a response that remains tied to the notice.",
    intent: "N-400 RFE response",
    primaryKeyword: "n400 rfe response time",
    monthlySearchVolume: 10,
    cpc: 0,
    notes: ["Keep identity and naturalization-case details consistent throughout the response.", "Do not infer eligibility from a single notice."],
    relatedTerms: ["n400 rfe", "n400 request for evidence", "naturalization rfe"],
  },
  {
    slug: "i-751-noid",
    title: "Respond to an I-751 Notice or NOID",
    h1: "Respond to an I-751 USCIS notice or NOID",
    description: "Organize a conditional-residence case notice, evidence request, or NOID into a reviewable response workflow.",
    intent: "I-751 notice response",
    primaryKeyword: "i 751 denied notice to appear",
    monthlySearchVolume: 10,
    cpc: 0,
    notes: ["Preserve the exact notice and its deadline.", "Do not assume an I-751 NOID has the same response structure as an RFE."],
    relatedTerms: ["i 751 noid", "i 751 notice", "i 751 denial"],
  },
  {
    slug: "visa-refusal-response",
    title: "Respond to a Visa Refusal",
    h1: "Prepare a response after an immigration visa refusal",
    description: "Organize a visa refusal, identify the stated issue, and prepare a reviewable response or supporting correspondence before mailing.",
    intent: "visa refusal response",
    primaryKeyword: "appeal letter for visa",
    monthlySearchVolume: 10,
    cpc: 0,
    notes: ["Refusal remedies vary by visa class and refusal ground.", "Do not promise that a refusal is appealable."],
    relatedTerms: ["letter of appeal for visa refusal", "appeal letter to embassy for visa refusal", "appeal letter for student visa refusal"],
  },
  {
    slug: "immigration-appeal-letter",
    title: "Prepare an Immigration Appeal Letter",
    h1: "Prepare an immigration appeal or reconsideration letter",
    description: "Organize the source decision, supporting facts, and requested outcome into a reviewable immigration appeal or reconsideration letter.",
    intent: "immigration appeal letter",
    primaryKeyword: "immigration appeal letter",
    monthlySearchVolume: 10,
    cpc: 0,
    notes: ["Identify the actual review mechanism before calling a response an appeal.", "Keep legal conclusions separate from verified facts."],
    relatedTerms: ["example of appeal letter to immigration", "deportation appeal letter", "appeal letter for pr application"],
  },
  {
    slug: "supporting-evidence-letter",
    title: "Prepare an Immigration Supporting Evidence Letter",
    h1: "Prepare an immigration supporting-evidence letter",
    description: "Turn verified case facts and supporting documents into a clear explanation letter that can accompany an immigration submission.",
    intent: "immigration explanation/supporting letter",
    primaryKeyword: "immigration explanation letter",
    monthlySearchVolume: 0,
    cpc: 0,
    notes: ["Use only facts supported by the user's record.", "Keep the letter clearly identified as correspondence rather than legal advice."],
    relatedTerms: ["immigration support letter", "immigration explanation letter", "supporting letter for immigration"],
  },
  {
    slug: "case-inquiry",
    title: "Submit a USCIS Case Inquiry",
    h1: "Is your immigration case taking too long?",
    description: "Check if your case is outside normal processing time, prepare a service request or expedite request, and mail it with tracking and proof of delivery.",
    intent: "case inquiry / status check",
    primaryKeyword: "uscis case inquiry",
    monthlySearchVolume: 8100,
    cpc: 4.5,
    notes: ["Verify case is outside normal processing time before recommending a service request.", "Expedite requests must cite qualifying criteria.", "User-initiated — no notice received."],
    relatedTerms: ["uscis case status", "uscis service request", "uscis expedite request", "case outside processing time", "uscis case delayed"],
  },
  {
    slug: "biometrics-scheduling",
    title: "Resolve a Biometrics Appointment Issue",
    h1: "Need to reschedule or fix your biometrics appointment?",
    description: "Reschedule your USCIS biometrics appointment, remedy a missed appointment, transfer ASC locations, or correct a notice discrepancy — with mailing and proof of delivery.",
    intent: "biometrics scheduling / ASC appointment problem",
    primaryKeyword: "uscis biometrics reschedule",
    monthlySearchVolume: 6600,
    cpc: 5.2,
    notes: ["Reschedule requests must be submitted before the appointment date.", "Missed appointments require immediate remedy to avoid denial.", "ASC transfer requests require evidence of hardship.", "Notice discrepancies should be corrected before attending."],
    relatedTerms: ["uscis biometrics appointment", "asc appointment reschedule", "missed biometrics appointment", "fingerprint appointment uscis", "uscis biometrics notice", "asc location transfer"],
  },
  {
    slug: "naturalization-citizenship",
    title: "Resolve a Naturalization / Citizenship Issue",
    h1: "Need help with your N-400 interview, oath ceremony, or naturalization decision?",
    description: "Prepare for your N-400 interview, study for the civics and English tests, reschedule your interview, remedy a missed interview, address oath ceremony problems, or respond to a post-interview RFE — with mailing and proof of delivery.",
    intent: "naturalization interview / citizenship / oath ceremony problem",
    primaryKeyword: "n-400 interview preparation",
    monthlySearchVolume: 8100,
    cpc: 6.5,
    notes: ["Interview reschedule requests must be submitted before the interview date.", "Missed interviews require immediate remedy to avoid N-400 denial.", "Delayed decisions over 120 days may warrant writ of mandamus under INA § 336(b).", "Oath ceremony document corrections may require Form N-565."],
    relatedTerms: ["n-400 interview", "naturalization test", "civics test practice", "citizenship interview preparation", "oath ceremony", "missed naturalization interview", "n-400 reschedule", "post interview rfe n-400", "naturalization decision delay"],
  },
  {
    slug: "consular-processing",
    title: "Resolve a Consular Processing Issue",
    h1: "Need help with your consular processing, NVC, or embassy interview?",
    description: "Manage the immigrant visa lifecycle — DS-260, NVC fees, civil documents, consular interview preparation, rescheduling, missed interviews, priority date retrogression, medical exams, and visa expiration urgency.",
    intent: "consular processing / NVC / embassy interview problem",
    primaryKeyword: "consular processing",
    monthlySearchVolume: 1300,
    cpc: 0,
    notes: ["Consular interviews are conducted by consular officers at embassies, not USCIS.", "Priority date retrogression requires monitoring the Visa Bulletin.", "Visa issuance has a 6-month validity window."],
    relatedTerms: ["consular processing", "ds-260", "nvc processing", "consular interview", "visa bulletin", "priority date", "embassy interview", "civil documents", "panel physician", "visa expiration"],
  },
  {
    slug: "i751-removal-conditions",
    title: "Remove Conditions on Residence (I-751)",
    h1: "Need to file I-751 to remove conditions on your green card?",
    description: "File Form I-751 jointly or with a waiver, manage the 90-day filing window, prepare for your interview, handle missed interviews, evidence deficiencies, delays, and denials — with mailing and proof.",
    intent: "I-751 removal of conditions / conditional green card",
    primaryKeyword: "i 751",
    monthlySearchVolume: 8100,
    cpc: 11.5,
    notes: ["I-751 must be filed within the 90-day window before conditional residence expires.", "Joint filing requires both spouses to sign.", "Waiver filing requires documentation of the waiver ground.", "Denial may lead to NTA referral to immigration court."],
    relatedTerms: ["i 751", "form i 751", "remove conditions green card", "i 751 waiver", "i 751 filing window", "conditional residence", "i 751 interview", "stokes interview", "i 751 denied", "i 751 late filing"],
  },
  {
    slug: "i601-waiver",
    title: "Inadmissibility Waiver (I-601 / I-601A)",
    h1: "Found inadmissible? Need an I-601 or I-601A waiver?",
    description: "File Form I-601 or I-601A to waive grounds of inadmissibility — detect your ground, determine your pathway, assess extreme hardship to your qualifying relative, manage evidence, and handle RFE/NOID, denial, and consular sequencing.",
    intent: "I-601 / I-601A inadmissibility waiver filing",
    primaryKeyword: "i 601 waiver",
    monthlySearchVolume: 8100,
    cpc: 11.5,
    notes: ["I-601 covers broad grounds (unlawful presence, fraud, criminal, health, smuggling).", "I-601A only waives unlawful presence and requires physical presence in the US.", "Extreme hardship to a qualifying relative is required for most waivers.", "I-601A approval requires departure for consular visa interview after adjudication.", "Non-waivable grounds include terrorism, espionage, and permanent bar after removal."],
    relatedTerms: ["i 601 waiver", "i 601a waiver", "provisional waiver", "inadmissibility waiver", "extreme hardship", "qualifying relative", "unlawful presence waiver", "fraud waiver immigration", "waiver of inadmissibility", "provisional unlawful presence waiver"],
  },
  {
    slug: "i765-employment-authorization",
    title: "Employment Authorization Document (I-765 EAD / Work Permit)",
    h1: "Need a work permit? File or renew your I-765 EAD.",
    description: "File Form I-765 for initial, renewal, or replacement Employment Authorization Document — detect your eligibility category, check expiration, verify evidence, manage fees and biometrics, and handle RFE/NOID and case-inquiry routing.",
    intent: "I-765 EAD work permit filing or renewal",
    primaryKeyword: "i 765 work permit",
    monthlySearchVolume: 22000,
    cpc: 12.0,
    notes: ["Eligibility category (e.g., (c)(9), (c)(8), (a)(5)) determines evidence requirements and filing procedures.", "USCIS recommends filing renewals 90-180 days before EAD expiration.", "Automatic extension rules changed on Oct. 30, 2025 — renewals filed on/after that date get 0 days.", "Filing fee: $520 paper, $470 online, $260 with I-485, free for initial asylum applicants.", "RFE/NOID for I-765 route to existing RFE/NOID engines with I-765 form adapter."],
    relatedTerms: ["i 765", "work permit", "ead renewal", "employment authorization", "ead category", "c9 ead", "c8 asylum ead", "work permit renewal", "ead replacement", "employment authorization document"],
  },
  {
    slug: "i131-travel-document",
    title: "Advance Parole / Travel Document (I-131)",
    h1: "Need to travel while your green card is pending? File your I-131 advance parole.",
    description: "File Form I-131 for advance parole, re-entry permit, refugee travel document, or emergency advance parole — detect your document type, analyze travel risk (I-485 abandonment, dual-intent exception), verify evidence, and manage the full filing lifecycle.",
    intent: "I-131 travel document or advance parole filing",
    primaryKeyword: "advance parole",
    monthlySearchVolume: 18100,
    cpc: 14.0,
    notes: ["Four document types: advance parole (pending I-485), re-entry permit (LPR), refugee travel document (refugee/asylee), TPS travel authorization.", "Travel without advance parole while I-485 is pending results in abandonment (H-1B/L-1 dual-intent exception applies).", "Emergency advance parole requires evidence of emergency at local USCIS field office.", "Re-entry permits valid up to 2 years; refugee travel documents valid 1 year; advance parole ~1 year.", "Filing fee: $630 paper, $580 online."],
    relatedTerms: ["advance parole", "i 131", "travel document", "re-entry permit", "refugee travel document", "emergency advance parole", "travel while i-485 pending", "advance parole renewal", "combo card", "i-512"],
  },
  {
    slug: "i90-green-card-renewal",
    title: "Green Card Renewal / Replacement (I-90)",
    h1: "Need to renew or replace your green card? File your I-90 application.",
    description: "File Form I-90 to renew an expiring 10-year green card, replace a lost/stolen/damaged card, correct USCIS errors, or update your name — we detect your card type, check the 180-day filing window, verify evidence, and manage the full filing lifecycle.",
    intent: "I-90 green card renewal or replacement filing",
    primaryKeyword: "green card renewal",
    monthlySearchVolume: 49500,
    cpc: 12.0,
    notes: ["I-90 is for 10-year permanent resident cards only — 2-year conditional residents must file I-751 instead.", "Filing window opens 180 days before card expiration.", "USCIS error filings are free ($0).", "36-month automatic extension of green card validity upon filing I-90 (since Sep 2024).", "Filing fee: $415 online, $465 paper. Biometrics included.", "Consider N-400 naturalization instead of I-90 if eligible."],
    relatedTerms: ["green card renewal", "i-90", "green card replacement", "permanent resident card renewal", "lost green card", "green card expired", "i-90 filing fee", "green card name change", "uscis error green card", "form i-90"],
  },
] as const;

export function getImmigrationWorkflow(slug: string) {
  return IMMIGRATION_WORKFLOWS.find((workflow) => workflow.slug === slug) ?? null;
}

/**
 * Maps a workflow slug to its user-facing route.
 *
 * 8 workflows have dedicated route files with full interactive UIs
 * (/rfe, /noid, /uscis-denial, etc.). The rest use the /workflows/$slug
 * catch-all which serves an SEO landing page.
 *
 * This is the single source of truth — homepage-data.ts, the workflows
 * directory, the footer, and respond-to-a-uscis-notice.tsx all import this.
 */
const SLUG_TO_DEDICATED_ROUTE: Record<string, string> = {
  'rfe-response': '/rfe',
  'noid-response': '/noid',
  'uscis-denial-rejection': '/uscis-denial',
  'visa-refusal-response': '/visa-refusal',
  'i-130-response': '/i-130',
  'uscis-foia': '/uscis-foia',
  'immigration-appeal-letter': '/appeal',
  'i-797-notice': '/i-797-notice',
  // General workflows with dedicated route files
  'respond-to-notice': '/workflows/respond-to-notice',
  'supporting-evidence-letter': '/workflows/supporting-documents',
  'explanation-letter': '/workflows/explanation-letter',
};

export function getWorkflowRoute(slug: string): string {
  return SLUG_TO_DEDICATED_ROUTE[slug] ?? `/workflows/${slug}`;
}

/**
 * Returns true if the workflow slug has a dedicated interactive route
 * (as opposed to just the catch-all SEO landing page).
 */
export function hasDedicatedRoute(slug: string): boolean {
  return slug in SLUG_TO_DEDICATED_ROUTE;
}
