import { z } from "zod";

export type WorkflowStep =
  | "intro" | "document" | "xray" | "decision" | "timeline" | "grounds"
  | "evidence" | "arguments" | "stress-test" | "draft" | "final-stress-test"
  | "readiness" | "packet" | "recipient" | "mailing" | "checkout" | "proof" | "submitted";
export type ExperienceStage = "understand" | "build" | "send";
export interface WorkflowFieldDef { key: string; label: string; placeholder?: string; type: "text" | "date" | "textarea" | "select"; options?: string[]; required?: boolean; }
export interface WorkflowDefinition {
  id: string; title: string; description: string; disclaimer: string; steps: WorkflowStep[]; stepLabels: string[];
  decisionFields: WorkflowFieldDef[]; focusAreas: string[]; deadlineWarning: string;
  experienceStages: readonly ExperienceStage[]; primaryKeyword?: string; primaryMsv?: number; primaryCpc?: number;
  keywordIntent?: "transactional" | "commercial" | "informational"; workflowPrompt: string; acceptsDocuments: boolean;
}
export type WorkflowId = string;

const COMMON_STEPS: WorkflowStep[] = ["intro","document","xray","decision","timeline","grounds","evidence","arguments","stress-test","draft","final-stress-test","readiness","packet","recipient","mailing","checkout","proof","submitted"];
const COMMON_LABELS = ["Start","Document","X-Ray","Decision","Timeline","Grounds","Evidence","Arguments","Stress Test","Draft","Final Test","Readiness","Packet","Recipient","Mailing","Checkout","Proof","Done"];
const BASE = {
  disclaimer: "Benefits Appeal provides document preparation and mailing assistance. It is not a law firm and does not provide legal advice.",
  steps: COMMON_STEPS, stepLabels: COMMON_LABELS,
  decisionFields: [
    { key: "referenceNumber", label: "Reference / Case Number", type: "text" as const },
    { key: "agency", label: "Agency / Decision-maker", type: "text" as const },
    { key: "decisionDate", label: "Decision Date", type: "date" as const },
    { key: "deadline", label: "Response / Appeal Deadline", type: "date" as const },
  ],
  focusAreas: [] as string[], deadlineWarning: "Check the source document carefully for the response or appeal deadline.",
  experienceStages: ["understand","build","send"] as const, acceptsDocuments: true,
};
function makeWorkflow(id: string,title: string,description: string,primaryKeyword: string|undefined,primaryMsv: number|undefined,primaryCpc: number|undefined,focusAreas: string[],workflowPrompt: string): WorkflowDefinition {
  return {...BASE,id,title,description,primaryKeyword,primaryMsv,primaryCpc,focusAreas,keywordIntent:"transactional",workflowPrompt};
}

export const workflows: Record<string, WorkflowDefinition> = {
  "ssdi-denial": makeWorkflow(
    "ssdi-denial",
    "Appeal an SSDI Denial",
    "Upload your SSDI denial letter and build a source-grounded appeal that identifies the stated denial reason, organizes medical and work evidence, tracks the deadline, and produces a review-ready appeal package.",
    "denied SSDI",
    390, 12.0,
    ["Denial reason","Medical evidence","Work history","Residual functional capacity","Deadline","Appeal level","Hearing request"],
    "Analyze the uploaded SSDI denial letter and extract the agency name, claim number, decision date, appeal deadline, stated denial reason, medical evidence cited, vocational factors, residual functional capacity assessment, and procedural instructions. Separate agency statements from user-supplied facts and unknowns. Identify factual or documentary gaps, contradictions, missing medical evidence, and unsupported assumptions. Do not invent medical conditions, diagnoses, eligibility, deadlines, or outcomes. Build a traceable issue-to-evidence map and defensible response grounds tied to the available record. Distinguish reconsideration, hearing, and Appeals Council as separate levels and treat the actual notice and governing rules as controlling. Draft only after the analysis is internally consistent, then validate dates, references, recipient instructions, requested relief, evidence references, and unsupported claims before human approval. Never represent draft creation or approval as mailing success; fulfillment remains review -> approval -> payment -> MailMyPDF -> tracking -> proof."
  ),
  "ssi-denial": makeWorkflow(
    "ssi-denial",
    "Appeal an SSI Denial",
    "Upload your SSI denial notice and build a documented response with organized evidence and deadline tracking.",
    "SSI denial",
    210, 10.0,
    ["Denial reason","Income and resource evidence","Living arrangement","Medical evidence","Deadline","Appeal level"],
    "Analyze the uploaded SSI denial notice and extract the agency, claim number, decision date, appeal deadline, stated denial reason (income, resources, disability, or technical), evidence cited, and procedural instructions. Separate agency statements from user-supplied facts. Identify gaps in income/resource documentation, medical evidence, or living-arrangement records. Do not invent eligibility, resource amounts, or outcomes. Build a source-linked issue-to-evidence map and defensible grounds. Distinguish reconsideration, hearing, and Appeals Council levels. Draft only after analysis is internally consistent, then validate before human approval."
  ),
  "social-security-denial": makeWorkflow(
    "social-security-denial",
    "Appeal a Social Security Denial",
    "Upload your Social Security decision and prepare a documented appeal or reconsideration request.",
    "social security denial appeal",
    110, 8.0,
    ["Decision type","Denial reason","Medical/vocational evidence","Procedural history","Deadline","Appeal level"],
    "Analyze the Social Security decision for the stated denial reason, medical/vocational evidence, procedural history, deadline, and appeal level. Identify gaps and contradictions without inventing eligibility or outcomes. Build a source-grounded response."
  ),
  "ssdi-reconsideration": makeWorkflow(
    "ssdi-reconsideration",
    "Request SSDI Reconsideration",
    "Upload the initial denial and build a focused reconsideration request with new evidence or corrected facts.",
    "appeal SSDI denial",
    260, 11.0,
    ["Initial denial reason","New medical evidence","Corrected facts","Reconsideration deadline","Disability criteria"],
    "Analyze the initial SSDI denial for the stated reason, identify new or corrected evidence, and build a reconsideration request that addresses the specific denial rationale. Do not invent eligibility or outcomes. Track deadlines and procedural requirements."
  ),
  "ssi-reconsideration": makeWorkflow(
    "ssi-reconsideration",
    "Request SSI Reconsideration",
    "Upload the SSI denial and build a reconsideration request with updated income, resource, or medical evidence.",
    "SSI denial appeal",
    90, 9.0,
    ["Denial reason","Updated income records","Resource documentation","Medical evidence","Deadline"],
    "Analyze the SSI denial for the stated reason (income, resources, disability, or technical). Identify updated or missing documentation. Build a reconsideration request that addresses the specific denial. Do not invent eligibility."
  ),
  "unemployment-denial": makeWorkflow(
    "unemployment-denial",
    "Appeal an Unemployment Denial",
    "Upload your unemployment denial letter and build a documented appeal with organized work and wage evidence.",
    "denied unemployment",
    390, 14.0,
    ["Denial reason","Work separation facts","Wage records","Eligibility issue","Deadline","Appeal hearing"],
    "Analyze the uploaded unemployment denial letter and extract the agency, claim number, decision date, appeal deadline, stated denial reason (work separation, wages, availability, misconduct, or voluntary quit), evidence cited, and hearing instructions. Separate agency findings from user-supplied facts. Identify factual disputes, missing wage records, and disputed separation facts. Do not invent eligibility, wages, dates, or outcomes. Build a source-linked issue-to-evidence map. Draft only after analysis is internally consistent, then validate before human approval."
  ),
  "edd-denial": makeWorkflow(
    "edd-denial",
    "Appeal an EDD Denial",
    "Upload your EDD determination and build a documented appeal response for California unemployment or disability benefits.",
    "appeal EDD denial",
    10, 15.0,
    ["EDD determination","Denial reason","Work separation","Wage records","Deadline","Appeal procedure"],
    "Analyze the EDD determination for the stated reason, work separation details, wage records, deadline, and appeal procedure. Identify factual disputes and missing documentation. Build a source-grounded appeal specific to EDD procedures. Do not invent eligibility or outcomes."
  ),
  "medicaid-denial": makeWorkflow(
    "medicaid-denial",
    "Appeal a Medicaid Denial",
    "Upload your Medicaid denial or termination notice and build a documented appeal with organized eligibility evidence.",
    "Medicaid denied",
    260, 6.0,
    ["Denial reason","Income documentation","Household composition","Eligibility category","Deadline","Fair hearing request"],
    "Analyze the uploaded Medicaid denial or termination notice and extract the agency, case number, decision date, appeal deadline, stated denial reason (income, category, procedural, or documentation), eligibility factors cited, and fair hearing instructions. Separate agency findings from user-supplied facts. Identify gaps in income documentation, household verification, or category eligibility. Do not invent eligibility, income amounts, or outcomes. Build a source-linked issue-to-evidence map. Draft only after analysis is internally consistent, then validate before human approval."
  ),
  "snap-denial": makeWorkflow(
    "snap-denial",
    "Appeal a Food Stamp (SNAP) Denial",
    "Upload your SNAP denial notice and build a documented appeal with organized eligibility evidence.",
    "appeal food stamp denial",
    10, 5.0,
    ["Denial reason","Income documentation","Household size","Resource verification","Deadline","Fair hearing"],
    "Analyze the SNAP denial notice for the stated reason (income, resources, household composition, or procedural). Identify gaps in income or household documentation. Build a source-grounded fair hearing request. Do not invent eligibility or outcomes."
  ),
  "va-benefits-denial": makeWorkflow(
    "va-benefits-denial",
    "Appeal a VA Benefits Denial",
    "Upload your VA decision and build a documented appeal with organized service and medical evidence.",
    "VA benefits appeal",
    90, 18.0,
    ["VA decision","Denial reason","Service connection","Medical evidence","Rating decision","Deadline","Appeal lane"],
    "Analyze the VA decision for the stated denial reason, service-connection evidence, medical records cited, rating decision, deadline, and appeal lane (Higher-Level Review, Supplemental Claim, Board Appeal). Separate VA findings from user-supplied facts. Identify gaps in service records, medical evidence, or nexus documentation. Do not invent service connection, ratings, or outcomes. Build a source-grounded appeal."
  ),
  "housing-benefits-denial": makeWorkflow(
    "housing-benefits-denial",
    "Appeal a Housing Benefits Denial",
    "Upload your Section 8 or housing benefits denial and build a documented appeal response.",
    "housing benefits denial",
    30, 4.0,
    ["Denial reason","Income documentation","Household composition","Eligibility","Deadline","Informal hearing"],
    "Analyze the housing benefits denial for the stated reason (income, eligibility, voucher termination, or procedural). Identify gaps in income or household documentation. Build a source-grounded informal hearing request. Do not invent eligibility."
  ),
  "disability-benefits-denial": makeWorkflow(
    "disability-benefits-denial",
    "Appeal a Disability Benefits Denial",
    "Upload your disability benefits denial and build a documented response with organized medical evidence.",
    "disability benefits appeal",
    170, 12.0,
    ["Denial reason","Medical evidence","Functional capacity","Treating provider records","Deadline","Appeal level"],
    "Analyze the disability benefits denial for the stated denial reason, medical evidence cited, functional assessment, treating-provider records, deadline, and appeal level. Identify gaps in medical documentation or functional evidence. Do not invent diagnoses, functional capacity, or outcomes. Build a source-grounded appeal."
  ),
  "overpayment": makeWorkflow(
    "overpayment",
    "Respond to a Benefits Overpayment Notice",
    "Upload the overpayment notice and build a documented response with organized records and request for waiver or repayment plan.",
    "benefits overpayment",
    60, 8.0,
    ["Overpayment amount","Reason stated","Waiver eligibility","Repayment capacity","Supporting records","Deadline"],
    "Analyze the overpayment notice for the stated reason, overpayment amount, recovery method, waiver criteria, deadline, and appeal rights. Separate agency calculations from user-supplied facts. Identify disputed amounts, missing documentation, or procedural errors. Do not invent eligibility for waiver or outcomes. Build a source-grounded response."
  ),
  "benefits-reconsideration": makeWorkflow(
    "benefits-reconsideration",
    "Request a Benefits Reconsideration",
    "Upload the benefits decision and build a focused reconsideration request with new evidence or corrected facts.",
    "reconsideration request benefits",
    50, 7.0,
    ["Original decision","New evidence","Corrected facts","Reconsideration deadline","Agency procedure"],
    "Analyze the original benefits decision for the stated reason. Identify new or corrected evidence that supports a different outcome. Build a reconsideration request that addresses the specific denial rationale. Do not invent eligibility or outcomes. Track deadlines and procedural requirements."
  ),
  "hearing-preparation": makeWorkflow(
    "hearing-preparation",
    "Prepare for a Benefits Hearing",
    "Upload the hearing notice and build an organized hearing preparation packet with evidence, issues, and argument outline.",
    "benefits hearing preparation",
    40, 10.0,
    ["Hearing notice","Issues on appeal","Evidence packet","Witness list","Argument outline","Hearing date"],
    "Analyze the hearing notice for the issues on appeal, hearing date, procedural requirements, and evidence needs. Organize the evidence packet by issue, identify witnesses, and build an argument outline. Do not invent outcomes or legal conclusions. Prepare a source-grounded hearing packet."
  ),
};

export function getWorkflow(id: string): WorkflowDefinition {
  const w = workflows[id];
  if (!w) throw new Error(`Unknown workflow: ${id}`);
  return w;
}

export const workflowIds = Object.keys(workflows) as WorkflowId[];
export const appealWorkflowCount = workflowIds.length;
export function isWorkflowId(value: string): value is WorkflowId { return Boolean(workflows[value]); }
export const workflowCatalogVersion = "2026-08-27-benefits-appeal-v1";

// Backwards compat aliases
export { getWorkflow as getWorkflowById };
