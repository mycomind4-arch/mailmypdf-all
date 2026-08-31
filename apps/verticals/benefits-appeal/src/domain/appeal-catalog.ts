import { z } from "zod";

/* ═══════════════════════════════════════════════════════════
   Benefits Appeal — Canonical Workflow Catalog
   ═══════════════════════════════════════════════════════════ */

export type AppealCategory =
  | "Disability & Social Security"
  | "Unemployment"
  | "Medicaid & Health Benefits"
  | "Public Assistance"
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
  /** What Benefits Appeal will identify */
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
  /** Route to the actual executable workflow */
  workflowRoute: string;
  cta: string;
}

/* ── Category metadata ── */

export const CATEGORY_ORDER: AppealCategory[] = [
  "Disability & Social Security",
  "Unemployment",
  "Medicaid & Health Benefits",
  "Public Assistance",
  "Veterans",
  "Administrative",
];

export const CATEGORY_DESCRIPTIONS: Record<AppealCategory, string> = {
  "Disability & Social Security":
    "SSDI, SSI, Social Security reconsideration, overpayment, and Appeals Council appeals.",
  "Unemployment":
    "Unemployment insurance denials, EDD determinations, work separation disputes, and wage record appeals.",
  "Medicaid & Health Benefits":
    "Medicaid denials, terminations, and fair hearing requests.",
  "Public Assistance":
    "SNAP/food stamps, housing benefits, and general public assistance denials and appeals.",
  "Veterans":
    "VA benefits denials, service connection disputes, rating decisions, and Board appeals.",
  "Administrative":
    "Reconsideration requests, overpayment responses, hearing preparation, and general benefits correspondence.",
};

/* ═══════════════════════════════════════════════════════════
   CATALOG ENTRIES
   ═══════════════════════════════════════════════════════════ */

export const APPEAL_CATALOG: AppealWorkflowEntry[] = [
  {
    slug: "ssdi-denial",
    title: "Appeal an SSDI Denial",
    category: "Disability & Social Security",
    shortDescription: "Appeal a denied Social Security Disability Insurance claim with organized medical and vocational evidence.",
    longDescription: "If your SSDI claim was denied, you have the right to appeal. Benefits Appeal helps you understand the denial reason, organize your medical evidence and work history, and build a source-grounded appeal for reconsideration or hearing.",
    intendedUser: "Individuals whose Social Security Disability Insurance claim was denied at the initial or reconsideration level.",
    problemSolved: "SSDI denials are often based on insufficient medical evidence or vocational factors. This workflow helps you identify what's missing and build a supported appeal.",
    whatWeAnalyze: ["The stated denial reason and medical evidence cited","Your residual functional capacity assessment","Vocational factors (age, education, past work)","Deadline for appeal (typically 60 days)","The appropriate appeal level"],
    whatYouNeed: ["SSDI denial letter","Medical records and provider statements","Work history for the past 15 years","Any RFC or CE reports","List of medications and treatments"],
    whatWeIdentify: ["Gaps between the denial reason and your medical evidence","Contradictions in the agency's findings","Missing or outdated medical records","Deadline and procedural requirements","Possible grounds for appeal"],
    whatAppealAddresses: ["Request for reconsideration with new evidence","Request for administrative law judge hearing","Argument that the denial misapplied the medical evidence","Identification of vocational factors the agency overlooked"],
    seoTitle: "Appeal an SSDI Denial | Benefits Appeal",
    seoDescription: "Appeal a denied SSDI claim with organized medical evidence, work history, and source-grounded arguments. Build a review-ready appeal package.",
    primaryKeyword: "denied SSDI",
    relatedKeywords: ["appeal SSDI denial", "SSDI appeal letter", "Social Security disability denial", "request reconsideration SSDI"],
    route: "/appeal/ssdi-denial",
    status: "IMPLEMENTED",
    engine: "benefits-engine",
    executable: true,
    workflowRoute: "/workflows/ssdi-denial",
    cta: "Start your SSDI appeal",
  },
  {
    slug: "ssi-denial",
    title: "Appeal an SSI Denial",
    category: "Disability & Social Security",
    shortDescription: "Appeal a denied Supplemental Security Income claim with updated income, resource, and medical evidence.",
    longDescription: "If your SSI claim was denied, the reason could be income, resources, disability, or a technical eligibility issue. Benefits Appeal helps you identify the specific denial rationale and build a documented response.",
    intendedUser: "Individuals whose Supplemental Security Income claim was denied.",
    problemSolved: "SSI denials often stem from income/resource documentation issues or disability determinations. This workflow organizes your evidence for each type of denial reason.",
    whatWeAnalyze: ["The stated denial reason (income, resources, disability, or technical)","Income and resource documentation on file","Living arrangement verification","Medical evidence if disability was denied","Deadline and appeal level"],
    whatYouNeed: ["SSI denial notice","Income and bank records","Resource documentation","Medical records if applicable","Living arrangement documentation"],
    whatWeIdentify: ["Income or resource documentation gaps","Missing medical evidence for disability claims","Contradictions in the agency's findings","Deadline and procedural requirements"],
    whatAppealAddresses: ["Request for reconsideration with updated documentation","Challenge to income or resource calculations","Argument that medical evidence supports disability","Corrected living arrangement information"],
    seoTitle: "Appeal an SSI Denial | Benefits Appeal",
    seoDescription: "Appeal a denied SSI claim with organized income, resource, and medical evidence. Build a source-grounded reconsideration or hearing request.",
    primaryKeyword: "SSI denial",
    relatedKeywords: ["SSI appeal letter", "supplemental security income denial", "appeal SSI denial", "SSI reconsideration"],
    route: "/appeal/ssi-denial",
    status: "IMPLEMENTED",
    engine: "benefits-engine",
    executable: true,
    workflowRoute: "/workflows/ssi-denial",
    cta: "Start your SSI appeal",
  },
  {
    slug: "social-security-denial",
    title: "Appeal a Social Security Denial",
    category: "Disability & Social Security",
    shortDescription: "Upload your Social Security decision and prepare a documented appeal or reconsideration request.",
    longDescription: "Whether it's a retirement, survivor, or disability decision, Benefits Appeal helps you understand the agency's findings and build a source-grounded response.",
    intendedUser: "Individuals who received an adverse Social Security Administration decision.",
    problemSolved: "Social Security decisions can be complex. This workflow breaks down the denial reason and organizes your evidence for the appropriate appeal level.",
    whatWeAnalyze: ["The decision type and stated reason","Medical or vocational evidence cited","Procedural history","Deadline and appeal level","Eligibility factors assessed"],
    whatYouNeed: ["Social Security decision letter","Medical records if disability-related","Work history if vocational factors","Any prior correspondence with SSA"],
    whatWeIdentify: ["Gaps between the decision and your evidence","Procedural errors","Missing documentation","Deadline and next steps"],
    whatAppealAddresses: ["Reconsideration request","Hearing request before an ALJ","Appeals Council review","Argument that the decision misapplied the evidence"],
    seoTitle: "Appeal a Social Security Denial | Benefits Appeal",
    seoDescription: "Appeal a Social Security decision with organized evidence and source-grounded arguments. Prepare a reconsideration, hearing, or Appeals Council request.",
    primaryKeyword: "social security denial appeal",
    relatedKeywords: ["social security denial", "SSA appeal", "appeal Social Security decision"],
    route: "/appeal/social-security-denial",
    status: "IMPLEMENTED",
    engine: "benefits-engine",
    executable: true,
    workflowRoute: "/workflows/social-security-denial",
    cta: "Start your appeal",
  },
  {
    slug: "ssdi-reconsideration",
    title: "Request SSDI Reconsideration",
    category: "Disability & Social Security",
    shortDescription: "Build a focused reconsideration request for an SSDI denial with new medical evidence or corrected facts.",
    longDescription: "Reconsideration is the first formal appeal level for SSDI denials. A different reviewer examines your claim with any new evidence you provide. Benefits Appeal helps you organize and present that evidence.",
    intendedUser: "Individuals who received an initial SSDI denial and want to request reconsideration within 60 days.",
    problemSolved: "Reconsideration gives you the chance to have a different reviewer look at your claim with new or corrected evidence. This workflow identifies what to submit.",
    whatWeAnalyze: ["The initial denial reasons","What new evidence could strengthen the claim","Whether the reconsideration deadline is met","Medical records submitted and gaps","Corrected factual information"],
    whatYouNeed: ["Initial denial notice","New or updated medical records","Reconsideration request forms","Any new physician statements","Corrected work or income information"],
    whatWeIdentify: ["Gaps in medical evidence that the denial identified","New evidence that addresses the denial reason","Procedural deadline and requirements","Factual errors in the original decision"],
    whatAppealAddresses: ["Request for reconsideration with new medical evidence","Correction of factual errors","Updated provider statements","Additional treatment records"],
    seoTitle: "SSDI Reconsideration Request | Benefits Appeal",
    seoDescription: "Build a focused SSDI reconsideration request with new medical evidence and corrected facts. Address the specific denial rationale.",
    primaryKeyword: "appeal SSDI denial",
    relatedKeywords: ["SSDI reconsideration", "Social Security reconsideration request", "denied SSDI appeal"],
    route: "/appeal/ssdi-reconsideration",
    status: "IMPLEMENTED",
    engine: "benefits-engine",
    executable: true,
    workflowRoute: "/workflows/ssdi-reconsideration",
    cta: "Request reconsideration",
  },
  {
    slug: "ssi-reconsideration",
    title: "Request SSI Reconsideration",
    category: "Disability & Social Security",
    shortDescription: "Build a reconsideration request for an SSI denial with updated income, resource, or medical documentation.",
    longDescription: "If your SSI claim was denied, reconsideration is the first appeal level. Benefits Appeal helps you identify what documentation to update and how to present your case.",
    intendedUser: "Individuals who received an initial SSI denial and want to request reconsideration.",
    problemSolved: "SSI reconsideration requires updated or corrected documentation. This workflow identifies exactly what the denial cited as missing and organizes your response.",
    whatWeAnalyze: ["The denial reason (income, resources, disability, or technical)","What documentation was missing or insufficient","Updated income or resource records","Medical evidence if disability was denied","Reconsideration deadline"],
    whatYouNeed: ["SSI denial notice","Updated income and bank records","Resource documentation","Medical records if applicable","Reconsideration request forms"],
    whatWeIdentify: ["Income or resource documentation gaps","Updated records that address the denial","Medical evidence supporting disability","Procedural deadline and requirements"],
    whatAppealAddresses: ["Reconsideration request with updated documentation","Corrected income or resource calculations","Additional medical evidence","Corrected living arrangement information"],
    seoTitle: "SSI Reconsideration Request | Benefits Appeal",
    seoDescription: "Build an SSI reconsideration request with updated income, resource, and medical documentation. Address the specific denial reason.",
    primaryKeyword: "SSI denial appeal",
    relatedKeywords: ["SSI reconsideration", "supplemental security income reconsideration", "appeal SSI denial"],
    route: "/appeal/ssi-reconsideration",
    status: "IMPLEMENTED",
    engine: "benefits-engine",
    executable: true,
    workflowRoute: "/workflows/ssi-reconsideration",
    cta: "Request reconsideration",
  },
  {
    slug: "unemployment-denial",
    title: "Appeal an Unemployment Denial",
    category: "Unemployment",
    shortDescription: "Appeal a denied unemployment claim with organized work separation, wage, and eligibility evidence.",
    longDescription: "If your unemployment claim was denied, you have the right to appeal. Benefits Appeal helps you understand the denial reason, organize your work separation facts and wage records, and build a source-grounded appeal.",
    intendedUser: "Individuals whose unemployment insurance claim was denied by the state agency.",
    problemSolved: "Unemployment denials often involve disputed work separation facts, wage discrepancies, or eligibility issues. This workflow organizes your evidence for each issue.",
    whatWeAnalyze: ["The stated denial reason","Work separation facts (who, what, when)","Wage records and discrepancies","Eligibility issue (misconduct, voluntary quit, availability)","Deadline and appeal procedure"],
    whatYouNeed: ["Unemployment denial letter","Employment separation documentation","Pay stubs and wage records","Any employer correspondence","Appeal forms for your state"],
    whatWeIdentify: ["Factual disputes about the work separation","Wage record discrepancies","Missing employer documentation","Deadline and hearing requirements","Possible grounds for appeal"],
    whatAppealAddresses: ["Request for appeal hearing","Challenge to the stated separation reason","Correction of wage records","Argument that you meet eligibility requirements"],
    seoTitle: "Appeal an Unemployment Denial | Benefits Appeal",
    seoDescription: "Appeal a denied unemployment claim with organized work separation evidence and wage records. Build a review-ready appeal for hearing.",
    primaryKeyword: "denied unemployment",
    relatedKeywords: ["appeal unemployment denial", "unemployment benefits denial", "denied unemployment claim", "unemployment appeal letter"],
    route: "/appeal/unemployment-denial",
    status: "IMPLEMENTED",
    engine: "benefits-engine",
    executable: true,
    workflowRoute: "/workflows/unemployment-denial",
    cta: "Start your appeal",
  },
  {
    slug: "edd-denial",
    title: "Appeal an EDD Denial",
    category: "Unemployment",
    shortDescription: "Appeal an EDD determination for California unemployment or disability benefits with organized evidence.",
    longDescription: "California's Employment Development Department (EDD) issues determinations that can be appealed. Benefits Appeal helps you understand the EDD's reasoning and build a documented response for the appeal process.",
    intendedUser: "California residents who received an EDD determination denying unemployment or disability benefits.",
    problemSolved: "EDD denials involve specific California procedures and deadlines. This workflow identifies the stated reason, organizes your evidence, and builds an appeal specific to EDD requirements.",
    whatWeAnalyze: ["The EDD determination and stated reason","Work separation details under California law","Wage records and EDD calculations","Eligibility factors","Deadline (typically 30 days in California)"],
    whatYouNeed: ["EDD determination notice","California employment records","Pay stubs and wage documentation","Employer separation documents","Appeal forms (DE 1000M)"],
    whatWeIdentify: ["Disputed facts about the work separation","Wage record discrepancies","Missing documentation","California-specific deadline and procedure","Possible grounds for appeal"],
    whatAppealAddresses: ["Request for appeal before the CUIAB","Challenge to the EDD's stated reason","Correction of wage or employer records","Argument under California unemployment law"],
    seoTitle: "Appeal an EDD Denial | Benefits Appeal",
    seoDescription: "Appeal an EDD determination with organized work separation and wage evidence. Build a documented appeal for California unemployment or disability benefits.",
    primaryKeyword: "appeal EDD denial",
    relatedKeywords: ["EDD denial appeal", "California unemployment appeal", "EDD determination appeal", "DE 1000M"],
    route: "/appeal/edd-denial",
    status: "IMPLEMENTED",
    engine: "benefits-engine",
    executable: true,
    workflowRoute: "/workflows/edd-denial",
    cta: "Start your EDD appeal",
  },
  {
    slug: "medicaid-denial",
    title: "Appeal a Medicaid Denial",
    category: "Medicaid & Health Benefits",
    shortDescription: "Appeal a Medicaid denial or termination with organized income, household, and eligibility evidence.",
    longDescription: "If your Medicaid application was denied or your benefits were terminated, you have the right to request a fair hearing. Benefits Appeal helps you understand the denial and build a documented appeal.",
    intendedUser: "Individuals whose Medicaid application was denied or whose Medicaid benefits were terminated.",
    problemSolved: "Medicaid denials can involve income, category eligibility, household composition, or documentation issues. This workflow organizes your evidence for each type.",
    whatWeAnalyze: ["The stated denial or termination reason","Income documentation on file","Household composition and size","Eligibility category","Deadline for fair hearing request"],
    whatYouNeed: ["Medicaid denial or termination notice","Income documentation (pay stubs, tax returns)","Household verification","Medical expense records if applicable","Fair hearing request forms"],
    whatWeIdentify: ["Income documentation gaps","Household composition issues","Missing eligibility documentation","Procedural errors in the determination","Deadline and hearing requirements"],
    whatAppealAddresses: ["Request for fair hearing","Challenge to income or household calculations","Additional documentation supporting eligibility","Argument that the denial was in error"],
    seoTitle: "Appeal a Medicaid Denial | Benefits Appeal",
    seoDescription: "Appeal a Medicaid denial or termination with organized income, household, and eligibility evidence. Build a fair hearing request.",
    primaryKeyword: "Medicaid denied",
    relatedKeywords: ["appeal Medicaid denial", "Medicaid fair hearing", "Medicaid termination appeal", "appealing a Medicaid denial"],
    route: "/appeal/medicaid-denial",
    status: "IMPLEMENTED",
    engine: "benefits-engine",
    executable: true,
    workflowRoute: "/workflows/medicaid-denial",
    cta: "Start your Medicaid appeal",
  },
  {
    slug: "snap-denial",
    title: "Appeal a Food Stamp (SNAP) Denial",
    category: "Public Assistance",
    shortDescription: "Appeal a SNAP/food stamp denial with organized income, household, and resource evidence.",
    longDescription: "If your SNAP application was denied or your benefits were reduced, you can request a fair hearing. Benefits Appeal helps you organize your evidence and build a documented response.",
    intendedUser: "Individuals whose SNAP/food stamp application was denied or benefits were reduced or terminated.",
    problemSolved: "SNAP denials often involve income, resource, or household composition disputes. This workflow identifies what the agency cited and organizes your evidence.",
    whatWeAnalyze: ["The stated denial or reduction reason","Income documentation","Household size and composition","Resource verification","Deadline for fair hearing"],
    whatYouNeed: ["SNAP denial or reduction notice","Income documentation","Household verification","Bank statements","Fair hearing request forms"],
    whatWeIdentify: ["Income calculation errors","Household composition issues","Missing documentation","Procedural errors","Deadline and hearing requirements"],
    whatAppealAddresses: ["Request for fair hearing","Challenge to income or resource calculations","Additional documentation","Argument that eligibility was met"],
    seoTitle: "Appeal a Food Stamp Denial | Benefits Appeal",
    seoDescription: "Appeal a SNAP/food stamp denial with organized income, household, and resource evidence. Build a fair hearing request.",
    primaryKeyword: "appeal food stamp denial",
    relatedKeywords: ["SNAP denial appeal", "food stamps denial", "SNAP fair hearing", "food stamp appeal letter"],
    route: "/appeal/snap-denial",
    status: "IMPLEMENTED",
    engine: "benefits-engine",
    executable: true,
    workflowRoute: "/workflows/snap-denial",
    cta: "Start your SNAP appeal",
  },
  {
    slug: "va-benefits-denial",
    title: "Appeal a VA Benefits Denial",
    category: "Veterans",
    shortDescription: "Appeal a VA benefits denial with organized service connection, medical, and rating evidence.",
    longDescription: "If the VA denied your claim for disability compensation or other benefits, you have appeal options. Benefits Appeal helps you understand the decision and choose the right appeal lane.",
    intendedUser: "Veterans whose VA disability compensation or other benefits claim was denied.",
    problemSolved: "VA appeals involve multiple lanes (Higher-Level Review, Supplemental Claim, Board Appeal). This workflow identifies the denial reason and helps you choose and prepare the right path.",
    whatWeAnalyze: ["The VA decision and stated denial reason","Service connection evidence","Medical evidence and nexus documentation","Rating decision details","Deadline and appeal lane options"],
    whatYouNeed: ["VA rating decision or claim decision","Service treatment records","Medical records and provider statements","Buddy statements or witness statements","DD-214 or service records"],
    whatWeIdentify: ["Gaps in service connection evidence","Missing medical nexus documentation","Rating decision errors","Deadline and lane selection","Possible grounds for appeal"],
    whatAppealAddresses: ["Higher-Level Review request","Supplemental Claim with new evidence","Notice of Disagreement for Board Appeal","Argument that the rating decision was in error"],
    seoTitle: "Appeal a VA Benefits Denial | Benefits Appeal",
    seoDescription: "Appeal a VA benefits denial with organized service connection, medical, and rating evidence. Choose the right appeal lane and build a documented response.",
    primaryKeyword: "VA benefits appeal",
    relatedKeywords: ["VA denial appeal", "VA disability appeal", "Higher-Level Review", "Supplemental Claim", "Board Appeal"],
    route: "/appeal/va-benefits-denial",
    status: "IMPLEMENTED",
    engine: "benefits-engine",
    executable: true,
    workflowRoute: "/workflows/va-benefits-denial",
    cta: "Start your VA appeal",
  },
  {
    slug: "housing-benefits-denial",
    title: "Appeal a Housing Benefits Denial",
    category: "Public Assistance",
    shortDescription: "Appeal a Section 8 or housing benefits denial with organized income and eligibility evidence.",
    longDescription: "If your housing benefits were denied or terminated, you can request an informal hearing. Benefits Appeal helps you organize your evidence and build a documented response.",
    intendedUser: "Individuals whose Section 8, housing choice voucher, or public housing benefits were denied or terminated.",
    problemSolved: "Housing benefits denials involve income, eligibility, and procedural issues. This workflow identifies what the housing authority cited and organizes your response.",
    whatWeAnalyze: ["The stated denial or termination reason","Income documentation","Household composition","Eligibility factors","Deadline for informal hearing"],
    whatYouNeed: ["Housing benefits denial notice","Income documentation","Household verification","Lease and rental records","Any prior correspondence with the housing authority"],
    whatWeIdentify: ["Income calculation errors","Household composition issues","Procedural errors in the determination","Missing documentation","Deadline and hearing requirements"],
    whatAppealAddresses: ["Request for informal hearing","Challenge to income or eligibility calculations","Additional documentation","Argument that the denial was in error"],
    seoTitle: "Appeal a Housing Benefits Denial | Benefits Appeal",
    seoDescription: "Appeal a Section 8 or housing benefits denial with organized income and eligibility evidence. Build an informal hearing request.",
    primaryKeyword: "housing benefits denial",
    relatedKeywords: ["Section 8 denial appeal", "housing voucher appeal", "housing benefits termination", "informal hearing"],
    route: "/appeal/housing-benefits-denial",
    status: "IMPLEMENTED",
    engine: "benefits-engine",
    executable: true,
    workflowRoute: "/workflows/housing-benefits-denial",
    cta: "Start your housing appeal",
  },
  {
    slug: "disability-benefits-denial",
    title: "Appeal a Disability Benefits Denial",
    category: "Disability & Social Security",
    shortDescription: "Appeal a disability benefits denial with organized medical, functional, and provider evidence.",
    longDescription: "If your disability benefits claim was denied, the reason may be insufficient medical evidence or functional capacity assessment. Benefits Appeal helps you identify the gaps and build a documented appeal.",
    intendedUser: "Individuals whose short-term or long-term disability benefits claim was denied.",
    problemSolved: "Disability benefits denials often hinge on medical evidence and functional capacity. This workflow identifies what's missing and organizes your evidence for appeal.",
    whatWeAnalyze: ["The stated denial reason","Medical evidence cited","Functional capacity assessment","Treating provider records","Deadline and appeal level"],
    whatYouNeed: ["Disability benefits denial letter","Medical records and treating provider statements","Functional capacity evaluation","Medication and treatment list","Any IME or CE reports"],
    whatWeIdentify: ["Gaps between the denial reason and medical evidence","Missing treating provider statements","Contradictions in functional capacity assessments","Deadline and procedural requirements"],
    whatAppealAddresses: ["Appeal with additional medical evidence","Challenge to the functional capacity assessment","Updated treating provider statements","Argument that the denial misapplied the medical record"],
    seoTitle: "Appeal a Disability Benefits Denial | Benefits Appeal",
    seoDescription: "Appeal a disability benefits denial with organized medical, functional, and provider evidence. Build a source-grounded appeal.",
    primaryKeyword: "disability benefits appeal",
    relatedKeywords: ["disability benefits denial", "disability appeal letter", "long-term disability appeal", "short-term disability denial"],
    route: "/appeal/disability-benefits-denial",
    status: "IMPLEMENTED",
    engine: "benefits-engine",
    executable: true,
    workflowRoute: "/workflows/disability-benefits-denial",
    cta: "Start your disability appeal",
  },
  {
    slug: "overpayment",
    title: "Respond to a Benefits Overpayment Notice",
    category: "Administrative",
    shortDescription: "Build a documented response to a benefits overpayment notice with organized records and waiver or repayment request.",
    longDescription: "If you received an overpayment notice from a benefits agency, you may need to respond with a waiver request, repayment plan, or appeal. Benefits Appeal helps you understand the notice and organize your response.",
    intendedUser: "Individuals who received a benefits overpayment notice from SSA, EDD, Medicaid, or another agency.",
    problemSolved: "Overpayment notices can be challenged or managed through waiver, repayment plans, or appeal. This workflow identifies the stated reason and organizes your records.",
    whatWeAnalyze: ["The overpayment amount and stated reason","Agency calculations and recovery method","Waiver eligibility factors","Repayment capacity and hardship","Deadline for response"],
    whatYouNeed: ["Overpayment notice","Income and benefit records","Financial statements","Any prior correspondence","Waiver or repayment forms"],
    whatWeIdentify: ["Disputed overpayment amounts","Calculation errors","Waiver eligibility factors","Repayment capacity documentation","Deadline and procedural requirements"],
    whatAppealAddresses: ["Request for waiver of overpayment","Repayment plan proposal","Challenge to the overpayment calculation","Appeal of the overpayment determination"],
    seoTitle: "Respond to a Benefits Overpayment Notice | Benefits Appeal",
    seoDescription: "Build a documented response to a benefits overpayment notice with organized records. Request a waiver, repayment plan, or appeal.",
    primaryKeyword: "benefits overpayment",
    relatedKeywords: ["overpayment notice", "overpayment waiver", "SSA overpayment", "benefits overpayment appeal"],
    route: "/appeal/overpayment",
    status: "IMPLEMENTED",
    engine: "benefits-engine",
    executable: true,
    workflowRoute: "/workflows/overpayment",
    cta: "Respond to the notice",
  },
  {
    slug: "benefits-reconsideration",
    title: "Request a Benefits Reconsideration",
    category: "Administrative",
    shortDescription: "Build a focused reconsideration request with new evidence or corrected facts before formal appeal.",
    longDescription: "Reconsideration is often the first step before a formal appeal. Benefits Appeal helps you identify new evidence or factual errors and build a focused reconsideration request.",
    intendedUser: "Individuals who received a benefits denial and want to request reconsideration before filing a formal appeal.",
    problemSolved: "Reconsideration allows you to present new evidence or corrected facts to the agency. This workflow identifies what to include.",
    whatWeAnalyze: ["The original decision and stated reason","New evidence or corrected facts","Reconsideration deadline","Agency-specific procedure","What was missing from the original submission"],
    whatYouNeed: ["Original benefits decision","New or corrected documentation","Reconsideration request forms","Any additional supporting records"],
    whatWeIdentify: ["Factual errors in the original decision","New evidence that addresses the denial reason","Procedural deadline and requirements","What was missing from the original submission"],
    whatAppealAddresses: ["Reconsideration request with new evidence","Correction of factual errors","Updated documentation","Additional records or statements"],
    seoTitle: "Request a Benefits Reconsideration | Benefits Appeal",
    seoDescription: "Build a focused benefits reconsideration request with new evidence and corrected facts. Address the specific denial rationale.",
    primaryKeyword: "reconsideration request benefits",
    relatedKeywords: ["benefits reconsideration", "reconsideration request", "appeal benefits decision"],
    route: "/appeal/benefits-reconsideration",
    status: "IMPLEMENTED",
    engine: "benefits-engine",
    executable: true,
    workflowRoute: "/workflows/benefits-reconsideration",
    cta: "Request reconsideration",
  },
  {
    slug: "hearing-preparation",
    title: "Prepare for a Benefits Hearing",
    category: "Administrative",
    shortDescription: "Build an organized hearing preparation packet with evidence, issues, and argument outline.",
    longDescription: "If your benefits appeal has been scheduled for a hearing, Benefits Appeal helps you organize your evidence by issue, prepare an argument outline, and identify witnesses.",
    intendedUser: "Individuals whose benefits appeal has been scheduled for an administrative hearing.",
    problemSolved: "Hearing preparation requires organizing evidence by issue, building an argument outline, and identifying witnesses. This workflow does the heavy lifting.",
    whatWeAnalyze: ["The hearing notice and issues on appeal","Evidence already submitted","Witnesses and their relevance","Procedural requirements","Hearing date and deadlines"],
    whatYouNeed: ["Hearing notice","All prior submissions and evidence","Witness contact information","Any new evidence since the last submission","Hearing rules for your agency"],
    whatWeIdentify: ["Evidence gaps by issue","Witnesses who can support specific issues","Contradictions in the agency's position","Procedural requirements and deadlines"],
    whatAppealAddresses: ["Organized evidence packet by issue","Argument outline with source references","Witness list and relevance","Pre-hearing submission preparation"],
    seoTitle: "Prepare for a Benefits Hearing | Benefits Appeal",
    seoDescription: "Build an organized hearing preparation packet with evidence, issues, and argument outline. Prepare for your administrative hearing.",
    primaryKeyword: "benefits hearing preparation",
    relatedKeywords: ["benefits hearing", "administrative hearing preparation", "appeal hearing prep", "SSDI hearing preparation"],
    route: "/appeal/hearing-preparation",
    status: "IMPLEMENTED",
    engine: "benefits-engine",
    executable: true,
    workflowRoute: "/workflows/hearing-preparation",
    cta: "Prepare for your hearing",
  },
];

export function getWorkflowBySlug(slug: string): AppealWorkflowEntry | undefined {
  return APPEAL_CATALOG.find((e) => e.slug === slug);
}

export function getWorkflowsByCategory(category: AppealCategory): AppealWorkflowEntry[] {
  return APPEAL_CATALOG.filter((e) => e.category === category);
}

export function getImplementedWorkflows(): AppealWorkflowEntry[] {
  return APPEAL_CATALOG.filter((e) => e.status === "IMPLEMENTED");
}

export function getComingSoonWorkflows(): AppealWorkflowEntry[] {
  return APPEAL_CATALOG.filter((e) => e.status === "COMING_SOON");
}
