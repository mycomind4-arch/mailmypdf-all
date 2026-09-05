export type PublicVerticalId =
  | "appeal-mail"
  | "benefits-appeal"
  | "claim-proof"
  | "code-enforcement"
  | "dispute-mail"
  | "immigration-mail"
  | "insurance-claims"
  | "notice-respond"
  | "permit-reply"
  | "private-office"
  | "records-request"
  | "small-business"
  | "tenant-reply";

export type PublicVerticalCategory = {
  label: string;
  terms: string[];
};

export type PublicVerticalConfig = {
  id: PublicVerticalId;
  path: `/${string}`;
  product: string;
  verticalKeys: string[];
  eyebrow: string;
  heroTitle: string;
  description: string;
  directoryDescription: string;
  helperTitle: string;
  helperDescription: string;
  categories: PublicVerticalCategory[];
  steps: Array<{ title: string; description: string }>;
};

export const PUBLIC_VERTICALS: readonly PublicVerticalConfig[] = [
  {
    id: "appeal-mail",
    path: "/appeal-mail",
    product: "Appeal Mail",
    verticalKeys: ["appeal"],
    eyebrow: "Appeals · reconsiderations · adverse decisions",
    heroTitle: "Turn a denial into a clear appeal plan.",
    description:
      "Start with the decision you received. Understand the stated reasons, organize the record and supporting evidence, prepare a reviewable response, and keep the final packet and available mailing proof together.",
    directoryDescription:
      "Browse appeal guides for insurance, disability, benefits, financial aid, licensing, administrative decisions, and other adverse determinations.",
    helperTitle: "Not sure what kind of appeal you have?",
    helperDescription: "Start with the denial, determination, or decision letter. The document usually identifies the agency, issue, deadline, and next review path.",
    categories: [
      { label: "Insurance & health", terms: ["insurance", "medical", "dental", "network", "authorization", "claim"] },
      { label: "Benefits & disability", terms: ["ssdi", "ssi", "social security", "medicaid", "unemployment", "benefit", "veteran"] },
      { label: "Financial aid", terms: ["financial aid", "fafsa", "scholarship", "sap"] },
      { label: "Licensing & DMV", terms: ["license", "dmv", "registration", "suspension", "revocation"] },
      { label: "General appeals", terms: ["appeal", "reconsideration", "government", "court"] },
    ],
    steps: [
      { title: "Start with the decision", description: "Use the denial, determination, or adverse decision as the source document." },
      { title: "Map reasons and deadlines", description: "Separate what the decision says from assumptions and identify the controlling instructions." },
      { title: "Organize the record", description: "Collect the evidence, prior correspondence, and facts that directly address the stated reasons." },
      { title: "Prepare and preserve", description: "Build a reviewable response and keep the approved packet with available mailing or submission proof." },
    ],
  },
  {
    id: "benefits-appeal",
    path: "/benefits-appeal",
    product: "Benefits Appeal",
    verticalKeys: ["benefits"],
    eyebrow: "Benefits decisions · reconsideration · hearings",
    heroTitle: "Build a benefits appeal around the actual decision record.",
    description:
      "Use the notice or determination as the source of truth, identify the stated basis and review path, organize supporting records, and prepare a response without inventing eligibility rules or deadlines.",
    directoryDescription: "Browse benefits appeal, reconsideration, documentation, and hearing-preparation guides.",
    helperTitle: "Start from the benefits notice",
    helperDescription: "The notice generally tells you what changed, why, which program issued the decision, and what review options are available.",
    categories: [
      { label: "Denials", terms: ["denial", "denied"] },
      { label: "Reconsideration", terms: ["reconsideration", "review"] },
      { label: "Documentation", terms: ["documentation", "evidence", "record"] },
      { label: "Hearings", terms: ["hearing"] },
      { label: "All benefits", terms: ["benefit", "appeal"] },
    ],
    steps: [
      { title: "Read the determination", description: "Capture the program, decision, stated basis, effective date, and review instructions." },
      { title: "Check the record", description: "Identify missing, outdated, or misunderstood information relevant to the stated decision." },
      { title: "Organize support", description: "Gather records and explanations that directly address the issue under review." },
      { title: "Prepare the review packet", description: "Keep the final response, exhibits, submission details, and available proof together." },
    ],
  },
  {
    id: "claim-proof",
    path: "/claim-proof",
    product: "Claim Proof",
    verticalKeys: ["claim"],
    eyebrow: "Evidence · chronology · claim documentation",
    heroTitle: "Turn scattered claim evidence into a traceable record.",
    description:
      "Organize what happened, what was submitted, what the other side said, and what evidence supports the claim so the next letter, appeal, or submission starts from a controlled record.",
    directoryDescription: "Browse evidence-first claim documentation and submission-package guides.",
    helperTitle: "Start with the claim record you already have",
    helperDescription: "A useful claim file usually begins with the claim or decision document, a chronology, supporting evidence, prior submissions, and proof of what was sent.",
    categories: [
      { label: "Evidence packages", terms: ["evidence", "proof"] },
      { label: "Documentation", terms: ["documentation", "record"] },
      { label: "Submission packages", terms: ["submission", "package"] },
      { label: "All claims", terms: ["claim"] },
    ],
    steps: [
      { title: "Define the claim", description: "Identify the event, requested outcome, parties, dates, and controlling source documents." },
      { title: "Build the chronology", description: "Place correspondence, decisions, payments, losses, and evidence in a verifiable sequence." },
      { title: "Close evidence gaps", description: "Separate what is proven, what is disputed, and what still needs support." },
      { title: "Preserve the package", description: "Keep the approved submission and available mailing or delivery proof with the record." },
    ],
  },
  {
    id: "code-enforcement",
    path: "/code-enforcement",
    product: "Code Enforcement",
    verticalKeys: ["code-enforcement"],
    eyebrow: "Notices · inspections · compliance · hearings",
    heroTitle: "Respond to code enforcement from the document and the record.",
    description:
      "Understand the notice, allegations, inspection history, requested action, and deadline before preparing correspondence, evidence, access responses, hearing material, or follow-up documentation.",
    directoryDescription: "Browse code-enforcement guides for notices, inspections, evidence, compliance, hearings, citations, penalties, status requests, and records.",
    helperTitle: "Start with the notice or inspection document",
    helperDescription: "Keep the exact allegations, property identifiers, dates, requested action, contact information, and stated deadline tied to the source document.",
    categories: [
      { label: "Notices & violations", terms: ["notice", "violation", "warning", "order"] },
      { label: "Inspections & access", terms: ["inspection", "access", "warrant", "search"] },
      { label: "Evidence & compliance", terms: ["evidence", "compliance", "correction", "abatement", "photo"] },
      { label: "Hearings & appeals", terms: ["hearing", "appeal", "review"] },
      { label: "Citations & penalties", terms: ["citation", "penalty", "fine", "fee"] },
      { label: "Status & records", terms: ["status", "record", "request", "case"] },
    ],
    steps: [
      { title: "Preserve the notice", description: "Capture the allegations, cited provisions, property information, requested action, and deadline exactly as issued." },
      { title: "Build the property record", description: "Organize inspection history, photographs, permits, correspondence, ownership information, and relevant facts." },
      { title: "Choose the response path", description: "Distinguish clarification, correction, evidence submission, access, hearing, appeal, or records needs." },
      { title: "Keep proof", description: "Review the exact response before sending and preserve the packet with available delivery evidence." },
    ],
  },
  {
    id: "dispute-mail",
    path: "/dispute-mail",
    product: "Dispute Mail",
    verticalKeys: ["dispute"],
    eyebrow: "Credit · debt · billing · consumer disputes",
    heroTitle: "Build a dispute that can be reviewed line by line.",
    description:
      "Start with the account, report, bill, charge, collection notice, or prior response. Organize the disputed facts and supporting documents before preparing correspondence and preserving what was sent.",
    directoryDescription: "Browse dispute guides for debt and collections, credit reports, billing and transactions, and follow-up escalation.",
    helperTitle: "Not sure which dispute fits?",
    helperDescription: "Start with the document showing the problem: a credit report, collection letter, statement, invoice, transaction record, or prior response.",
    categories: [
      { label: "Debt & collections", terms: ["debt", "collection", "collector", "fdcpa", "medical collections"] },
      { label: "Credit reports", terms: ["credit report", "equifax", "experian", "transunion", "inquiry", "charge-off", "fcra"] },
      { label: "Billing & transactions", terms: ["billing", "charge", "subscription", "transaction", "service contract", "payment"] },
      { label: "Follow-up & escalation", terms: ["follow up", "response", "escalat", "cease"] },
    ],
    steps: [
      { title: "Identify the disputed item", description: "Pin the issue to the exact account, report entry, bill, transaction, or communication." },
      { title: "Separate facts from conclusions", description: "Record what the source documents show and what specifically is disputed." },
      { title: "Attach the right support", description: "Use statements, reports, receipts, contracts, correspondence, or identity records that directly support the dispute." },
      { title: "Send and preserve", description: "Review the final correspondence and retain the packet with available mailing and response records." },
    ],
  },
  {
    id: "immigration-mail",
    path: "/immigration-mail",
    product: "Immigration Mail",
    verticalKeys: ["immigration"],
    eyebrow: "USCIS notices · evidence · records · correspondence",
    heroTitle: "Prepare immigration correspondence from verified source material.",
    description:
      "Use the actual notice, request, receipt, decision, or records need to organize facts and evidence. Preserve form numbers, receipt numbers, dates, instructions, and response boundaries instead of guessing from a generic template.",
    directoryDescription: "Browse immigration guides for notices, RFEs, NOIDs, petition and application correspondence, visa matters, records requests, and supporting letters.",
    helperTitle: "Start with the immigration document",
    helperDescription: "Identify the issuing agency, form or notice type, receipt or case number, date, requested action, and any response instructions shown on the document.",
    categories: [
      { label: "USCIS notices", terms: ["uscis", "i-797", "notice"] },
      { label: "RFE & NOID", terms: ["rfe", "noid", "intent to deny", "evidence"] },
      { label: "Petitions & applications", terms: ["i-130", "i-140", "i-485", "i-751", "n-400"] },
      { label: "Visa & consular", terms: ["visa", "consular", "refusal"] },
      { label: "FOIA & records", terms: ["foia", "g-639", "eoir", "ice", "record"] },
    ],
    steps: [
      { title: "Identify the document", description: "Preserve the agency, form or notice type, receipt number, date, and requested action." },
      { title: "Map each request", description: "Break requests or concerns into separate items instead of answering from memory." },
      { title: "Match evidence to the record", description: "Organize only verified facts and supporting documents relevant to each item." },
      { title: "Review the packet", description: "Confirm names, identifiers, dates, exhibits, instructions, and the exact final package before submission or mailing." },
    ],
  },
  {
    id: "insurance-claims",
    path: "/insurance-claims",
    product: "Insurance Claims",
    verticalKeys: ["insurance", "insurance-claims"],
    eyebrow: "Claims · denials · underpayments · evidence",
    heroTitle: "Build the insurance claim record before the next response.",
    description:
      "Keep the policy or plan material, claim documents, loss evidence, estimates, correspondence, and insurer decision connected so claim submissions, disputes, supplements, and appeals are grounded in the record.",
    directoryDescription: "Browse insurance claim guides for new claims, denials, property losses, health and disability decisions, underpayments, supplemental claims, and total-loss disputes.",
    helperTitle: "Start with the claim or decision document",
    helperDescription: "The strongest starting point is the actual claim acknowledgment, explanation, estimate, denial, coverage decision, or payment record plus the supporting evidence behind it.",
    categories: [
      { label: "Start a claim", terms: ["new claim", "homeowners", "auto claim", "renters", "commercial"] },
      { label: "Denials & appeals", terms: ["denied", "denial", "appeal", "coverage"] },
      { label: "Health & disability", terms: ["medical", "health", "disability", "prior auth", "network", "necessity", "workers"] },
      { label: "Property damage", terms: ["water", "roof", "fire", "hail", "theft", "mold", "flood", "property damage"] },
      { label: "Valuation & payment", terms: ["underpaid", "supplemental", "total loss", "interruption", "dispute"] },
    ],
    steps: [
      { title: "Establish the claim record", description: "Collect the policy or plan material, claim number, dates, loss facts, and insurer correspondence." },
      { title: "Read the insurer position", description: "Separate coverage language, factual findings, estimates, payments, and stated reasons for any denial or reduction." },
      { title: "Organize supporting evidence", description: "Match photos, estimates, receipts, reports, records, and prior communications to the disputed issue." },
      { title: "Prepare the next submission", description: "Review the exact packet and preserve it with available submission, mailing, and response proof." },
    ],
  },
  {
    id: "notice-respond",
    path: "/notice-respond",
    product: "Notice Respond",
    verticalKeys: ["notice"],
    eyebrow: "Official notices · deadlines · evidence · responses",
    heroTitle: "Don’t ignore that notice. Start with what it actually says.",
    description:
      "Identify the issuing agency, notice type, requested action, important dates, and supporting records before preparing a response. Keep the source document and the final response connected from the beginning.",
    directoryDescription: "Browse notice-response guides for IRS notices, agency actions, court documents, benefits notices, DMV matters, evidence packages, and compliance responses.",
    helperTitle: "Not sure what notice you received?",
    helperDescription: "Start with the notice itself. The issuer, notice number, subject line, reference number, requested action, and response instructions usually determine the right path.",
    categories: [
      { label: "IRS & tax notices", terms: ["irs", "cp14", "cp2000", "cp504", "cp523", "tax"] },
      { label: "Agency & government", terms: ["agency", "government", "official"] },
      { label: "Court & summons", terms: ["court", "summons"] },
      { label: "Benefits & DMV", terms: ["benefit", "dmv", "social security"] },
      { label: "Evidence & compliance", terms: ["evidence", "deadline", "compliance", "proof"] },
    ],
    steps: [
      { title: "Identify the notice", description: "Preserve the issuer, notice number, subject, reference number, dates, and requested action." },
      { title: "Extract the controlling facts", description: "Keep stated facts, allegations, amounts, deadlines, and instructions separate from assumptions." },
      { title: "Organize the response record", description: "Gather documents and evidence that directly address what the notice asks or alleges." },
      { title: "Review before sending", description: "Confirm the response and attachments, then preserve the approved packet and available mailing proof." },
    ],
  },
  {
    id: "permit-reply",
    path: "/permit-reply",
    product: "Permit Reply",
    verticalKeys: ["permit"],
    eyebrow: "Permits · plan review · inspections · closeout",
    heroTitle: "Turn permit comments and decisions into a point-by-point response record.",
    description:
      "Start with the permit, plan-review comments, failed inspection, stop-work notice, zoning decision, or closeout issue and keep every response tied to the actual requirement and source document.",
    directoryDescription: "Browse permit and regulatory response guides for denials, corrections, inspections, stop-work matters, zoning decisions, and closeout issues.",
    helperTitle: "Start from the permit document",
    helperDescription: "Use the permit number, project address, reviewing agency, comment or correction text, cited requirement, and response instructions exactly as issued.",
    categories: [
      { label: "Denials", terms: ["denial", "denied"] },
      { label: "Corrections & plan review", terms: ["correction", "plan review", "comment"] },
      { label: "Inspections", terms: ["inspection", "failed"] },
      { label: "Stop-work & violations", terms: ["stop work", "violation"] },
      { label: "Zoning & closeout", terms: ["variance", "zoning", "certificate", "closeout"] },
    ],
    steps: [
      { title: "Capture the agency comments", description: "Preserve every correction, condition, denial reason, inspection item, or requested change." },
      { title: "Map each item", description: "Separate the response into traceable issues rather than replying with a generic narrative." },
      { title: "Attach the supporting record", description: "Connect revised documents, permits, plans, photos, approvals, and explanations to the relevant item." },
      { title: "Preserve the submission", description: "Review the exact package and keep it with available filing, mailing, or delivery proof." },
    ],
  },
  {
    id: "private-office",
    path: "/private-office",
    product: "Private Office",
    verticalKeys: ["private-office"],
    eyebrow: "High-stakes correspondence · controlled records",
    heroTitle: "A quieter way to manage consequential correspondence.",
    description:
      "Organize source documents, chronology, evidence, drafts, approvals, delivery, and proof for important private matters where the record should remain deliberate and reviewable.",
    directoryDescription: "Browse governed Private Office matters for contractor disputes, property insurance claims, bank and wire disputes, trust-beneficiary notices, and security-deposit disputes.",
    helperTitle: "Start with the matter record",
    helperDescription: "Collect the agreement, decision, transaction, notice, correspondence, and evidence that define the matter before drafting the next communication.",
    categories: [
      { label: "Property & contractors", terms: ["contractor", "property"] },
      { label: "Banking & transfers", terms: ["bank", "wire", "transfer"] },
      { label: "Trusts", terms: ["trust", "beneficiary"] },
      { label: "Housing", terms: ["security deposit", "deposit"] },
      { label: "All matters", terms: ["dispute", "claim", "notice"] },
    ],
    steps: [
      { title: "Open the matter record", description: "Keep the source documents, parties, dates, amounts, and prior correspondence together." },
      { title: "Build the chronology", description: "Create a controlled sequence of events and distinguish verified facts from disputed assertions." },
      { title: "Prepare the communication", description: "Draft from the record, connect exhibits deliberately, and keep unresolved issues visible." },
      { title: "Approve and preserve", description: "Review the exact final packet before delivery and retain available proof with the matter." },
    ],
  },
  {
    id: "records-request",
    path: "/records-request",
    product: "Records Requests",
    verticalKeys: ["records"],
    eyebrow: "FOIA · public records · agency records",
    heroTitle: "Ask for the right records from the right custodian.",
    description:
      "Define the records you want, identify the likely custodian, narrow the scope, preserve identifiers and date ranges, and keep the request and response history together.",
    directoryDescription: "Browse records-request guides for federal FOIA, state and local records, law enforcement, courts, property, permits, vital records, communications, and follow-up.",
    helperTitle: "Not sure which agency has the records?",
    helperDescription: "Start with who created, received, maintains, regulates, inspected, investigated, licensed, permitted, or decided the matter reflected in the records.",
    categories: [
      { label: "FOIA & public records", terms: ["foia", "public records", "government", "agency"] },
      { label: "Law enforcement & courts", terms: ["police", "body camera", "911", "court", "judicial", "incident"] },
      { label: "Property & development", terms: ["property", "permit", "license", "inspection", "assessment"] },
      { label: "Personal & vital records", terms: ["vital", "personal", "immigration", "education"] },
      { label: "Contracts & communications", terms: ["contract", "procurement", "communication", "email"] },
      { label: "Follow-up", terms: ["follow up", "appeal", "denial"] },
    ],
    steps: [
      { title: "Define the record set", description: "Describe identifiable records rather than asking an agency to answer a broad question." },
      { title: "Find the likely custodian", description: "Match the request to the office that creates, receives, or maintains the records." },
      { title: "Narrow and verify", description: "Use names, dates, locations, case numbers, subjects, and record types that improve searchability." },
      { title: "Track the request", description: "Keep the request, acknowledgments, productions, denials, fees, follow-ups, and available proof together." },
    ],
  },
  {
    id: "small-business",
    path: "/small-business",
    product: "Small Business",
    verticalKeys: ["business"],
    eyebrow: "Business correspondence · approvals · proof",
    heroTitle: "Run repeatable business correspondence without losing the record.",
    description:
      "Prepare payment reminders and demands, renewal letters, compliance notices, and customer-dispute responses with consistent review, optional mailing, tracking, and proof.",
    directoryDescription: "Browse the current governed Small Business correspondence workflows. Broader formation and lifecycle automation remains a separate product-development track.",
    helperTitle: "Start with the business action you need to document",
    helperDescription: "Use the invoice, agreement, renewal date, compliance obligation, customer correspondence, or other source record that drives the communication.",
    categories: [
      { label: "Payments & receivables", terms: ["payment", "demand", "invoice", "past due"] },
      { label: "Contracts", terms: ["contract", "renewal"] },
      { label: "Compliance", terms: ["compliance", "notice"] },
      { label: "Customer correspondence", terms: ["customer", "dispute", "response"] },
    ],
    steps: [
      { title: "Choose the business action", description: "Start from the invoice, contract, compliance event, or customer issue that requires correspondence." },
      { title: "Prepare from source records", description: "Keep dates, balances, terms, commitments, and prior communications tied to the underlying documents." },
      { title: "Review and approve", description: "Confirm the exact communication and attachments before it leaves the business." },
      { title: "Send, track, prove", description: "Use the delivery method that fits the matter and preserve the communication with available proof." },
    ],
  },
  {
    id: "tenant-reply",
    path: "/tenant-reply",
    product: "Tenant Reply",
    verticalKeys: ["tenant"],
    eyebrow: "Tenant notices · repairs · housing correspondence",
    heroTitle: "Build tenant correspondence around the notice, condition, and record.",
    description:
      "Organize landlord notices, repair requests, habitability evidence, deposit records, lease correspondence, and access communications so each response stays tied to the actual documents and facts.",
    directoryDescription: "Browse tenant-response guides for notices, repairs and conditions, disputes, deposits, lease correspondence, and landlord access communications.",
    helperTitle: "Start with the housing document or condition",
    helperDescription: "Use the notice, lease provision, repair history, photographs, deposit statement, access request, or prior correspondence that defines the issue.",
    categories: [
      { label: "Notices", terms: ["notice", "response"] },
      { label: "Repairs & conditions", terms: ["repair", "condition", "habitability"] },
      { label: "Deposits & disputes", terms: ["deposit", "dispute"] },
      { label: "Lease correspondence", terms: ["lease", "rent", "landlord"] },
      { label: "Entry & access", terms: ["entry", "access"] },
    ],
    steps: [
      { title: "Preserve the source record", description: "Keep the notice, lease, condition evidence, request, statement, or prior correspondence together." },
      { title: "Build the chronology", description: "Record dates, communications, repairs, access events, payments, photographs, and responses in order." },
      { title: "Prepare the correspondence", description: "Use verified facts and the actual source documents rather than generic assumptions about local rules." },
      { title: "Keep delivery proof", description: "Review the exact final communication and preserve available mailing or delivery records." },
    ],
  },
] as const;

export function publicVerticalById(id: string | undefined): PublicVerticalConfig | null {
  return PUBLIC_VERTICALS.find((vertical) => vertical.id === id) ?? null;
}

export function publicVerticalByPath(path: string): { config: PublicVerticalConfig; kind: "landing" | "directory" } | null {
  const normalized = path.replace(/\/+$/, "") || "/";
  for (const config of PUBLIC_VERTICALS) {
    if (normalized === config.path) return { config, kind: "landing" };
    if (normalized === `${config.path}/workflows`) return { config, kind: "directory" };
  }
  return null;
}

export function categoryForWorkflow(config: PublicVerticalConfig, searchableText: string): string {
  const haystack = searchableText.toLowerCase();
  const match = config.categories.find((category) => category.terms.some((term) => haystack.includes(term.toLowerCase())));
  return match?.label ?? "Other workflows";
}
