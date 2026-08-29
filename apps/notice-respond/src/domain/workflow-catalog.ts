import type { MasterWorkflowDefinition, CapabilityPack, UXMetadata, SEOMetadata } from "./workflow-definition";

const sharedCapabilities: CapabilityPack[] = [
  "document-classification",
  "fact-extraction",
  "deadline-analysis",
  "requirements-analysis",
  "evidence-analysis",
  "contradiction-analysis",
  "research",
  "response-strategy",
  "drafting",
  "draft-validation",
  "submission",
  "mailing",
  "proof",
];

const sharedQualityGate = {
  documentRecognition: false,
  factGrounding: true,
  deadlineVerification: true,
  requirementCoverage: true,
  evidenceGrounding: true,
  draftValidation: true,
  submissionReadiness: true,
  proofReady: true,
};

const sharedSteps: UXMetadata["steps"] = [
  { id: "intro", label: "Start" },
  { id: "document", label: "Notice" },
  { id: "facts", label: "Facts" },
  { id: "objective", label: "Objective" },
  { id: "draft", label: "Draft" },
  { id: "review", label: "Review" },
  { id: "attachments", label: "Documents" },
  { id: "recipient", label: "Recipient" },
  { id: "mailing", label: "Mail" },
  { id: "checkout", label: "Checkout" },
  { id: "done", label: "Done" },
];

const sharedReviewChecks = [
  "I reviewed every factual statement in this draft.",
  "Names, dates, notice numbers, and amounts are correct.",
  "I reviewed the uploaded notice and agency instructions.",
  "I understand Notice Respond is not providing legal or tax advice.",
];

const sharedMailOptions = [
  { id: "standard", label: "Standard", price: "$" + (499 / 100).toFixed(2), desc: "3–7 business days · Tracking included" },
  { id: "certified", label: "Certified", price: "$" + (1494 / 100).toFixed(2), desc: "Delivery tracking + confirmation · 3–7 days" },
  { id: "registered", label: "Registered", price: "$" + (3249 / 100).toFixed(2), desc: "Secure handling + tracking · 5–10 days" },
];

export const noticeRespondCatalog: MasterWorkflowDefinition[] = [
  {
    id: "irs-notice",
    vertical: "notice-respond",
    lifecycle: "functional",
    engine: "document-action",
    title: "Respond to an IRS Notice",
    description: "Analyze an IRS notice, identify what it is asking for, organize supporting evidence, prepare a response, and preserve mailing proof.",
    disclaimer: "Notice Respond is a document and correspondence tool, not a law firm, CPA firm, or tax professional.",
    searchIntent: {
      primary: "respond to an IRS notice",
      secondary: ["IRS notice response", "IRS letter response", "IRS notice deadline"],
      canonicalPath: "/workflows/irs-notice",
      informationalEntryPoints: ["IRS notice", "IRS letter", "what does my IRS notice mean"],
      actionIntents: ["respond to IRS notice", "IRS notice response letter", "mail IRS response"],
    },
    documents: [
      { name: "IRS notice or letter", identifiers: ["CP", "LTR", "Notice"], acceptedFormats: ["application/pdf", "image/*"], extractionFields: ["noticeType", "noticeDate", "responseDeadline", "taxYear", "amounts", "requestedActions", "mailingAddress", "contactInformation"] },
    ],
    deadlines: [{ id: "notice-response", label: "Response deadline shown on notice", trigger: "explicit deadline in notice", sourcePriority: ["uploaded notice", "official IRS source"], notes: ["Do not infer a deadline when the notice provides one."] }],
    requirements: [
      { id: "response-content", label: "Address each requested issue", type: "response", source: "uploaded notice", required: true },
      { id: "supporting-records", label: "Include relevant supporting documents", type: "document", source: "notice + user evidence", required: true },
      { id: "recipient", label: "Use the response address specified by the notice", type: "recipient", source: "uploaded notice", required: true },
    ],
    evidence: [
      { id: "tax-records", label: "Tax and income records", purpose: "Support or refute the issue identified in the notice", required: false, examples: ["W-2", "1099", "return", "payment record"] },
      { id: "correspondence", label: "Prior IRS correspondence", purpose: "Establish context and prior agency communications", required: false, examples: ["prior notices", "response letters"] },
    ],
    analysis: { capabilities: [...sharedCapabilities], orderedChecks: ["classify notice", "extract controlling dates", "identify requested action", "compare notice claims with uploaded evidence", "identify missing evidence", "prepare response strategy"], outputSections: ["notice summary", "deadline", "requested action", "facts", "evidence gaps", "response strategy"] },
    drafting: { requiredSections: ["recipient", "subject/reference", "response to notice", "fact-by-fact explanation", "supporting evidence list", "requested outcome", "contact information"], forbiddenBehavior: ["invent facts", "invent tax conclusions", "state uncertainty as fact"], validationChecks: ["every factual claim traceable to user evidence", "every requested issue addressed", "recipient matches notice"] },
    submission: { methods: ["mail"], recipientRules: ["use address from the notice unless user explicitly overrides after review"], proofRequirements: ["mailing record", "tracking when selected", "final approved document"] },
    capabilities: [...sharedCapabilities],
    qualityGate: sharedQualityGate,
    ux: { steps: sharedSteps, reviewChecks: sharedReviewChecks, disclaimerText: "Notice Respond provides document preparation and mailing assistance. It is not a law firm, CPA firm, or tax professional and does not provide legal or tax advice.", mailOptions: sharedMailOptions },
    seo: {
      title: "Respond to an IRS Notice — Notice Respond",
      description: "Guided workflow to organize an IRS notice, prepare a written response, and mail it with proof of delivery.",
      canonical: "/workflows/irs-notice",
      openGraph: { title: "Respond to an IRS Notice", description: "Organize an IRS notice, prepare a written response, and mail it with proof of delivery." },
    },
    directory: {
      category: "Tax notices",
      bestFor: "IRS notices and letters where the notice instructions call for a written response or supporting documentation.",
      steps: ["Identify the notice number and issue", "Capture the response date and mailing instructions", "Compare the notice with your records", "Prepare the response and attachments", "Send with a retained mailing record"],
      documents: ["IRS notice or letter", "Tax return excerpts", "Payment records", "Supporting statements or forms"],
      seoRoute: "/workflows/respond-to-an-irs-notice",
      seoTitle: "Respond to an IRS notice",
      seoDescription: "Organize an IRS notice, response date, notice number, disputed facts, and supporting records before you send a written reply.",
    },
  },
  {
    id: "court-summons",
    vertical: "notice-respond",
    lifecycle: "functional",
    engine: "document-action",
    title: "Respond to a Court Summons",
    description: "Analyze a summons or complaint, surface deadlines and filing instructions, organize facts and exhibits, and prepare the response package.",
    disclaimer: "Court filings can have strict procedural requirements. Notice Respond is not a law firm and does not provide legal advice.",
    searchIntent: {
      primary: "respond to a court summons",
      secondary: ["court summons response", "civil summons response", "answer a summons"],
      canonicalPath: "/workflows/court-summons",
      informationalEntryPoints: ["court summons", "what is a summons"],
      actionIntents: ["respond to court summons", "answer summons", "mail summons response"],
    },
    documents: [{ name: "Summons or complaint", identifiers: ["summons", "complaint", "case number"], acceptedFormats: ["application/pdf", "image/*"], extractionFields: ["court", "caseNumber", "parties", "serviceDate", "responseDeadline", "filingInstructions", "address"] }],
    deadlines: [{ id: "court-response", label: "Court response deadline", trigger: "service date + controlling court rule OR explicit deadline", sourcePriority: ["court document", "official court rules"], notes: ["Rules vary by jurisdiction and case type."] }],
    requirements: [{ id: "filing-format", label: "Follow court filing instructions", type: "format", source: "court document and official court source", required: true }],
    evidence: [{ id: "case-record", label: "Case records", purpose: "Support factual response", required: false, examples: ["contracts", "communications", "receipts", "prior filings"] }],
    analysis: { capabilities: [...sharedCapabilities], orderedChecks: ["classify court document", "extract court and case", "determine response deadline source", "extract filing instructions", "identify factual issues", "identify exhibits and missing information"], outputSections: ["case summary", "deadline", "filing instructions", "issues", "evidence", "next actions"] },
    drafting: { requiredSections: ["caption/reference", "response", "factual statements", "requested relief", "signature/contact", "exhibit index when needed"], forbiddenBehavior: ["invent procedural rules", "claim legal representation", "state legal conclusions without support"], validationChecks: ["deadline source cited", "caption matches case document", "required sections present"] },
    submission: { methods: ["mail", "user-directed filing"], recipientRules: ["use the court address and filing instructions from the governing documents"], proofRequirements: ["final filing copy", "mailing record", "tracking when selected"] },
    capabilities: [...sharedCapabilities],
    qualityGate: { ...sharedQualityGate, documentRecognition: false },
    ux: { steps: sharedSteps, reviewChecks: sharedReviewChecks, disclaimerText: "Notice Respond is not a law firm and does not provide legal advice. Court filings have strict deadlines and procedural requirements.", mailOptions: sharedMailOptions },
    seo: {
      title: "Respond to a Court Summons — Notice Respond",
      description: "Analyze a summons, surface deadlines and filing instructions, organize exhibits, and prepare a response package.",
    },
    directory: {
      category: "Court & formal actions",
      bestFor: "Civil summonses and other formal court papers where a response deadline is stated in the documents.",
      steps: ["Upload the summons", "Capture case and service information", "Identify the stated deadline", "Organize relevant documents", "Prepare the next step for professional review or filing"],
      documents: ["Summons", "Complaint or petition", "Court attachments", "Prior correspondence"],
      seoRoute: "/workflows/respond-to-a-court-summons",
      seoTitle: "Respond to a court summons",
      seoDescription: "Organize a summons, case number, service information, deadlines, and supporting documents so you can understand the required next step.",
    },
  },
  {
    id: "agency-action",
    vertical: "notice-respond",
    lifecycle: "functional",
    engine: "document-action",
    title: "Respond to an Agency Action",
    description: "Respond to a regulatory, licensing, administrative, or agency action with source-linked facts, deadlines, evidence, and a reviewable response.",
    disclaimer: "Agency proceedings vary by jurisdiction. Notice Respond is not a law firm and does not provide legal advice.",
    searchIntent: {
      primary: "respond to a government agency notice",
      secondary: ["agency action response", "administrative notice response", "government agency letter response"],
      canonicalPath: "/workflows/agency-action",
      informationalEntryPoints: ["agency action", "government agency notice"],
      actionIntents: ["respond to agency action", "agency response letter", "government notice response"],
    },
    documents: [{ name: "Agency notice or determination", identifiers: ["notice", "determination", "order", "licensing action"], acceptedFormats: ["application/pdf", "image/*"], extractionFields: ["agency", "actionType", "caseId", "issue", "deadline", "requestedResponse", "recipient"] }],
    deadlines: [{ id: "agency-response", label: "Agency response deadline", trigger: "explicit deadline or controlling agency rule", sourcePriority: ["uploaded notice", "official agency source"] }],
    requirements: [{ id: "agency-instructions", label: "Follow agency submission instructions", type: "format", source: "agency notice", required: true }],
    evidence: [{ id: "agency-record", label: "Agency record and supporting evidence", purpose: "Support the user's factual response", required: false, examples: ["prior correspondence", "licenses", "receipts", "photographs"] }],
    analysis: { capabilities: [...sharedCapabilities], orderedChecks: ["classify agency action", "extract deadline and instructions", "identify agency assertions", "map supporting facts", "surface contradictions and gaps", "select response strategy"], outputSections: ["action summary", "deadline", "agency assertions", "supporting facts", "gaps", "strategy"] },
    drafting: { requiredSections: ["recipient", "reference", "response", "fact and evidence sections", "requested outcome", "attachments"], forbiddenBehavior: ["invent agency requirements", "invent facts"], validationChecks: ["every agency assertion addressed or explicitly marked", "evidence references are accurate", "submission route matches instructions"] },
    submission: { methods: ["mail", "user-directed submission"], recipientRules: ["preserve the agency's specified recipient and delivery method"], proofRequirements: ["approved response", "submission record", "tracking when applicable"] },
    capabilities: [...sharedCapabilities],
    qualityGate: sharedQualityGate,
    ux: { steps: sharedSteps, reviewChecks: sharedReviewChecks, disclaimerText: "Agency responses may have strict deadlines and specific formatting requirements. Notice Respond is not a law firm.", mailOptions: sharedMailOptions },
    seo: {
      title: "Respond to an Agency Action — Notice Respond",
      description: "Respond to a regulatory or administrative agency action with source-linked facts, deadlines, evidence, and a reviewable response.",
    },
    directory: {
      category: "Court & formal actions",
      bestFor: "Administrative decisions, enforcement actions, compliance determinations, and formal agency correspondence.",
      steps: ["Upload the action", "Identify the agency decision and deadlines", "Build the supporting record", "Choose the response path", "Prepare the written submission"],
      documents: ["Agency decision", "Notice of action", "Supporting records", "Prior agency correspondence"],
      seoRoute: "/workflows/respond-to-an-agency-action",
      seoTitle: "Respond to an agency action",
      seoDescription: "Work through a formal agency action by organizing the decision, deadlines, evidence, and response path before drafting.",
    },
  },
  {
    id: "file-appeal",
    vertical: "notice-respond",
    lifecycle: "functional",
    engine: "appeal",
    title: "File an Appeal",
    description: "Turn a denial or decision into a structured appeal package with facts, evidence, deadline analysis, and a reviewed response.",
    disclaimer: "Appeal procedures and deadlines vary. Notice Respond is not a law firm and does not provide legal advice.",
    searchIntent: {
      primary: "file an appeal",
      secondary: ["appeal letter", "appeal a denial", "appeal a decision"],
      canonicalPath: "/workflows/file-appeal",
      informationalEntryPoints: ["how to file an appeal", "appeal process"],
      actionIntents: ["file an appeal", "write an appeal letter", "mail an appeal"],
    },
    documents: [{ name: "Denial or decision letter", identifiers: ["denial", "decision", "determination", "notice of decision"], acceptedFormats: ["application/pdf", "image/*"], extractionFields: ["agency", "decisionDate", "appealDeadline", "appealMethod", "reasons", "referenceNumber"] }],
    deadlines: [{ id: "appeal-deadline", label: "Appeal deadline", trigger: "explicit deadline in decision OR controlling appeal rule", sourcePriority: ["uploaded decision", "official appeal rules"], notes: ["Appeal deadlines are often short and strict."] }],
    requirements: [{ id: "appeal-grounds", label: "State grounds for appeal", type: "response", source: "decision document + user facts", required: true }, { id: "appeal-method", label: "Use the appeal method specified in the decision", type: "format", source: "uploaded decision", required: true }],
    evidence: [{ id: "appeal-evidence", label: "Supporting evidence for appeal grounds", purpose: "Demonstrate why the decision should be reconsidered", required: false, examples: ["records", "correspondence", "photographs", "expert statements"] }],
    analysis: { capabilities: [...sharedCapabilities], orderedChecks: ["classify decision", "extract appeal deadline", "identify reasons for denial", "map facts to denial reasons", "identify missing support", "construct appeal strategy"], outputSections: ["decision summary", "deadline", "reasons", "evidence", "gaps", "appeal strategy"] },
    drafting: { requiredSections: ["recipient", "decision reference", "grounds", "supporting facts", "evidence", "requested outcome", "attachments"], forbiddenBehavior: ["invent legal authority", "invent facts", "guarantee outcome"], validationChecks: ["each denial reason addressed", "facts trace to evidence", "deadline and submission method verified"] },
    submission: { methods: ["mail", "user-directed submission"], recipientRules: ["use appeal instructions in the decision unless verified otherwise"], proofRequirements: ["final appeal", "mailing record", "delivery tracking when selected"] },
    capabilities: [...sharedCapabilities],
    qualityGate: sharedQualityGate,
    ux: { steps: sharedSteps, reviewChecks: sharedReviewChecks, disclaimerText: "Appeals often have short deadlines and specific requirements. Review the appeal instructions from the agency or court. Notice Respond is not a law firm.", mailOptions: sharedMailOptions },
    seo: {
      title: "File an Appeal — Notice Respond",
      description: "Turn a denial or decision into a structured appeal package with facts, evidence, deadline analysis, and a reviewed response.",
    },
  },
  {
    id: "cp2000-response",
    vertical: "notice-respond",
    lifecycle: "functional",
    engine: "document-action",
    title: "Respond to an IRS CP2000 Notice",
    description: "Analyze a CP2000 underreported-income notice, compare the notice against your tax records, identify the income discrepancy, and prepare a response package with supporting evidence.",
    disclaimer: "Notice Respond is a document and correspondence tool, not a CPA firm or tax professional. It does not provide tax advice.",
    searchIntent: {
      primary: "respond to CP2000",
      secondary: [
        "CP2000 response",
        "CP2000 response letter",
        "CP2000 notice response",
        "CP2000 response deadline",
        "how to respond to CP2000",
        "CP2000 documentation",
        "dispute CP2000",
        "CP2000 income discrepancy",
        "what is CP2000",
      ],
      canonicalPath: "/workflows/cp2000-response",
      informationalEntryPoints: ["what is CP2000", "CP2000 notice", "CP2000 meaning", "IRS CP2000"],
      actionIntents: ["respond to CP2000", "CP2000 response letter", "dispute CP2000", "CP2000 income discrepancy response"],
    },
    documents: [
      { name: "IRS CP2000 notice", identifiers: ["CP2000", "Automated Underreporter", "Underreported Income"], acceptedFormats: ["application/pdf", "image/*"], extractionFields: ["noticeNumber", "noticeDate", "responseDeadline", "taxYear", "proposedChange", "reportedIncome", "irsReportedIncome", "incomeSource", "payerName", "responseAddress", "contactPhone", "proposedTaxIncrease", "proposedPenalty", "requestedAction"] },
      { name: "Supporting tax record", identifiers: ["W-2", "1099", "return", "transcript", "K-1"], acceptedFormats: ["application/pdf", "image/*"], extractionFields: ["payerName", "taxYear", "incomeAmount", "withholding"] },
    ],
    deadlines: [
      { id: "cp2000-response", label: "CP2000 response deadline", trigger: "date stated on CP2000 notice", sourcePriority: ["uploaded CP2000", "official IRS source"], notes: ["The CP2000 notice typically states a response deadline. Do not infer a deadline if the notice does not provide one.", "If no deadline is present, the user should contact the IRS or consult a tax professional."] },
    ],
    requirements: [
      { id: "cp2000-reconcile", label: "Explain or document the income mismatch", type: "response", source: "CP2000 + supporting tax records", required: true },
      { id: "cp2000-address", label: "Use the response address shown on the notice", type: "recipient", source: "CP2000", required: true },
      { id: "cp2000-attachments", label: "Attach supporting documentation for claimed positions", type: "document", source: "CP2000 instructions", required: true },
    ],
    evidence: [
      { id: "income-records", label: "Income reporting records", purpose: "Reconcile the discrepancy identified by the notice", required: true, examples: ["W-2", "1099-INT", "1099-DIV", "1099-B", "broker statement", "return transcript", "K-1"] },
      { id: "prior-correspondence", label: "Prior IRS correspondence", purpose: "Establish context and prior communications about this tax year", required: false, examples: ["prior notices", "response letters", "IRS account transcript"] },
      { id: "corrected-documents", label: "Corrected or amended documents", purpose: "Show that an error was already corrected or an amended return was filed", required: false, examples: ["1040X", "corrected W-2c", "corrected 1099"] },
    ],
    analysis: {
      capabilities: [...sharedCapabilities],
      orderedChecks: [
        "classify document as CP2000",
        "confirm CP2000 identifiers",
        "extract tax year and amounts",
        "extract response deadline",
        "compare notice amounts to user-provided records",
        "identify income discrepancy details",
        "identify unresolved mismatches",
        "identify missing evidence",
        "surface contradictions between notice and user records",
        "prepare response strategy",
      ],
      outputSections: ["CP2000 summary", "amounts at issue", "deadline", "reconciliation", "evidence gaps", "contradictions", "response strategy"],
    },
    drafting: {
      requiredSections: ["Re:", "tax year", "mismatch explanation", "supporting records list", "requested correction", "attachments"],
      forbiddenBehavior: ["invent tax positions", "invent income records", "state a tax conclusion without evidence", "claim to provide tax advice", "fabricate IRS mailing addresses"],
      validationChecks: [
        "every amount in the draft reconciles to a source document or is explicitly marked as unverified",
        "response deadline comes from the notice or is explicitly marked unknown",
        "response address matches the notice",
        "notice number is consistent between extraction and draft",
        "no unsupported factual assertions about tax law",
        "all required sections present",
      ],
    },
    submission: {
      methods: ["mail"],
      recipientRules: ["use the exact response address printed on the CP2000 notice unless a verified source indicates otherwise"],
      proofRequirements: ["approved response document", "mailing record", "tracking when selected"],
    },
    capabilities: [...sharedCapabilities],
    qualityGate: {
      documentRecognition: true,
      factGrounding: true,
      deadlineVerification: true,
      requirementCoverage: true,
      evidenceGrounding: true,
      draftValidation: true,
      submissionReadiness: true,
      proofReady: true,
    },
    ux: {
      steps: [
        { id: "intro", label: "Start" },
        { id: "document", label: "Upload" },
        { id: "extraction", label: "Review" },
        { id: "facts", label: "Facts" },
        { id: "objective", label: "Objective" },
        { id: "draft", label: "Draft" },
        { id: "review", label: "Review" },
        { id: "attachments", label: "Documents" },
        { id: "recipient", label: "Recipient" },
        { id: "mailing", label: "Mail" },
        { id: "checkout", label: "Checkout" },
        { id: "done", label: "Done" },
      ],
      reviewChecks: [
        "I reviewed every factual statement in this draft.",
        "The notice number, tax year, and amounts are correct.",
        "Every amount in the draft is supported by my records or marked as unverified.",
        "I reviewed the uploaded CP2000 and the response address.",
        "I understand Notice Respond is not providing tax advice.",
      ],
      disclaimerText: "Notice Respond is a document and correspondence tool, not a CPA firm or tax professional. It does not provide tax advice.",
      mailOptions: sharedMailOptions,
    },
    seo: {
      title: "Respond to an IRS CP2000 Notice — Notice Respond",
      description: "Analyze your CP2000 underreported-income notice, compare it against your tax records, and prepare a response with supporting evidence. Mail with proof of delivery.",
      canonical: "/workflows/cp2000-response",
      openGraph: { title: "Respond to an IRS CP2000 Notice", description: "Analyze your CP2000, reconcile income discrepancies, and prepare a response with proof of delivery." },
      faq: [
        { question: "What is a CP2000 notice?", answer: "A CP2000 is an Automated Underreporter proposal from the IRS. It shows income reported to the IRS by third parties (employers, banks, brokerages) that does not match the income reported on your tax return. It proposes changes to your tax liability but is not a bill." },
        { question: "How long do I have to respond to a CP2000?", answer: "The CP2000 notice itself states a response deadline — typically 30 days from the notice date. The deadline on your specific notice controls. If you cannot find a deadline, contact the IRS or a tax professional." },
        { question: "What documents should I gather?", answer: "Gather the tax records that correspond to the income the IRS says was underreported: W-2s, 1099s, broker statements, return transcripts, and any corrected documents. These records help you reconcile the discrepancy." },
        { question: "Does Notice Respond provide tax advice?", answer: "No. Notice Respond is a document preparation and mailing tool. It helps you organize the notice, compare it with your records, and prepare a written response. It does not provide tax advice or determine the correct tax outcome." },
        { question: "What happens after I approve my response?", answer: "Once you review and approve your response, Notice Respond prepares a physical mailing through the MailMyPDF integration. You choose the mail type, and a mailing record with tracking is preserved as proof." },
      ],
    },
    directory: {
      category: "Tax notices",
      bestFor: "Taxpayers who received an IRS CP2000 underreported-income notice and need to reconcile the income discrepancy with supporting records.",
      steps: ["Upload the CP2000 notice", "Review extracted facts and the income discrepancy", "Add your facts and supporting records", "Choose your response objective", "Review and edit the response draft", "Approve and mail with proof of delivery"],
      documents: ["IRS CP2000 notice", "W-2 or 1099 forms", "Tax return or transcript", "Broker statements", "Corrected documents (W-2c, 1040X)"],
      seoRoute: "/workflows/respond-to-cp2000-notice",
      seoTitle: "Respond to an IRS CP2000 notice",
      seoDescription: "Analyze your CP2000, reconcile the income discrepancy, and prepare a response with supporting evidence.",
    },
  },
  {
    id: "cp14-response",
    vertical: "notice-respond",
    lifecycle: "authority",
    engine: "document-action",
    title: "Respond to an IRS CP14 Notice",
    description: "Analyze a CP14 balance-due notice, verify the amount owed, and prepare a response to pay, request an installment agreement, or dispute the balance with supporting evidence.",
    disclaimer: "Notice Respond is a document and correspondence tool, not a CPA firm or tax professional. It does not provide tax advice.",
    searchIntent: {
      primary: "respond to CP14",
      secondary: [
        "CP14 response",
        "CP14 response letter",
        "CP14 notice response",
        "CP14 payment deadline",
        "how to respond to CP14",
        "CP14 balance due",
        "dispute CP14",
        "CP14 installment agreement",
        "what is CP14",
      ],
      canonicalPath: "/workflows/cp14-response",
      informationalEntryPoints: ["what is CP14", "CP14 notice", "CP14 meaning", "IRS CP14", "CP14 balance due"],
      actionIntents: ["respond to CP14", "CP14 response letter", "dispute CP14", "CP14 installment agreement request"],
    },
    documents: [
      { name: "IRS CP14 notice", identifiers: ["CP14", "Balance Due", "Amount You Owe"], acceptedFormats: ["application/pdf", "image/*"], extractionFields: ["noticeNumber", "noticeDate", "responseDeadline", "taxYear", "balanceDue", "penaltyAmount", "interestAmount", "totalDue", "paymentDeadline", "responseAddress", "contactPhone", "requestedAction", "installmentOption"] },
      { name: "Supporting tax record", identifiers: ["payment", "return", "transcript", "9465", "prior correspondence"], acceptedFormats: ["application/pdf", "image/*"], extractionFields: ["taxYear", "amountPaid", "paymentDate", "correspondenceDate"] },
    ],
    deadlines: [
      { id: "cp14-response", label: "CP14 response or payment deadline", trigger: "date stated on CP14 notice", sourcePriority: ["uploaded CP14", "official IRS source"], notes: ["The CP14 notice states a payment or response deadline. Do not infer a deadline if the notice does not provide one.", "If no deadline is present, contact the IRS or a tax professional immediately."] },
    ],
    requirements: [
      { id: "cp14-pay-or-respond", label: "Pay the balance or respond explaining why it is incorrect", type: "response", source: "CP14 + supporting records", required: true },
      { id: "cp14-address", label: "Use the response or payment address shown on the notice", type: "recipient", source: "CP14", required: true },
      { id: "cp14-attachments", label: "Attach supporting documentation if disputing the balance", type: "document", source: "CP14 instructions", required: false },
    ],
    evidence: [
      { id: "payment-records", label: "Payment records", purpose: "Show that the balance has been paid or is being paid", required: false, examples: ["payment confirmation", "bank statement", "canceled check", "IRS account transcript"] },
      { id: "prior-correspondence", label: "Prior IRS correspondence", purpose: "Establish context and prior communications about this balance", required: false, examples: ["prior notices", "response letters", "installment agreement"] },
      { id: "return-records", label: "Tax return records", purpose: "Support a dispute of the balance if the return was correct", required: false, examples: ["tax return", "return transcript", "amended return (1040X)"] },
    ],
    analysis: {
      capabilities: [...sharedCapabilities],
      orderedChecks: [
        "classify document as CP14",
        "confirm CP14 identifiers",
        "extract tax year and amounts",
        "extract payment or response deadline",
        "verify balance due, penalty, interest, and total",
        "check for installment agreement option",
        "compare notice amounts to user-provided payment records",
        "identify missing evidence",
        "surface contradictions between notice and user records",
        "prepare response strategy (pay, installment, or dispute)",
      ],
      outputSections: ["CP14 summary", "balance due", "penalty and interest", "deadline", "payment options", "evidence gaps", "contradictions", "response strategy"],
    },
    drafting: {
      requiredSections: ["CP14 reference number", "tax year", "payment or dispute position", "balance explanation", "supporting records list", "attachments"],
      forbiddenBehavior: ["invent tax positions", "invent payment records", "state a tax conclusion without evidence", "claim to provide tax advice", "fabricate IRS mailing addresses", "guarantee outcome", "invent legal authority"],
      validationChecks: [
        "every amount in the draft reconciles to a source document or is explicitly marked as unverified",
        "response or payment deadline comes from the notice or is explicitly marked unknown",
        "response address matches the notice",
        "notice number is consistent between extraction and draft",
        "no unsupported factual assertions about tax law",
        "all required sections present",
      ],
    },
    submission: {
      methods: ["mail"],
      recipientRules: ["use the exact response or payment address printed on the CP14 notice unless a verified source indicates otherwise"],
      proofRequirements: ["approved response document", "mailing record", "tracking when selected"],
    },
    capabilities: [...sharedCapabilities],
    qualityGate: {
      documentRecognition: true,
      factGrounding: true,
      deadlineVerification: true,
      requirementCoverage: true,
      evidenceGrounding: true,
      draftValidation: true,
      submissionReadiness: true,
      proofReady: true,
    },
    ux: {
      steps: [
        { id: "intro", label: "Start" },
        { id: "document", label: "Upload" },
        { id: "extraction", label: "Review" },
        { id: "facts", label: "Facts" },
        { id: "objective", label: "Objective" },
        { id: "draft", label: "Draft" },
        { id: "review", label: "Review" },
        { id: "attachments", label: "Documents" },
        { id: "recipient", label: "Recipient" },
        { id: "mailing", label: "Mail" },
        { id: "checkout", label: "Checkout" },
        { id: "done", label: "Done" },
      ],
      reviewChecks: [
        "I reviewed every factual statement in this draft.",
        "The notice number, tax year, and amounts are correct.",
        "Every amount in the draft is supported by my records or marked as unverified.",
        "I reviewed the uploaded CP14 and the response or payment address.",
        "I understand Notice Respond is not providing tax advice.",
      ],
      disclaimerText: "Notice Respond is a document and correspondence tool, not a CPA firm or tax professional. It does not provide tax advice.",
      mailOptions: sharedMailOptions,
    },
    seo: {
      title: "Respond to an IRS CP14 Notice — Notice Respond",
      description: "Analyze your CP14 balance-due notice, verify the amount owed, and prepare a response to pay, request an installment agreement, or dispute the balance. Mail with proof of delivery.",
      canonical: "/workflows/cp14-response",
      openGraph: { title: "Respond to an IRS CP14 Notice", description: "Verify your CP14 balance due, prepare a payment or dispute response, and mail with proof of delivery." },
      faq: [
        { question: "What is a CP14 notice?", answer: "A CP14 is a Balance Due notice from the IRS. It informs you that you have an unpaid balance on your tax account for a specific tax year. It shows the tax amount, plus any penalties and interest, and the total amount due. It is a bill — not a proposal like the CP2000." },
        { question: "How long do I have to respond to a CP14?", answer: "The CP14 notice itself states a payment or response deadline. The deadline on your specific notice controls. Because interest and penalties continue to accrue, prompt action is important. If you cannot find a deadline, contact the IRS or a tax professional." },
        { question: "What are my options when I receive a CP14?", answer: "You generally have three options: (1) pay the balance in full, (2) request an installment agreement if you cannot pay in full, or (3) dispute the balance if you believe it is incorrect. The notice may also mention an offer in compromise or other payment options." },
        { question: "What documents should I gather?", answer: "Gather the tax return for the year in question, any payment confirmations, prior IRS correspondence about the balance, and your IRS account transcript. If you are disputing the balance, gather documents that support your position." },
        { question: "Does Notice Respond provide tax advice?", answer: "No. Notice Respond is a document preparation and mailing tool. It helps you organize the notice, compare it with your records, and prepare a written response. It does not provide tax advice or determine whether you owe the balance." },
        { question: "What happens after I approve my response?", answer: "Once you review and approve your response, Notice Respond prepares a physical mailing through the MailMyPDF integration. You choose the mail type, and a mailing record with tracking is preserved as proof." },
      ],
    },
    directory: {
      category: "Tax notices",
      bestFor: "Taxpayers who received an IRS CP14 balance-due notice and need to pay, request an installment agreement, or dispute the balance with supporting records.",
      steps: ["Upload the CP14 notice", "Review extracted facts and the balance due", "Add your facts and supporting records", "Choose your response objective", "Review and edit the response draft", "Approve and mail with proof of delivery"],
      documents: ["IRS CP14 notice", "Tax return for the year in question", "Payment confirmations", "Prior IRS correspondence", "IRS account transcript"],
      seoRoute: "/workflows/respond-to-cp14-notice",
      seoTitle: "Respond to an IRS CP14 notice",
      seoDescription: "Verify your CP14 balance due, prepare a payment or dispute response, and mail with proof of delivery.",
    },
  },
  {
    id: "cp504-response",
    vertical: "notice-respond",
    lifecycle: "functional",
    engine: "document-action",
    title: "Respond to an IRS CP504 Notice (Intent to Levy)",
    description: "Analyze a CP504 Intent to Levy notice, identify your Collection Due Process hearing rights, verify the balance, and prepare a response to protect your assets from levy.",
    disclaimer: "Notice Respond is a document and correspondence tool, not a law firm, CPA firm, or tax professional.",
    searchIntent: {
      primary: "respond to IRS CP504 notice",
      secondary: ["CP504 response", "IRS intent to levy", "CP504 CDP hearing", "IRS levy notice response"],
      canonicalPath: "/workflows/cp504-response",
      informationalEntryPoints: ["CP504", "intent to levy", "IRS levy notice", "CP504 meaning"],
      actionIntents: ["respond to CP504", "request CDP hearing", "CP504 response letter", "stop IRS levy"],
    },
    documents: [
      { name: "IRS CP504 notice", identifiers: ["CP504", "Intent to Levy", "Final Notice"], acceptedFormats: ["application/pdf", "image/*"], extractionFields: ["noticeNumber", "noticeDate", "responseDeadline", "cdpHearingDeadline", "taxYear", "balanceDue", "penaltyAmount", "interestAmount", "totalDue", "levyType", "responseAddress", "contactPhone", "cdpRightsNotice"] },
    ],
    deadlines: [
      { id: "cp504-cdp-hearing", label: "Collection Due Process hearing deadline (30 days from notice)", trigger: "notice date + 30 days", sourcePriority: ["uploaded CP504", "official IRS source"], notes: ["The CP504 gives you 30 days to request a CDP hearing. This is a hard deadline — do not miss it.", "If the deadline is not on the notice, contact the IRS or a tax professional immediately."] },
      { id: "cp504-response", label: "Response deadline", trigger: "date stated on CP504 notice", sourcePriority: ["uploaded CP504", "official IRS source"], notes: ["Do not infer a deadline if the notice does not provide one."] },
    ],
    requirements: [
      { id: "cp504-cdp-or-pay", label: "Request a CDP hearing or pay the balance", type: "response", source: "CP504 + supporting records", required: true },
      { id: "cp504-address", label: "Use the response address shown on the notice", type: "recipient", source: "CP504", required: true },
      { id: "cp504-attachments", label: "Attach supporting documentation (tax returns, financial statements, payment records)", type: "document", source: "CP504 instructions", required: false },
    ],
    evidence: [
      { id: "tax-records", label: "Tax returns and transcripts", purpose: "Verify the balance and tax year", required: true, examples: ["tax return", "return transcript", "account transcript"] },
      { id: "payment-records", label: "Payment records", purpose: "Show payments already made", required: false, examples: ["payment confirmations", "bank statements", "canceled checks"] },
      { id: "financial-statement", label: "Financial statement (Form 433-F or 433-A)", purpose: "Support installment agreement or offer in compromise", required: false, examples: ["Form 433-F", "Form 433-A", "income/expense statement"] },
      { id: "prior-correspondence", label: "Prior IRS correspondence", purpose: "Show prior notices and responses", required: false, examples: ["CP14", "CP501", "CP503", "prior response letters"] },
    ],
    analysis: { capabilities: [...sharedCapabilities], orderedChecks: ["classify CP504", "extract CDP hearing deadline", "identify levy type", "verify balance due", "identify CDP rights", "identify missing evidence", "prepare response strategy"], outputSections: ["notice summary", "CDP hearing deadline", "levy type", "balance due", "evidence gaps", "response strategy"] },
    drafting: { requiredSections: ["date", "IRS address", "reference number", "CDP hearing request", "factual explanation", "supporting records list", "attachments list", "signature"], forbiddenBehavior: ["invent facts", "invent tax conclusions", "state uncertainty as fact", "claim legal representation"], validationChecks: ["every factual claim traceable to user evidence", "CDP hearing request present", "recipient matches notice"] },
    submission: { methods: ["mail"], recipientRules: ["use address from the notice unless user explicitly overrides after review"], proofRequirements: ["mailing record", "tracking when selected", "final approved document"] },
    capabilities: [...sharedCapabilities],
    qualityGate: sharedQualityGate,
    ux: {
      steps: sharedSteps,
      reviewChecks: sharedReviewChecks,
      disclaimerText: "Notice Respond provides document preparation and mailing assistance. It is not a law firm, CPA firm, or tax professional and does not provide legal or tax advice. A CP504 notice has a strict 30-day deadline for requesting a CDP hearing — do not delay.",
      mailOptions: sharedMailOptions,
    },
    seo: {
      title: "Respond to an IRS CP504 Notice (Intent to Levy) — Notice Respond",
      description: "Analyze your CP504 Intent to Levy notice, identify your Collection Due Process hearing rights, verify the balance, and prepare a response to protect your assets.",
      canonical: "/workflows/cp504-response",
      openGraph: { title: "Respond to an IRS CP504 Notice", description: "Protect your assets from IRS levy — prepare a CP504 response with CDP hearing rights, evidence, and mailing proof." },
      faq: [
        { question: "What is a CP504 notice?", answer: "A CP504 is an IRS Notice of Intent to Levy. It tells you that the IRS plans to seize your assets (bank accounts, wages, or property) to satisfy an unpaid tax balance. You have 30 days to request a Collection Due Process (CDP) hearing." },
        { question: "How long do I have to respond to a CP504?", answer: "You have 30 days from the date of the notice to request a Collection Due Process (CDP) hearing. This is a strict deadline. If you miss it, the IRS can proceed with the levy." },
        { question: "What is a CDP hearing?", answer: "A Collection Due Process (CDP) hearing is your right under IRC section 6330 to challenge the IRS's collection actions before an independent appeals officer. You can propose alternatives like an installment agreement or offer in compromise." },
        { question: "What happens if I don't respond to a CP504?", answer: "If you don't request a CDP hearing within 30 days, the IRS can proceed with the levy after that period. They can seize funds from your bank account, garnish your wages, or seize property." },
      ],
    },
    directory: {
      category: "Tax notices",
      bestFor: "Taxpayers who received a CP504 Intent to Levy notice and need to request a CDP hearing or respond before the 30-day deadline.",
      steps: ["Upload the CP504 notice", "Review the CDP hearing deadline and levy type", "Verify the balance due", "Gather supporting documents", "Prepare and mail the response"],
      documents: ["CP504 notice", "Tax returns and transcripts", "Payment records", "Financial statement (Form 433-F)", "Prior IRS correspondence"],
      seoRoute: "/workflows/respond-to-cp504-notice",
      seoTitle: "Respond to an IRS CP504 notice",
      seoDescription: "Protect your assets from IRS levy — prepare a CP504 response requesting a CDP hearing, verify the balance, and mail with proof of delivery.",
    },
  },
  {
    id: "cp523-response",
    vertical: "notice-respond",
    lifecycle: "functional",
    engine: "document-action",
    title: "Respond to an IRS CP523 Notice (Installment Agreement Default)",
    description: "Analyze a CP523 Notice of Default on Installment Agreement and Intent to Levy, identify your Collection Due Process hearing rights, verify the balance, and prepare a response to protect your installment agreement and assets.",
    disclaimer: "Notice Respond is a document and correspondence tool, not a law firm, CPA firm, or tax professional.",
    searchIntent: {
      primary: "respond to IRS CP523 notice",
      secondary: ["CP523 response", "IRS installment agreement default", "CP523 intent to levy", "IRS CP523 notice"],
      canonicalPath: "/workflows/cp523-response",
      informationalEntryPoints: ["CP523", "installment agreement default", "intent to levy", "CP523 meaning"],
      actionIntents: ["respond to CP523", "reinstate installment agreement", "CP523 response letter", "stop IRS levy"],
    },
    documents: [
      { name: "IRS CP523 notice", identifiers: ["CP523", "Installment Agreement", "Default", "Intent to Levy"], acceptedFormats: ["application/pdf", "image/*"], extractionFields: ["noticeNumber", "noticeDate", "responseDeadline", "cdpHearingDeadline", "terminationDate", "installmentAgreementNumber", "defaultReason", "taxYearsCovered", "balanceDue", "penaltyAmount", "interestAmount", "totalDue", "levyType", "responseAddress", "contactPhone", "cdpRightsNotice", "passportCertification"] },
    ],
    deadlines: [
      { id: "cp523-response-deadline", label: "Response deadline (30 days from notice date)", trigger: "notice date + 30 days", sourcePriority: ["uploaded CP523", "official IRS source"], notes: ["The CP523 gives you 30 days to respond. This is a hard deadline — do not miss it.", "If the deadline is not on the notice, contact the IRS immediately."] },
      { id: "cp523-termination", label: "Installment agreement termination date", trigger: "date stated on CP523", sourcePriority: ["uploaded CP523", "official IRS source"], notes: ["The notice states when the installment agreement will be terminated if you do not respond."] },
    ],
    requirements: [
      { id: "cp523-respond-or-pay", label: "Contact the IRS to reinstate the agreement or pay the balance", type: "response", source: "CP523 + supporting records", required: true },
      { id: "cp523-address", label: "Use the response address shown on the notice", type: "recipient", source: "CP523", required: true },
      { id: "cp523-attachments", label: "Attach supporting documentation (payment records, installment agreement, financial statement)", type: "document", source: "CP523 instructions", required: false },
    ],
    evidence: [
      { id: "installment-agreement", label: "Installment agreement documentation", purpose: "Show the terms of the original agreement", required: true, examples: ["IA confirmation letter", "Form 9465", "payment schedule"] },
      { id: "payment-records", label: "Payment records", purpose: "Show payment history under the installment agreement", required: true, examples: ["bank statements", "canceled checks", "IRS payment confirmations"] },
      { id: "tax-returns", label: "Tax returns for covered years", purpose: "Verify the tax years covered by the agreement", required: false, examples: ["Form 1040", "return transcript"] },
      { id: "financial-statement", label: "Financial statement (Form 433-F)", purpose: "Support reinstatement or new agreement request", required: false, examples: ["Form 433-F", "income/expense statement"] },
      { id: "prior-correspondence", label: "Prior IRS correspondence", purpose: "Show prior notices and communications", required: false, examples: ["CP14", "CP501", "prior response letters"] },
    ],
    analysis: { capabilities: [...sharedCapabilities], orderedChecks: ["classify CP523", "extract response deadline and termination date", "identify default reason", "identify levy type", "verify balance due", "identify CDP rights", "check passport certification", "identify missing evidence", "prepare response strategy"], outputSections: ["notice summary", "default reason", "termination date", "levy risk", "balance due", "evidence gaps", "response strategy"] },
    drafting: { requiredSections: ["date", "IRS address", "reference number", "default acknowledgement", "factual explanation", "requested action", "supporting records list", "signature"], forbiddenBehavior: ["invent facts", "invent tax conclusions", "state uncertainty as fact", "claim legal representation"], validationChecks: ["every factual claim traceable to user evidence", "requested action clearly stated", "recipient matches notice"] },
    submission: { methods: ["mail"], recipientRules: ["use address from the notice unless user explicitly overrides after review"], proofRequirements: ["mailing record", "tracking when selected", "final approved document"] },
    capabilities: [...sharedCapabilities],
    qualityGate: sharedQualityGate,
    ux: {
      steps: sharedSteps,
      reviewChecks: sharedReviewChecks,
      disclaimerText: "Notice Respond provides document preparation and mailing assistance. It is not a law firm, CPA firm, or tax professional and does not provide legal or tax advice. A CP523 notice has a 30-day response deadline — do not delay.",
      mailOptions: sharedMailOptions,
    },
    seo: {
      title: "Respond to an IRS CP523 Notice (Installment Agreement Default) — Notice Respond",
      description: "Analyze your CP523 Notice of Default on Installment Agreement and Intent to Levy, identify your CDP hearing rights, and prepare a response to protect your installment agreement and assets.",
      canonical: "/workflows/cp523-response",
      openGraph: { title: "Respond to an IRS CP523 Notice", description: "Protect your installment agreement and assets — prepare a CP523 response with CDP hearing rights, evidence, and mailing proof." },
      faq: [
        { question: "What is a CP523 notice?", answer: "A CP523 is an IRS Notice of Default on Installment Agreement and Intent to Levy. It tells you that the IRS intends to terminate your installment agreement and seize (levy) your assets because you have defaulted on the agreement." },
        { question: "How long do I have to respond to a CP523?", answer: "You should contact the IRS as soon as possible but no later than 30 days from the date of the notice. This is a strict deadline." },
        { question: "Can I reinstate my installment agreement after a CP523?", answer: "Yes, you can request reinstatement by contacting the IRS at the number on the notice. You may have to pay a fee to reinstate it or pay any new tax liability in full." },
        { question: "What happens if I don't respond to a CP523?", answer: "If you don't respond, the IRS will terminate your installment agreement and begin collection action, which can include filing a federal tax lien or seizing (levying) your wages and/or bank accounts." },
      ],
    },
    directory: {
      category: "Tax notices",
      bestFor: "Taxpayers who received a CP523 Notice of Default on Installment Agreement and need to request reinstatement, a CDP hearing, or respond before the 30-day deadline.",
      steps: ["Upload the CP523 notice", "Review the default reason and termination date", "Verify the balance due", "Gather supporting documents", "Prepare and mail the response"],
      documents: ["CP523 notice", "Installment agreement documentation", "Payment records", "Tax returns for covered years", "Financial statement (Form 433-F)"],
      seoRoute: "/workflows/respond-to-cp523-notice",
      seoTitle: "Respond to an IRS CP523 notice",
      seoDescription: "Protect your installment agreement and assets — prepare a CP523 response requesting reinstatement or a CDP hearing, verify the balance, and mail with proof of delivery.",
    },
  },
  {
    id: "transunion-dispute",
    vertical: "dispute-mail",
    lifecycle: "functional",
    engine: "dispute",
    title: "Dispute Inaccurate Information on Your TransUnion Credit Report",
    description: "Identify inaccurate, outdated, or fraudulent items on your TransUnion credit report, organize your evidence, and prepare an FCRA-based dispute letter to mail with proof of delivery.",
    disclaimer: "Notice Respond is a document preparation and mailing tool, not a law firm or credit repair organization. We do not provide legal advice or guarantee specific credit outcomes.",
    searchIntent: {
      primary: "dispute TransUnion credit report",
      secondary: ["TransUnion dispute", "TransUnion credit dispute", "dispute TransUnion report", "TransUnion dispute letter"],
      canonicalPath: "/workflows/transunion-dispute",
      informationalEntryPoints: ["TransUnion dispute", "how to dispute TransUnion", "TransUnion credit report error"],
      actionIntents: ["file TransUnion dispute", "TransUnion dispute letter", "mail TransUnion dispute"],
    },
    documents: [
      { name: "TransUnion credit report", identifiers: ["TransUnion", "credit report", "account"], acceptedFormats: ["application/pdf", "image/*"], extractionFields: ["consumerName", "consumerAddress", "reportDate", "reportNumber", "disputedItems", "accountNames", "accountNumbers"] },
    ],
    deadlines: [
      { id: "fcra-30-day", label: "TransUnion must investigate within 30 days (45 if additional info provided)", trigger: "date dispute received by TransUnion", sourcePriority: ["FCRA Section 611", "official FTC guidance"], notes: ["The 30-day investigation period starts when TransUnion receives your dispute, not when you mail it.", "If you send additional information during the 30-day period, it extends to 45 days."] },
    ],
    requirements: [
      { id: "dispute-specific-items", label: "Clearly identify each item you are disputing", type: "response", source: "credit report + user knowledge", required: true },
      { id: "provide-reason", label: "State why each item is inaccurate", type: "response", source: "user facts", required: true },
      { id: "tu-address", label: "Mail to TransUnion's dispute address", type: "recipient", source: "TransUnion official address", required: true },
      { id: "enclose-id", label: "Include proof of identity (copy of ID, utility bill)", type: "document", source: "FCRA best practice", required: true },
    ],
    evidence: [
      { id: "account-records", label: "Account statements", purpose: "Prove the correct account status or balance", required: false, examples: ["bank statements", "credit card statements", "loan documents"] },
      { id: "payment-records", label: "Payment records", purpose: "Show payments that contradict the reported status", required: false, examples: ["canceled checks", "payment confirmations", "receipts"] },
      { id: "identity-proof", label: "Proof of identity", purpose: "Verify you are the consumer on the report", required: true, examples: ["driver's license", "utility bill", "passport"] },
      { id: "prior-correspondence", label: "Prior dispute correspondence", purpose: "Show previous disputes and responses", required: false, examples: ["prior dispute letters", "bureau responses", "furnisher letters"] },
      { id: "police-report", label: "Police report (if identity theft)", purpose: "Support claim that account is not yours due to identity theft", required: false, examples: ["FTC Identity Theft Report", "police report"] },
    ],
    analysis: { capabilities: [...sharedCapabilities], orderedChecks: ["identify TransUnion as bureau", "extract consumer information", "identify disputed accounts and items", "classify error types", "identify missing evidence", "prepare dispute strategy"], outputSections: ["consumer info", "disputed items", "error types", "evidence gaps", "FCRA rights", "dispute strategy"] },
    drafting: { requiredSections: ["date", "TransUnion address", "report number", "consumer info", "disputed items list", "explanation", "requested action", "FCRA citation", "supporting documents list", "signature"], forbiddenBehavior: ["invent facts", "claim legal representation", "guarantee credit outcome", "state legal conclusions without support"], validationChecks: ["every disputed item traceable to report", "FCRA citation present", "consumer name present", "at least one disputed item specified"] },
    submission: { methods: ["mail"], recipientRules: ["use TransUnion dispute address: P.O. Box 2000, Chester, PA 19016"], proofRequirements: ["mailing record", "tracking when selected", "final approved document"] },
    capabilities: [...sharedCapabilities],
    qualityGate: sharedQualityGate,
    ux: {
      steps: sharedSteps,
      reviewChecks: sharedReviewChecks,
      disclaimerText: "Notice Respond provides document preparation and mailing assistance. It is not a law firm, credit repair organization, or financial advisor. We do not provide legal advice or guarantee specific credit outcomes. You have the right to dispute inaccurate information under the FCRA.",
      mailOptions: sharedMailOptions,
    },
    seo: {
      title: "Dispute TransUnion Credit Report Errors — Notice Respond",
      description: "Identify inaccurate items on your TransUnion credit report, prepare an FCRA-based dispute letter with supporting evidence, and mail it with proof of delivery.",
      canonical: "/workflows/transunion-dispute",
      openGraph: { title: "Dispute Your TransUnion Credit Report", description: "Prepare an FCRA-based TransUnion dispute letter with evidence and mail with proof of delivery." },
      faq: [
        { question: "How do I dispute inaccurate information on my TransUnion credit report?", answer: "Under the FCRA, you can dispute inaccurate information by sending a letter to TransUnion that identifies each disputed item, explains why it is inaccurate, and includes supporting documentation. TransUnion must investigate within 30 days." },
        { question: "Where do I mail a TransUnion dispute?", answer: "Mail your dispute to TransUnion LLC, Consumer Dispute Center, P.O. Box 2000, Chester, PA 19016. Certified mail with tracking is recommended for proof of timely submission." },
        { question: "How long does TransUnion have to investigate a dispute?", answer: "Under FCRA Section 611, TransUnion must complete their investigation within 30 days of receiving your dispute. If you submit additional information during that period, it extends to 45 days." },
        { question: "What should I include in my TransUnion dispute letter?", answer: "Include your full name and address, the report number and date, each item you are disputing with the account name and number, why each item is inaccurate, what the correct information should be, copies of supporting documents, and proof of identity." },
        { question: "Can I dispute TransUnion errors by mail?", answer: "Yes. While online disputes are available, mailing your dispute provides a paper trail and lets you include physical supporting documents. Certified mail gives you proof that TransUnion received your dispute by a specific date." },
      ],
    },
    directory: {
      category: "Credit disputes",
      bestFor: "Consumers who found inaccurate, outdated, or fraudulent information on their TransUnion credit report and want to dispute it by mail with proof of delivery.",
      steps: ["Upload your TransUnion credit report", "Review the extracted consumer info and disputed items", "Add your facts and evidence", "Prepare the FCRA-based dispute letter", "Mail with tracking and proof of delivery"],
      documents: ["TransUnion credit report", "Account statements", "Payment records", "Proof of identity", "Police report (if identity theft)"],
      seoRoute: "/workflows/transunion-dispute",
      seoTitle: "Dispute TransUnion credit report errors",
      seoDescription: "Identify inaccurate items on your TransUnion credit report, prepare an FCRA dispute letter with evidence, and mail with proof of delivery.",
    },
  },
  {
    id: "experian-dispute",
    vertical: "dispute-mail",
    lifecycle: "functional",
    engine: "dispute",
    title: "Dispute Inaccurate Information on Your Experian Credit Report",
    description: "Identify inaccurate, outdated, or fraudulent items on your Experian credit report, organize your evidence, and prepare an FCRA-based dispute letter to mail with proof of delivery.",
    disclaimer: "Notice Respond is a document preparation and mailing tool, not a law firm or credit repair organization. We do not provide legal advice or guarantee specific credit outcomes.",
    searchIntent: {
      primary: "dispute Experian credit report",
      secondary: ["Experian dispute", "Experian credit dispute", "dispute Experian report", "Experian dispute letter"],
      canonicalPath: "/workflows/experian-dispute",
      informationalEntryPoints: ["Experian dispute", "how to dispute Experian", "Experian credit report error"],
      actionIntents: ["file Experian dispute", "Experian dispute letter", "mail Experian dispute"],
    },
    documents: [
      { name: "Experian credit report", identifiers: ["Experian", "credit report", "account"], acceptedFormats: ["application/pdf", "image/*"], extractionFields: ["consumerName", "consumerAddress", "reportDate", "reportNumber", "disputedItems", "accountNames", "accountNumbers"] },
    ],
    deadlines: [
      { id: "fcra-30-day", label: "Experian must investigate within 30 days (45 if additional info provided)", trigger: "date dispute received by Experian", sourcePriority: ["FCRA Section 611", "official FTC guidance"], notes: ["The 30-day investigation period starts when Experian receives your dispute, not when you mail it.", "If you send additional information during the 30-day period, it extends to 45 days."] },
    ],
    requirements: [
      { id: "dispute-specific-items", label: "Clearly identify each item you are disputing", type: "response", source: "credit report + user knowledge", required: true },
      { id: "provide-reason", label: "State why each item is inaccurate", type: "response", source: "user facts", required: true },
      { id: "exp-address", label: "Mail to Experian's dispute address", type: "recipient", source: "Experian official address", required: true },
      { id: "enclose-id", label: "Include proof of identity (copy of ID, utility bill)", type: "document", source: "FCRA best practice", required: true },
    ],
    evidence: [
      { id: "account-records", label: "Account statements", purpose: "Prove the correct account status or balance", required: false, examples: ["bank statements", "credit card statements", "loan documents"] },
      { id: "payment-records", label: "Payment records", purpose: "Show payments that contradict the reported status", required: false, examples: ["canceled checks", "payment confirmations", "receipts"] },
      { id: "identity-proof", label: "Proof of identity", purpose: "Verify you are the consumer on the report", required: true, examples: ["driver's license", "utility bill", "passport"] },
      { id: "prior-correspondence", label: "Prior dispute correspondence", purpose: "Show previous disputes and responses", required: false, examples: ["prior dispute letters", "bureau responses", "furnisher letters"] },
      { id: "police-report", label: "Police report (if identity theft)", purpose: "Support claim that account is not yours due to identity theft", required: false, examples: ["FTC Identity Theft Report", "police report"] },
    ],
    analysis: { capabilities: [...sharedCapabilities], orderedChecks: ["identify Experian as bureau", "extract consumer information", "identify disputed accounts and items", "classify error types", "identify missing evidence", "prepare dispute strategy"], outputSections: ["consumer info", "disputed items", "error types", "evidence gaps", "FCRA rights", "dispute strategy"] },
    drafting: { requiredSections: ["date", "Experian address", "report number", "consumer info", "disputed items list", "explanation", "requested action", "FCRA citation", "supporting documents list", "signature"], forbiddenBehavior: ["invent facts", "claim legal representation", "guarantee credit outcome", "state legal conclusions without support"], validationChecks: ["every disputed item traceable to report", "FCRA citation present", "consumer name present", "at least one disputed item specified"] },
    submission: { methods: ["mail"], recipientRules: ["use Experian dispute address: P.O. Box 4500, Allen, TX 75013"], proofRequirements: ["mailing record", "tracking when selected", "final approved document"] },
    capabilities: [...sharedCapabilities],
    qualityGate: sharedQualityGate,
    ux: {
      steps: sharedSteps,
      reviewChecks: sharedReviewChecks,
      disclaimerText: "Notice Respond provides document preparation and mailing assistance. It is not a law firm, credit repair organization, or financial advisor. We do not provide legal advice or guarantee specific credit outcomes. You have the right to dispute inaccurate information under the FCRA.",
      mailOptions: sharedMailOptions,
    },
    seo: {
      title: "Dispute Experian Credit Report Errors — Notice Respond",
      description: "Identify inaccurate items on your Experian credit report, prepare an FCRA-based dispute letter with supporting evidence, and mail it with proof of delivery.",
      canonical: "/workflows/experian-dispute",
      openGraph: { title: "Dispute Your Experian Credit Report", description: "Prepare an FCRA-based Experian dispute letter with evidence and mail with proof of delivery." },
      faq: [
        { question: "How do I dispute inaccurate information on my Experian credit report?", answer: "Under the FCRA, you can dispute inaccurate information by sending a letter to Experian that identifies each disputed item, explains why it is inaccurate, and includes supporting documentation. Experian must investigate within 30 days." },
        { question: "Where do I mail an Experian dispute?", answer: "Mail your dispute to Experian, P.O. Box 4500, Allen, TX 75013. Certified mail with tracking is recommended for proof of timely submission." },
        { question: "How long does Experian have to investigate a dispute?", answer: "Under FCRA Section 611, Experian must complete their investigation within 30 days of receiving your dispute. If you submit additional information during that period, it extends to 45 days." },
        { question: "What should I include in my Experian dispute letter?", answer: "Include your full name and address, the report number and date, each item you are disputing with the account name and number, why each item is inaccurate, what the correct information should be, copies of supporting documents, and proof of identity." },
        { question: "Can I dispute Experian errors by mail?", answer: "Yes. While online disputes are available, mailing your dispute provides a paper trail and lets you include physical supporting documents. Certified mail gives you proof that Experian received your dispute by a specific date." },
      ],
    },
    directory: {
      category: "Credit disputes",
      bestFor: "Consumers who found inaccurate, outdated, or fraudulent information on their Experian credit report and want to dispute it by mail with proof of delivery.",
      steps: ["Upload your Experian credit report", "Review the extracted consumer info and disputed items", "Add your facts and evidence", "Prepare the FCRA-based dispute letter", "Mail with tracking and proof of delivery"],
      documents: ["Experian credit report", "Account statements", "Payment records", "Proof of identity", "Police report (if identity theft)"],
      seoRoute: "/workflows/experian-dispute",
      seoTitle: "Dispute Experian credit report errors",
      seoDescription: "Identify inaccurate items on your Experian credit report, prepare an FCRA dispute letter with evidence, and mail with proof of delivery.",
    },
  },
  {
    id: "equifax-dispute",
    vertical: "dispute-mail",
    lifecycle: "functional",
    engine: "dispute",
    title: "Dispute Inaccurate Information on Your Equifax Credit Report",
    description: "Identify inaccurate, outdated, or fraudulent items on your Equifax credit report, organize your evidence, and prepare an FCRA-based dispute letter to mail with proof of delivery.",
    disclaimer: "Notice Respond is a document preparation and mailing tool, not a law firm or credit repair organization. We do not provide legal advice or guarantee specific credit outcomes.",
    searchIntent: {
      primary: "dispute Equifax credit report",
      secondary: ["Equifax dispute", "Equifax credit dispute", "dispute Equifax report", "Equifax dispute letter"],
      canonicalPath: "/workflows/equifax-dispute",
      informationalEntryPoints: ["Equifax dispute", "how to dispute Equifax", "Equifax credit report error"],
      actionIntents: ["file Equifax dispute", "Equifax dispute letter", "mail Equifax dispute"],
    },
    documents: [
      { name: "Equifax credit report", identifiers: ["Equifax", "credit report", "account"], acceptedFormats: ["application/pdf", "image/*"], extractionFields: ["consumerName", "consumerAddress", "reportDate", "reportNumber", "disputedItems", "accountNames", "accountNumbers"] },
    ],
    deadlines: [
      { id: "fcra-30-day", label: "Equifax must investigate within 30 days (45 if additional info provided)", trigger: "date dispute received by Equifax", sourcePriority: ["FCRA Section 611", "official FTC guidance"], notes: ["The 30-day investigation period starts when Equifax receives your dispute, not when you mail it.", "If you send additional information during the 30-day period, it extends to 45 days."] },
    ],
    requirements: [
      { id: "dispute-specific-items", label: "Clearly identify each item you are disputing", type: "response", source: "credit report + user knowledge", required: true },
      { id: "provide-reason", label: "State why each item is inaccurate", type: "response", source: "user facts", required: true },
      { id: "eq-address", label: "Mail to Equifax's dispute address", type: "recipient", source: "Equifax official address", required: true },
      { id: "enclose-id", label: "Include proof of identity (copy of ID, utility bill)", type: "document", source: "FCRA best practice", required: true },
    ],
    evidence: [
      { id: "account-records", label: "Account statements", purpose: "Prove the correct account status or balance", required: false, examples: ["bank statements", "credit card statements", "loan documents"] },
      { id: "payment-records", label: "Payment records", purpose: "Show payments that contradict the reported status", required: false, examples: ["canceled checks", "payment confirmations", "receipts"] },
      { id: "identity-proof", label: "Proof of identity", purpose: "Verify you are the consumer on the report", required: true, examples: ["driver's license", "utility bill", "passport"] },
      { id: "prior-correspondence", label: "Prior dispute correspondence", purpose: "Show previous disputes and responses", required: false, examples: ["prior dispute letters", "bureau responses", "furnisher letters"] },
      { id: "police-report", label: "Police report (if identity theft)", purpose: "Support claim that account is not yours due to identity theft", required: false, examples: ["FTC Identity Theft Report", "police report"] },
    ],
    analysis: { capabilities: [...sharedCapabilities], orderedChecks: ["identify Equifax as bureau", "extract consumer information", "identify disputed accounts and items", "classify error types", "identify missing evidence", "prepare dispute strategy"], outputSections: ["consumer info", "disputed items", "error types", "evidence gaps", "FCRA rights", "dispute strategy"] },
    drafting: { requiredSections: ["date", "Equifax address", "report number", "consumer info", "disputed items list", "explanation", "requested action", "FCRA citation", "supporting documents list", "signature"], forbiddenBehavior: ["invent facts", "claim legal representation", "guarantee credit outcome", "state legal conclusions without support"], validationChecks: ["every disputed item traceable to report", "FCRA citation present", "consumer name present", "at least one disputed item specified"] },
    submission: { methods: ["mail"], recipientRules: ["use Equifax dispute address: P.O. Box 105069, Atlanta, GA 30348"], proofRequirements: ["mailing record", "tracking when selected", "final approved document"] },
    capabilities: [...sharedCapabilities],
    qualityGate: sharedQualityGate,
    ux: {
      steps: sharedSteps,
      reviewChecks: sharedReviewChecks,
      disclaimerText: "Notice Respond provides document preparation and mailing assistance. It is not a law firm, credit repair organization, or financial advisor. We do not provide legal advice or guarantee specific credit outcomes. You have the right to dispute inaccurate information under the FCRA.",
      mailOptions: sharedMailOptions,
    },
    seo: {
      title: "Dispute Equifax Credit Report Errors — Notice Respond",
      description: "Identify inaccurate items on your Equifax credit report, prepare an FCRA-based dispute letter with supporting evidence, and mail it with proof of delivery.",
      canonical: "/workflows/equifax-dispute",
      openGraph: { title: "Dispute Your Equifax Credit Report", description: "Prepare an FCRA-based Equifax dispute letter with evidence and mail with proof of delivery." },
      faq: [
        { question: "How do I dispute inaccurate information on my Equifax credit report?", answer: "Under the FCRA, you can dispute inaccurate information by sending a letter to Equifax that identifies each disputed item, explains why it is inaccurate, and includes supporting documentation. Equifax must investigate within 30 days." },
        { question: "Where do I mail an Equifax dispute?", answer: "Mail your dispute to Equifax Information Services LLC, P.O. Box 105069, Atlanta, GA 30348. Certified mail with tracking is recommended for proof of timely submission." },
        { question: "How long does Equifax have to investigate a dispute?", answer: "Under FCRA Section 611, Equifax must complete their investigation within 30 days of receiving your dispute. If you submit additional information during that period, it extends to 45 days." },
        { question: "What should I include in my Equifax dispute letter?", answer: "Include your full name and address, the report number and date, each item you are disputing with the account name and number, why each item is inaccurate, what the correct information should be, copies of supporting documents, and proof of identity." },
        { question: "Can I dispute Equifax errors by mail?", answer: "Yes. While online disputes are available, mailing your dispute provides a paper trail and lets you include physical supporting documents. Certified mail gives you proof that Equifax received your dispute by a specific date." },
      ],
    },
    directory: {
      category: "Credit disputes",
      bestFor: "Consumers who found inaccurate, outdated, or fraudulent information on their Equifax credit report and want to dispute it by mail with proof of delivery.",
      steps: ["Upload your Equifax credit report", "Review the extracted consumer info and disputed items", "Add your facts and evidence", "Prepare the FCRA-based dispute letter", "Mail with tracking and proof of delivery"],
      documents: ["Equifax credit report", "Account statements", "Payment records", "Proof of identity", "Police report (if identity theft)"],
      seoRoute: "/workflows/equifax-dispute",
      seoTitle: "Dispute Equifax credit report errors",
      seoDescription: "Identify inaccurate items on your Equifax credit report, prepare an FCRA dispute letter with evidence, and mail with proof of delivery.",
    },
  },
  {
    id: "tax-notice",
    vertical: "notice-respond",
    lifecycle: "functional",
    engine: "document-action",
    title: "Respond to a Tax Notice",
    description: "Create a structured response to a tax authority notice without losing the notice deadline, reference number, or supporting evidence.",
    disclaimer: "Tax notices vary by jurisdiction. Notice Respond is not a tax preparer or financial advisor and does not provide tax advice.",
    searchIntent: {
      primary: "respond to a tax notice",
      secondary: ["tax notice response", "tax authority letter", "tax correspondence response"],
      canonicalPath: "/workflows/tax-notice",
      informationalEntryPoints: ["respond to a tax notice"],
      actionIntents: ["respond to a tax notice", "response letter"],
    },
    documents: [{ name: "Respond to a Tax Notice", identifiers: ["notice", "letter", "determination"], acceptedFormats: ["application/pdf", "image/*"], extractionFields: ["agency", "noticeType", "noticeNumber", "taxYear", "noticeDate", "responseDeadline", "issue", "amount", "requestedAction", "recipient"] }],
    deadlines: [{ id: "response-deadline", label: "Response deadline shown on notice", trigger: "explicit deadline in notice", sourcePriority: ["uploaded notice", "official agency source"], notes: ["Do not infer a deadline when the notice provides one."] }],
    requirements: [{ id: "response-content", label: "Address each requested issue", type: "response", source: "uploaded notice", required: true }],
    evidence: [{ id: "supporting-records", label: "Supporting evidence", purpose: "Support or refute the issue identified in the notice", required: false, examples: ["tax returns", "W-2 or 1099", "payment records", "prior correspondence"] }],
    analysis: { capabilities: [...sharedCapabilities], orderedChecks: ["classify notice type", "extract deadline and instructions", "identify agency assertions", "map supporting facts", "surface contradictions and gaps", "select response strategy"], outputSections: ["notice summary", "deadline", "agency assertions", "supporting facts", "gaps", "strategy"] },
    drafting: { requiredSections: ["recipient", "reference", "response", "fact and evidence sections", "requested outcome", "attachments"], forbiddenBehavior: ["invent agency requirements", "invent facts"], validationChecks: ["every agency assertion addressed or explicitly marked", "evidence references are accurate", "submission route matches instructions"] },
    submission: { methods: ["mail", "user-directed submission"], recipientRules: ["preserve the agency's specified recipient and delivery method"], proofRequirements: ["approved response", "submission record", "tracking when applicable"] },
    capabilities: [...sharedCapabilities],
    qualityGate: sharedQualityGate,
    ux: { steps: sharedSteps, reviewChecks: sharedReviewChecks, disclaimerText: "Tax notices vary by jurisdiction. Notice Respond is not a tax preparer or financial advisor and does not provide tax advice.", mailOptions: sharedMailOptions },
    seo: {
      title: "Respond to a Tax Notice — Notice Respond",
      description: "Create a structured response to a tax authority notice without losing the notice deadline, reference number, or supporting evidence.",
      canonical: "/workflows/tax-notice",
      openGraph: { title: "Respond to a Tax Notice", description: "Create a structured response to a tax authority notice without losing the notice deadline, reference number, or supporting evidence." },
      faq: [
        {
                "question": "How long do I have to respond to a tax notice?",
                "answer": "Most tax notices include a response deadline, typically 30 days from the notice date. If no deadline is stated, contact the issuing agency immediately to confirm the response window."
        },
        {
                "question": "What should I include in my response to a tax notice?",
                "answer": "Include the notice or reference number, the tax year in question, a point-by-point response to each issue raised, supporting documentation, and your contact information. Address every item the notice raises."
        },
        {
                "question": "Can I disagree with a tax notice?",
                "answer": "Yes. If you believe the notice is incorrect, state clearly which items you disagree with and provide evidence supporting your position. Include copies of relevant records, not originals."
        },
        {
                "question": "Should I send original documents with my tax notice response?",
                "answer": "No. Always send copies, not originals. Keep your original documents and proof of mailing in your records."
        },
        {
                "question": "What mail type should I use for a tax notice response?",
                "answer": "Certified mail is recommended for tax notice responses because it provides proof of timely delivery, which is important if you need to prove you met the deadline."
        }
],
    },
    directory: {
      category: "Tax notices",
      bestFor: "Federal, state, or local tax notices that require clarification, documents, disagreement, or another written action.",
      steps: ["Upload the notice", "Record the stated reason and deadline", "Collect the records that address the notice", "Draft a point-by-point response", "Review the mailing details"],
      documents: ["Tax notice", "Returns or schedules", "Payment evidence", "Prior correspondence"],
      seoRoute: "/workflows/tax-notice",
      seoTitle: "Respond to a Tax Notice",
      seoDescription: "Create a structured response to a tax authority notice without losing the notice deadline, reference number, or supporting evidence.",
    },
  },

  {
    id: "code-enforcement",
    vertical: "notice-respond",
    lifecycle: "functional",
    engine: "document-action",
    title: "Respond to a Code Enforcement Notice",
    description: "Organize a code enforcement notice around the property, alleged violations, inspection dates, correction deadline, and evidence you want the agency to consider.",
    disclaimer: "Code enforcement varies by municipality. Notice Respond is not a law firm and does not provide legal advice.",
    searchIntent: {
      primary: "respond to a code enforcement notice",
      secondary: ["code enforcement response", "municipal violation notice", "property compliance notice"],
      canonicalPath: "/workflows/code-enforcement",
      informationalEntryPoints: ["respond to a code enforcement notice"],
      actionIntents: ["respond to a code enforcement notice", "response letter"],
    },
    documents: [{ name: "Respond to a Code Enforcement Notice", identifiers: ["notice", "letter", "determination"], acceptedFormats: ["application/pdf", "image/*"], extractionFields: ["agency", "caseNumber", "propertyAddress", "violationType", "inspectionDate", "noticeDate", "correctionDeadline", "requestedAction", "recipient"] }],
    deadlines: [{ id: "response-deadline", label: "Response deadline shown on notice", trigger: "explicit deadline in notice", sourcePriority: ["uploaded notice", "official agency source"], notes: ["Do not infer a deadline when the notice provides one."] }],
    requirements: [{ id: "response-content", label: "Address each requested issue", type: "response", source: "uploaded notice", required: true }],
    evidence: [{ id: "supporting-records", label: "Supporting evidence", purpose: "Support or refute the issue identified in the notice", required: false, examples: ["property records", "permits", "photos", "inspection reports", "prior correspondence"] }],
    analysis: { capabilities: [...sharedCapabilities], orderedChecks: ["classify notice type", "extract deadline and instructions", "identify agency assertions", "map supporting facts", "surface contradictions and gaps", "select response strategy"], outputSections: ["notice summary", "deadline", "agency assertions", "supporting facts", "gaps", "strategy"] },
    drafting: { requiredSections: ["recipient", "reference", "response", "fact and evidence sections", "requested outcome", "attachments"], forbiddenBehavior: ["invent agency requirements", "invent facts"], validationChecks: ["every agency assertion addressed or explicitly marked", "evidence references are accurate", "submission route matches instructions"] },
    submission: { methods: ["mail", "user-directed submission"], recipientRules: ["preserve the agency's specified recipient and delivery method"], proofRequirements: ["approved response", "submission record", "tracking when applicable"] },
    capabilities: [...sharedCapabilities],
    qualityGate: sharedQualityGate,
    ux: { steps: sharedSteps, reviewChecks: sharedReviewChecks, disclaimerText: "Code enforcement varies by municipality. Notice Respond is not a law firm and does not provide legal advice.", mailOptions: sharedMailOptions },
    seo: {
      title: "Respond to a Code Enforcement Notice — Notice Respond",
      description: "Organize a code enforcement notice around the property, alleged violations, inspection dates, correction deadline, and evidence you want the agency to consider.",
      canonical: "/workflows/code-enforcement",
      openGraph: { title: "Respond to a Code Enforcement Notice", description: "Organize a code enforcement notice around the property, alleged violations, inspection dates, correction deadline, and evidence you want the agency to consider." },
      faq: [
        {
                "question": "What happens if I miss the correction deadline on a code enforcement notice?",
                "answer": "Missing a correction deadline can result in fines, liens, or additional enforcement action. If you cannot meet the deadline, respond before it expires to request an extension and show good-faith progress."
        },
        {
                "question": "Can I dispute a code enforcement violation?",
                "answer": "Yes. If you believe the violation is incorrect or has already been corrected, document your position with photos, permits, or inspection records and include them with your response."
        },
        {
                "question": "What evidence should I include with my code enforcement response?",
                "answer": "Include photos showing compliance, permits, inspection reports, prior correspondence with the agency, and any other records that support your position."
        },
        {
                "question": "How do I request an extension on a code enforcement deadline?",
                "answer": "State your request clearly in the response letter, explain why you need more time, describe the corrective steps already taken, and propose a specific completion date."
        }
],
    },
    directory: {
      category: "Property & local government",
      bestFor: "Property owners and occupants dealing with municipal code, nuisance, inspection, or compliance notices.",
      steps: ["Upload the notice", "Capture property and case details", "Build the notice timeline", "Attach permits, photos, records, or other evidence", "Prepare a response for review"],
      documents: ["Violation notice", "Inspection reports", "Permits", "Photos", "Property records", "Agency correspondence"],
      seoRoute: "/workflows/code-enforcement",
      seoTitle: "Respond to a Code Enforcement Notice",
      seoDescription: "Organize a code enforcement notice around the property, alleged violations, inspection dates, correction deadline, and evidence you want the agency to consider.",
    },
  },

  {
    id: "permit-correction",
    vertical: "notice-respond",
    lifecycle: "functional",
    engine: "document-action",
    title: "Respond to a Permit Correction Notice",
    description: "Turn permit or planning corrections into a tracked response so each requested change is understood, answered, and supported.",
    disclaimer: "Permit processes vary by jurisdiction. Notice Respond is not a law firm and does not provide legal advice.",
    searchIntent: {
      primary: "respond to a permit correction notice",
      secondary: ["permit correction response", "planning department notice", "building permit resubmission"],
      canonicalPath: "/workflows/permit-correction",
      informationalEntryPoints: ["respond to a permit correction notice"],
      actionIntents: ["respond to a permit correction notice", "response letter"],
    },
    documents: [{ name: "Respond to a Permit Correction Notice", identifiers: ["notice", "letter", "determination"], acceptedFormats: ["application/pdf", "image/*"], extractionFields: ["agency", "permitNumber", "projectAddress", "correctionItems", "reviewerName", "noticeDate", "resubmissionDeadline", "requestedAction", "recipient"] }],
    deadlines: [{ id: "response-deadline", label: "Response deadline shown on notice", trigger: "explicit deadline in notice", sourcePriority: ["uploaded notice", "official agency source"], notes: ["Do not infer a deadline when the notice provides one."] }],
    requirements: [{ id: "response-content", label: "Address each requested issue", type: "response", source: "uploaded notice", required: true }],
    evidence: [{ id: "supporting-records", label: "Supporting evidence", purpose: "Support or refute the issue identified in the notice", required: false, examples: ["revised plans", "original application", "inspection notes", "engineering reports", "prior correspondence"] }],
    analysis: { capabilities: [...sharedCapabilities], orderedChecks: ["classify notice type", "extract deadline and instructions", "identify agency assertions", "map supporting facts", "surface contradictions and gaps", "select response strategy"], outputSections: ["notice summary", "deadline", "agency assertions", "supporting facts", "gaps", "strategy"] },
    drafting: { requiredSections: ["recipient", "reference", "response", "fact and evidence sections", "requested outcome", "attachments"], forbiddenBehavior: ["invent agency requirements", "invent facts"], validationChecks: ["every agency assertion addressed or explicitly marked", "evidence references are accurate", "submission route matches instructions"] },
    submission: { methods: ["mail", "user-directed submission"], recipientRules: ["preserve the agency's specified recipient and delivery method"], proofRequirements: ["approved response", "submission record", "tracking when applicable"] },
    capabilities: [...sharedCapabilities],
    qualityGate: sharedQualityGate,
    ux: { steps: sharedSteps, reviewChecks: sharedReviewChecks, disclaimerText: "Permit processes vary by jurisdiction. Notice Respond is not a law firm and does not provide legal advice.", mailOptions: sharedMailOptions },
    seo: {
      title: "Respond to a Permit Correction Notice — Notice Respond",
      description: "Turn permit or planning corrections into a tracked response so each requested change is understood, answered, and supported.",
      canonical: "/workflows/permit-correction",
      openGraph: { title: "Respond to a Permit Correction Notice", description: "Turn permit or planning corrections into a tracked response so each requested change is understood, answered, and supported." },
      faq: [
        {
                "question": "How should I format my permit correction response?",
                "answer": "Address each correction item individually by number. For each item, state whether you agree, describe the corrective action taken, and reference the specific plan sheet or document that shows the correction."
        },
        {
                "question": "What if I disagree with a permit correction item?",
                "answer": "State your disagreement clearly, explain why the original submission meets code requirements, and cite the relevant code section or standard that supports your position."
        },
        {
                "question": "Do I need to resubmit the entire plan set with my correction response?",
                "answer": "Most jurisdictions require a full resubmission with corrected sheets highlighted. Check the correction notice for specific instructions on what to include."
        },
        {
                "question": "How long do I have to respond to a permit correction notice?",
                "answer": "Correction notices may or may not include a deadline. If no deadline is stated, respond promptly to keep your application active. Contact the permit office if you need clarification."
        }
],
    },
    directory: {
      category: "Property & local government",
      bestFor: "Building, planning, zoning, inspection, and permit resubmission comments.",
      steps: ["Upload the correction notice", "Extract each correction item", "Match each item to supporting plans or documents", "Draft a point-by-point response", "Prepare the resubmission package"],
      documents: ["Correction notice", "Plans", "Permit application", "Inspection notes", "Supporting correspondence"],
      seoRoute: "/workflows/permit-correction",
      seoTitle: "Respond to a Permit Correction Notice",
      seoDescription: "Turn permit or planning corrections into a tracked response so each requested change is understood, answered, and supported.",
    },
  },

  {
    id: "dmv-notice",
    vertical: "notice-respond",
    lifecycle: "functional",
    engine: "document-action",
    title: "Respond to a DMV Notice",
    description: "Organize a DMV notice, identify the response or hearing date, and assemble the records needed for the written response.",
    disclaimer: "DMV procedures vary by state. Notice Respond is not a law firm and does not provide legal advice.",
    searchIntent: {
      primary: "respond to a DMV notice",
      secondary: ["DMV notice response", "license suspension response", "vehicle registration notice"],
      canonicalPath: "/workflows/dmv-notice",
      informationalEntryPoints: ["respond to a DMV notice"],
      actionIntents: ["respond to a DMV notice", "response letter"],
    },
    documents: [{ name: "Respond to a DMV Notice", identifiers: ["notice", "letter", "determination"], acceptedFormats: ["application/pdf", "image/*"], extractionFields: ["agency", "noticeType", "licenseOrId", "vehicleInfo", "noticeDate", "responseDeadline", "actionProposed", "requestedResponse", "recipient"] }],
    deadlines: [{ id: "response-deadline", label: "Response deadline shown on notice", trigger: "explicit deadline in notice", sourcePriority: ["uploaded notice", "official agency source"], notes: ["Do not infer a deadline when the notice provides one."] }],
    requirements: [{ id: "response-content", label: "Address each requested issue", type: "response", source: "uploaded notice", required: true }],
    evidence: [{ id: "supporting-records", label: "Supporting evidence", purpose: "Support or refute the issue identified in the notice", required: false, examples: ["license records", "registration documents", "proof of insurance", "payment receipts", "prior correspondence"] }],
    analysis: { capabilities: [...sharedCapabilities], orderedChecks: ["classify notice type", "extract deadline and instructions", "identify agency assertions", "map supporting facts", "surface contradictions and gaps", "select response strategy"], outputSections: ["notice summary", "deadline", "agency assertions", "supporting facts", "gaps", "strategy"] },
    drafting: { requiredSections: ["recipient", "reference", "response", "fact and evidence sections", "requested outcome", "attachments"], forbiddenBehavior: ["invent agency requirements", "invent facts"], validationChecks: ["every agency assertion addressed or explicitly marked", "evidence references are accurate", "submission route matches instructions"] },
    submission: { methods: ["mail", "user-directed submission"], recipientRules: ["preserve the agency's specified recipient and delivery method"], proofRequirements: ["approved response", "submission record", "tracking when applicable"] },
    capabilities: [...sharedCapabilities],
    qualityGate: sharedQualityGate,
    ux: { steps: sharedSteps, reviewChecks: sharedReviewChecks, disclaimerText: "DMV procedures vary by state. Notice Respond is not a law firm and does not provide legal advice.", mailOptions: sharedMailOptions },
    seo: {
      title: "Respond to a DMV Notice — Notice Respond",
      description: "Organize a DMV notice, identify the response or hearing date, and assemble the records needed for the written response.",
      canonical: "/workflows/dmv-notice",
      openGraph: { title: "Respond to a DMV Notice", description: "Organize a DMV notice, identify the response or hearing date, and assemble the records needed for the written response." },
      faq: [
        {
                "question": "How do I request a DMV hearing?",
                "answer": "Most DMV notices that propose suspension or revocation include instructions for requesting a hearing. Follow the instructions exactly and submit your request before the deadline stated in the notice."
        },
        {
                "question": "What happens if I miss the response deadline on a DMV notice?",
                "answer": "Missing the deadline can result in automatic suspension, fines, or other enforcement action. If the deadline has passed, contact the DMV immediately to ask if a late response is possible."
        },
        {
                "question": "Can I respond to a DMV notice by mail?",
                "answer": "Yes, most DMV notices can be responded to by mail. Certified mail is recommended for proof of timely submission. Check the notice for the accepted response methods."
        },
        {
                "question": "What should I include in my DMV response?",
                "answer": "Include your license or ID number, the notice reference number, a clear statement of your position, supporting documents, and your contact information. Address every action the notice proposes."
        }
],
    },
    directory: {
      category: "State agencies",
      bestFor: "License, registration, title, suspension, compliance, or other DMV correspondence.",
      steps: ["Upload the notice", "Identify the action and deadline", "Collect records that support your position", "Prepare the response", "Keep the submission and mailing record"],
      documents: ["DMV notice", "License or registration records", "Proof of insurance", "Supporting correspondence"],
      seoRoute: "/workflows/dmv-notice",
      seoTitle: "Respond to a DMV Notice",
      seoDescription: "Organize a DMV notice, identify the response or hearing date, and assemble the records needed for the written response.",
    },
  },

  {
    id: "ssa-notice",
    vertical: "notice-respond",
    lifecycle: "functional",
    engine: "document-action",
    title: "Respond to an SSA Notice",
    description: "Organize a Social Security notice, its deadline, stated decision or request, and the records you need for a written response or next review step.",
    disclaimer: "SSA procedures have strict deadlines. Notice Respond is not a law firm and does not provide legal advice.",
    searchIntent: {
      primary: "respond to an SSA notice",
      secondary: ["SSA notice response", "Social Security determination", "benefits appeal"],
      canonicalPath: "/workflows/ssa-notice",
      informationalEntryPoints: ["respond to an SSA notice"],
      actionIntents: ["respond to an SSA notice", "response letter"],
    },
    documents: [{ name: "Respond to an SSA Notice", identifiers: ["notice", "letter", "determination"], acceptedFormats: ["application/pdf", "image/*"], extractionFields: ["agency", "noticeType", "ssn", "claimNumber", "noticeDate", "responseDeadline", "decision", "reasonGiven", "appealRights", "requestedResponse", "recipient"] }],
    deadlines: [{ id: "response-deadline", label: "Response deadline shown on notice", trigger: "explicit deadline in notice", sourcePriority: ["uploaded notice", "official agency source"], notes: ["Do not infer a deadline when the notice provides one."] }],
    requirements: [{ id: "response-content", label: "Address each requested issue", type: "response", source: "uploaded notice", required: true }],
    evidence: [{ id: "supporting-records", label: "Supporting evidence", purpose: "Support or refute the issue identified in the notice", required: false, examples: ["benefit records", "work history", "medical records", "identity documents", "prior correspondence"] }],
    analysis: { capabilities: [...sharedCapabilities], orderedChecks: ["classify notice type", "extract deadline and instructions", "identify agency assertions", "map supporting facts", "surface contradictions and gaps", "select response strategy"], outputSections: ["notice summary", "deadline", "agency assertions", "supporting facts", "gaps", "strategy"] },
    drafting: { requiredSections: ["recipient", "reference", "response", "fact and evidence sections", "requested outcome", "attachments"], forbiddenBehavior: ["invent agency requirements", "invent facts"], validationChecks: ["every agency assertion addressed or explicitly marked", "evidence references are accurate", "submission route matches instructions"] },
    submission: { methods: ["mail", "user-directed submission"], recipientRules: ["preserve the agency's specified recipient and delivery method"], proofRequirements: ["approved response", "submission record", "tracking when applicable"] },
    capabilities: [...sharedCapabilities],
    qualityGate: sharedQualityGate,
    ux: { steps: sharedSteps, reviewChecks: sharedReviewChecks, disclaimerText: "SSA procedures have strict deadlines. Notice Respond is not a law firm and does not provide legal advice.", mailOptions: sharedMailOptions },
    seo: {
      title: "Respond to an SSA Notice — Notice Respond",
      description: "Organize a Social Security notice, its deadline, stated decision or request, and the records you need for a written response or next review step.",
      canonical: "/workflows/ssa-notice",
      openGraph: { title: "Respond to an SSA Notice", description: "Organize a Social Security notice, its deadline, stated decision or request, and the records you need for a written response or next review step." },
      faq: [
        {
                "question": "How long do I have to appeal an SSA decision?",
                "answer": "You typically have 60 days from the date you receive the notice to file an appeal. The SSA assumes you received the notice 5 days after the date on the notice unless you can show otherwise."
        },
        {
                "question": "What are the levels of SSA appeal?",
                "answer": "The SSA appeal process has four levels: reconsideration, hearing by an administrative law judge, review by the Appeals Council, and federal court. Your notice should tell you which level applies to you."
        },
        {
                "question": "What should I include in my SSA appeal letter?",
                "answer": "Include your name, Social Security number, the claim number, the decision you are appealing, why you disagree with the decision, and any new evidence that supports your claim."
        },
        {
                "question": "Can I request more time to respond to an SSA notice?",
                "answer": "The SSA may grant a good-cause extension if you have a valid reason for the delay. Contact the SSA as soon as possible to explain your situation and request more time."
        },
        {
                "question": "Should I send original documents to the SSA?",
                "answer": "No. Send copies, not originals. Keep your original documents and proof of mailing in your records."
        }
],
    },
    directory: {
      category: "Benefits & identity",
      bestFor: "Social Security notices, requests for information, and administrative decisions that require action.",
      steps: ["Upload the notice", "Record the notice date and response deadline", "Extract the stated reason or request", "Organize supporting evidence", "Prepare and review the response"],
      documents: ["SSA notice", "Benefit records", "Work or identity records when relevant", "Prior correspondence"],
      seoRoute: "/workflows/ssa-notice",
      seoTitle: "Respond to an SSA Notice",
      seoDescription: "Organize a Social Security notice, its deadline, stated decision or request, and the records you need for a written response or next review step.",
    },
  },

  {
    id: "uscis-notice",
    vertical: "notice-respond",
    lifecycle: "functional",
    engine: "document-action",
    title: "Respond to a USCIS Notice",
    description: "Keep the USCIS notice, deadline, receipt number, requested evidence, and response package organized in one workflow.",
    disclaimer: "Immigration proceedings have strict deadlines and requirements. Notice Respond is not a law firm and does not provide legal or immigration advice.",
    searchIntent: {
      primary: "respond to a USCIS notice",
      secondary: ["USCIS RFE response", "USCIS notice response", "immigration evidence request"],
      canonicalPath: "/workflows/uscis-notice",
      informationalEntryPoints: ["respond to a USCIS notice"],
      actionIntents: ["respond to a USCIS notice", "response letter"],
    },
    documents: [{ name: "Respond to a USCIS Notice", identifiers: ["notice", "letter", "determination"], acceptedFormats: ["application/pdf", "image/*"], extractionFields: ["agency", "noticeType", "receiptNumber", "caseType", "noticeDate", "responseDeadline", "evidenceRequested", "requestedAction", "recipient"] }],
    deadlines: [{ id: "response-deadline", label: "Response deadline shown on notice", trigger: "explicit deadline in notice", sourcePriority: ["uploaded notice", "official agency source"], notes: ["Do not infer a deadline when the notice provides one."] }],
    requirements: [{ id: "response-content", label: "Address each requested issue", type: "response", source: "uploaded notice", required: true }],
    evidence: [{ id: "supporting-records", label: "Supporting evidence", purpose: "Support or refute the issue identified in the notice", required: false, examples: ["filing copies", "identity documents", "financial records", "photos", "affidavits", "prior correspondence"] }],
    analysis: { capabilities: [...sharedCapabilities], orderedChecks: ["classify notice type", "extract deadline and instructions", "identify agency assertions", "map supporting facts", "surface contradictions and gaps", "select response strategy"], outputSections: ["notice summary", "deadline", "agency assertions", "supporting facts", "gaps", "strategy"] },
    drafting: { requiredSections: ["recipient", "reference", "response", "fact and evidence sections", "requested outcome", "attachments"], forbiddenBehavior: ["invent agency requirements", "invent facts"], validationChecks: ["every agency assertion addressed or explicitly marked", "evidence references are accurate", "submission route matches instructions"] },
    submission: { methods: ["mail", "user-directed submission"], recipientRules: ["preserve the agency's specified recipient and delivery method"], proofRequirements: ["approved response", "submission record", "tracking when applicable"] },
    capabilities: [...sharedCapabilities],
    qualityGate: sharedQualityGate,
    ux: { steps: sharedSteps, reviewChecks: sharedReviewChecks, disclaimerText: "Immigration proceedings have strict deadlines and requirements. Notice Respond is not a law firm and does not provide legal or immigration advice.", mailOptions: sharedMailOptions },
    seo: {
      title: "Respond to a USCIS Notice — Notice Respond",
      description: "Keep the USCIS notice, deadline, receipt number, requested evidence, and response package organized in one workflow.",
      canonical: "/workflows/uscis-notice",
      openGraph: { title: "Respond to a USCIS Notice", description: "Keep the USCIS notice, deadline, receipt number, requested evidence, and response package organized in one workflow." },
      faq: [
        {
                "question": "How long do I have to respond to a USCIS Request for Evidence?",
                "answer": "Most RFEs give you 87 days to respond. The exact deadline is stated on the RFE notice. If you miss the deadline, USCIS may deny your case based on the evidence already on file."
        },
        {
                "question": "What should I include in my RFE response package?",
                "answer": "Include the RFE notice, a cover letter listing each item of evidence requested, the evidence itself, and a copy of the receipt notice. Label everything clearly and organize by RFE item number."
        },
        {
                "question": "Can I get more time to respond to a USCIS RFE?",
                "answer": "USCIS generally does not grant extensions for RFE responses. If you cannot gather all evidence in time, submit what you have before the deadline with a letter explaining what is missing and when it will be available."
        },
        {
                "question": "Should I send original documents to USCIS?",
                "answer": "No. Send copies, not originals, unless USCIS specifically requests originals. USCIS may not return original documents."
        },
        {
                "question": "What mail type should I use for a USCIS response?",
                "answer": "Use certified mail with tracking or a courier service that provides a delivery confirmation. Keep the tracking number as proof of timely submission."
        }
],
    },
    directory: {
      category: "Immigration",
      bestFor: "Requests for Evidence, notices of intent, case correspondence, and other USCIS notices that require a response.",
      steps: ["Upload the notice", "Capture receipt/reference information", "Identify the exact request", "Organize evidence and supporting documents", "Review the response package before submission"],
      documents: ["USCIS notice", "Forms and filing copies", "Identity or status records", "Supporting evidence"],
      seoRoute: "/workflows/uscis-notice",
      seoTitle: "Respond to a USCIS Notice",
      seoDescription: "Keep the USCIS notice, deadline, receipt number, requested evidence, and response package organized in one workflow.",
    },
  },

  {
    id: "benefits-notice",
    vertical: "notice-respond",
    lifecycle: "functional",
    engine: "document-action",
    title: "Respond to a Benefits Notice",
    description: "Understand a benefits notice, preserve the stated deadline, and prepare a factual response or request for review from your records.",
    disclaimer: "Benefits programs have specific rules and deadlines. Notice Respond is not a law firm and does not provide legal advice.",
    searchIntent: {
      primary: "respond to a benefits notice",
      secondary: ["benefits notice response", "overpayment notice", "eligibility determination response"],
      canonicalPath: "/workflows/benefits-notice",
      informationalEntryPoints: ["respond to a benefits notice"],
      actionIntents: ["respond to a benefits notice", "response letter"],
    },
    documents: [{ name: "Respond to a Benefits Notice", identifiers: ["notice", "letter", "determination"], acceptedFormats: ["application/pdf", "image/*"], extractionFields: ["agency", "noticeType", "caseNumber", "programName", "noticeDate", "responseDeadline", "decision", "amount", "reasonGiven", "appealRights", "requestedResponse", "recipient"] }],
    deadlines: [{ id: "response-deadline", label: "Response deadline shown on notice", trigger: "explicit deadline in notice", sourcePriority: ["uploaded notice", "official agency source"], notes: ["Do not infer a deadline when the notice provides one."] }],
    requirements: [{ id: "response-content", label: "Address each requested issue", type: "response", source: "uploaded notice", required: true }],
    evidence: [{ id: "supporting-records", label: "Supporting evidence", purpose: "Support or refute the issue identified in the notice", required: false, examples: ["eligibility records", "payment statements", "income records", "household documentation", "prior correspondence"] }],
    analysis: { capabilities: [...sharedCapabilities], orderedChecks: ["classify notice type", "extract deadline and instructions", "identify agency assertions", "map supporting facts", "surface contradictions and gaps", "select response strategy"], outputSections: ["notice summary", "deadline", "agency assertions", "supporting facts", "gaps", "strategy"] },
    drafting: { requiredSections: ["recipient", "reference", "response", "fact and evidence sections", "requested outcome", "attachments"], forbiddenBehavior: ["invent agency requirements", "invent facts"], validationChecks: ["every agency assertion addressed or explicitly marked", "evidence references are accurate", "submission route matches instructions"] },
    submission: { methods: ["mail", "user-directed submission"], recipientRules: ["preserve the agency's specified recipient and delivery method"], proofRequirements: ["approved response", "submission record", "tracking when applicable"] },
    capabilities: [...sharedCapabilities],
    qualityGate: sharedQualityGate,
    ux: { steps: sharedSteps, reviewChecks: sharedReviewChecks, disclaimerText: "Benefits programs have specific rules and deadlines. Notice Respond is not a law firm and does not provide legal advice.", mailOptions: sharedMailOptions },
    seo: {
      title: "Respond to a Benefits Notice — Notice Respond",
      description: "Understand a benefits notice, preserve the stated deadline, and prepare a factual response or request for review from your records.",
      canonical: "/workflows/benefits-notice",
      openGraph: { title: "Respond to a Benefits Notice", description: "Understand a benefits notice, preserve the stated deadline, and prepare a factual response or request for review from your records." },
      faq: [
        {
                "question": "How do I appeal a benefits determination?",
                "answer": "Most benefits notices include appeal rights and a deadline, typically 30 to 90 days. Follow the instructions on the notice to request an appeal or fair hearing, and submit before the deadline."
        },
        {
                "question": "What should I include in my benefits appeal letter?",
                "answer": "Include your case number, the decision you are appealing, why you disagree, any new evidence, and a clear statement of the outcome you want."
        },
        {
                "question": "Can I request more time to respond to a benefits notice?",
                "answer": "Many programs allow extensions for good cause. Contact the agency as soon as possible, explain why you need more time, and document your request."
        },
        {
                "question": "What happens if I miss the response deadline?",
                "answer": "Missing the deadline may result in the decision becoming final, loss of benefits, or collection action. If the deadline has passed, contact the agency immediately to ask about late appeal options."
        }
],
    },
    directory: {
      category: "Benefits & identity",
      bestFor: "Public benefits, eligibility, overpayment, review, and program-administration notices.",
      steps: ["Upload the notice", "Capture the decision and deadline", "Organize records for each issue", "Draft the response or review request", "Keep proof of what was submitted"],
      documents: ["Benefits notice", "Eligibility records", "Payment statements", "Supporting correspondence"],
      seoRoute: "/workflows/benefits-notice",
      seoTitle: "Respond to a Benefits Notice",
      seoDescription: "Understand a benefits notice, preserve the stated deadline, and prepare a factual response or request for review from your records.",
    },
  },
];

export const workflowById = Object.fromEntries(
  noticeRespondCatalog.map((workflow) => [workflow.id, workflow]),
) as Record<string, MasterWorkflowDefinition>;

export function getWorkflowById(id: string): MasterWorkflowDefinition | undefined {
  return workflowById[id];
}

export function getWorkflowByPath(path: string): MasterWorkflowDefinition | undefined {
  return noticeRespondCatalog.find((w) => w.searchIntent.canonicalPath === path);
}

export function getFunctionalWorkflows(): MasterWorkflowDefinition[] {
  return noticeRespondCatalog.filter((w) => w.lifecycle !== "blueprint");
}

export function getAuthorityWorkflows(): MasterWorkflowDefinition[] {
  return noticeRespondCatalog.filter((w) => w.lifecycle === "authority");
}
