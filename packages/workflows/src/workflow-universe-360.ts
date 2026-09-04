/**
 * MailMyPDF workflow planning universe.
 * Keyword-informed catalog target: 30 workflows per product family.
 * This is the planning/source catalog; execution maturity remains independent.
 */

export type WorkflowUniverseFamily = {
  id: string;
  name: string;
  defaultPipeline: string;
  workflows: readonly string[];
};

export const WORKFLOW_UNIVERSE_360: readonly WorkflowUniverseFamily[] = [
  { id: "mail", name: "MailMyPDF Core", defaultPipeline: "P01_CORE_MAIL", workflows: [
    "Mail a PDF","Mail a Document","Send a Letter Online","Write and Mail a Letter","Send a Physical Letter Online","Send Certified Mail Online","Send a Certified Letter Online","Send Registered Mail Online","Send Mail Without Going to the Post Office","Mail From Home","Print and Mail a PDF","Print and Mail a Letter","Send Documents by Mail","Send Important Documents by Mail","Send Legal Documents by Mail","Send Tax Documents by Mail","Send Business Documents by Mail","Send a Letter With Return Receipt","Send Certified Mail With Return Receipt","Proof of Mailing","Proof of Delivery","Proof of Service","Mailing With Tracking","Address Verification and Mailing","Letter to Future Self","Reusable Letter Templates","Bulk Document Mailing","Mail Again / Reorder","Secure Document Mailing","Document Mailing Record"
  ] },
  { id: "appeal", name: "Appeal Mail", defaultPipeline: "P03_APPEAL", workflows: [
    "Appeal a Denied Claim","Appeal a Government Decision","Request Reconsideration","Appeal an Insurance Claim Denial","Appeal an Insurance Coverage Denial","Respond to an Insurance Denial Letter","Appeal a Medical Insurance Denial","Appeal a Medical Necessity Denial","Appeal a Prior Authorization Denial","Appeal an Out-of-Network Denial","Appeal a Timely Filing Denial","Appeal a Dental Insurance Denial","Appeal a Car Insurance Claim","Appeal a Life Insurance Denial","Appeal a Medicare Claim Denial","Appeal an SSDI Denial","Appeal an SSI Denial","Appeal a Social Security Decision","Appeal a Social Security Overpayment","Appeal a Medicaid Denial","Appeal an Unemployment Denial","Appeal an EDD Disqualification","Appeal a Financial Aid Decision","SAP Appeal","Financial Aid Suspension Appeal","Financial Aid Reinstatement","FAFSA / Special Circumstances Appeal","Scholarship Appeal","License Suspension Appeal","DMV Suspension / Revocation Appeal"
  ] },
  { id: "notice", name: "Notice Respond", defaultPipeline: "P02_OFFICIAL_RESPONSE", workflows: [
    "IRS Notice Response","CP2000 Response","CP90 / Collection Notice Response","CP504 Response","CP3219A Response","IRS Audit Letter Response","IRS 30-Day Letter Response","IRS Income Tax Notice Response","IRS Penalty Notice Response","IRS Balance Due Notice Response","IRS Underreporter Notice Response","IRS Identity / Information Notice Response","Agency Action Response","Government Notice Response","State Tax Notice Response","State Revenue Department Notice Response","Court Summons Response","Civil Summons Response","Administrative Hearing Notice Response","Licensing Notice Response","Benefits Notice Response","Unemployment Notice Response","Compliance Notice Response","Regulatory Deficiency Notice Response","Document Request Response","Evidence Request Response","Deadline Extension Request","Notice Disagreement Response","Appeal After Notice","Follow-Up After Notice Submission"
  ] },
  { id: "immigration", name: "Immigration Mail", defaultPipeline: "P05_IMMIGRATION", workflows: [
    "USCIS RFE Response","Respond to an Immigration Notice","Response to Request for Evidence","RFE Response Letter","RFE Cover Letter","Medical RFE Response","I-485 RFE Response","I-140 RFE Response","H-1B RFE Response","L-1 RFE Response","N-400 RFE Response","EB-1 RFE Response","NIW RFE Response","Submit Supporting Documents to USCIS","USCIS Evidence Submission","USCIS Explanation Letter","USCIS Missing Evidence Response","USCIS Notice of Intent Response","Notice of Intent to Deny Response","Notice of Intent to Revoke Response","Request for Reconsideration","Case Evidence Package","Immigration Affidavit Package","Translation / Certified Translation Package","Immigration Filing Cover Letter","Supplemental Evidence Submission","Biometrics / Appointment Correspondence","Immigration Deadline Response","USCIS Follow-Up After Submission","Immigration Mailing and Proof Package"
  ] },
  { id: "dispute", name: "Dispute Mail", defaultPipeline: "P06_DISPUTE", workflows: [
    "Debt Collection Dispute","Dispute a Collection Agency","Debt Dispute","Debt Validation","Dispute a Collection Account","Dispute Collections on Credit Report","Credit Report Error Dispute","Credit Report Collections Dispute","Hard Inquiry Dispute","Charge-Off Dispute","Medical Collections Dispute","Medical Debt Dispute","Student Loan Account Dispute","Credit Card Billing Dispute","Unauthorized Charge Dispute","Billing Error Dispute","Subscription Charge Dispute","Service Contract Dispute","Insurance Billing Dispute","Insurance Payment Dispute","Dispute With Creditor","Dispute With Debt Buyer","Dispute With Collection Agency","Credit Bureau Dispute Package","Follow-Up on Unanswered Dispute","Escalate an Unresolved Dispute","Cease Contact Request","Debt Communication Documentation","FDCPA Dispute","Consumer Evidence Package"
  ] },
  { id: "business", name: "Small Business Mail", defaultPipeline: "P07_BUSINESS", workflows: [
    "Payment Reminder","Final Payment Reminder","Past-Due Invoice Notice","Payment Demand","Unpaid Invoice Letter","Collection Letter","Final Demand for Payment","Account Balance Notice","Contract Renewal Notice","Contract Nonrenewal Notice","Contract Change Notice","Customer Dispute Response","Customer Complaint Response","Refund Response","Service Cancellation Response","Late Payment Notice","Terms Violation Notice","Compliance Notice","Vendor Dispute Response","Vendor Payment Dispute","Change-of-Address Notice","Business Policy Update","Price Increase Notice","Service Interruption Notice","Appointment / Scheduling Notice","Insurance Certificate Request","Business Records Request","Vendor Documentation Request","Cease-and-Desist Business Correspondence","General Formal Business Letter"
  ] },
  { id: "records", name: "Records Request", defaultPipeline: "P08_RECORDS", workflows: [
    "Public Records Request","FOIA Request","FOIA Police Records Request","Police Report Request","Police Records Request","Police Report Copy Request","Court Records Request","Criminal Records Request","Criminal History Request","Arrest Records Request","Background Check Records Request","Birth Records Request","Birth Certificate Request","Marriage Records Request","Divorce Records Request","Death Records Request","Military Records Request","Medical Records Request","Employment Records Request","Education Records Request","School Records Request","Public Information Request","Open Records Request","Agency Records Request","Government Documents Request","Permit Records Request","Property Records Request","Code Enforcement Records Request","Records Follow-Up Request","Records Denial / Appeal Request"
  ] },
  { id: "tenant", name: "Tenant Reply", defaultPipeline: "P09_REGULATORY", workflows: [
    "Tenant Response to Landlord","Tenant Notice Response","Security Deposit Dispute","Security Deposit Demand","Security Deposit Response","Repair Request","Unresolved Repair Follow-Up","Habitability Complaint","Rent Increase Response","Late Fee Dispute","Lease Violation Response","Lease Termination Response","Eviction Notice Response","Pay-or-Quit Response","Cure-or-Quit Response","Notice to Enter Response","Unauthorized Entry Complaint","Utility Billing Dispute","Maintenance Neglect Response","Mold / Water Damage Notice","Property Damage Dispute","Landlord Damage Claim Response","Move-Out Dispute","Move-Out Charges Dispute","Lease Renewal Response","Lease Amendment Response","Landlord Communication Documentation","Tenant Evidence Package","Tenant Demand Letter","Housing Agency Complaint Response"
  ] },
  { id: "permit", name: "Permit Reply", defaultPipeline: "P09_REGULATORY", workflows: [
    "Building Permit Response","Building Permit Correction Response","Building Permit Denial Response","Construction Permit Response","Residential Building Permit","Commercial Building Permit","Electrical Permit Response","Plumbing Permit Response","Mechanical Permit Response","HVAC Permit Response","Roofing Permit Response","Reroof Permit Response","Fence Permit Response","Deck Permit Response","Demolition Permit Response","Temporary Structure Permit","Temporary Use Permit","Zoning Permit Response","Site Development Permit","Land Development Permit","Utility Permit Response","Certificate of Occupancy Response","Occupancy Permit Response","Nonconforming Use Permit","Permit Deficiency Response","Permit Document Submission","Permit Evidence Package","Permit Status / Tracking Request","Permit Reconsideration","Permit Appeal / Administrative Response"
  ] },
  { id: "benefits", name: "Benefits Appeal", defaultPipeline: "P03_APPEAL", workflows: [
    "SSI Appeal","SSI Denial Appeal","SSI Reconsideration","SSI Overpayment Appeal","SSDI Appeal","SSDI Denial Appeal","SSDI Reconsideration","SSDI Appeals Council","Social Security Decision Appeal","Social Security Overpayment Appeal","Social Security Non-Medical Appeal","Unemployment Appeal","Unemployment Denial Appeal","Unemployment Disqualification Appeal","Unemployment Overpayment Appeal","EDD Appeal","EDD Disqualification Appeal","SNAP Appeal","Food Stamp Appeal","Medicaid Appeal","Medicaid Denial Appeal","VA Claim Appeal","Workers' Compensation Appeal","Disability Claim Appeal","Benefits Reconsideration","Appeals Council Preparation","Benefits Evidence Package","Benefits Deadline Response","Benefits Hearing Preparation","Benefits Supporting-Document Submission"
  ] },
  { id: "claim", name: "Claim Proof", defaultPipeline: "P10_CLAIM_PROOF", workflows: [
    "Insurance Claim Documentation","Medical Insurance Claim Package","Health Insurance Claim Package","Medicare Claim Package","Dental Claim Package","Vision Claim Package","Disability Claim Evidence Package","Life Insurance Claim Package","Auto Insurance Claim Package","Home Insurance Claim Package","Property Damage Claim Package","Accident Claim Package","Travel Claim Package","Short-Term Disability Claim Package","Long-Term Disability Claim Package","Hospital Indemnity Claim Package","Reimbursement Claim Package","Claim Supporting Documents","Claim Proof Package","Claim Timeline Package","Claim Evidence Checklist","Claim Denial Evidence Package","Claim Reconsideration Package","Claim Appeal Evidence Package","Provider Claim Submission Package","Medical Necessity Evidence Package","Prior Authorization Evidence Package","Out-of-Network Evidence Package","Claim Follow-Up Package","Claim Record / Proof-of-Submission Package"
  ] },
];

export const WORKFLOW_UNIVERSE_COUNT = WORKFLOW_UNIVERSE_360.reduce((sum, family) => sum + family.workflows.length, 0);

export function slugifyWorkflowTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function listWorkflowUniverse() {
  return WORKFLOW_UNIVERSE_360.flatMap((family) =>
    family.workflows.map((title) => ({
      workflowId: `${family.id}-${slugifyWorkflowTitle(title)}`,
      vertical: family.id,
      title,
      pipeline: family.defaultPipeline,
      canonicalPath: `/${family.id}/${slugifyWorkflowTitle(title)}`,
    })),
  );
}
