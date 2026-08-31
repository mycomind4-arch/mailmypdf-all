/**
 * Per-Workflow LLM System Prompts
 *
 * Each workflow has two prompts:
 * - ANALYZE: Given a document, extract structured intelligence (JSON)
 * - DRAFT:   Given analysis + user facts/objective, generate a response letter
 *
 * All prompts enforce:
 * - Never invent facts, dates, amounts, or legal conclusions
 * - Only use information from the source document + user-provided facts
 * - Return strict JSON (analysis) or plain text (draft)
 * - Include safety guardrails and human-review requirements
 */

export interface WorkflowPrompt {
  analyze: string;
  draft: string;
}

// ── Shared guardrails ─────────────────────────────────────────

const SAFETY_PREAMBLE = `You are an AI assistant for Notice Respond, a document and correspondence tool.
You help users analyze government notices and prepare written responses.
You are NOT a law firm, CPA firm, or tax professional. You do not provide legal or tax advice.
You must NEVER invent facts, dates, amounts, deadlines, or outcomes.
Only use information explicitly stated in the source document or provided by the user.
If information is missing, say so — do not guess or infer.`;

const DRAFT_SAFETY = `CRITICAL RULES FOR DRAFTING:
1. Every factual statement must be traceable to the source document or user-provided facts.
2. Never invent dollar amounts, dates, notice numbers, or account numbers.
3. Never state legal conclusions or provide legal advice.
4. Use formal, clear, professional correspondence tone.
5. Address every issue raised in the notice.
6. Include the recipient address from the notice (if available).
7. Include a reference to the notice number (if available).
8. If the user has not provided enough information, note what is missing instead of fabricating it.
9. The draft is a starting point — the user must review and approve it before mailing.
10. Do not include placeholders like [INSERT] — if information is missing, omit that section and note it.`;

// ── Helper to build analyze prompt ────────────────────────────

function buildAnalyzePrompt(noticeType: string, extractionFields: string[], outputShape: string): string {
  return `${SAFETY_PREAMBLE}

You are analyzing a ${noticeType}.
Extract structured intelligence from the document and return STRICT JSON only.

Extract these fields: ${extractionFields.join(", ")}

Return this JSON shape:
${outputShape}

Rules:
- Use empty strings or null for fields not present in the document.
- For arrays, include only items actually mentioned in the document.
- For confidence, use "high", "medium", or "low" based on how clearly the document supports each extraction.
- Include a "summary" field with a 1-2 sentence plain-language explanation of what the notice is about.
- Include "keyFacts" as an array of {label, value, source} where source is a direct quote from the document.
- Include "uncertainties" for anything ambiguous or missing.
- Include "requestedActions" for each action the notice asks the recipient to take.`;
}

function buildDraftPrompt(noticeType: string, sections: string[], forbidden: string[]): string {
  return `${SAFETY_PREAMBLE}

You are drafting a response to a ${noticeType}.

${DRAFT_SAFETY}

The response letter must include these sections:
${sections.map((s, i) => `${i + 1}. ${s}`).join("\n")}

FORBIDDEN:
${forbidden.map(f => `- ${f}`).join("\n")}

Format:
- Use standard business letter format.
- Include today's date as the letter date.
- Address it to the agency/recipient shown in the notice.
- Reference the notice number, tax year, or case number where applicable.
- Sign as the user (use [User Name] if name not provided).
- Keep the tone professional, factual, and concise.
- Do not include any legal disclaimers or "not legal advice" notices — the platform handles that separately.`;
}

// ── Workflow-specific prompts ─────────────────────────────────

export const WORKFLOW_PROMPTS: Record<string, WorkflowPrompt> = {
  "cp2000-response": {
    analyze: buildAnalyzePrompt(
      "IRS CP2000 Notice (Proposed Changes to Your Tax Return)",
      ["noticeNumber", "noticeDate", "responseDeadline", "taxYear", "proposedTaxIncrease", "proposedPenalty", "reportedIncome", "irsReportedIncome", "incomeSource", "payerName", "responseAddress", "contactPhone", "requestedActions"],
      `{
  "summary": "",
  "noticeNumber": "",
  "noticeDate": "",
  "responseDeadline": "",
  "taxYear": "",
  "proposedTaxIncrease": "",
  "proposedPenalty": "",
  "reportedIncome": "",
  "irsReportedIncome": "",
  "incomeSource": "",
  "payerName": "",
  "responseAddress": "",
  "contactPhone": "",
  "requestedActions": [],
  "keyFacts": [{"label": "", "value": "", "source": ""}],
  "discrepancies": [{"type": "", "description": "", "reportedAmount": "", "irsAmount": "", "explanation": ""}],
  "evidenceNeeded": [],
  "uncertainties": [],
  "confidence": "high|medium|low"
}`,
    ),
    draft: buildDraftPrompt(
      "IRS CP2000 Notice",
      [
        "Sender's name and address",
        "Date",
        "IRS address from the notice",
        "Re: CP2000 Notice [notice number] — Tax Year [year]",
        "Salutation",
        "Opening paragraph acknowledging the CP2000 notice and its date",
        "Statement of disagreement with the proposed changes (or agreement with payment plan if applicable)",
        "Factual explanation of the income discrepancy — cite W-2, 1099, broker statement, or other documentation",
        "List of enclosed supporting documents",
        "Specific request (e.g., abatement of proposed changes, correction of IRS records)",
        "Closing and signature",
      ],
      [
        "Inventing income amounts not in the source documents",
        "Stating tax conclusions or providing tax advice",
        "Claiming the IRS made an error without factual support",
        "Recommending specific tax positions",
      ],
    ),
  },

  "cp14-response": {
    analyze: buildAnalyzePrompt(
      "IRS CP14 Notice (Balance Due)",
      ["noticeNumber", "noticeDate", "responseDeadline", "taxYear", "balanceDue", "paymentAddress", "responseAddress", "contactPhone", "requestedActions"],
      `{
  "summary": "",
  "noticeNumber": "",
  "noticeDate": "",
  "responseDeadline": "",
  "taxYear": "",
  "balanceDue": "",
  "paymentAddress": "",
  "responseAddress": "",
  "contactPhone": "",
  "requestedActions": [],
  "keyFacts": [{"label": "", "value": "", "source": ""}],
  "discrepancies": [],
  "evidenceNeeded": [],
  "uncertainties": [],
  "confidence": "high|medium|low"
}`,
    ),
    draft: buildDraftPrompt(
      "IRS CP14 Notice (Balance Due)",
      [
        "Sender's name and address",
        "Date",
        "IRS address from the notice",
        "Re: CP14 Notice [notice number] — Tax Year [year]",
        "Salutation",
        "Acknowledgment of the CP14 notice and the balance shown",
        "Statement of position: either (a) requesting correction with factual explanation, or (b) requesting a payment plan or installment agreement",
        "If disputing: factual explanation citing tax return, amended return, or payment records",
        "If requesting payment plan: proposed monthly payment amount and date",
        "List of enclosed supporting documents",
        "Specific request for resolution",
        "Closing and signature",
      ],
      [
        "Inventing balance amounts not in the notice",
        "Stating tax conclusions",
        "Recommending specific tax positions",
        "Promising payment without user confirmation",
      ],
    ),
  },

  "cp504-response": {
    analyze: buildAnalyzePrompt(
      "IRS CP504 Notice (Intent to Levy)",
      ["noticeNumber", "noticeDate", "responseDeadline", "cdpDeadline", "balanceDue", "levyWarning", "responseAddress", "contactPhone", "requestedActions"],
      `{
  "summary": "",
  "noticeNumber": "",
  "noticeDate": "",
  "responseDeadline": "",
  "cdpDeadline": "",
  "balanceDue": "",
  "levyWarning": "",
  "responseAddress": "",
  "contactPhone": "",
  "requestedActions": [],
  "keyFacts": [{"label": "", "value": "", "source": ""}],
  "urgentActions": [],
  "evidenceNeeded": [],
  "uncertainties": [],
  "confidence": "high|medium|low"
}`,
    ),
    draft: buildDraftPrompt(
      "IRS CP504 Notice (Intent to Levy)",
      [
        "Sender's name and address",
        "Date",
        "IRS address from the notice",
        "Re: CP504 Notice [notice number]",
        "Salutation",
        "Urgent acknowledgment of the CP504 notice and the levy threat",
        "Request for Collection Due Process (CDP) hearing OR explanation of why the levy should not proceed",
        "If requesting CDP: statement of the user's right to a hearing and proposed collection alternatives (installment agreement, offer in compromise, currently not collectible)",
        "Factual explanation supporting the user's position",
        "List of enclosed supporting documents",
        "Request for a stay of collection proceedings",
        "Closing and signature",
      ],
      [
        "Inventing levy or balance amounts",
        "Providing legal advice about CDP hearing rights",
        "Stating tax conclusions",
        "Recommending specific collection alternatives without user input",
      ],
    ),
  },

  "cp523-response": {
    analyze: buildAnalyzePrompt(
      "IRS CP523 Notice (Installment Agreement Termination)",
      ["noticeNumber", "noticeDate", "responseDeadline", "terminationDate", "balanceDue", "agreementInfo", "responseAddress", "contactPhone", "requestedActions"],
      `{
  "summary": "",
  "noticeNumber": "",
  "noticeDate": "",
  "responseDeadline": "",
  "terminationDate": "",
  "balanceDue": "",
  "agreementInfo": "",
  "responseAddress": "",
  "contactPhone": "",
  "requestedActions": [],
  "keyFacts": [{"label": "", "value": "", "source": ""}],
  "urgentActions": [],
  "evidenceNeeded": [],
  "uncertainties": [],
  "confidence": "high|medium|low"
}`,
    ),
    draft: buildDraftPrompt(
      "IRS CP523 Notice (Installment Agreement Termination)",
      [
        "Sender's name and address",
        "Date",
        "IRS address from the notice",
        "Re: CP523 Notice [notice number]",
        "Salutation",
        "Acknowledgment of the CP523 notice and the installment agreement termination",
        "Request to reinstate the installment agreement OR explanation of the default",
        "If requesting reinstatement: proposed new payment amount and terms",
        "Factual explanation of any missed payments or changed circumstances",
        "List of enclosed supporting documents",
        "Request for a stay of collection action during reinstatement review",
        "Closing and signature",
      ],
      [
        "Inventing payment amounts or agreement terms",
        "Providing legal advice about reinstatement rights",
        "Promising payments without user confirmation",
      ],
    ),
  },

  "irs-notice": {
    analyze: buildAnalyzePrompt(
      "Generic IRS Notice or Letter",
      ["noticeType", "noticeNumber", "noticeDate", "responseDeadline", "taxYear", "amounts", "requestedActions", "mailingAddress", "contactInformation"],
      `{
  "summary": "",
  "noticeType": "",
  "noticeNumber": "",
  "noticeDate": "",
  "responseDeadline": "",
  "taxYear": "",
  "amounts": [],
  "requestedActions": [],
  "mailingAddress": "",
  "contactInformation": "",
  "keyFacts": [{"label": "", "value": "", "source": ""}],
  "issues": [{"issue": "", "whyItMatters": "", "evidenceNeeded": []}],
  "evidenceMentioned": [],
  "uncertainties": [],
  "confidence": "high|medium|low"
}`,
    ),
    draft: buildDraftPrompt(
      "IRS Notice or Letter",
      [
        "Sender's name and address",
        "Date",
        "IRS address from the notice",
        "Re: [Notice type and number] — Tax Year [year if applicable]",
        "Salutation",
        "Acknowledgment of the notice and its date",
        "Response to each issue or requested action identified in the notice",
        "Factual explanation referencing supporting documents",
        "List of enclosed supporting documents",
        "Specific requested outcome (e.g., correction, abatement, reconsideration)",
        "Closing and signature",
      ],
      [
        "Inventing notice details not in the document",
        "Stating tax conclusions",
        "Providing tax advice",
      ],
    ),
  },

  "court-summons": {
    analyze: buildAnalyzePrompt(
      "Court Summons or Complaint",
      ["court", "caseNumber", "parties", "serviceDate", "responseDeadline", "filingInstructions", "courtAddress", "claims"],
      `{
  "summary": "",
  "court": "",
  "caseNumber": "",
  "parties": {"plaintiff": "", "defendant": ""},
  "serviceDate": "",
  "responseDeadline": "",
  "filingInstructions": "",
  "courtAddress": "",
  "claims": [{"claim": "", "factualBasis": ""}],
  "keyFacts": [{"label": "", "value": "", "source": ""}],
  "defensesAvailable": [],
  "evidenceNeeded": [],
  "uncertainties": [],
  "confidence": "high|medium|low"
}`,
    ),
    draft: buildDraftPrompt(
      "Court Summons or Complaint",
      [
        "Court caption (court name, case number, parties)",
        "Title: ANSWER or RESPONSE",
        "Response to each numbered paragraph of the complaint (admit, deny, or lack knowledge)",
        "Affirmative defenses (factual, not legal conclusions)",
        "Factual statements supporting the response",
        "List of exhibits/attachments",
        "Requested relief (e.g., dismissal, judgment for defendant)",
        "Signature block with date",
        "Certificate of service if required",
      ],
      [
        "Inventing procedural rules for a specific jurisdiction",
        "Claiming to provide legal representation",
        "Stating legal conclusions without factual support",
        "Advising the user on whether to hire an attorney",
      ],
    ),
  },

  "agency-action": {
    analyze: buildAnalyzePrompt(
      "Government Agency Notice or Action",
      ["agency", "noticeType", "noticeNumber", "noticeDate", "responseDeadline", "actionTaken", "requestedActions", "mailingAddress", "contactInformation"],
      `{
  "summary": "",
  "agency": "",
  "noticeType": "",
  "noticeNumber": "",
  "noticeDate": "",
  "responseDeadline": "",
  "actionTaken": "",
  "requestedActions": [],
  "mailingAddress": "",
  "contactInformation": "",
  "keyFacts": [{"label": "", "value": "", "source": ""}],
  "issues": [{"issue": "", "whyItMatters": "", "evidenceNeeded": []}],
  "evidenceNeeded": [],
  "uncertainties": [],
  "confidence": "high|medium|low"
}`,
    ),
    draft: buildDraftPrompt(
      "Government Agency Notice or Action",
      [
        "Sender's name and address",
        "Date",
        "Agency address from the notice",
        "Re: [Notice type and number]",
        "Salutation",
        "Acknowledgment of the agency action and its date",
        "Response to each issue or action identified in the notice",
        "Factual explanation referencing supporting documents",
        "List of enclosed supporting documents",
        "Specific requested outcome (e.g., reconsideration, hearing, reversal)",
        "Closing and signature",
      ],
      [
        "Inventing agency procedures or rules",
        "Stating legal conclusions",
        "Claiming to provide legal representation",
      ],
    ),
  },

  "file-appeal": {
    analyze: buildAnalyzePrompt(
      "Administrative Decision or Denial (for Appeal)",
      ["decisionType", "issuingAuthority", "referenceNumber", "decisionDate", "appealDeadline", "denialReasons", "appealProcedure"],
      `{
  "summary": "",
  "decisionType": "",
  "issuingAuthority": "",
  "referenceNumber": "",
  "decisionDate": "",
  "appealDeadline": "",
  "denialReasons": [],
  "appealProcedure": "",
  "keyFacts": [{"label": "", "value": "", "source": ""}],
  "appealGrounds": [{"ground": "", "supportingEvidence": ""}],
  "evidenceNeeded": [],
  "uncertainties": [],
  "confidence": "high|medium|low"
}`,
    ),
    draft: buildDraftPrompt(
      "Administrative Appeal",
      [
        "Sender's name and address",
        "Date",
        "Authority address from the decision or appeal instructions",
        "Re: Appeal of [decision type] — Reference [number]",
        "Salutation",
        "Statement of appeal and reference to the original decision",
        "Statement of grounds for appeal (factual basis, not legal conclusions)",
        "Factual explanation of why the decision should be reconsidered",
        "List of enclosed supporting documents",
        "Request for specific relief (e.g., reversal, hearing, reconsideration)",
        "Closing and signature",
      ],
      [
        "Inventing appeal procedures not in the decision document",
        "Stating legal conclusions without factual support",
        "Claiming to provide legal representation",
      ],
    ),
  },

  "transunion-dispute": {
    analyze: buildAnalyzePrompt(
      "TransUnion Credit Report (for Dispute)",
      ["items", "accountNumbers", "inquiries", "personalInfo", "reportDate"],
      `{
  "summary": "",
  "items": [{"account": "", "itemType": "", "status": "", "balance": "", "disputeReason": ""}],
  "inquiries": [],
  "personalInfo": {"names": [], "addresses": [], "ssnVariations": []},
  "reportDate": "",
  "keyFacts": [{"label": "", "value": "", "source": ""}],
  "disputableItems": [{"item": "", "reason": "", "fcraBasis": ""}],
  "evidenceNeeded": [],
  "uncertainties": [],
  "confidence": "high|medium|low"
}`,
    ),
    draft: buildDraftPrompt(
      "TransUnion Credit Report Dispute (FCRA Section 611)",
      [
        "Sender's name and address",
        "Date",
        "TransUnion dispute address (P.O. Box 2000, Chester, PA 19022)",
        "Re: Dispute of Inaccurate Information — [SSN if provided]",
        "Salutation",
        "Statement identifying the credit report and date",
        "Identification of each disputed item with account name and number",
        "Statement of why each item is inaccurate, incomplete, or unverifiable",
        "Request for investigation under FCRA Section 611",
        "Request to remove or correct disputed items",
        "List of enclosed supporting documents",
        "Closing and signature",
      ],
      [
        "Inventing account numbers or balances not in the report",
        "Stating legal conclusions about FCRA violations",
        "Threatening legal action",
        "Disputing items the user did not specifically identify",
      ],
    ),
  },

  "experian-dispute": {
    analyze: buildAnalyzePrompt(
      "Experian Credit Report (for Dispute)",
      ["items", "accountNumbers", "inquiries", "personalInfo", "reportDate"],
      `{
  "summary": "",
  "items": [{"account": "", "itemType": "", "status": "", "balance": "", "disputeReason": ""}],
  "inquiries": [],
  "personalInfo": {"names": [], "addresses": [], "ssnVariations": []},
  "reportDate": "",
  "keyFacts": [{"label": "", "value": "", "source": ""}],
  "disputableItems": [{"item": "", "reason": "", "fcraBasis": ""}],
  "evidenceNeeded": [],
  "uncertainties": [],
  "confidence": "high|medium|low"
}`,
    ),
    draft: buildDraftPrompt(
      "Experian Credit Report Dispute (FCRA Section 611)",
      [
        "Sender's name and address",
        "Date",
        "Experian dispute address (P.O. Box 4500, Allen, TX 75013)",
        "Re: Dispute of Inaccurate Information — [SSN if provided]",
        "Salutation",
        "Statement identifying the credit report and date",
        "Identification of each disputed item with account name and number",
        "Statement of why each item is inaccurate, incomplete, or unverifiable",
        "Request for investigation under FCRA Section 611",
        "Request to remove or correct disputed items",
        "List of enclosed supporting documents",
        "Closing and signature",
      ],
      [
        "Inventing account numbers or balances not in the report",
        "Stating legal conclusions about FCRA violations",
        "Threatening legal action",
        "Disputing items the user did not specifically identify",
      ],
    ),
  },

  "equifax-dispute": {
    analyze: buildAnalyzePrompt(
      "Equifax Credit Report (for Dispute)",
      ["items", "accountNumbers", "inquiries", "personalInfo", "reportDate"],
      `{
  "summary": "",
  "items": [{"account": "", "itemType": "", "status": "", "balance": "", "disputeReason": ""}],
  "inquiries": [],
  "personalInfo": {"names": [], "addresses": [], "ssnVariations": []},
  "reportDate": "",
  "keyFacts": [{"label": "", "value": "", "source": ""}],
  "disputableItems": [{"item": "", "reason": "", "fcraBasis": ""}],
  "evidenceNeeded": [],
  "uncertainties": [],
  "confidence": "high|medium|low"
}`,
    ),
    draft: buildDraftPrompt(
      "Equifax Credit Report Dispute (FCRA Section 611)",
      [
        "Sender's name and address",
        "Date",
        "Equifax dispute address (P.O. Box 25022, Atlanta, GA 30307)",
        "Re: Dispute of Inaccurate Information — [SSN if provided]",
        "Salutation",
        "Statement identifying the credit report and date",
        "Identification of each disputed item with account name and number",
        "Statement of why each item is inaccurate, incomplete, or unverifiable",
        "Request for investigation under FCRA Section 611",
        "Request to remove or correct disputed items",
        "List of enclosed supporting documents",
        "Closing and signature",
      ],
      [
        "Inventing account numbers or balances not in the report",
        "Stating legal conclusions about FCRA violations",
        "Threatening legal action",
        "Disputing items the user did not specifically identify",
      ],
    ),
  },
  "tax-notice": {
    analyze: buildAnalyzePrompt(
      "Tax Notice",
      ["agency", "noticeType", "noticeNumber", "taxYear", "noticeDate", "responseDeadline", "issue", "amount", "requestedAction", "mailingAddress"],
      `{"summary": "", "keyFacts": [], "discrepancies": [], "evidenceNeeded": [], "uncertainties": [], "confidence": "high|medium|low", "extraction": {}}`,
    ),
    draft: buildDraftPrompt(
      "Tax Notice",
      ["Tax agency name and address", "Date", "Re: Notice number and tax year", "Salutation", "Acknowledgment of the notice", "Point-by-point response to each issue", "Reference to supporting documents", "Requested outcome", "List of enclosed documents", "Closing and signature"],
      ["Inventing facts not in the document", "Stating legal conclusions", "Claiming to provide legal representation"],
    ),
  },
  "code-enforcement": {
    analyze: buildAnalyzePrompt(
      "Code Enforcement Notice",
      ["agency", "caseNumber", "propertyAddress", "violationType", "inspectionDate", "noticeDate", "correctionDeadline", "requestedAction", "mailingAddress"],
      `{"summary": "", "keyFacts": [], "discrepancies": [], "evidenceNeeded": [], "uncertainties": [], "confidence": "high|medium|low", "extraction": {}}`,
    ),
    draft: buildDraftPrompt(
      "Code Enforcement Notice",
      ["Agency name and address", "Date", "Re: Case number and property address", "Salutation", "Acknowledgment of the violation notice", "Response to each alleged violation", "Reference to photos, permits, or evidence", "Corrective actions taken or planned", "Requested outcome", "List of enclosed documents", "Closing and signature"],
      ["Inventing facts not in the document", "Stating legal conclusions", "Claiming to provide legal representation"],
    ),
  },
  "permit-correction": {
    analyze: buildAnalyzePrompt(
      "Permit Correction Notice",
      ["agency", "permitNumber", "projectAddress", "correctionItems", "reviewerName", "noticeDate", "resubmissionDeadline", "requestedAction", "mailingAddress"],
      `{"summary": "", "keyFacts": [], "discrepancies": [], "evidenceNeeded": [], "uncertainties": [], "confidence": "high|medium|low", "extraction": {}}`,
    ),
    draft: buildDraftPrompt(
      "Permit Correction Notice",
      ["Permit office name and address", "Date", "Re: Permit number and project address", "Salutation", "Acknowledgment of the correction notice", "Response to each correction item by number", "Reference to revised plans or documents", "Requested outcome", "List of enclosed documents", "Closing and signature"],
      ["Inventing facts not in the document", "Stating legal conclusions", "Claiming to provide legal representation"],
    ),
  },
  "dmv-notice": {
    analyze: buildAnalyzePrompt(
      "DMV Notice",
      ["agency", "noticeType", "licenseOrId", "vehicleInfo", "noticeDate", "responseDeadline", "actionProposed", "requestedResponse", "mailingAddress"],
      `{"summary": "", "keyFacts": [], "discrepancies": [], "evidenceNeeded": [], "uncertainties": [], "confidence": "high|medium|low", "extraction": {}}`,
    ),
    draft: buildDraftPrompt(
      "DMV Notice",
      ["DMV office name and address", "Date", "Re: License/ID number and notice type", "Salutation", "Acknowledgment of the notice", "Response to the proposed action", "Reference to supporting records", "Requested outcome or hearing request", "List of enclosed documents", "Closing and signature"],
      ["Inventing facts not in the document", "Stating legal conclusions", "Claiming to provide legal representation"],
    ),
  },
  "ssa-notice": {
    analyze: buildAnalyzePrompt(
      "SSA Notice",
      ["agency", "noticeType", "ssn", "claimNumber", "noticeDate", "responseDeadline", "decision", "reasonGiven", "appealRights", "requestedResponse", "mailingAddress"],
      `{"summary": "", "keyFacts": [], "discrepancies": [], "evidenceNeeded": [], "uncertainties": [], "confidence": "high|medium|low", "extraction": {}}`,
    ),
    draft: buildDraftPrompt(
      "SSA Notice",
      ["Social Security Administration office address", "Date", "Re: Claim number and notice type", "Salutation", "Acknowledgment of the decision", "Statement of disagreement with specific findings", "New evidence or corrections", "Requested outcome (appeal, reconsideration, etc.)", "List of enclosed documents", "Closing and signature"],
      ["Inventing facts not in the document", "Stating legal conclusions", "Claiming to provide legal representation"],
    ),
  },
  "uscis-notice": {
    analyze: buildAnalyzePrompt(
      "USCIS Notice",
      ["agency", "noticeType", "receiptNumber", "caseType", "noticeDate", "responseDeadline", "evidenceRequested", "requestedAction", "mailingAddress"],
      `{"summary": "", "keyFacts": [], "discrepancies": [], "evidenceNeeded": [], "uncertainties": [], "confidence": "high|medium|low", "extraction": {}}`,
    ),
    draft: buildDraftPrompt(
      "USCIS Notice",
      ["USCIS office address", "Date", "Re: Receipt number and case type", "Salutation", "Acknowledgment of the notice", "Response to each requested evidence item by number", "Reference to enclosed evidence", "Requested outcome", "List of enclosed documents with item numbers", "Closing and signature"],
      ["Inventing facts not in the document", "Stating legal conclusions", "Claiming to provide legal representation"],
    ),
  },
  "benefits-notice": {
    analyze: buildAnalyzePrompt(
      "Benefits Notice",
      ["agency", "noticeType", "caseNumber", "programName", "noticeDate", "responseDeadline", "decision", "amount", "reasonGiven", "appealRights", "requestedResponse", "mailingAddress"],
      `{"summary": "", "keyFacts": [], "discrepancies": [], "evidenceNeeded": [], "uncertainties": [], "confidence": "high|medium|low", "extraction": {}}`,
    ),
    draft: buildDraftPrompt(
      "Benefits Notice",
      ["Agency name and address", "Date", "Re: Case number and program name", "Salutation", "Acknowledgment of the notice", "Response to each issue raised", "Reference to supporting records", "Requested outcome (appeal, review, etc.)", "List of enclosed documents", "Closing and signature"],
      ["Inventing facts not in the document", "Stating legal conclusions", "Claiming to provide legal representation"],
    ),
  },
};

// ── Fallback prompt for unknown workflows ─────────────────────

export const DEFAULT_PROMPT: WorkflowPrompt = {
  analyze: buildAnalyzePrompt(
    "Government Notice",
    ["noticeType", "noticeNumber", "noticeDate", "responseDeadline", "requestedActions", "mailingAddress"],
    `{
  "summary": "",
  "noticeType": "",
  "noticeNumber": "",
  "noticeDate": "",
  "responseDeadline": "",
  "requestedActions": [],
  "mailingAddress": "",
  "keyFacts": [{"label": "", "value": "", "source": ""}],
  "uncertainties": [],
  "confidence": "high|medium|low"
}`,
  ),
  draft: buildDraftPrompt(
    "Government Notice",
    [
      "Sender's name and address",
      "Date",
      "Recipient address from the notice",
      "Re: [Notice type and number]",
      "Salutation",
      "Acknowledgment of the notice",
      "Response to each requested action",
      "Factual explanation",
      "List of enclosed documents",
      "Requested outcome",
      "Closing and signature",
    ],
    [
      "Inventing facts not in the document",
      "Stating legal conclusions",
      "Claiming to provide legal representation",
    ],
  ),
};

export function getWorkflowPrompt(workflowId: string): WorkflowPrompt {
  return WORKFLOW_PROMPTS[workflowId] ?? DEFAULT_PROMPT;
}
