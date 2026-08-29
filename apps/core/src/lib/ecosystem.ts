export type EcosystemCapability = "ai" | "voice" | "research" | "documents" | "mailing";

export type EcosystemWorkflow = {
  slug: string;
  title: string;
  searchIntent: string;
  description: string;
};

export type EcosystemVertical = {
  slug: string;
  title: string;
  label: string;
  description: string;
  href: string;
  capabilities: EcosystemCapability[];
  requiresAccount: boolean;
  workflows: EcosystemWorkflow[];
};

export type PlatformEntitlement = {
  plan: "free" | "plus" | "pro";
  workflowsIncluded: number;
  workflowsUsed: number;
};

export const ECOSYSTEM_VERTICALS: EcosystemVertical[] = [
  {
    slug: "appeal-reply",
    title: "Appeal & Reply",
    label: "Advanced Appeal Workflow",
    description: "A master workspace for decisions, reconsiderations, appeals, evidence, deadlines, and formal replies.",
    href: "https://appeal-mail.pages.dev/",
    capabilities: ["ai", "documents", "mailing"],
    requiresAccount: true,
    workflows: [
      { slug: "appeal-a-decision", title: "Appeal a decision", searchIntent: "appeal a government decision", description: "Turn a decision and supporting records into a structured appeal workflow." },
      { slug: "denied-benefits", title: "Appeal denied benefits", searchIntent: "appeal denied benefits", description: "Organize the denial, deadline, evidence, and appeal response." },
      { slug: "reconsideration", title: "Request reconsideration", searchIntent: "reconsideration request letter", description: "Prepare a focused reconsideration request from source documents." },
      { slug: "appeal-letter", title: "Write an appeal letter", searchIntent: "write an appeal letter", description: "Draft, review, and revise a formal appeal before mailing." }
    ]
  },
  {
    slug: "notice-respond",
    title: "Notice Respond",
    label: "Advanced Notice Workflow",
    description: "A master workspace for official notices, deadlines, requested actions, evidence, research, and responses.",
    href: "https://notice-respond.pages.dev",
    capabilities: ["ai", "documents", "research", "mailing"],
    requiresAccount: true,
    workflows: [
      { slug: "government-notice", title: "Respond to a government notice", searchIntent: "respond to government notice", description: "Understand the notice, identify what is being requested, and prepare a response." },
      { slug: "tax-notice", title: "Respond to a tax notice", searchIntent: "respond to tax notice", description: "Organize the notice, dates, records, and response requirements." },
      { slug: "code-enforcement", title: "Respond to a code enforcement notice", searchIntent: "respond to code enforcement notice", description: "Build a notice-driven response around property facts, evidence, and deadlines." },
      { slug: "permit-correction", title: "Respond to a permit correction", searchIntent: "respond to permit correction notice", description: "Turn correction comments into a tracked, point-by-point response." },
      { slug: "dmv-notice", title: "Respond to a DMV notice", searchIntent: "respond to DMV notice", description: "Organize the notice, deadlines, supporting documents, and next response step." },
      { slug: "benefits-notice", title: "Respond to a benefits notice", searchIntent: "respond to benefits notice", description: "Understand an agency notice and prepare the appropriate written response." }
    ]
  },
  {
    slug: "immigration-mail",
    title: "Immigration Mail",
    label: "Immigration Workflow",
    description: "A master workspace for USCIS notices, RFE and NOID responses, immigration records requests, refusals, supporting letters, review, and mailing with proof.",
    href: "https://immigration-mail.pages.dev",
    capabilities: ["ai", "documents", "research", "mailing"],
    requiresAccount: true,
    workflows: [
      { slug: "i-797-notice", title: "Understand an I-797 / I-797C", searchIntent: "i 797", description: "Understand a USCIS Notice of Action and determine the next document-driven step." },
      { slug: "rfe-response", title: "Respond to an RFE", searchIntent: "responding to rfe", description: "Organize requested evidence and prepare a reviewable USCIS RFE response." },
      { slug: "noid-response", title: "Respond to a NOID", searchIntent: "notice of intent to deny uscis", description: "Preserve the stated concerns, evidence, and response record for a USCIS NOID." },
      { slug: "uscis-denial-rejection", title: "Respond to a USCIS denial or rejection", searchIntent: "rejection notice uscis", description: "Understand the decision and organize the appropriate response or review path." },
      { slug: "uscis-foia", title: "USCIS FOIA request", searchIntent: "foia uscis", description: "Prepare and mail a USCIS immigration records request." },
      { slug: "eoir-foia", title: "EOIR FOIA request", searchIntent: "eoir foia", description: "Prepare an immigration-court records request with case identifiers." },
      { slug: "ice-foia", title: "ICE FOIA request", searchIntent: "ice foia request", description: "Prepare a focused ICE records request with identity and case information." },
      { slug: "g-639-records", title: "G-639 records request", searchIntent: "g 639 uscis", description: "Organize an immigration records request using the relevant G-639 information." },
      { slug: "i-130-response", title: "I-130 notice response", searchIntent: "intent to deny i 130", description: "Prepare a source-linked I-130 RFE, NOID, or decision response." },
      { slug: "i-140-rfe-response", title: "I-140 RFE response", searchIntent: "i 140 rfe response", description: "Map an I-140 RFE to supporting evidence and a reviewable cover letter." },
      { slug: "i-485-rfe-response", title: "I-485 RFE response", searchIntent: "i 485 rfe response time", description: "Organize an I-485 RFE response package and preserve the notice deadline." },
      { slug: "n-400-rfe-response", title: "N-400 RFE response", searchIntent: "n400 rfe response time", description: "Prepare a reviewable naturalization evidence response." },
      { slug: "i-751-noid", title: "I-751 notice / NOID", searchIntent: "i 751 denied notice to appear", description: "Organize an I-751 case notice, evidence, and response workflow." },
      { slug: "visa-refusal-response", title: "Visa refusal response", searchIntent: "appeal letter for visa", description: "Prepare a reviewable response after an immigration visa refusal." },
      { slug: "immigration-appeal-letter", title: "Immigration appeal letter", searchIntent: "immigration appeal letter", description: "Prepare an immigration appeal or reconsideration letter from verified facts." },
      { slug: "supporting-evidence-letter", title: "Supporting evidence letter", searchIntent: "immigration explanation letter", description: "Prepare an explanation or supporting-evidence letter for an immigration submission." }
    ]
  },
  {
    slug: "records-request",
    title: "Records Request",
    label: "Public Records Workflow",
    description: "A master workspace for FOIA, state and local public-records requests, agency records, evidence, review, and certified mailing with proof.",
    href: "/records-request",
    capabilities: ["ai", "documents", "research", "mailing"],
    requiresAccount: true,
    workflows: [
      { slug: "federal-foia", title: "Federal FOIA request", searchIntent: "file a federal FOIA request", description: "Prepare a federal FOIA request with the right agency, record scope, and review warnings." },
      { slug: "state-public-records", title: "State public records request", searchIntent: "state public records request", description: "Prepare a state public-records request while keeping state-specific timing and fee rules explicit." },
      { slug: "local-government-records", title: "Local government records", searchIntent: "local government public records request", description: "Target a city, county, district, or local custodian with a specific records request." },
      { slug: "police-incident-records", title: "Police incident records", searchIntent: "police incident report records request", description: "Request incident reports and related law-enforcement records with privacy and exemption warnings." },
      { slug: "body-camera-records", title: "Body-camera / video records", searchIntent: "body camera footage public records request", description: "Request government-held video with precise incident, time, and location details." },
      { slug: "911-dispatch-records", title: "911 / dispatch records", searchIntent: "911 call records request", description: "Request 911 audio, CAD logs, and dispatch records with a narrow time and location scope." },
      { slug: "public-employee-records", title: "Public employee records", searchIntent: "public employee records request", description: "Prepare a request for public employee records while flagging personnel-privacy limits." },
      { slug: "procurement-contract-records", title: "Procurement & contract records", searchIntent: "government contract records request", description: "Request bids, contracts, amendments, invoices, and procurement records." },
      { slug: "permits-licenses-records", title: "Permits, licenses & inspections", searchIntent: "permit records request", description: "Request permits, inspections, code-enforcement, or licensing records from the responsible custodian." },
      { slug: "property-assessment-records", title: "Property & assessment records", searchIntent: "property assessment records request", description: "Request assessment, appraisal, parcel, and property-history records." },
      { slug: "education-school-records", title: "Education & school records", searchIntent: "school district public records request", description: "Request public education records while respecting student privacy constraints." },
      { slug: "environmental-records", title: "Environmental & regulatory records", searchIntent: "environmental records request", description: "Request permits, compliance, inspection, monitoring, and enforcement records." },
      { slug: "election-records", title: "Election & campaign records", searchIntent: "election records request", description: "Request public election administration or campaign-finance records from the likely custodian." },
      { slug: "immigration-foia-pa", title: "Immigration FOIA / Privacy Act", searchIntent: "immigration FOIA request", description: "Prepare an immigration records request with identity, authorization, and agency-specific cautions." },
      { slug: "court-judicial-records", title: "Court & judicial records", searchIntent: "court records request", description: "Request public judicial or court-administration records while checking for existing public access channels." }
    ]
  },
  {
    slug: "private-office",
    title: "Private Office",
    label: "Professional Correspondence",
    description: "A master workspace for high-stakes correspondence — contractor disputes, property insurance claims, bank and wire transfer disputes, trust beneficiary notices, and security deposit disputes with evidence, approval gates, and certified mailing.",
    href: "https://mycomind4-arch-mailmypdf-private-office.pages.dev/",
    capabilities: ["ai", "documents", "research", "mailing"],
    requiresAccount: true,
    workflows: [
      { slug: "contractor-dispute", title: "Contractor dispute", searchIntent: "contractor dispute letter", description: "Document defective or incomplete work, billing disputes, or breach of agreement with a professional dispute letter." },
      { slug: "property-insurance-claim", title: "Property insurance claim", searchIntent: "property insurance claim letter", description: "Document and pursue denied claims, underpayments, or disputed scope with evidence and chronology." },
      { slug: "bank-wire-dispute", title: "Bank & wire transfer dispute", searchIntent: "bank wire transfer dispute letter", description: "Document unauthorized wires, mistaken transfers, or disputed transactions with transaction records." },
      { slug: "trust-beneficiary-notice", title: "Trust beneficiary notice", searchIntent: "trust beneficiary letter", description: "Request information, accounting, or distribution status from a trustee with evidence." },
      { slug: "security-deposit-dispute", title: "Security deposit dispute", searchIntent: "security deposit dispute letter", description: "Document non-return, partial return, or unauthorized deductions from your deposit." }
    ]
  },
  {
    slug: "dispute-mail",
    title: "Dispute Mail",
    label: "Consumer Dispute Workflow",
    description: "A master workspace for credit report disputes, debt validation requests, billing errors, and unauthorized charges — with deadline awareness, certified mailing, and proof of timely submission.",
    href: "https://dispute-mail.pages.dev",
    capabilities: ["ai", "documents", "mailing"],
    requiresAccount: true,
    workflows: [
      { slug: "credit-report-dispute", title: "Dispute a credit report error", searchIntent: "dispute credit report error", description: "Dispute inaccurate items on your credit report with Equifax, Experian, or TransUnion under the FCRA." },
      { slug: "debt-validation", title: "Request debt validation", searchIntent: "debt validation letter", description: "Request validation of a debt from a collector under the FDCPA within 30 days of first contact." },
      { slug: "billing-error-dispute", title: "Dispute a billing error", searchIntent: "billing error dispute letter", description: "Dispute a medical billing error, utility overcharge, or incorrect service charge with the provider." },
      { slug: "unauthorized-charge-dispute", title: "Dispute an unauthorized charge", searchIntent: "unauthorized charge dispute letter", description: "Dispute an unauthorized or fraudulent charge with your card issuer or bank in writing." }
    ]
  },
  {
    slug: "small-business-mail",
    title: "Small Business Mail",
    label: "Business Correspondence OS",
    description: "A master workspace for business correspondence — create, schedule, track, and prove the documents your business sends with team approvals, templates, automation, and a permanent proof archive.",
    href: "https://mycomind4-arch-mailmypdf-smallbusiness.pages.dev/",
    capabilities: ["ai", "documents", "mailing"],
    requiresAccount: true,
    workflows: [
      { slug: "payment-reminder", title: "Payment reminder", searchIntent: "payment reminder letter", description: "Schedule and mail professional payment reminders with tracking and proof." },
      { slug: "contract-renewal", title: "Contract renewal", searchIntent: "contract renewal letter", description: "Prepare and mail contract renewal notices with certified mail and proof of delivery." },
      { slug: "past-due-notice", title: "Past-due notice", searchIntent: "past due notice letter", description: "Send formal past-due notices with tracking and a permanent mailing record." },
      { slug: "business-certificate", title: "Business certificate mailing", searchIntent: "mail business documents", description: "Mail certificates, licenses, and official business documents with proof of delivery." }
    ]
  },
  {
    slug: "mail-pdf",
    title: "Mail a PDF",
    label: "Mailing",
    description: "The shared delivery workflow for turning a finished document into physical U.S. mail with tracking and proof.",
    href: "/send",
    capabilities: ["mailing"],
    requiresAccount: false,
    workflows: [
      { slug: "certified-mail", title: "Send certified mail", searchIntent: "send certified mail online", description: "Prepare and mail a document with Certified Mail." },
      { slug: "registered-mail", title: "Send registered mail", searchIntent: "send registered mail online", description: "Prepare and mail a document using Registered Mail." },
      { slug: "print-and-mail", title: "Print and mail a PDF", searchIntent: "print and mail PDF online", description: "Upload a finished PDF and have it printed and mailed without a printer." },
      { slug: "mail-proof", title: "Keep mailing proof", searchIntent: "proof of mailing", description: "Keep the order, mailing status, tracking information, and available proof together." }
    ]
  }
];

export function getPlatformEntitlement(): PlatformEntitlement {
  return { plan: "free", workflowsIncluded: 30, workflowsUsed: 0 };
}

export function getRemainingWorkflows(entitlement: PlatformEntitlement) {
  return Math.max(0, entitlement.workflowsIncluded - entitlement.workflowsUsed);
}
