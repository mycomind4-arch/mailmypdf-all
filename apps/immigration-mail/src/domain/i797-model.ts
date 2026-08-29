/**
 * I-797 Notice Classification & Routing
 *
 * I-797 is a USCIS Notice of Action. There are multiple subtypes:
 * I-797, I-797A, I-797B, I-797C, I-797D, I-797E, I-797F
 *
 * This is NOT a mailing product. It is document understanding + routing:
 * 1. Classify the I-797 subtype
 * 2. Explain what it means
 * 3. Identify case status
 * 4. Route to the appropriate canonical workflow (RFE, NOID, Denial, etc.)
 *
 * The user does not need to know which I-797 subtype they received.
 */

// ─── I-797 Subtypes ──────────────────────────────────────────────────────────────

export type I797Subtype =
  | 'I-797'    // Original notice (various)
  | 'I-797A'   // Replacement I-94 + approval (in-person)
  | 'I-797B'   // Approval + consular processing
  | 'I-797C'   // Notice of Action (receipt, rejection, transfer, re-open, etc.)
  | 'I-797D'   // Benefit card (e.g., EAD card)
  | 'I-797E'   // Notice of Action (NACARA)
  | 'I-797F'   // Notice of Action (fingerprint, interview, etc.)
  | 'unknown';

export type I797ActionType =
  | 'receipt'            // Application received
  | 'approval'           // Application approved
  | 'denial'             // Application denied
  | 'rfe'                // Request for Evidence
  | 'noid'               // Notice of Intent to Deny
  | 'transfer'           // Case transferred
  | 'interview'          // Interview scheduled
  | 'biometrics'         // Biometrics appointment
  | 'rejection'          // Application rejected (fee, format)
  | 'reopening'          // Case reopened
  | 'revocation'         // Approval revoked
  | 'withdrawal_ack'     // Withdrawal acknowledged
  | 'delay'              // Case pending beyond normal processing time
  | 'unknown';

export type RoutingTarget =
  | 'rfe-response'
  | 'noid-response'
  | 'uscis-denial-rejection'
  | 'immigration-appeal-letter'
  | 'i-130-response'
  | 'uscis-foia'
  | 'case-inquiry'
  | 'biometrics-scheduling'
  | 'naturalization-citizenship'
  | 'consular-processing'
  | 'i751-removal-conditions'
  | 'no_action'
  | 'unknown';

export interface I797Analysis {
  subtype: I797Subtype;
  actionType: I797ActionType;
  formType?: string;
  receiptNumber?: string;
  aNumber?: string;
  caseStatus: string;
  date?: string;
  routingTarget: RoutingTarget;
  routingReason: string;
  summaryEn: string;
  summaryEs?: string;
  nextSteps: string[];
  urgent: boolean;
}

// ─── Classification ──────────────────────────────────────────────────────────────

export function detectI797Subtype(text: string): I797Subtype {
  if (/I-?797A\b/i.test(text)) return 'I-797A';
  if (/I-?797B\b/i.test(text)) return 'I-797B';
  if (/I-?797C\b/i.test(text)) return 'I-797C';
  if (/I-?797D\b/i.test(text)) return 'I-797D';
  if (/I-?797E\b/i.test(text)) return 'I-797E';
  if (/I-?797F\b/i.test(text)) return 'I-797F';
  if (/I-?797\b/i.test(text)) return 'I-797';
  return 'unknown';
}

export function detectI797ActionType(text: string): I797ActionType {
  const lower = text.toLowerCase();

  if (/request for evidence|rfe|requesting.{0,20}evidence|additional evidence/i.test(text)) return 'rfe';
  if (/notice of intent to deny|noid|intends to deny|intent to deny/i.test(text)) return 'noid';
  if (/denied|denial/i.test(lower) && !/intent to deny/i.test(lower)) return 'denial';
  if (/rejected|rejection/i.test(lower)) return 'rejection';
  if (/revocation|revoke/i.test(lower)) return 'revocation';
  if (/approved|approval|granted/i.test(lower)) return 'approval';
  if (/transfer/i.test(lower)) return 'transfer';
  if (/interview/i.test(lower)) return 'interview';
  if (/biometric|fingerprint|ASC appointment/i.test(lower)) return 'biometrics';
  if (/reopen/i.test(lower)) return 'reopening';
  if (/withdrawal|withdrawn/i.test(lower)) return 'withdrawal_ack';
  if (/receipt|received|acceptance/i.test(lower)) {
    // Check if user mentions delay/outside processing time
    if (/delay|outside.{0,20}processing|taking too long|haven.{0,5}t heard|months|too long/i.test(lower)) return 'delay';
    return 'receipt';
  }

  return 'unknown';
}

export function routeI797(actionType: I797ActionType): { target: RoutingTarget; reason: string } {
  switch (actionType) {
    case 'rfe':
      return { target: 'rfe-response', reason: 'This notice contains a Request for Evidence. Route to RFE Response engine.' };
    case 'noid':
      return { target: 'noid-response', reason: 'This is a Notice of Intent to Deny. Route to NOID Response engine.' };
    case 'denial':
      return { target: 'uscis-denial-rejection', reason: 'This is a denial. Route to Denial Response engine.' };
    case 'rejection':
      return { target: 'uscis-denial-rejection', reason: 'This is a rejection. Route to Denial Response engine.' };
    case 'revocation':
      return { target: 'immigration-appeal-letter', reason: 'Approval revoked. Route to Appeal engine for I-290B appeal.' };
    case 'approval':
      return { target: 'no_action', reason: 'This is an approval notice. No action needed.' };
    case 'receipt':
      return { target: 'no_action', reason: 'This is a receipt notice. No action needed.' };
    case 'transfer':
      return { target: 'no_action', reason: 'Case transferred. No action needed unless contacted.' };
    case 'interview':
      return { target: 'no_action', reason: 'Interview scheduled. Attend the interview.' };
    case 'biometrics':
      return { target: 'no_action', reason: 'Biometrics appointment scheduled. Attend the appointment.' };
    case 'reopening':
      return { target: 'no_action', reason: 'Case reopened. Monitor for next steps.' };
    case 'delay':
      return { target: 'case-inquiry', reason: 'Case appears delayed beyond normal processing time. Route to Case Inquiry engine.' };
    case 'withdrawal_ack':
      return { target: 'no_action', reason: 'Withdrawal acknowledged. No further action needed.' };
    default:
      return { target: 'unknown', reason: 'Cannot determine routing. Manual review needed.' };
  }
}

export function analyzeI797(text: string): I797Analysis {
  const subtype = detectI797Subtype(text);
  const actionType = detectI797ActionType(text);
  const { target: routingTarget, reason: routingReason } = routeI797(actionType);

  const receiptMatch = text.match(/\b([A-Z]{3}\d{10})\b/);
  const receiptNumber = receiptMatch?.[1];

  const aNumberMatch = text.match(/\bA\s*\d{8,9}\b/);
  const aNumber = aNumberMatch?.[0];

  const formMatch = text.match(/\b(I-?(?:485|130|140|751|129|90|765|864|693|290B)|N-?400)\b/i);
  const formType = formMatch?.[0].toUpperCase();

  const dateMatch = text.match(/(?:dated|date)\s*:?\s*([A-Z][a-z]+ \d{1,2},?\s*\d{4})/i);
  const date = dateMatch?.[1];

  const caseStatus =
    actionType === 'rfe' ? 'RFE issued' :
    actionType === 'noid' ? 'NOID issued' :
    actionType === 'denial' ? 'Denied' :
    actionType === 'rejection' ? 'Rejected' :
    actionType === 'approval' ? 'Approved' :
    actionType === 'receipt' ? 'Received' :
    actionType === 'transfer' ? 'Transferred' :
    actionType === 'interview' ? 'Interview scheduled' :
    actionType === 'biometrics' ? 'Biometrics scheduled' :
    actionType === 'revocation' ? 'Revoked' :
    actionType === 'reopening' ? 'Reopened' :
    actionType === 'withdrawal_ack' ? 'Withdrawn' :
    'Unknown';

  const urgent = actionType === 'rfe' || actionType === 'noid' || actionType === 'denial' || actionType === 'rejection' || actionType === 'revocation';

  const summaryEn = `This is ${subtype === 'unknown' ? 'a USCIS notice' : `Form ${subtype}`}. ` +
    `Action: ${caseStatus}. ` +
    (formType ? `Form: ${formType}. ` : '') +
    (receiptNumber ? `Receipt: ${receiptNumber}. ` : '') +
    (routingTarget !== 'no_action' && routingTarget !== 'unknown'
      ? `This requires action: ${routingReason} `
      : `${routingReason} `);

  const summaryEs = `Este es ${subtype === 'unknown' ? 'un aviso de USCIS' : `Formulario ${subtype}`}. ` +
    `Acción: ${caseStatus}. ` +
    (routingTarget !== 'no_action' && routingTarget !== 'unknown'
      ? `Esto requiere acción. `
      : `No se requiere acción. `);

  const nextSteps: string[] = [];
  if (actionType === 'rfe') {
    nextSteps.push('Read the RFE carefully and note the deadline.');
    nextSteps.push('Upload your RFE to get help preparing your response.');
  } else if (actionType === 'noid') {
    nextSteps.push('Read every denial ground in the NOID.');
    nextSteps.push('Upload your NOID to get help preparing your response.');
  } else if (actionType === 'denial' || actionType === 'rejection') {
    nextSteps.push('Read the denial or rejection notice carefully.');
    nextSteps.push('Upload the notice to determine next steps.');
  } else if (actionType === 'revocation') {
    nextSteps.push('Your approval was revoked.');
    nextSteps.push('You may be able to appeal with Form I-290B.');
  } else if (actionType === 'interview') {
    nextSteps.push('Attend your interview on the scheduled date.');
    nextSteps.push('Bring all requested documents.');
  } else if (actionType === 'biometrics') {
    nextSteps.push('Attend your biometrics appointment.');
    nextSteps.push('Bring the appointment notice and photo ID.');
  } else if (actionType === 'approval') {
    nextSteps.push('Your application was approved. Check for any next steps in the notice.');
  } else if (actionType === 'receipt') {
    nextSteps.push('Your application was received. Wait for the next notice.');
  } else {
    nextSteps.push('Review the notice carefully.');
  }

  return {
    subtype, actionType, formType, receiptNumber, aNumber, caseStatus, date,
    routingTarget, routingReason, summaryEn, summaryEs, nextSteps, urgent,
  };
}
