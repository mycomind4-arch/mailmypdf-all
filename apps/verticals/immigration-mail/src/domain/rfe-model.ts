/**
 * RFE Domain Model — Specialized intelligence for USCIS Request for Evidence
 *
 * Extends the general immigration case model with RFE-specific structures:
 * - RFE form types (I-485, I-130, I-140, I-751, H-1B, etc.)
 * - Requested evidence items
 * - Evidence checklist with per-item status
 * - RFE case identifiers (receipt number, alien number)
 * - RFE-specific deadline intelligence
 *
 * The RFE itself is the primary source for:
 * - requested items
 * - deadlines
 * - case identifiers
 * - instructions
 *
 * Do NOT infer a deadline from generic web content when the notice provides one.
 */

import type { DocumentUnderstanding } from './document-understanding';
import type { FactSource, CaseFact } from './immigration-case';

// ─── RFE Form Types ──────────────────────────────────────────────────────────

export type RFEFormType =
  | 'I-485'    // Adjustment of Status
  | 'I-130'    // Family Petition
  | 'I-140'    // Employment Petition
  | 'I-751'    // Removal of Conditions
  | 'I-129'    // H-1B / Nonimmigrant Worker
  | 'N-400'    // Naturalization
  | 'I-90'     // Green Card Renewal
  | 'I-765'    // Employment Authorization
  | 'I-864'    // Affidavit of Support
  | 'I-693'    // Medical Examination
  | 'generic'  // Not form-specific
  | 'unknown';

export const RFE_FORM_KEYWORDS: Record<RFEFormType, RegExp[]> = {
  'I-485': [/\bI-?485\b/i, /\badjustment of status\b/i, /\bpermanent residence\b/i],
  'I-130': [/\bI-?130\b/i, /\bfamily petition\b/i, /\brelative petition\b/i],
  'I-140': [/\bI-?140\b/i, /\bemployment petition\b/i, /\balien worker\b/i],
  'I-751': [/\bI-?751\b/i, /\bremoval of conditions\b/i, /\bconditional resident\b/i],
  'I-129': [/\bI-?129\b/i, /\bH-?1B\b/i, /\bnonimmigrant worker\b/i, /\bspecialty occupation\b/i],
  'N-400': [/\bN-?400\b/i, /\bnaturalization\b/i, /\bapplication for citizenship\b/i, /\bcitizenship application\b/i],
  'I-90':  [/\bI-?90\b/i, /\bgreen card renewal\b/i, /\breplace.*permanent resident card\b/i],
  'I-765': [/\bI-?765\b/i, /\bemployment authorization\b/i, /\bwork permit\b/i, /\bEAD\b/i],
  'I-864': [/\bI-?864\b/i, /\baffidavit of support\b/i, /\bfinancial sponsor\b/i],
  'I-693': [/\bI-?693\b/i, /\bmedical examination\b/i, /\bmedical.*sealed\b/i],
  'generic': [],
  'unknown': [],
};

// ─── Evidence Category ──────────────────────────────────────────────────────

export type EvidenceCategory =
  | 'identity'           // Passport, birth cert, photo ID
  | 'relationship'       // Marriage cert, birth cert, family evidence
  | 'financial'          // Tax returns, pay stubs, bank statements
  | 'employment'         // Employment verification, job letters
  | 'medical'            // Medical exams, vaccination records
  | 'education'          // Degrees, transcripts, credentials
  | 'language'           // Language test results
  | 'residence'          // Proof of address, utility bills, lease, mortgage
  | 'travel'             // Travel documents, entry/exit records
  | 'legal'              // Court records, attorney correspondence
  | 'translation'        // Certified translations
  | 'photograph'         // Passport photos
  | 'biometric'          // Fingerprints, biometrics appointment
  | 'insurance'          // Joint auto/health/life insurance policies
  | 'affidavit'          // Third-party affidavits/statements
  | 'other'
  | 'unknown';

// ─── RFE Requested Item ──────────────────────────────────────────────────────

export type EvidenceItemStatus =
  | 'have_it'           // User has this evidence
  | 'dont_have_it'      // User does not have it
  | 'need_help_finding' // User needs help finding/obtaining
  | 'not_applicable'    // Not applicable to this case
  | 'unsure'            // User is unsure
  | 'uploaded'           // Evidence has been uploaded
  | 'pending';          // Still in progress

export interface RFERequestedItem {
  id: string;
  /** What USCIS is asking for, in plain language. */
  description: string;
  descriptionEs?: string;
  /** The evidence category this item falls into. */
  category: EvidenceCategory;
  /** Status of this evidence item. */
  status: EvidenceItemStatus;
  /** Whether the RFE explicitly requested this item. */
  explicitlyRequested: boolean;
  /** Where in the RFE this was requested (page, section, quote). */
  source?: { page?: number; section?: string; quote?: string };
  /** Documents uploaded for this item. */
  uploadedDocumentIds: string[];
  /** Whether this item is required (vs. recommended). */
  required: boolean;
}

// ─── RFE Case Identifiers ────────────────────────────────────────────────────

export interface RFECaseIdentifiers {
  /** USCIS receipt number (e.g. MSC1890123456, WAC1234567890). */
  receiptNumber?: string;
  /** Alien Registration Number (A-number). */
  alienNumber?: string;
  /** USCIS online account number. */
  onlineAccountNumber?: string;
  /** Form type the RFE relates to. */
  formType: RFEFormType;
  /** Beneficiary name (the person the application is for). */
  beneficiaryName?: string;
  /** Petitioner name (the person who filed). */
  petitionerName?: string;
}

// ─── Extraction Confidence ──────────────────────────────────────────────────

export type ExtractionConfidence = 'high' | 'medium' | 'low';

// ─── RFE Analysis ─────────────────────────────────────────────────────────────
// The complete RFE-specific analysis extracted from the document.

export interface RFEAnalysis {
  /** The document understanding from the general engine. */
  documentUnderstanding: DocumentUnderstanding;
  /** RFE form type detected. */
  formType: RFEFormType;
  /** Case identifiers extracted. */
  identifiers: RFECaseIdentifiers;
  /** Evidence items requested in the RFE. */
  requestedItems: RFERequestedItem[];
  /** Response deadline from the RFE (primary source). */
  deadline?: { date: string; source: FactSource; confidence: number };
  /** Whether the RFE allows online response. */
  allowsOnlineResponse: boolean;
  /** Specific instructions from the RFE. */
  instructions: string[];
  /** RFE warnings (missing pages, unclear text, etc.) */
  warnings: string[];
  /** Plain-language summary of what USCIS is asking for. */
  summaryEn: string;
  summaryEs: string;
  /** Confidence level of the evidence extraction. */
  extractionConfidence: ExtractionConfidence;
  /** Number of itemized list items detected in the notice. */
  detectedListItemsCount: number;
}

// ─── RFE Detection ────────────────────────────────────────────────────────────

export function detectRFEFormType(text: string): RFEFormType {
  for (const [formType, patterns] of Object.entries(RFE_FORM_KEYWORDS)) {
    if (formType === 'generic' || formType === 'unknown') continue;
    for (const pattern of patterns) {
      if (pattern.test(text)) return formType as RFEFormType;
    }
  }
  return 'generic';
}

export function detectReceiptNumber(text: string): string | undefined {
  // USCIS receipt numbers: 3 letters + 10 digits, or similar patterns
  const match = text.match(/\b([A-Z]{3})(\d{10})\b/);
  if (match) return match[0];
  // Also check for common prefix patterns
  const match2 = text.match(/\b(MSC|WAC|LIN|SRC|EAC|NBC|IOE)[-_]?\d{6,12}\b/i);
  if (match2) return match2[0].toUpperCase().replace(/[-_]/, '');
  return undefined;
}

export function detectAlienNumber(text: string): string | undefined {
  // A-numbers: A followed by 7-9 digits
  const match = text.match(/\bA[-]?\d{7,9}\b/i);
  if (match) return match[0].toUpperCase().replace(/[-]/, '');
  return undefined;
}

export function detectRequestedEvidenceItems(text: string, du: DocumentUnderstanding): RFERequestedItem[] {
  const items: RFERequestedItem[] = [];
  let itemCounter = 0;
  const usedCategories = new Set<EvidenceCategory>();
  const seenDescriptions = new Set<string>();

  // 1. Use list items from document understanding's requested actions.
  //    These are the actual items parsed from the notice's itemized list —
  //    the primary, highest-confidence extraction path.
  for (const action of du.requestedActions) {
    const key = action.toLowerCase().trim();
    if (seenDescriptions.has(key)) continue;
    seenDescriptions.add(key);

    const category = categorizeEvidence(action);
    items.push({
      id: `rfe-item-${++itemCounter}`,
      description: action,
      category,
      status: 'unsure',
      explicitlyRequested: true,
      source: { quote: action },
      uploadedDocumentIds: [],
      required: true,
    });
    usedCategories.add(category);
  }

  // 2. Broadened pattern matching as supplementary/fallback extraction.
  //    Only adds items for categories not already covered by list-item extraction.
  //    Patterns are broadened to match realistic USCIS notice phrasing variants.
  //
  //    NOTE: This is a stopgap, not a real fix. Regex will always miss phrasing
  //    variants a real notice uses. The production path should route notice text
  //    through the AI extraction path (src/domain/ai-provider.ts, src/api/analyze-document.ts)
  //    for semantic extraction, with these patterns retained only as a low-confidence
  //    fallback when the AI call fails or returns nothing.
  const evidencePatterns: [EvidenceCategory, RegExp, string][] = [
    ['identity', /passport|birth certificate|national identity card|government[\-\s]?issued id/i, 'Passport, birth certificate, or identity document'],
    ['relationship', /marriage certificate|marriage license|proof of (?:bona fide|good faith) marriage|relationship evidence|bona fide|children.*born|born of the marriage/i, 'Proof of relationship (marriage certificate, etc.)'],
    ['financial', /tax return|W-?2|pay stub|bank account statement|bank statement|account statement|employment verification|proof of income|financial/i, 'Financial evidence (tax returns, pay stubs, bank statements)'],
    ['employment', /employment verification|job letter|offer letter|employer.*letter/i, 'Employment verification letter'],
    ['medical', /medical examination|Form I-?693|vaccination record|sealed medical/i, 'Medical examination (Form I-693)'],
    ['education', /degree|diploma|transcript|credential evaluation|educational.*evaluation/i, 'Educational credentials or evaluations'],
    ['language', /English.*proficiency|language.*test|IELTS|TOEFL/i, 'Language proficiency test results'],
    ['residence', /proof of residence|utility bill|lease agreement|rental agreement|lease or mortgage|mortgage document/i, 'Proof of residence'],
    ['photograph', /passport.*photo|photograph.*style|2x2.*photo/i, 'Passport-style photographs'],
    ['translation', /certified translation|certified English translation/i, 'Certified English translation of foreign-language documents'],
    ['insurance', /insurance|joint.*insurance|insurance polic|health.*insurance|auto.*insurance|life.*insurance/i, 'Evidence of joint insurance policies'],
    ['affidavit', /affidavit|third[\-\s]?party statement|personal knowledge of the relationship|letters.*friends|letters.*family/i, 'Affidavits or third-party statements'],
  ];

  for (const [category, pattern, description] of evidencePatterns) {
    if (pattern.test(text)) {
      // Skip if this category is already covered by list-item extraction
      if (usedCategories.has(category)) continue;

      // Check if the matched text is already covered by an existing list item.
      // This prevents pattern fallback from adding a duplicate when the same
      // evidence type appears in a list item but was categorized differently.
      const matchedText = text.match(pattern)?.[0]?.toLowerCase() ?? '';
      const descBase = description.split('(')[0].toLowerCase().trim();
      const alreadyCovered = items.some(i => {
        const itemDesc = i.description.toLowerCase();
        // Direct: matched text appears in an existing item's description
        if (matchedText && itemDesc.includes(matchedText)) return true;
        // Description-level: bidirectional substring match
        if (itemDesc.includes(descBase) || descBase.includes(itemDesc.split('(')[0].trim())) return true;
        return false;
      });
      if (!alreadyCovered) {
        items.push({
          id: `rfe-item-${++itemCounter}`,
          description,
          category,
          status: 'unsure',
          explicitlyRequested: true,
          source: { quote: text.match(pattern)?.[0] },
          uploadedDocumentIds: [],
          required: true,
        });
        usedCategories.add(category);
      }
    }
  }

  return items;
}

export function categorizeEvidence(text: string): EvidenceCategory {
  const patterns: [EvidenceCategory, RegExp][] = [
    // Check specific categories first to avoid false matches from broader patterns
    ['affidavit', /affidavit|third[\-\s]?party statement|personal knowledge of the relationship/i],
    ['insurance', /insurance|insurance polic|joint.*insurance/i],
    // relationship before identity: "Birth certificates of children born of the marriage"
    // is relationship evidence, not identity evidence. Standalone "birth certificate"
    // (without child/marriage context) falls through to identity correctly.
    ['relationship', /marriage|relationship|family|spouse|child|parent|bona fide|born of the marriage/i],
    ['identity', /passport|birth certificate|identity|photo id/i],
    ['financial', /tax|income|bank|salary|wage|financial|account statement/i],
    ['employment', /employment|job|work|employer/i],
    ['medical', /medical|health|vaccination|exam/i],
    ['education', /degree|diploma|transcript|education|school|university/i],
    ['language', /language|english.*proficiency|test.*score/i],
    ['residence', /residence|address|utility|lease|rental|mortgage/i],
    ['travel', /travel|entry|exit|passport.*stamp|I-94/i],
    ['legal', /court|legal|attorney|lawyer|judgment/i],
    ['translation', /translation|translate|certified.*english/i],
    ['photograph', /photo|photograph|picture/i],
    ['biometric', /biometric|fingerprint|biometrics/i],
  ];

  for (const [category, pattern] of patterns) {
    if (pattern.test(text)) return category;
  }
  return 'unknown';
}

export function detectAllowsOnlineResponse(text: string): boolean {
  return /online.*response|respond.*online|myUSCIS|USCIS.*online.*account/i.test(text);
}

export function detectInstructions(text: string): string[] {
  const instructions: string[] = [];
  if (/submit.*original/i.test(text)) instructions.push('Submit original documents (not copies).');
  if (/submit.*copy/i.test(text)) instructions.push('Submit copies are acceptable.');
  if (/translation.*certified/i.test(text)) instructions.push('All foreign-language documents must include certified English translations.');
  if (/sealed.*envelop/i.test(text)) instructions.push('Medical documents must be in a sealed envelope.');
  if (/no.*staple|do not.*staple|paperclip/i.test(text)) instructions.push('Do not use staples; use paperclips or binder clips.');
  if (/two.*holes|hole.*punch/i.test(text)) instructions.push('Use two-hole punching at the top of each page.');
  return instructions;
}

/**
 * Compute extraction confidence by comparing the number of itemized list items
 * detected in the notice to the number of evidence items actually extracted.
 *
 * - high:   extraction covers all (or nearly all) detected list items
 * - medium: extraction covers most detected list items
 * - low:    extraction covers fewer than half, or notice has a list but 0 items extracted
 */
function computeExtractionConfidence(listItemsCount: number, extractedItemsCount: number): ExtractionConfidence {
  if (listItemsCount === 0) return 'high';  // No list to compare against — can't assess
  if (extractedItemsCount === 0) return 'low';
  const ratio = extractedItemsCount / listItemsCount;
  if (ratio >= 0.8) return 'high';
  if (ratio >= 0.5) return 'medium';
  return 'low';
}

// ─── Main RFE analysis function ────────────────────────────────────────────────

export function analyzeRFE(du: DocumentUnderstanding, rawText?: string): RFEAnalysis {
  const text = (rawText ?? '') + ' ' + du.plainLanguageSummary + ' ' + du.requestedActions.join(' ') + ' ' +
    du.deadlines.map(d => d.label + ' ' + (d.date ?? '')).join(' ');

  const formType = detectRFEFormType(text);
  const receiptNumber = detectReceiptNumber(text);
  const alienNumber = detectAlienNumber(text);
  const requestedItems = detectRequestedEvidenceItems(text, du);
  const allowsOnlineResponse = detectAllowsOnlineResponse(text);
  const instructions = detectInstructions(text);

  const deadline = du.deadlines.length > 0
    ? { date: du.deadlines[0].date ?? '', source: du.deadlines[0].source, confidence: du.deadlines[0].confidence }
    : undefined;

  const warnings = [...du.warnings];
  if (du.deadlines.length === 0) warnings.push('No deadline was found in the document. Verify the response deadline manually.');
  if (requestedItems.length === 0) warnings.push('No specific evidence items were identified. Review the RFE carefully.');

  const detectedListItemsCount = du.listItems?.length ?? 0;
  const extractionConfidence = computeExtractionConfidence(detectedListItemsCount, requestedItems.length);
  if (extractionConfidence === 'low') {
    warnings.push(`Extraction confidence is LOW: ${detectedListItemsCount} itemized list item(s) detected but only ${requestedItems.length} evidence item(s) extracted. Manual review required.`);
  }

  // Generate summaries
  const formLabel = formType !== 'generic' && formType !== 'unknown' ? formType : '';
  const summaryEn = `This appears to be a USCIS Request for Evidence${formLabel ? ` related to your ${formLabel} application` : ''}. ` +
    `USCIS is asking for ${requestedItems.length} item(s)${deadline ? ` with a response deadline of ${deadline.date}` : ''}. ` +
    (instructions.length > 0 ? `Special instructions: ${instructions.join(' ')}` : '');

  const summaryEs = `Esto parece ser una Solicitud de Evidencia de USCIS${formLabel ? ` relacionada con su solicitud de ${formLabel}` : ''}. ` +
    `USCIS está pidiendo ${requestedItems.length} elemento(s)${deadline ? ` con una fecha límite de respuesta de ${deadline.date}` : ''}. ` +
    (instructions.length > 0 ? `Instrucciones especiales: ${instructions.join(' ')}` : '');

  return {
    documentUnderstanding: du,
    formType,
    identifiers: {
      receiptNumber,
      alienNumber,
      formType,
    },
    requestedItems,
    deadline,
    allowsOnlineResponse,
    instructions,
    warnings,
    summaryEn,
    summaryEs,
    extractionConfidence,
    detectedListItemsCount,
  };
}
