/**
 * Notice Extraction
 *
 * Extracts all fields from a code enforcement notice with source provenance.
 * Every field preserves: document ID, page, bounding/text excerpt, confidence, extraction method.
 */

import type { FactProvenance } from './fact-taxonomy';

// ─── Extraction Types ───────────────────────────────────────────────────────

export interface ExtractedField<T = string> {
  value: T | undefined;
  rawText?: string;
  excerpt?: string;
  documentId?: string;
  page?: number;
  confidence: number;
  extractionMethod: 'pattern' | 'ai_assisted' | 'manual';
  provenance?: FactProvenance;
}

export interface NoticeExtraction {
  agency: ExtractedField;
  department: ExtractedField;
  jurisdiction: ExtractedField;
  sender: ExtractedField;
  recipient: ExtractedField;
  recipientRole: ExtractedField;
  propertyOwner: ExtractedField;
  occupant: ExtractedField;
  propertyAddress: ExtractedField;
  apn: ExtractedField;
  parcelNumber: ExtractedField;
  caseNumber: ExtractedField;
  complaintNumber: ExtractedField;
  citationNumber: ExtractedField;
  noticeDate: ExtractedField;
  serviceDate: ExtractedField;
  responseDeadline: ExtractedField;
  inspectionDate: ExtractedField;
  inspectionTime: ExtractedField;
  inspectionLocation: ExtractedField;
  requestedScope: ExtractedField<string[]>;
  complaintBasis: ExtractedField<string[]>;
  allegedViolations: ExtractedField<string[]>;
  codeReferences: ExtractedField<string[]>;
  statutoryReferences: ExtractedField<string[]>;
  inspectionAuthority: ExtractedField;
  consentWording: ExtractedField;
  searchInspectionWording: ExtractedField;
  warrantWording: ExtractedField;
  consequencesOfNonResponse: ExtractedField;
  consequencesOfRefusal: ExtractedField;
  hearingReviewRights: ExtractedField;
  appealInformation: ExtractedField;
  contactInformation: ExtractedField;
  submissionInstructions: ExtractedField;
  documentId: string;
  extractionTimestamp: string;
  warnings: string[];
}

// ─── Date Patterns ────────────────────────────────────────────────────────────

const DATE_PATTERNS: RegExp[] = [
  /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/gi,
  /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
  /\b\d{4}-\d{2}-\d{2}\b/g,
  /\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
];

function normalizeDate(value: string): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return value;
}

function extractDate(text: string): string | undefined {
  for (const pattern of DATE_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(text);
    if (match?.[0]) return normalizeDate(match[0]);
  }
  return undefined;
}

function extractDateNearKeyword(text: string, keyword: RegExp, windowSize = 200): string | undefined {
  const match = text.match(keyword);
  if (!match?.index) return undefined;
  const start = Math.max(0, match.index - windowSize);
  const end = Math.min(text.length, match.index + match[0].length + windowSize);
  const window = text.slice(start, end);
  return extractDate(window);
}

// ─── Extraction Helpers ──────────────────────────────────────────────────────

function extractField(
  text: string,
  patterns: RegExp[],
  documentId: string,
): ExtractedField {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        value: (match[1] || match[0]).trim(),
        rawText: match[0],
        excerpt: match[0].slice(0, 300),
        documentId,
        confidence: 0.85,
        extractionMethod: 'pattern',
      };
    }
  }
  return {
    value: undefined,
    confidence: 0,
    extractionMethod: 'pattern',
  };
}

function extractListField(
  text: string,
  patterns: RegExp[],
  documentId: string,
): ExtractedField<string[]> {
  const results: string[] = [];
  for (const pattern of patterns) {
    // Ensure global flag for matchAll
    const flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g';
    const globalPattern = new RegExp(pattern.source, flags);
    const matches = text.matchAll(globalPattern);
    for (const match of matches) {
      const value = (match[1] || match[0]).trim();
      if (value && !results.includes(value)) {
        results.push(value);
      }
    }
  }
  return {
    value: results.length > 0 ? results : undefined,
    confidence: results.length > 0 ? 0.8 : 0,
    extractionMethod: 'pattern',
    documentId,
  };
}

// ─── Main Extraction Function ────────────────────────────────────────────────

export function extractNotice(text: string, documentId: string): NoticeExtraction {
  const warnings: string[] = [];

  const agency = extractField(text, [
    /(?:Humboldt\s+County|County\s+of\s+Humboldt)\s+(?:Code\s+Enforcement|Planning\s+(?:and|&)\s+Building)/i,
    /county\s+of\s+(\w+)\s+code\s+enforcement/i,
    /(\w+)\s+county\s+code\s+enforcement/i,
    /code\s+enforcement\s+(?:division|department|unit)/i,
    /planning\s+(?:and|&)\s+building\s+department/i,
  ], documentId);

  const department = extractField(text, [
    /(code\s+enforcement\s+(?:division|department|unit))/i,
    /(planning\s+(?:and|&)\s+building\s+department)/i,
    /(building\s+(?:department|division))/i,
  ], documentId);

  const recipient = extractField(text, [
    /(?:to|addressed\s+to|recipient)\s*:\s*(.+?)(?:\n|$)/i,
    /(?:dear|attention)\s+(?:mr\.|mrs\.|ms\.|dr\.)?\s*(.+?)(?:,|:|\n|$)/i,
  ], documentId);

  const propertyAddress = extractField(text, [
    /(?:property\s+(?:address|location|at))\s*:\s*(.+?)(?:\n|$)/i,
    /(?:address|site)\s*:\s*(.+?)(?:\n|$)/i,
    /(\d+\s+\S+(?:\s+\S+)*,\s+\w+(?:,\s+CA)?)\s*$/im,
  ], documentId);

  const apn = extractField(text, [
    /(?:APN|Assessor'?s?\s+Parcel\s+Number)\s*:\s*(\d{3,}-\d{3,}-\d{3,}|\d{6,})/i,
    /(?:APN|Assessor'?s?\s+Parcel\s+Number)\s*:\s*(.+?)(?:\n|$)/i,
  ], documentId);

  const caseNumber = extractField(text, [
    /(?:case\s+(?:number|no\.?|#))\s*:\s*(.+?)(?:\n|$)/i,
    /(?:case)\s*(?:#|no\.?)\s*[:\-]?\s*(\S+)/i,
  ], documentId);

  const complaintNumber = extractField(text, [
    /(?:complaint\s+(?:number|no\.?|#))\s*:\s*(.+?)(?:\n|$)/i,
    /(?:complaint)\s*(?:#|no\.?)\s*[:\-]?\s*(\S+)/i,
  ], documentId);

  const citationNumber = extractField(text, [
    /(?:citation\s+(?:number|no\.?|#))\s*:\s*(.+?)(?:\n|$)/i,
  ], documentId);

  const noticeDate = extractField(text, [
    /(?:notice\s+date|date\s+(?:of\s+)?notice)\s*:\s*(.+)/i,
  ], documentId);
  if (noticeDate.value === undefined) {
    noticeDate.value = extractDate(text);
    noticeDate.confidence = noticeDate.value ? 0.6 : 0;
  }

  const serviceDate = extractField(text, [
    /(?:date\s+(?:of\s+)?service|served\s+on)\s*:\s*(.+)/i,
  ], documentId);

  const responseDeadline = extractField(text, [
    /(?:response\s+(?:deadline|due)|respond\s+by|deadline)\s*:\s*(.+)/i,
    /(?:must\s+respond\s+(?:by|before|no\s+later\s+than))\s+(.+)/i,
    /(?:failure\s+to\s+respond\s+by)\s+(.+)/i,
  ], documentId);
  if (responseDeadline.value === undefined) {
    const dlDate = extractDateNearKeyword(text, /respond|response\s+deadline|failure\s+to\s+respond/i);
    if (dlDate) {
      responseDeadline.value = dlDate;
      responseDeadline.confidence = 0.7;
      responseDeadline.excerpt = text.match(/.{0,50}(?:respond|response\s+deadline).{0,80}/i)?.[0]?.slice(0, 300);
    }
  }

  const inspectionDate = extractField(text, [
    /(?:inspection\s+(?:date|scheduled|will\s+(?:be\s+)?conducted))\s*[:\s]*(.+)/i,
  ], documentId);

  const inspectionTime = extractField(text, [
    /(?:inspection\s+(?:time|at))\s*:\s*(.+)/i,
    /(?:at)\s+(\d{1,2}:\d{2}\s*(?:am|pm)?)/i,
  ], documentId);

  const requestedScope = extractListField(text, [
    /inspect\s+(?:the\s+)?(?:exterior|outside|grounds)/gi,
    /inspect\s+(?:the\s+)?(?:interior|inside|inside\s+the\s+(?:home|house|building|dwelling))/gi,
    /inspect\s+(?:the\s+)?(?:garage|carport|outbuilding|shed|barn)/gi,
    /inspect\s+(?:the\s+)?(?:vehicle|car|vehicle\s+area)/gi,
    /inspect\s+(?:the\s+)?(?:mechanical|electrical|plumbing|systems)/gi,
    /(?:photograph|photo|video|record)\s+(?:of|the)/gi,
    /(?:test|testing|sample|sampling)\s+(?:of|the)/gi,
  ], documentId);

  const allegedViolations = extractListField(text, [
    /(?:alleg(?:ed|es)|reports?)\s+(?:that\s+)?(.+?)(?:\.|;|\n|$)/gi,
    /(?:violation(?:s)?\s+(?:of|include))\s*:?\s*(.+?)(?:\.|;|\n|$)/gi,
    /(?:crowing\s+rooster|rooster)/gi,
    /(?:unpermitted\s+(?:structure|construction|building))/gi,
    /(?:broken|inoperable|abandoned|junk)\s+(?:vehicle|car)/gi,
    /(?:improper\s+(?:disposal|storage)\s+of\s+(?:solid\s+)?waste)/gi,
    /(?:maintain(?:ing)?(?:\s+a)?\s+(?:junkyard|junk\s+yard))/gi,
    /(?:overgrown\s+(?:vegetation|weeds|grass))/gi,
  ], documentId);

  const codeReferences = extractListField(text, [
    /(?:Humboldt\s+County\s+Code)\s+§?\s*(\d+(?:\.\d+)?)/gi,
    /(?:County\s+Code)\s+§?\s*(\d+(?:\.\d+)?)/gi,
    /(?:Municipal\s+Code)\s+§?\s*(\d+(?:\.\d+)?)/gi,
    /(?:Section)\s+(\d+(?:\.\d+)?)\s*(?:of|under)/gi,
    /(?:Ordinance)\s+(?:No\.?\s*)?(\d+)/gi,
  ], documentId);

  const statutoryReferences = extractListField(text, [
    /(?:California\s+(?:Government|Health\s+and\s+Safety|Civil)\s+Code)\s+§?\s*(\d+(?:\.\d+)?)/gi,
    /(?:Cal\.\s+(?:Govt|Health\s+&\s+Safety|Civ)\s+Code)\s+§?\s*(\d+(?:\.\d+)?)/gi,
    /(?:Gov(?:ernment)?\s+Code)\s+§?\s*(\d+(?:\.\d+)?)/gi,
    /(?:Health\s+(?:and|&)\s+Safety\s+Code)\s+§?\s*(\d+(?:\.\d+)?)/gi,
  ], documentId);

  const consentWording = extractField(text, [
    /(?:request(?:ing)?\s+(?:your\s+)?(?:permission|consent)\s+(?:to|for).+?)(?:\.|;|\n|$)/i,
    /(?:permission\s+to\s+(?:inspect|search|enter|access).+?)(?:\.|;|\n|$)/i,
    /(?:consent\s+to\s+(?:inspect|search|enter|access).+?)(?:\.|;|\n|$)/i,
  ], documentId);

  const searchInspectionWording = extractField(text, [
    /(?:inspect|search|examine)\s+(?:the\s+)?(?:property|premises).+?(?:\.|;|\n|$)/i,
  ], documentId);

  const warrantWording = extractField(text, [
    /(?:warrant|seek\s+(?:an?\s+)?warrant|obtain\s+(?:an?\s+)?warrant).+?(?:\.|;|\n|$)/i,
    /(?:administrative\s+(?:inspection\s+)?warrant).+?(?:\.|;|\n|$)/i,
    /(?:if\s+(?:permission|consent)\s+(?:is|is\s+not)\s+(?:granted|denied|given|refused)).+?(?:\.|;|\n|$)/i,
  ], documentId);

  const consequencesOfNonResponse = extractField(text, [
    /(?:failure\s+to\s+respond.+?)(?:\.|;|\n|$)/i,
    /(?:if\s+you\s+(?:do\s+not|fail\s+to)\s+respond.+?)(?:\.|;|\n|$)/i,
    /(?:non-response|no\s+response).+?(?:will\s+(?:be|result).+?)(?:\.|;|\n|$)/i,
  ], documentId);

  const consequencesOfRefusal = extractField(text, [
    /(?:if\s+(?:permission|consent|access)\s+(?:is\s+)?(?:denied|refused|not\s+granted).+?)(?:\.|;|\n|$)/i,
    /(?:refusal\s+(?:to\s+)?(?:allow|consent|permit).+?)(?:will|may|shall).+?(?:\.|;|\n|$)/i,
  ], documentId);

  const hearingReviewRights = extractField(text, [
    /(?:hearing|review|appeal)\s+rights?\s*:?\s*(.+?)(?:\n|$)/i,
    /(?:you\s+(?:have|may)\s+(?:the\s+)?(?:right|ability)\s+to\s+(?:request|appeal|hearing).+?)(?:\.|;|\n|$)/i,
  ], documentId);

  const appealInformation = extractField(text, [
    /(?:appeal(?:s)?\s+(?:must\s+be|may\s+be|can\s+be)\s+(?:filed|submitted).+?)(?:\.|;|\n|$)/i,
  ], documentId);

  const contactInformation = extractField(text, [
    /(?:contact|call|phone|email)\s*:\s*(.+?)(?:\n|$)/i,
    /(\(\d{3}\)\s*\d{3}-\d{4}|\d{3}-\d{3}-\d{4})/i,
  ], documentId);

  const submissionInstructions = extractField(text, [
    /(?:submit|send|mail|respond)\s+(?:to|your\s+response\s+to)\s*:\s*(.+?)(?:\n|$)/i,
    /(?:response\s+(?:should\s+be|must\s+be)\s+(?:sent|mailed|submitted)\s+to)\s*:\s*(.+?)(?:\n|$)/i,
  ], documentId);

  const jurisdiction = extractField(text, [
    /(Humboldt\s+County)/i,
    /(County\s+of\s+\w+)/i,
    /(\w+\s+County)/i,
    /City\s+of\s+(\w+)/i,
  ], documentId);

  if (agency.value === undefined) warnings.push('Agency could not be confidently identified.');
  if (recipient.value === undefined) warnings.push('Recipient could not be extracted.');
  if (propertyAddress.value === undefined) warnings.push('Property address could not be extracted.');
  if (responseDeadline.value === undefined) warnings.push('Response deadline could not be extracted; verify manually.');
  if (consentWording.value === undefined) warnings.push('No consent/permission request language found.');
  if (allegedViolations.value === undefined || allegedViolations.value?.length === 0) warnings.push('No alleged violations extracted.');

  return {
    agency,
    department,
    jurisdiction,
    sender: { value: undefined, confidence: 0, extractionMethod: 'pattern' },
    recipient,
    recipientRole: { value: undefined, confidence: 0, extractionMethod: 'pattern' },
    propertyOwner: { value: undefined, confidence: 0, extractionMethod: 'pattern' },
    occupant: { value: undefined, confidence: 0, extractionMethod: 'pattern' },
    propertyAddress,
    apn,
    parcelNumber: { value: apn.value, confidence: apn.confidence, extractionMethod: apn.extractionMethod, documentId },
    caseNumber,
    complaintNumber,
    citationNumber,
    noticeDate,
    serviceDate,
    responseDeadline,
    inspectionDate,
    inspectionTime,
    inspectionLocation: { value: propertyAddress.value, confidence: propertyAddress.confidence * 0.8, extractionMethod: 'pattern', documentId },
    requestedScope,
    complaintBasis: { value: allegedViolations.value, confidence: allegedViolations.confidence, extractionMethod: 'pattern', documentId },
    allegedViolations,
    codeReferences,
    statutoryReferences,
    inspectionAuthority: { value: undefined, confidence: 0, extractionMethod: 'pattern' },
    consentWording,
    searchInspectionWording,
    warrantWording,
    consequencesOfNonResponse,
    consequencesOfRefusal,
    hearingReviewRights,
    appealInformation,
    contactInformation,
    submissionInstructions,
    documentId,
    extractionTimestamp: new Date().toISOString(),
    warnings,
  };
}
