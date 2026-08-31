import { z } from "zod";

/* ═══════════════════════════════════════════════════════════
   Appeal Mail — Canonical Workflow Catalog
   ═══════════════════════════════════════════════════════════ */

export type AppealCategory =
  | "Insurance"
  | "Disability & Social Security"
  | "Unemployment"
  | "Government Benefits"
  | "Workers' Compensation"
  | "Veterans"
  | "Administrative";

export type WorkflowStatus = "IMPLEMENTED" | "COMING_SOON";

export interface AppealWorkflowEntry {
  /** Stable slug for routing and SEO */
  slug: string;
  /** Display name for cards and page titles */
  title: string;
  /** Category grouping */
  category: AppealCategory;
  /** Short description for cards */
  shortDescription: string;
  /** Long-form description for the placeholder page */
  longDescription: string;
  /** Who this appeal is for */
  intendedUser: string;
  /** What problem it solves */
  problemSolved: string;
  /** What we analyze */
  whatWeAnalyze: string[];
  /** What the user should prepare */
  whatYouNeed: string[];
  /** What Appeal Mail will identify */
  whatWeIdentify: string[];
  /** What the resulting appeal can address */
  whatAppealAddresses: string[];
  /** SEO title */
  seoTitle: string;
  /** SEO description */
  seoDescription: string;
  /** Primary keyword */
  primaryKeyword: string;
  /** Related keywords */
  relatedKeywords: string[];
  /** Canonical route path */
  route: string;
  /** Status */
  status: WorkflowStatus;
  /** Which engine this belongs to in the architecture */
  engine: string;
  /** Whether this workflow can actually be executed */
  executable: boolean;
  /** CTA text */
  cta: string;
}

/* ── Category metadata ── */

export const CATEGORY_ORDER: AppealCategory[] = [
  "Insurance",
  "Disability & Social Security",
  "Unemployment",
  "Government Benefits",
  "Workers' Compensation",
  "Veterans",
  "Administrative",
];

export const CATEGORY_DESCRIPTIONS: Record<AppealCategory, string> = {
  "Insurance":
    "Denied insurance claims, health coverage, prior authorizations, out-of-network, timely filing, Medicare, and dental appeals.",
  "Disability & Social Security":
    "SSI, SSDI, Social Security reconsideration, overpayment, and Appeals Council appeals.",
  "Unemployment":
    "Unemployment benefit denials, EDD appeals, and state-specific unemployment decision appeals.",
  "Government Benefits":
    "Medicaid, SNAP/food stamp, and general benefits denial appeals.",
  "Workers' Compensation":
    "Workers' compensation claim denials and disputed benefit decisions.",
  "Veterans":
    "VA claim appeals under the Appeals Modernization Act.",
  "Administrative":
    "Agency decisions, administrative rulings, licensing, and regulatory appeals.",
};

/* ═══════════════════════════════════════════════════════════
   CATALOG
   ═══════════════════════════════════════════════════════════ */

export const APPEAL_CATALOG: AppealWorkflowEntry[] = [
  /* ── INSURANCE ── */
  {
    slug: "insurance-claim",
    title: "Insurance Claim Appeal",
    category: "Insurance",
    shortDescription:
      "Turn a denied insurance claim into an organized, evidence-supported appeal.",
    longDescription:
      "Insurance claim denials are common, but many are reversible with a well-organized appeal that addresses the insurer's stated reasons, cites policy provisions, and includes supporting evidence. Appeal Mail helps you extract the denial reasons, cross-reference your documents, identify contradictions, and build a point-by-point appeal letter.",
    intendedUser:
      "Anyone whose insurance claim — auto, property, liability, or other — has been denied and who wants to appeal the decision.",
    problemSolved:
      "Insurers deny claims for many reasons: missing documentation, policy exclusions, late filing, or factual disputes. A strong appeal addresses each reason individually with evidence.",
    whatWeAnalyze: [
      "The stated denial reasons in the denial letter",
      "Policy provisions cited as the basis for denial",
      "Claim reference numbers and filing dates",
      "Supporting documents for contradictions or gaps",
      "Whether the denial cites the correct policy language",
    ],
    whatYouNeed: [
      "The denial letter or explanation of benefits",
      "Your insurance policy or plan documents",
      "Claim correspondence and reference numbers",
      "Supporting evidence: receipts, photos, reports, medical records",
      "Any prior correspondence with the insurer",
    ],
    whatWeIdentify: [
      "Date conflicts between the denial and your documents",
      "Policy provisions that may not support the denial",
      "Evidence the insurer did not consider or acknowledge",
      "Factual discrepancies in the denial rationale",
      "Missing documentation that could strengthen your appeal",
    ],
    whatAppealAddresses: [
      "Each denial reason with a specific, evidence-backed response",
      "Policy provisions that support coverage",
      "Procedural errors in how the claim was handled",
      "New or previously unconsidered evidence",
      "A clear request for reconsideration or review",
    ],
    seoTitle: "Insurance Claim Appeal — Appeal Mail",
    seoDescription:
      "Turn a denied insurance claim into an organized, evidence-supported appeal. Upload your denial letter, identify issues, and build a point-by-point appeal.",
    primaryKeyword: "denial of insurance claim",
    relatedKeywords: [
      "insurance appeal",
      "appealing insurance denial",
      "insurance claim appeal",
      "insurance appeal letter",
      "appeal letter for insurance denial",
    ],
    route: "/appeal/insurance-claim",
    status: "IMPLEMENTED",
    engine: "Insurance Appeal Engine",
    executable: true,
    cta: "Start Appeal",
  },
  {
    slug: "health-insurance",
    title: "Health Insurance Appeal",
    category: "Insurance",
    shortDescription:
      "Appeal a denied health insurance claim or coverage decision with medical evidence.",
    longDescription:
      "Health insurance denials often involve medical necessity disputes, coding errors, or coverage exclusions. A successful appeal requires understanding the clinical rationale, citing the correct plan provisions, and providing supporting medical documentation.",
    intendedUser:
      "Patients, advocates, and caregivers dealing with a denied health insurance claim or coverage decision.",
    problemSolved:
      "Health insurance denials are frequently overturned on appeal when the patient provides the right clinical documentation and addresses the specific denial reason.",
    whatWeAnalyze: [
      "Medical necessity denials and the stated rationale",
      "Coding or billing discrepancy claims",
      "Plan exclusion or limitation citations",
      "Prior authorization status and requirements",
      "Appeal deadline and process instructions from the denial letter",
    ],
    whatYouNeed: [
      "Explanation of Benefits (EOB) or denial letter",
      "Health insurance plan documents or summary of benefits",
      "Medical records, lab results, or physician letters",
      "Prior authorization correspondence",
      "Itemized bills or coding documentation",
    ],
    whatWeIdentify: [
      "Whether the denial reason aligns with your plan's actual coverage terms",
      "Medical documentation that contradicts the denial rationale",
      "Coding errors or billing discrepancies",
      "Missing prior authorization issues",
      "Deadline and process errors in the denial letter",
    ],
    whatAppealAddresses: [
      "Medical necessity arguments with supporting documentation",
      "Coverage provisions that support the claim",
      "Coding or billing corrections",
      "Procedural errors in the denial process",
      "A clear request for review with specific relief sought",
    ],
    seoTitle: "Health Insurance Appeal — Appeal Mail",
    seoDescription:
      "Appeal a denied health insurance claim with medical evidence. Address medical necessity denials, coding errors, and coverage exclusions.",
    primaryKeyword: "health insurance appeal",
    relatedKeywords: ["medical claim appeal", "insurance appeal letter"],
    route: "/appeal/health-insurance",
    status: "COMING_SOON",
    engine: "Insurance Appeal Engine",
    executable: false,
    cta: "Join the workflow",
  },
  {
    slug: "prior-authorization",
    title: "Prior Authorization Appeal",
    category: "Insurance",
    shortDescription:
      "Appeal a denied prior authorization request with clinical justification.",
    longDescription:
      "Prior authorization denials can delay necessary treatment. A strong appeal addresses the clinical criteria the insurer used and provides documentation showing the treatment meets medical necessity standards.",
    intendedUser:
      "Patients and providers appealing a denied prior authorization for a procedure, medication, or service.",
    problemSolved:
      "Insurers deny prior authorizations based on internal criteria that may not account for your specific clinical situation.",
    whatWeAnalyze: [
      "The clinical criteria cited in the denial",
      "Whether your medical records support the requested treatment",
      "Plan provisions governing prior authorization",
      "Whether the denial followed required timeline rules",
      "Appeal rights and deadlines",
    ],
    whatYouNeed: [
      "Prior authorization denial letter",
      "Letter of medical necessity from your provider",
      "Medical records supporting the request",
      "Plan documents on prior authorization requirements",
      "Any peer-to-peer review notes",
    ],
    whatWeIdentify: [
      "Clinical documentation gaps that weakened the original request",
      "Whether the insurer applied the correct criteria",
      "Timeline violations in the authorization process",
      "Evidence supporting medical necessity",
      "Plan provisions that support coverage",
    ],
    whatAppealAddresses: [
      "Medical necessity with specific clinical evidence",
      "Why the insurer's criteria do not fit your situation",
      "Procedural errors in the denial process",
      "A request for expedited review if treatment is urgent",
    ],
    seoTitle: "Prior Authorization Appeal — Appeal Mail",
    seoDescription:
      "Appeal a denied prior authorization with clinical justification and supporting medical documentation.",
    primaryKeyword: "prior authorization appeal",
    relatedKeywords: ["health insurance appeal", "medical necessity appeal"],
    route: "/appeal/prior-authorization",
    status: "COMING_SOON",
    engine: "Insurance Appeal Engine",
    executable: false,
    cta: "Join the workflow",
  },
  {
    slug: "out-of-network",
    title: "Out-of-Network Appeal",
    category: "Insurance",
    shortDescription:
      "Appeal a denied out-of-network coverage claim with network adequacy or medical necessity arguments.",
    longDescription:
      "Out-of-network denials often occur when in-network providers are unavailable or when the treatment was medically necessary and could not wait for network authorization.",
    intendedUser:
      "Patients who received care from an out-of-network provider and had their claim denied.",
    problemSolved:
      "Out-of-network denials can often be reversed when you demonstrate network inadequacy or urgent medical necessity.",
    whatWeAnalyze: [
      "The insurer's stated reason for the out-of-network denial",
      "Whether in-network alternatives were actually available",
      "Medical necessity documentation for the specific provider",
      "Plan provisions on out-of-network coverage",
      "Whether the care was emergency or urgent",
    ],
    whatYouNeed: [
      "Out-of-network denial letter",
      "Documentation of in-network provider availability (or lack thereof)",
      "Medical records justifying the provider choice",
      "Plan documents on out-of-network benefits",
      "Any correspondence about network referral",
    ],
    whatWeIdentify: [
      "Network adequacy gaps that support your provider choice",
      "Medical necessity documentation supporting the out-of-network care",
      "Plan provisions that may require coverage in certain circumstances",
      "Whether the denial followed proper process",
    ],
    whatAppealAddresses: [
      "Why in-network alternatives were not available or appropriate",
      "Medical necessity for the specific provider or facility",
      "Plan provisions requiring coverage in your situation",
      "A request for coverage at in-network rates",
    ],
    seoTitle: "Out-of-Network Appeal — Appeal Mail",
    seoDescription:
      "Appeal a denied out-of-network coverage claim with network adequacy and medical necessity arguments.",
    primaryKeyword: "out-of-network appeal",
    relatedKeywords: ["health insurance appeal", "no authorization appeal"],
    route: "/appeal/out-of-network",
    status: "COMING_SOON",
    engine: "Insurance Appeal Engine",
    executable: false,
    cta: "Join the workflow",
  },
  {
    slug: "timely-filing",
    title: "Timely Filing Appeal",
    category: "Insurance",
    shortDescription:
      "Appeal a claim denied for late submission with proof of timely filing.",
    longDescription:
      "Insurers deny claims for timely filing when they believe the claim was submitted after the deadline. A successful appeal requires proof of when the claim was actually submitted.",
    intendedUser:
      "Providers or patients whose claim was denied solely for untimely filing.",
    problemSolved:
      "Timely filing denials are often reversed when you can document the actual submission date and method.",
    whatWeAnalyze: [
      "The filing deadline stated in the denial",
      "Your submission records and proof of delivery",
      "Plan provisions on filing timelines and extensions",
      "Whether the insurer's deadline calculation is correct",
      "Any prior correspondence about the claim",
    ],
    whatYouNeed: [
      "Timely filing denial letter",
      "Proof of claim submission (electronic confirmation, certified mail receipt, etc.)",
      "Plan documents on filing deadlines",
      "Any correspondence acknowledging receipt of the claim",
    ],
    whatWeIdentify: [
      "Whether your submission records contradict the denial's timeline",
      "Errors in the insurer's deadline calculation",
      "Plan provisions that may allow extensions or exceptions",
      "Evidence of prior submission acknowledgment",
    ],
    whatAppealAddresses: [
      "Proof of timely submission with documentation",
      "Disputes with the insurer's deadline calculation",
      "Plan provisions supporting an extension or exception",
      "A request for the claim to be processed on the merits",
    ],
    seoTitle: "Timely Filing Appeal — Appeal Mail",
    seoDescription:
      "Appeal a claim denied for late submission with proof of timely filing and documentation of the actual submission date.",
    primaryKeyword: "timely filing appeal",
    relatedKeywords: ["insurance appeal", "claim denial appeal"],
    route: "/appeal/timely-filing",
    status: "COMING_SOON",
    engine: "Insurance Appeal Engine",
    executable: false,
    cta: "Join the workflow",
  },
  {
    slug: "medicare",
    title: "Medicare Appeal",
    category: "Insurance",
    shortDescription:
      "Appeal a denied Medicare claim through the five-level Medicare appeals process.",
    longDescription:
      "Medicare appeals follow a structured five-level process: Redetermination, Reconsideration, Administrative Law Judge hearing, Appeals Council review, and Federal District Court. Each level has specific deadlines and requirements.",
    intendedUser:
      "Medicare beneficiaries or their representatives appealing a coverage or payment decision.",
    problemSolved:
      "Medicare denials can be appealed through a formal multi-level process, but each level has strict deadlines and specific documentation requirements.",
    whatWeAnalyze: [
      "The Medicare denial notice and stated reason",
      "Which level of appeal is appropriate (redetermination, reconsideration, etc.)",
      "The applicable deadline for the current appeal level",
      "Medical and coverage documentation supporting the appeal",
      "Whether the denial followed Medicare coverage rules",
    ],
    whatYouNeed: [
      "Medicare denial notice (MSN or REMIT)",
      "Medical records supporting the service or item",
      "Medicare coverage documents or NCD/LCD references",
      "Any prior appeal correspondence",
    ],
    whatWeIdentify: [
      "The correct appeal level and its deadline",
      "Coverage rules or NCDs/LCDs that support your claim",
      "Medical documentation gaps",
      "Whether the denial reason aligns with Medicare policy",
    ],
    whatAppealAddresses: [
      "Coverage arguments citing specific Medicare rules",
      "Medical necessity documentation",
      "Procedural errors in the denial",
      "A request for the specific appeal level with correct forms",
    ],
    seoTitle: "Medicare Appeal — Appeal Mail",
    seoDescription:
      "Appeal a denied Medicare claim through the five-level Medicare appeals process with proper documentation and deadline tracking.",
    primaryKeyword: "Medicare appeal",
    relatedKeywords: ["Medicare appeal letter", "Medicare denial appeal"],
    route: "/appeal/medicare",
    status: "COMING_SOON",
    engine: "Insurance Appeal Engine",
    executable: false,
    cta: "Join the workflow",
  },
  {
    slug: "dental-insurance",
    title: "Dental Insurance Appeal",
    category: "Insurance",
    shortDescription:
      "Appeal a denied dental insurance claim with documentation of medical necessity and plan coverage.",
    longDescription:
      "Dental insurance denials often involve disputes over whether a procedure is medically necessary, covered under the plan, or correctly coded.",
    intendedUser:
      "Patients or dental providers appealing a denied dental insurance claim.",
    problemSolved:
      "Dental claim denials can often be reversed with supporting documentation showing medical necessity and correct coding.",
    whatWeAnalyze: [
      "The denial reason and cited plan exclusion or limitation",
      "Whether the procedure coding is correct",
      "Plan coverage documents and waiting periods",
      "Medical necessity documentation",
    ],
    whatYouNeed: [
      "Dental claim denial letter or EOB",
      "Dental plan documents and coverage schedule",
      "Clinical notes and x-rays from the dental provider",
      "Pre-treatment authorization correspondence",
    ],
    whatWeIdentify: [
      "Coding errors that may have triggered the denial",
      "Plan provisions that support coverage",
      "Medical necessity documentation gaps",
      "Whether the waiting period or limitation applies correctly",
    ],
    whatAppealAddresses: [
      "Medical necessity with clinical documentation",
      "Corrected coding if applicable",
      "Plan provisions supporting coverage",
      "A request for claim reconsideration",
    ],
    seoTitle: "Dental Insurance Appeal — Appeal Mail",
    seoDescription:
      "Appeal a denied dental insurance claim with documentation of medical necessity, correct coding, and plan coverage.",
    primaryKeyword: "dental insurance appeal",
    relatedKeywords: ["dental claim appeal", "insurance appeal"],
    route: "/appeal/dental-insurance",
    status: "COMING_SOON",
    engine: "Insurance Appeal Engine",
    executable: false,
    cta: "Join the workflow",
  },

  /* ── DISABILITY & SOCIAL SECURITY ── */
  {
    slug: "ssi",
    title: "SSI Appeal",
    category: "Disability & Social Security",
    shortDescription:
      "Appeal a denied Supplemental Security Income claim through reconsideration, hearing, or Appeals Council.",
    longDescription:
      "SSI appeals follow the SSA appeals process: Reconsideration, Administrative Law Judge hearing, Appeals Council review, and Federal Court. Many initial denials are reversed on appeal, especially at the hearing level.",
    intendedUser:
      "Individuals denied Supplemental Security Income benefits who want to appeal the decision.",
    problemSolved:
      "SSI denials are common at the initial level but many are reversed on appeal with better documentation and argument.",
    whatWeAnalyze: [
      "The denial notice and stated medical or non-medical reasons",
      "Which appeal level is appropriate",
      "The applicable deadline (typically 60 days from receipt)",
      "Medical evidence supporting the disability claim",
      "Whether the SSA considered all relevant evidence",
    ],
    whatYouNeed: [
      "SSA denial notice",
      "Medical records and treatment history",
      "Work history and income documentation",
      "Any prior SSA correspondence",
    ],
    whatWeIdentify: [
      "Medical evidence the SSA may not have considered",
      "Gaps in the medical record that need to be filled",
      "Whether the SSA applied the correct evaluation criteria",
      "Deadline and appeal level requirements",
    ],
    whatAppealAddresses: [
      "Medical evidence supporting disability",
      "Arguments addressing each specific denial reason",
      "Request for the appropriate appeal level",
      "Updated or additional evidence",
    ],
    seoTitle: "SSI Appeal — Appeal Mail",
    seoDescription:
      "Appeal a denied SSI claim through reconsideration, hearing, or Appeals Council with organized medical evidence and deadline tracking.",
    primaryKeyword: "SSI appeal",
    relatedKeywords: [
      "SSI benefits appeal",
      "appeal SSI benefits",
      "SSI appeal form",
      "appeal SSI decision",
      "SSI denial",
    ],
    route: "/appeal/ssi",
    status: "COMING_SOON",
    engine: "Disability Appeal Engine",
    executable: false,
    cta: "Join the workflow",
  },
  {
    slug: "ssdi",
    title: "SSDI Appeal",
    category: "Disability & Social Security",
    shortDescription:
      "Appeal a denied Social Security Disability Insurance claim with organized medical and work evidence.",
    longDescription:
      "SSDI appeals follow the same SSA appeals process as SSI. The key difference is that SSDI is based on work history and earnings records, and the medical evidence must demonstrate an inability to engage in substantial gainful activity.",
    intendedUser:
      "Individuals denied Social Security Disability Insurance benefits who want to appeal.",
    problemSolved:
      "SSDI denials are frequently reversed on appeal, particularly at the ALJ hearing level, with better medical documentation and legal argument.",
    whatWeAnalyze: [
      "The denial notice and stated medical or vocational reasons",
      "Medical evidence in the record and potential gaps",
      "Work history and earnings records",
      "Whether the SSA correctly applied the sequential evaluation",
      "The applicable deadline and appeal level",
    ],
    whatYouNeed: [
      "SSA denial notice",
      "Comprehensive medical records",
      "Work history and earnings documentation",
      "Physician statements or residual functional capacity assessments",
      "Any prior SSA correspondence",
    ],
    whatWeIdentify: [
      "Medical evidence gaps that need to be filled",
      "Whether the SSA's vocational analysis was correct",
      "Evidence the SSA may not have properly considered",
      "Deadline and appeal level requirements",
    ],
    whatAppealAddresses: [
      "Medical evidence supporting disability under SSA criteria",
      "Vocational arguments if applicable",
      "Arguments addressing each denial reason",
      "Updated medical evidence and provider statements",
    ],
    seoTitle: "SSDI Appeal — Appeal Mail",
    seoDescription:
      "Appeal a denied SSDI claim with organized medical and work evidence. Track deadlines through the SSA appeals process.",
    primaryKeyword: "denied SSDI",
    relatedKeywords: [
      "SSDI reconsideration",
      "appeal SSDI denial",
      "social security denial appeal",
      "denied SSDI benefits",
    ],
    route: "/appeal/ssdi",
    status: "COMING_SOON",
    engine: "Disability Appeal Engine",
    executable: false,
    cta: "Join the workflow",
  },
  {
    slug: "social-security-reconsideration",
    title: "Social Security Reconsideration",
    category: "Disability & Social Security",
    shortDescription:
      "Request reconsideration of a Social Security denial — the first formal appeal level.",
    longDescription:
      "Reconsideration is the first level of appeal for Social Security denials. A different reviewer examines the claim and any new evidence you provide.",
    intendedUser:
      "Individuals who received an initial Social Security denial and want to request reconsideration.",
    problemSolved:
      "Reconsideration gives you the opportunity to have a different reviewer look at your claim with additional evidence.",
    whatWeAnalyze: [
      "The initial denial reasons",
      "What new evidence could strengthen the claim",
      "Whether the reconsideration deadline is met (60 days)",
      "Medical records submitted and gaps",
    ],
    whatYouNeed: [
      "Initial denial notice",
      "New or updated medical records",
      "Reconsideration request forms",
      "Any new physician statements",
    ],
    whatWeIdentify: [
      "Medical evidence gaps to address",
      "Arguments for why the initial decision was wrong",
      "Whether the deadline is met",
      "New evidence to submit",
    ],
    whatAppealAddresses: [
      "New medical evidence",
      "Arguments addressing each initial denial reason",
      "Request for reconsideration with proper forms",
    ],
    seoTitle: "Social Security Reconsideration — Appeal Mail",
    seoDescription:
      "Request reconsideration of a Social Security denial with new evidence and organized arguments.",
    primaryKeyword: "Social Security reconsideration",
    relatedKeywords: ["SSI reconsideration", "SSDI reconsideration"],
    route: "/appeal/social-security-reconsideration",
    status: "COMING_SOON",
    engine: "Disability Appeal Engine",
    executable: false,
    cta: "Join the workflow",
  },
  {
    slug: "social-security-overpayment",
    title: "Social Security Overpayment Appeal",
    category: "Disability & Social Security",
    shortDescription:
      "Appeal a Social Security overpayment notice or request a waiver of recovery.",
    longDescription:
      "If the SSA claims you were overpaid, you can appeal the overpayment determination or request a waiver if the overpayment was not your fault and recovery would be unfair.",
    intendedUser:
      "Individuals who received a Social Security overpayment notice and want to appeal or request a waiver.",
    problemSolved:
      "Overpayment notices can be appealed on the merits or waived if recovery would be inequitable and you were not at fault.",
    whatWeAnalyze: [
      "The overpayment notice and amount claimed",
      "Whether the overpayment calculation is correct",
      "Whether you were at fault for the overpayment",
      "Whether recovery would be against equity and good conscience",
    ],
    whatYouNeed: [
      "Overpayment notice from SSA",
      "Income and expense records",
      "Any correspondence about the overpayment",
      "Records showing you reported changes timely",
    ],
    whatWeIdentify: [
      "Calculation errors in the overpayment amount",
      "Evidence that you were not at fault",
      "Financial hardship documentation for waiver",
      "Whether you reported changes that should have prevented the overpayment",
    ],
    whatAppealAddresses: [
      "Disputes with the overpayment calculation",
      "Waiver request with financial documentation",
      "Arguments that recovery would be inequitable",
      "Request for reconsideration or waiver",
    ],
    seoTitle: "Social Security Overpayment Appeal — Appeal Mail",
    seoDescription:
      "Appeal a Social Security overpayment notice or request a waiver of recovery with financial documentation.",
    primaryKeyword: "Social Security overpayment appeal",
    relatedKeywords: ["SSI overpayment appeal", "SSDI overpayment appeal"],
    route: "/appeal/social-security-overpayment",
    status: "COMING_SOON",
    engine: "Disability Appeal Engine",
    executable: false,
    cta: "Join the workflow",
  },
  {
    slug: "appeals-council",
    title: "Appeals Council Appeal",
    category: "Disability & Social Security",
    shortDescription:
      "Request Appeals Council review of an Administrative Law Judge decision.",
    longDescription:
      "The Appeals Council reviews ALJ decisions and can issue its own decision, remand for a new hearing, or deny review. You must request review within 60 days of the ALJ decision.",
    intendedUser:
      "Individuals who received an unfavorable ALJ decision and want to request Appeals Council review.",
    problemSolved:
      "The Appeals Council can review ALJ decisions for errors of law, insufficient evidence, or new and material evidence.",
    whatWeAnalyze: [
      "The ALJ decision and reasoning",
      "Potential legal errors in the ALJ's analysis",
      "New and material evidence not considered by the ALJ",
      "Whether the deadline for Appeals Council review is met",
    ],
    whatYouNeed: [
      "ALJ hearing decision",
      "New evidence if available",
      "Written arguments identifying specific errors",
      "Medical records from after the ALJ hearing",
    ],
    whatWeIdentify: [
      "Legal errors in the ALJ's decision",
      "Evidence gaps or improperly weighed evidence",
      "New and material evidence for the Appeals Council",
      "Deadline compliance",
    ],
    whatAppealAddresses: [
      "Specific legal errors in the ALJ decision",
      "New and material evidence",
      "Arguments for remand or a favorable decision",
      "Request for Appeals Council review with proper forms",
    ],
    seoTitle: "Appeals Council Appeal — Appeal Mail",
    seoDescription:
      "Request Appeals Council review of an ALJ decision with identified legal errors and new evidence.",
    primaryKeyword: "SSDI Appeals Council",
    relatedKeywords: ["Appeals Council appeal", "Social Security appeal"],
    route: "/appeal/appeals-council",
    status: "COMING_SOON",
    engine: "Disability Appeal Engine",
    executable: false,
    cta: "Join the workflow",
  },

  /* ── UNEMPLOYMENT ── */
  {
    slug: "unemployment",
    title: "Unemployment Appeal",
    category: "Unemployment",
    shortDescription:
      "Appeal a denied unemployment benefits decision with evidence of eligibility.",
    longDescription:
      "Unemployment denials can often be reversed on appeal. Common reasons for denial include misconduct, voluntary quit without good cause, or insufficient earnings. A successful appeal addresses the specific reason with evidence.",
    intendedUser:
      "Workers whose unemployment benefits claim was denied and who want to appeal the decision.",
    problemSolved:
      "Unemployment denials are frequently reversed at the hearing level when the appellant presents evidence and testimony contradicting the initial determination.",
    whatWeAnalyze: [
      "The determination notice and stated reason for denial",
      "Whether the denial is based on misconduct, voluntary quit, or earnings",
      "Employment records and separation documentation",
      "The applicable deadline (varies by state, often 10–30 days)",
    ],
    whatYouNeed: [
      "Unemployment determination/denial notice",
      "Employment separation documentation",
      "Pay stubs and earnings records",
      "Any correspondence with the employer about separation",
      "Witness statements if applicable",
    ],
    whatWeIdentify: [
      "Whether the denial reason is supported by the evidence",
      "Gaps in documentation that need to be filled",
      "Contradictions between the employer's account and your records",
      "Deadline and hearing preparation requirements",
    ],
    whatAppealAddresses: [
      "Evidence of eligibility for benefits",
      "Arguments addressing each specific denial reason",
      "Documentation of the employment separation",
      "Request for a hearing with proper forms",
    ],
    seoTitle: "Unemployment Appeal — Appeal Mail",
    seoDescription:
      "Appeal a denied unemployment benefits decision with evidence of eligibility and documentation of employment separation.",
    primaryKeyword: "unemployment appeal",
    relatedKeywords: [
      "appeal of unemployment",
      "appeal on unemployment",
      "lawyer for unemployment appeal",
      "denied unemployment",
      "appeal unemployment decision",
      "appealing unemployment denial",
    ],
    route: "/appeal/unemployment",
    status: "COMING_SOON",
    engine: "Unemployment Appeal Engine",
    executable: false,
    cta: "Join the workflow",
  },
  {
    slug: "edd",
    title: "EDD Appeal",
    category: "Unemployment",
    shortDescription:
      "Appeal a California EDD unemployment determination with evidence and deadline tracking.",
    longDescription:
      "California EDD appeals go through the California Unemployment Insurance Appeals Board (CUIAB). You must appeal within 20 days of the determination mailing date.",
    intendedUser:
      "California workers whose EDD unemployment claim was denied and who want to appeal.",
    problemSolved:
      "EDD denials can be reversed at the CUIAB hearing with proper evidence and argument.",
    whatWeAnalyze: [
      "The EDD determination and stated reason",
      "Whether the 20-day deadline is met",
      "California UI Code provisions relevant to the denial",
      "Employment separation documentation",
    ],
    whatYouNeed: [
      "EDD determination notice",
      "Employment separation records",
      "Earnings documentation",
      "Any EDD correspondence",
    ],
    whatWeIdentify: [
      "Whether the denial aligns with California UI Code",
      "Evidence gaps for the CUIAB hearing",
      "Deadline compliance",
      "Contradictions in the employer's account",
    ],
    whatAppealAddresses: [
      "California UI Code arguments",
      "Evidence of eligibility",
      "Arguments for each denial reason",
      "Request for CUIAB hearing",
    ],
    seoTitle: "EDD Appeal — Appeal Mail",
    seoDescription:
      "Appeal a California EDD unemployment determination with evidence, California UI Code arguments, and deadline tracking.",
    primaryKeyword: "EDD appeal",
    relatedKeywords: ["unemployment appeal", "California unemployment appeal"],
    route: "/appeal/edd",
    status: "COMING_SOON",
    engine: "Unemployment Appeal Engine",
    executable: false,
    cta: "Join the workflow",
  },

  /* ── GOVERNMENT BENEFITS ── */
  {
    slug: "medicaid",
    title: "Medicaid Appeal",
    category: "Government Benefits",
    shortDescription:
      "Appeal a denied Medicaid claim or eligibility determination with supporting documentation.",
    longDescription:
      "Medicaid denials can involve eligibility disputes, coverage issues, or service authorization denials. Each state has its own Medicaid appeals process, typically involving a fair hearing request.",
    intendedUser:
      "Individuals denied Medicaid coverage or eligibility who want to appeal.",
    problemSolved:
      "Medicaid denials are often reversible when you provide the correct income, household, or medical documentation and follow the state's fair hearing process.",
    whatWeAnalyze: [
      "The Medicaid denial notice and stated reason",
      "Eligibility criteria and whether you meet them",
      "Income and household documentation",
      "The applicable deadline for requesting a fair hearing",
      "State-specific Medicaid appeal procedures",
    ],
    whatYouNeed: [
      "Medicaid denial notice",
      "Income and household documentation",
      "Medical records if the denial involves service authorization",
      "Any prior Medicaid correspondence",
    ],
    whatWeIdentify: [
      "Eligibility documentation gaps",
      "Whether the denial applied the correct criteria",
      "Deadline and fair hearing requirements",
      "Evidence supporting eligibility or medical necessity",
    ],
    whatAppealAddresses: [
      "Income and household documentation supporting eligibility",
      "Medical necessity arguments if applicable",
      "Procedural errors in the denial",
      "Request for a fair hearing",
    ],
    seoTitle: "Medicaid Appeal — Appeal Mail",
    seoDescription:
      "Appeal a denied Medicaid claim or eligibility determination with supporting documentation and fair hearing request.",
    primaryKeyword: "appeal for Medicaid",
    relatedKeywords: [
      "Medicaid denied",
      "appeal Medicaid denial",
      "appealing a Medicaid denial",
      "appeal Medicaid decision",
    ],
    route: "/appeal/medicaid",
    status: "COMING_SOON",
    engine: "Benefits Appeal Engine",
    executable: false,
    cta: "Join the workflow",
  },
  {
    slug: "snap",
    title: "SNAP / Food Stamp Appeal",
    category: "Government Benefits",
    shortDescription:
      "Appeal a denied SNAP or food stamp benefits determination with evidence of eligibility.",
    longDescription:
      "SNAP denials can involve income calculations, household composition disputes, or work requirement issues. You have the right to request a fair hearing, typically within 90 days.",
    intendedUser:
      "Individuals denied SNAP/food stamp benefits who want to appeal the determination.",
    problemSolved:
      "SNAP denials are often reversed on appeal when you provide correct income documentation and address the specific denial reason.",
    whatWeAnalyze: [
      "The SNAP denial notice and stated reason",
      "Income calculation and whether it is correct",
      "Household composition determination",
      "Work requirement issues if applicable",
      "The fair hearing deadline",
    ],
    whatYouNeed: [
      "SNAP denial notice",
      "Income documentation (pay stubs, tax returns, etc.)",
      "Household expense records",
      "Any SNAP correspondence",
    ],
    whatWeIdentify: [
      "Income calculation errors",
      "Household composition disputes",
      "Whether the work requirement was properly applied",
      "Deadline compliance",
    ],
    whatAppealAddresses: [
      "Correct income documentation",
      "Household composition arguments",
      "Work requirement exemptions if applicable",
      "Request for a fair hearing",
    ],
    seoTitle: "SNAP / Food Stamp Appeal — Appeal Mail",
    seoDescription:
      "Appeal a denied SNAP or food stamp benefits determination with evidence of eligibility and income documentation.",
    primaryKeyword: "SNAP appeal",
    relatedKeywords: ["food stamp appeal", "benefits denial appeal"],
    route: "/appeal/snap",
    status: "COMING_SOON",
    engine: "Benefits Appeal Engine",
    executable: false,
    cta: "Join the workflow",
  },

  /* ── WORKERS' COMPENSATION ── */
  {
    slug: "workers-comp",
    title: "Workers' Compensation Appeal",
    category: "Workers' Compensation",
    shortDescription:
      "Appeal a denied workers' compensation claim with medical evidence and injury documentation.",
    longDescription:
      "Workers' compensation denials can involve disputes about whether the injury is work-related, the extent of disability, or the necessity of treatment. Each state has its own workers' comp appeals process.",
    intendedUser:
      "Workers whose workers' compensation claim was denied and who want to appeal.",
    problemSolved:
      "Workers' comp denials are frequently reversed on appeal with proper medical documentation connecting the injury to the workplace.",
    whatWeAnalyze: [
      "The denial notice and stated reason",
      "Medical evidence connecting the injury to work",
      "Whether the injury was reported within the required timeframe",
      "State-specific workers' comp appeal procedures",
      "Wage and disability documentation",
    ],
    whatYouNeed: [
      "Workers' comp denial letter",
      "Medical records and physician reports",
      "Incident report and witness statements",
      "Wage records",
      "Any prior correspondence with the insurer or employer",
    ],
    whatWeIdentify: [
      "Medical evidence gaps connecting the injury to work",
      "Whether the injury was reported on time",
      "Contradictions in the insurer's denial rationale",
      "Whether the correct state procedures were followed",
    ],
    whatAppealAddresses: [
      "Medical evidence of a work-related injury",
      "Arguments addressing each denial reason",
      "Wage and disability documentation",
      "Request for the appropriate appeals board hearing",
    ],
    seoTitle: "Workers' Compensation Appeal — Appeal Mail",
    seoDescription:
      "Appeal a denied workers' compensation claim with medical evidence and injury documentation.",
    primaryKeyword: "workers compensation appeal",
    relatedKeywords: [
      "workers comp appeal",
      "my workers comp claim was denied",
      "appealing workers compensation decision",
    ],
    route: "/appeal/workers-comp",
    status: "COMING_SOON",
    engine: "Workers Compensation Engine",
    executable: false,
    cta: "Join the workflow",
  },

  /* ── VETERANS ── */
  {
    slug: "va-claim",
    title: "VA Claim Appeal",
    category: "Veterans",
    shortDescription:
      "Appeal a denied VA disability claim under the Appeals Modernization Act review pathways.",
    longDescription:
      "VA claim appeals under the Appeals Modernization Act offer three review pathways: Higher-Level Review, Supplemental Claim, and Board Appeal. Each has different requirements and timelines.",
    intendedUser:
      "Veterans whose VA disability claim was denied and who want to appeal the decision.",
    problemSolved:
      "VA denials can be reversed through the appropriate review pathway with new evidence or identification of errors in the original decision.",
    whatWeAnalyze: [
      "The VA decision and stated reason for denial",
      "Which review pathway is appropriate (HLR, Supplemental Claim, or Board)",
      "Service connection evidence and medical nexus",
      "Whether the VA properly considered all evidence",
      "The applicable deadline for the chosen pathway",
    ],
    whatYouNeed: [
      "VA decision letter",
      "Service treatment records and personnel records",
      "Medical evidence and nexus opinions",
      "Any prior VA correspondence or claims",
    ],
    whatWeIdentify: [
      "Medical evidence gaps in the service connection chain",
      "Errors in the VA's evaluation of your evidence",
      "New evidence that could support a Supplemental Claim",
      "Arguments for a Higher-Level Review or Board Appeal",
    ],
    whatAppealAddresses: [
      "Service connection arguments with medical nexus evidence",
      "Identification of errors in the original decision",
      "New and relevant evidence",
      "Request for the appropriate review pathway",
    ],
    seoTitle: "VA Claim Appeal — Appeal Mail",
    seoDescription:
      "Appeal a denied VA disability claim under the Appeals Modernization Act with organized evidence and pathway selection.",
    primaryKeyword: "appeal VA claim",
    relatedKeywords: ["VA appeal", "VA disability appeal", "VA claim denial"],
    route: "/appeal/va-claim",
    status: "COMING_SOON",
    engine: "Veterans Appeal Engine",
    executable: false,
    cta: "Join the workflow",
  },

  /* ── ADMINISTRATIVE ── */
  {
    slug: "agency-decision",
    title: "Agency Decision Appeal",
    category: "Administrative",
    shortDescription:
      "Appeal an adverse agency decision with evidence, regulatory arguments, and deadline compliance.",
    longDescription:
      "Agency decisions can involve licensing, permits, regulatory compliance, or administrative penalties. Each agency has its own appeal process, often requiring a formal written appeal within a specific deadline.",
    intendedUser:
      "Individuals or businesses affected by an adverse agency decision who want to appeal.",
    problemSolved:
      "Agency decisions often have very short appeal deadlines and specific procedural requirements that must be followed exactly.",
    whatWeAnalyze: [
      "The agency decision and stated basis",
      "Applicable regulations and whether the decision aligns with them",
      "The appeal deadline and process requirements",
      "Supporting documentation and evidence",
    ],
    whatYouNeed: [
      "Agency decision letter or order",
      "Relevant regulations or statutes",
      "Supporting documentation and correspondence",
      "Any prior agency correspondence",
    ],
    whatWeIdentify: [
      "Whether the decision aligns with applicable regulations",
      "Procedural errors in the agency's process",
      "Evidence the agency may not have considered",
      "Deadline and process compliance requirements",
    ],
    whatAppealAddresses: [
      "Regulatory arguments challenging the decision",
      "Evidence supporting your position",
      "Procedural errors in the decision-making process",
      "Request for review or hearing",
    ],
    seoTitle: "Agency Decision Appeal — Appeal Mail",
    seoDescription:
      "Appeal an adverse agency decision with evidence, regulatory arguments, and deadline compliance.",
    primaryKeyword: "agency decision appeal",
    relatedKeywords: ["administrative decision appeal", "regulatory appeal"],
    route: "/appeal/agency-decision",
    status: "COMING_SOON",
    engine: "Administrative Appeal Engine",
    executable: false,
    cta: "Join the workflow",
  },
  {
    slug: "licensing",
    title: "Licensing Appeal",
    category: "Administrative",
    shortDescription:
      "Appeal a denied, suspended, or revoked professional license with evidence and regulatory arguments.",
    longDescription:
      "Licensing appeals involve professional boards, state licensing agencies, or regulatory bodies. The appeal process typically requires a formal written response and may include a hearing.",
    intendedUser:
      "Professionals whose license was denied, suspended, or revoked and who want to appeal.",
    problemSolved:
      "Licensing decisions can often be reversed on appeal when you address the specific grounds for discipline or denial.",
    whatWeAnalyze: [
      "The licensing decision and stated grounds",
      "Whether the decision aligns with licensing regulations",
      "The appeal deadline and process",
      "Evidence supporting reinstatement or approval",
    ],
    whatYouNeed: [
      "Licensing decision or order",
      "Professional license records",
      "Evidence of compliance or rehabilitation",
      "Any prior correspondence with the licensing board",
    ],
    whatWeIdentify: [
      "Whether the licensing board followed proper procedure",
      "Evidence supporting your case for licensure or reinstatement",
      "Regulatory arguments challenging the decision",
      "Deadline compliance",
    ],
    whatAppealAddresses: [
      "Arguments addressing each ground for denial or discipline",
      "Evidence of compliance, rehabilitation, or good standing",
      "Procedural errors in the licensing process",
      "Request for hearing or review",
    ],
    seoTitle: "Licensing Appeal — Appeal Mail",
    seoDescription:
      "Appeal a denied, suspended, or revoked professional license with evidence and regulatory arguments.",
    primaryKeyword: "licensing appeal",
    relatedKeywords: ["professional license appeal", "regulatory appeal"],
    route: "/appeal/licensing",
    status: "COMING_SOON",
    engine: "Administrative Appeal Engine",
    executable: false,
    cta: "Join the workflow",
  },
];

/* ── Helper functions ── */

export function getWorkflowBySlug(slug: string): AppealWorkflowEntry | undefined {
  return APPEAL_CATALOG.find((w) => w.slug === slug);
}

export function getWorkflowsByCategory(category: AppealCategory): AppealWorkflowEntry[] {
  return APPEAL_CATALOG.filter((w) => w.category === category);
}

export function getImplementedWorkflows(): AppealWorkflowEntry[] {
  return APPEAL_CATALOG.filter((w) => w.status === "IMPLEMENTED");
}

export function getComingSoonWorkflows(): AppealWorkflowEntry[] {
  return APPEAL_CATALOG.filter((w) => w.status === "COMING_SOON");
}

export function searchWorkflows(query: string): AppealWorkflowEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return APPEAL_CATALOG;
  return APPEAL_CATALOG.filter(
    (w) =>
      w.title.toLowerCase().includes(q) ||
      w.shortDescription.toLowerCase().includes(q) ||
      w.category.toLowerCase().includes(q) ||
      w.primaryKeyword.toLowerCase().includes(q) ||
      w.relatedKeywords.some((k) => k.toLowerCase().includes(q)),
  );
}

export function getCatalogStats() {
  return {
    total: APPEAL_CATALOG.length,
    implemented: APPEAL_CATALOG.filter((w) => w.status === "IMPLEMENTED").length,
    comingSoon: APPEAL_CATALOG.filter((w) => w.status === "COMING_SOON").length,
    categories: CATEGORY_ORDER.length,
  };
}

/* ── Validation ── */

export const AppealWorkflowEntrySchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  shortDescription: z.string().min(10),
  longDescription: z.string().min(20),
  intendedUser: z.string().min(5),
  problemSolved: z.string().min(10),
  whatWeAnalyze: z.array(z.string()).min(1),
  whatYouNeed: z.array(z.string()).min(1),
  whatWeIdentify: z.array(z.string()).min(1),
  whatAppealAddresses: z.array(z.string()).min(1),
  seoTitle: z.string().min(1),
  seoDescription: z.string().min(10),
  primaryKeyword: z.string().min(1),
  relatedKeywords: z.array(z.string()).min(0),
  route: z.string().startsWith("/"),
  status: z.enum(["IMPLEMENTED", "COMING_SOON"]),
  engine: z.string().min(1),
  executable: z.boolean(),
  cta: z.string().min(1),
});

export function validateCatalog(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const seenSlugs = new Set<string>();

  for (const entry of APPEAL_CATALOG) {
    const result = AppealWorkflowEntrySchema.safeParse(entry);
    if (!result.success) {
      errors.push(`Invalid entry "${entry.slug}": ${result.error.message}`);
    }
    if (seenSlugs.has(entry.slug)) {
      errors.push(`Duplicate slug: ${entry.slug}`);
    }
    seenSlugs.add(entry.slug);

    // COMING_SOON entries must not be executable
    if (entry.status === "COMING_SOON" && entry.executable) {
      errors.push(`Workflow "${entry.slug}" is COMING_SOON but marked executable`);
    }
    // IMPLEMENTED entries must be executable
    if (entry.status === "IMPLEMENTED" && !entry.executable) {
      errors.push(`Workflow "${entry.slug}" is IMPLEMENTED but not marked executable`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/* ═══════════════════════════════════════════════════════════
   CATEGORY SLUGS — for category parent pages
   ═══════════════════════════════════════════════════════════ */

export const CATEGORY_SLUGS: Record<AppealCategory, string> = {
  "Insurance": "insurance",
  "Disability & Social Security": "disability",
  "Unemployment": "unemployment",
  "Government Benefits": "benefits",
  "Workers' Compensation": "workers-comp",
  "Veterans": "veterans",
  "Administrative": "administrative",
};

export const SLUG_TO_CATEGORY: Record<string, AppealCategory> = Object.fromEntries(
  Object.entries(CATEGORY_SLUGS).map(([cat, slug]) => [slug, cat as AppealCategory])
);

export function getCategoryBySlug(slug: string): AppealCategory | undefined {
  return SLUG_TO_CATEGORY[slug];
}

export function getCategoryRoute(category: AppealCategory): string {
  return `/appeal/${CATEGORY_SLUGS[category]}`;
}
