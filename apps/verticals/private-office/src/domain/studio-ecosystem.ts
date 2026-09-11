import { workflowList } from "./workflows";

export type StudioPublicationConnection = "connected" | "adapter-required";

export type StudioVertical = {
  id: string;
  title: string;
  connection: StudioPublicationConnection;
};

export type StudioCatalogWorkflow = {
  id: string;
  verticalId: string;
  title: string;
  description: string;
  publicPath: string;
  status: "planned" | "scaffolded" | "functional" | "authority" | "gold";
};

export const studioVerticals: StudioVertical[] = [
  { id: "private-office", title: "Private Office", connection: "connected" },
  { id: "appeal-mail", title: "Appeal Mail", connection: "adapter-required" },
  { id: "benefits-appeal", title: "Benefits Appeal", connection: "adapter-required" },
  { id: "claim-proof", title: "Claim Proof", connection: "adapter-required" },
  { id: "code-enforcement", title: "Code Enforcement", connection: "adapter-required" },
  { id: "dispute-mail", title: "Dispute Mail", connection: "adapter-required" },
  { id: "immigration-mail", title: "Immigration Mail", connection: "adapter-required" },
  { id: "insurance-claims", title: "Insurance Claims", connection: "adapter-required" },
  { id: "notice-respond", title: "Notice Respond", connection: "adapter-required" },
  { id: "permit-reply", title: "Permit Reply", connection: "adapter-required" },
  { id: "records-request", title: "Records Request", connection: "adapter-required" },
  { id: "small-business", title: "Small Business", connection: "adapter-required" },
  { id: "tenant-reply", title: "Tenant Reply", connection: "adapter-required" },
];

type RegisteredWorkflowRow = [
  verticalId: string,
  id: string,
  title: string,
  publicPath: string,
  status: StudioCatalogWorkflow["status"],
];

// This mirrors the cross-product workflow registry. Keep a row here for every
// workflow that should appear in the Studio, even before its app adapter ships.
const registeredWorkflowRows: RegisteredWorkflowRow[] = [
  ["notice-respond", "cp2000-response", "Respond to an IRS CP2000 Notice", "/workflows/cp2000-response", "functional"],
  ["notice-respond", "cp14-response", "Respond to an IRS CP14 Notice", "/workflows/cp14-response", "authority"],
  ["notice-respond", "irs-notice", "Respond to an IRS Notice", "/workflows/irs-notice", "functional"],
  ["notice-respond", "court-summons", "Respond to a Court Summons", "/workflows/court-summons", "functional"],
  ["notice-respond", "agency-action", "Respond to an Agency Action", "/workflows/agency-action", "functional"],
  ["notice-respond", "file-appeal", "File an Appeal", "/workflows/file-appeal", "functional"],
  ["notice-respond", "cp504-response", "Respond to an IRS CP504 Notice", "/workflows/cp504-response", "functional"],
  ["notice-respond", "cp523-response", "Respond to an IRS CP523 Notice", "/workflows/cp523-response", "functional"],
  ["notice-respond", "tax-notice", "Respond to a Tax Notice", "/workflows/tax-notice", "functional"],
  ["notice-respond", "code-enforcement", "Respond to a Code Enforcement Notice", "/workflows/code-enforcement", "functional"],
  ["notice-respond", "permit-correction", "Respond to a Permit Correction Notice", "/workflows/permit-correction", "functional"],
  ["notice-respond", "dmv-notice", "Respond to a DMV Notice", "/workflows/dmv-notice", "functional"],
  ["notice-respond", "ssa-notice", "Respond to an SSA Notice", "/workflows/ssa-notice", "functional"],
  ["notice-respond", "uscis-notice", "Respond to a USCIS Notice", "/workflows/uscis-notice", "functional"],
  ["notice-respond", "benefits-notice", "Respond to a Benefits Notice", "/workflows/benefits-notice", "functional"],
  ["appeal-mail", "insurance-claim-denied", "Insurance Claim Denied", "/appeal-mail/insurance/claim-denied", "planned"],
  ["appeal-mail", "insurance-claim-appeal", "Insurance Claim Appeal", "/appeal-mail/insurance/claim-appeal", "planned"],
  ["appeal-mail", "health-insurance-denial", "Health Insurance Denial Appeal", "/appeal-mail/insurance/health-denial", "planned"],
  ["appeal-mail", "roof-claim-denied", "Roof Insurance Claim Denied", "/appeal-mail/insurance/roof-claim-denied", "planned"],
  ["appeal-mail", "workers-comp-denied", "Workers Compensation Denied", "/appeal-mail/insurance/workers-comp-denied", "planned"],
  ["appeal-mail", "life-insurance-claim-denied", "Life Insurance Claim Denied", "/appeal-mail/insurance/life-claim-denied", "planned"],
  ["appeal-mail", "financial-aid-appeal", "Financial Aid Appeal", "/appeal-mail/financial-aid/appeal", "planned"],
  ["appeal-mail", "sap-appeal", "SAP Appeal", "/appeal-mail/financial-aid/sap-appeal", "planned"],
  ["appeal-mail", "ssdi-appeal", "SSDI Appeal", "/appeal-mail/government/ssdi-appeal", "planned"],
  ["appeal-mail", "ssi-appeal", "SSI Appeal", "/appeal-mail/government/ssi-appeal", "planned"],
  ["appeal-mail", "unemployment-appeal", "Unemployment Appeal", "/appeal-mail/government/unemployment-appeal", "planned"],
  ["appeal-mail", "medicaid-appeal", "Medicaid Appeal", "/appeal-mail/government/medicaid-appeal", "planned"],
  ["dispute-mail", "transunion-dispute", "TransUnion Dispute", "/workflows/transunion-dispute", "functional"],
  ["dispute-mail", "experian-dispute", "Experian Dispute", "/workflows/experian-dispute", "functional"],
  ["dispute-mail", "equifax-dispute", "Equifax Dispute", "/workflows/equifax-dispute", "functional"],
  ["dispute-mail", "credit-report-dispute", "Credit Report Dispute", "/dispute-mail/credit/credit-report-dispute", "planned"],
  ["dispute-mail", "lexisnexis-dispute", "LexisNexis Dispute", "/dispute-mail/credit/lexisnexis", "planned"],
  ["dispute-mail", "hard-inquiry-dispute", "Hard Inquiry Dispute", "/dispute-mail/credit/hard-inquiry", "planned"],
  ["dispute-mail", "collection-dispute", "Collection Dispute", "/dispute-mail/credit/collection-dispute", "planned"],
  ["dispute-mail", "fcra-dispute", "FCRA Dispute", "/dispute-mail/credit/fcra-dispute", "planned"],
  ["dispute-mail", "debt-collection-dispute", "Debt Collection Dispute", "/dispute-mail/debt/debt-collection-dispute", "planned"],
  ["dispute-mail", "debt-validation", "Debt Validation Letter", "/dispute-mail/debt/debt-validation", "planned"],
  ["dispute-mail", "fdcpa-dispute", "FDCPA Dispute", "/dispute-mail/debt/fdcpa-dispute", "planned"],
  ["dispute-mail", "debt-lawsuit-response", "Debt Lawsuit Response", "/dispute-mail/debt/debt-lawsuit-response", "planned"],
  ["dispute-mail", "collection-cease-contact", "Collection Cease Contact Letter", "/dispute-mail/debt/cease-contact", "planned"],
  ["immigration-mail", "i-797-analysis", "I-797 Analysis", "/workflows/i-797-analysis", "planned"],
  ["immigration-mail", "i-797c-analysis", "I-797C Analysis", "/workflows/i-797c-analysis", "planned"],
  ["immigration-mail", "uscis-rfe-response", "USCIS RFE Response", "/workflows/uscis-rfe-response", "planned"],
  ["records-request", "police-records-request", "Police Records Request", "/workflows/police-records-request", "planned"],
  ["records-request", "police-report-request", "Police Report Request", "/workflows/police-report-request", "planned"],
  ["records-request", "public-records-request", "Public Records Request", "/workflows/public-records-request", "planned"],
  ["records-request", "open-records-request", "Open Records Request", "/workflows/open-records-request", "planned"],
  ["records-request", "foia-request", "FOIA Request", "/workflows/foia-request", "planned"],
  ["records-request", "court-records-request", "Court Records Request", "/workflows/court-records-request", "planned"],
  ["records-request", "arrest-records-request", "Arrest Records Request", "/workflows/arrest-records-request", "planned"],
  ["records-request", "birth-records-request", "Birth Records Request", "/workflows/birth-records-request", "planned"],
  ["records-request", "marriage-records-request", "Marriage Records Request", "/workflows/marriage-records-request", "planned"],
  ["records-request", "property-records-request", "Property Records Request", "/workflows/property-records-request", "planned"],
  ["records-request", "permit-records-request", "Permit Records Request", "/workflows/permit-records-request", "planned"],
  ["code-enforcement", "code-enforcement-notice", "Respond to a Code Enforcement Notice", "/code-enforcement/respond-to-notice", "scaffolded"],
  ["tenant-reply", "tenant-notice-response", "Respond to a Tenant Notice", "/workflows/tenant-notice-response", "planned"],
  ["tenant-reply", "tenant-eviction-response", "Respond to an Eviction Notice", "/workflows/tenant-eviction-response", "functional"],
  ["tenant-reply", "tenant-repair-demand", "Respond to a Repair Demand or Habitability Issue", "/workflows/tenant-repair-demand", "functional"],
  ["claim-proof", "claim-proof-package", "Build a Claim Proof Package", "/workflows/claim-proof-package", "functional"],
  ["permit-reply", "permit-denial-response", "Respond to a Permit Denial", "/workflows/permit-denial-response", "functional"],
];

const localWorkflows: StudioCatalogWorkflow[] = workflowList.map((workflow) => ({
  id: workflow.id,
  verticalId: "private-office",
  title: workflow.title,
  description: workflow.description,
  publicPath: `/workflows/${workflow.id}`,
  status: "gold",
}));

export const studioCatalog: StudioCatalogWorkflow[] = [
  ...localWorkflows,
  ...registeredWorkflowRows.map(([verticalId, id, title, publicPath, status]) => ({
    id,
    verticalId,
    title,
    publicPath,
    status,
    description: `${title} is registered in the MailMyPDF workflow catalog.`,
  })),
];

export function workflowsForVertical(verticalId: string): StudioCatalogWorkflow[] {
  return studioCatalog.filter((workflow) => workflow.verticalId === verticalId);
}

export function findStudioVertical(verticalId: string): StudioVertical | undefined {
  return studioVerticals.find((vertical) => vertical.id === verticalId);
}
