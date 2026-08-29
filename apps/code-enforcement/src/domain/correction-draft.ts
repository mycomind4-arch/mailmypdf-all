/**
 * Correction Draft Engine
 *
 * Generates a professional correction/amendment request.
 *
 * Sections: Date, Agency, Property, Case number, Subject, Identification of issue,
 * Supporting evidence, Requested correction, Requested clarification, Requested confirmation,
 * Next-step request, Contact information, Attachments.
 *
 * Never fabricate: facts, dates, legal citations, ordinances, complaints, agency conduct.
 * Never make unsupported accusations.
 * Avoid unnecessary legal conclusions, threats, or inflammatory language.
 * Follow the minimal-effective-correction principle.
 */

import type { CorrectionIssue } from './correction-issue-engine';
import type { CorrectionStrategyType } from './correction-strategy';
import type { NoticeExtraction } from './notice-extraction';

// ─── Draft Types ──────────────────────────────────────────────────────────────

export interface CorrectionDraftSection {
  heading: string;
  content: string;
  source?: string;
}

export interface CorrectionDraft {
  sections: CorrectionDraftSection[];
  fullText: string;
  warnings: string[];
  fabricationCheck: CorrectionFabricationCheck;
  draftVersion: string;
  generatedAt: string;
}

export interface CorrectionFabricationCheck {
  passed: boolean;
  issues: string[];
}

// ─── Fabrication Check ─────────────────────────────────────────────────────────

function checkFabrication(sections: CorrectionDraftSection[]): CorrectionFabricationCheck {
  const issues: string[] = [];

  // Check for fabricated legal citations
  const legalCitationPattern = /\d+\s+U\.S\.C\.\s+§\s*\d+|\d+\s+Cal\.\s+\w+\s+§\s*\d+|Humboldt\s+County\s+Code\s+§\s*\d+/i;
  for (const section of sections) {
    const matches = section.content.match(legalCitationPattern);
    if (matches && !section.source) {
      issues.push(`Potential fabricated legal citation in section "${section.heading}": ${matches[0]}`);
    }
  }

  // Check for unsupported accusations
  const accusationPattern = /illegal|unlawful|unconstitutional|violated\s+(?:your|my|the)\s+rights|bad\s+faith/i;
  for (const section of sections) {
    if (accusationPattern.test(section.content)) {
      issues.push(`Potentially inflammatory or unsupported legal language in section "${section.heading}"`);
    }
  }

  // Check for threats
  const threatPattern = /I\s+will\s+sue|legal\s+action\s+will\s+be\s+taken|I\s+will\s+file\s+a\s+(?:complaint|lawsuit)/i;
  for (const section of sections) {
    if (threatPattern.test(section.content)) {
      issues.push(`Threatening language detected in section "${section.heading}"`);
    }
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}

// ─── Draft Generation ─────────────────────────────────────────────────────────

export function generateCorrectionDraft(input: {
  extraction: NoticeExtraction;
  issues: CorrectionIssue[];
  strategies: CorrectionStrategyType[];
  agencyName?: string;
  propertyAddress?: string;
  caseNumber?: string;
  noticeDate?: string;
  recipientName?: string;
  deceasedName?: string;
  jurisdictionName?: string;
}): CorrectionDraft {
  const sections: CorrectionDraftSection[] = [];
  const warnings: string[] = [];

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const agency = input.agencyName ?? input.extraction.agency.value ?? '[Agency Name]';
  const address = input.propertyAddress ?? input.extraction.propertyAddress.value ?? '[Property Address]';
  const caseNum = input.caseNumber ?? input.extraction.caseNumber.value ?? '[Case Number]';

  // Date
  sections.push({
    heading: 'Date',
    content: today,
  });

  // Agency
  sections.push({
    heading: 'Agency',
    content: agency,
    source: 'extraction.agency',
  });

  // Property
  sections.push({
    heading: 'Property',
    content: address,
    source: 'extraction.propertyAddress',
  });

  // Case number
  sections.push({
    heading: 'Case Number',
    content: caseNum,
    source: 'extraction.caseNumber',
  });

  // Subject
  const subjectParts: string[] = ['Request for Correction of Inspection Notice'];
  if (input.issues.some((i) => i.category === 'DECEASED_RECIPIENT')) {
    subjectParts.push('— Recipient Information Requires Update');
  }
  sections.push({
    heading: 'Subject',
    content: subjectParts.join(' '),
  });

  // Identification of issue
  const issueDescriptions = input.issues.map((i) => `• ${i.category.replace(/_/g, ' ')}: ${i.description}`);
  sections.push({
    heading: 'Identification of Issue(s)',
    content: issueDescriptions.join('\n'),
    source: 'correction-issue-engine',
  });

  // Supporting evidence
  const evidenceParts: string[] = [];
  if (input.issues.some((i) => i.category === 'DECEASED_RECIPIENT') && input.deceasedName) {
    evidenceParts.push(`The notice is addressed to ${input.deceasedName}, who is reported to be deceased. The current responsible party for this property has not been established.`);
  }
  const propertyMismatch = input.issues.find((i) => i.category === 'WRONG_APN' || i.category === 'WRONG_ADDRESS' || i.category === 'WRONG_PROPERTY');
  if (propertyMismatch) {
    evidenceParts.push(`The property information on the notice does not match available property records: ${propertyMismatch.description}`);
  }
  if (input.issues.some((i) => i.category === 'MISSING_AUTHORITY')) {
    evidenceParts.push('The notice does not cite specific statutory or regulatory authority for the requested inspection.');
  }
  if (input.issues.some((i) => i.category === 'MISSING_COMPLAINT_BASIS' || i.category === 'WRONG_COMPLAINT_NUMBER')) {
    evidenceParts.push('The notice does not include a complaint number or complaint reference.');
  }
  if (input.issues.some((i) => i.category === 'AMBIGUOUS_SCOPE' || i.category === 'MISSING_SCOPE')) {
    evidenceParts.push('The inspection scope is not clearly defined in the notice.');
  }

  if (evidenceParts.length === 0) {
    evidenceParts.push('The following correction(s) are requested based on the analysis of the notice and available records.');
  }

  sections.push({
    heading: 'Supporting Information',
    content: evidenceParts.join('\n'),
    source: 'reconciliation-analysis',
  });

  // Requested correction
  const corrections: string[] = [];
  if (input.strategies.includes('CORRECT_RECIPIENT')) {
    corrections.push('Please update the responsible-party/recipient information for this matter. Please identify the person or entity the agency currently recognizes as responsible for this property and confirm whether an amended notice should be issued.');
  }
  if (input.strategies.includes('CORRECT_PROPERTY')) {
    corrections.push('Please correct the property address, APN, or parcel information on the notice to match current property records.');
  }
  if (input.strategies.includes('CORRECT_OWNER')) {
    corrections.push('Please update the ownership information to reflect current county property records.');
  }
  if (input.strategies.includes('CORRECT_CASE_INFORMATION')) {
    corrections.push('Please confirm the correct case number for this matter.');
  }
  if (input.strategies.includes('CORRECT_COMPLAINT_REFERENCE')) {
    corrections.push('Please provide the complaint number, complaint date, and complaint basis for this matter.');
  }
  if (input.strategies.includes('CORRECT_DEADLINE')) {
    corrections.push('Please confirm the correct response deadline and identify the statutory or regulatory basis for the deadline.');
  }
  if (corrections.length === 0) {
    corrections.push('Please review and correct the identified issue(s) on the notice.');
  }
  sections.push({
    heading: 'Requested Correction(s)',
    content: corrections.map((c) => `• ${c}`).join('\n'),
    source: 'correction-strategy-engine',
  });

  // Requested clarification
  const clarifications: string[] = [];
  if (input.strategies.includes('CLARIFY_SCOPE')) {
    clarifications.push('Please specify the exact scope of the requested inspection, including: what areas of the property, what activities are contemplated, what alleged conditions are being investigated, whether interior access is requested, and the expected duration.');
  }
  if (input.strategies.includes('CLARIFY_AUTHORITY')) {
    clarifications.push('Please identify the specific ordinance, statute, regulation, order, or other authority under which the requested inspection is being sought.');
  }
  if (input.strategies.includes('CLARIFY_PURPOSE')) {
    clarifications.push('Please clarify the stated purpose of the inspection.');
  }
  if (clarifications.length > 0) {
    sections.push({
      heading: 'Requested Clarification(s)',
      content: clarifications.map((c) => `• ${c}`).join('\n'),
      source: 'correction-strategy-engine',
    });
  }

  // Requested confirmation
  sections.push({
    heading: 'Requested Confirmation',
    content: 'Please confirm in writing whether an amended notice will be issued and whether the response deadline will be adjusted accordingly.',
  });

  // Next-step request
  sections.push({
    heading: 'Next Steps',
    content: 'I look forward to your response to these correction requests. Please let me know if any additional information is needed. I am willing to cooperate with a properly documented inspection request.',
  });

  // Contact information
  sections.push({
    heading: 'Contact Information',
    content: '[Your Name]\n[Your Address]\n[Your Phone]\n[Your Email]',
  });

  // Build full text
  const fullText = sections
    .map((s) => `${s.heading.toUpperCase()}\n${'─'.repeat(s.heading.length)}\n${s.content}`)
    .join('\n\n');

  // Fabrication check
  const fabricationCheck = checkFabrication(sections);
  if (!fabricationCheck.passed) {
    warnings.push(...fabricationCheck.issues);
  }

  // Check for missing essential data
  if (!input.extraction.agency.value) {
    warnings.push('Agency name not extracted — draft contains placeholder.');
  }
  if (!input.extraction.propertyAddress.value) {
    warnings.push('Property address not extracted — draft contains placeholder.');
  }

  return {
    sections,
    fullText,
    warnings,
    fabricationCheck,
    draftVersion: '2.0.0',
    generatedAt: new Date().toISOString(),
  };
}
