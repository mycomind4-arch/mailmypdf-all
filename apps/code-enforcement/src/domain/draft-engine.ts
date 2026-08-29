/**
 * Draft Engine
 *
 * Creates a factual, professional response.
 * Never fabricates: facts, dates, legal citations, ordinances, complaints, agency conduct, witnesses, records.
 * Never makes unsupported accusations.
 */

import type { NoticeExtraction } from './notice-extraction';
import type { StrategyType } from './strategy-engine';

// ─── Draft Types ──────────────────────────────────────────────────────────────

export interface DraftSection {
  heading: string;
  content: string;
  source?: string; // Which extraction/analysis field this section is based on
}

export interface ResponseDraft {
  sections: DraftSection[];
  fullText: string;
  warnings: string[];
  fabricationCheck: FabricationCheck;
  draftVersion: string;
  generatedAt: string;
}

export interface FabricationCheck {
  passed: boolean;
  issues: string[];
}

// ─── Draft Generation ─────────────────────────────────────────────────────────

export function generateDraft(input: {
  extraction: NoticeExtraction;
  strategies: StrategyType[];
  recipientName?: string;
  propertyAddress?: string;
  caseNumber?: string;
  deadlineDate?: string;
  reportedDeceased?: boolean;
  deceasedName?: string;
  agencyName?: string;
  jurisdictionName?: string;
}): ResponseDraft {
  const sections: DraftSection[] = [];
  const warnings: string[] = [];
  const fabricationIssues: string[] = [];

  // Date
  const today = new Date().toISOString().slice(0, 10);
  sections.push({
    heading: 'Date',
    content: today,
  });

  // Agency
  sections.push({
    heading: 'Agency',
    content: input.agencyName || input.extraction.agency.value || '[AGENCY NAME — to be confirmed]',
    source: 'notice-extraction:agency',
  });

  // Property
  sections.push({
    heading: 'Property',
    content: input.propertyAddress || input.extraction.propertyAddress.value || '[PROPERTY ADDRESS — to be confirmed]',
    source: 'notice-extraction:propertyAddress',
  });

  // Case number
  sections.push({
    heading: 'Case Number',
    content: input.caseNumber || input.extraction.caseNumber.value || '[CASE NUMBER — to be confirmed]',
    source: 'notice-extraction:caseNumber',
  });

  // Subject
  sections.push({
    heading: 'Subject',
    content: `Response to Code Enforcement Inspection Request${input.caseNumber ? ` — Case ${input.caseNumber}` : ''}`,
  });

  // Acknowledgment
  sections.push({
    heading: 'Acknowledgment',
    content: 'I am writing in response to the code enforcement notice received regarding the above-referenced property. I acknowledge receipt of the notice and am providing this response within the timeframe stated in the notice.',
  });

  // Recipient discrepancy (if applicable)
  if (input.reportedDeceased && input.deceasedName) {
    sections.push({
      heading: 'Recipient Discrepancy',
      content: `I note that the notice appears to be addressed to ${input.deceasedName}, who is reportedly deceased. I am seeking clarification regarding the current responsible party for this property and whether the agency's records reflect the current ownership or occupancy status. This notification is provided in good faith to ensure accurate communication.`,
      source: 'property-intelligence:deceased-recipient',
    });
    warnings.push('Deceased recipient discrepancy included in draft. Verify the deceased person\'s name and date of death before sending.');
  }

  // Complaint/reference clarification
  if (input.strategies.includes('REQUEST_COMPLAINT_INFORMATION')) {
    sections.push({
      heading: 'Complaint Reference Clarification',
      content: 'I respectfully request that the agency provide the complaint number, complaint date, and the specific allegations on which this inspection request is based. This information is necessary to properly understand and respond to the notice.',
      source: 'strategy:REQUEST_COMPLAINT_INFORMATION',
    });
  }

  // Inspection scope clarification
  if (input.strategies.includes('REQUEST_INSPECTION_SCOPE')) {
    sections.push({
      heading: 'Inspection Scope Clarification',
      content: 'I respectfully request clarification regarding the specific scope of the requested inspection. Specifically, I seek to understand whether the inspection is limited to the exterior of the property, or whether it includes the interior of the residence, outbuildings, vehicle areas, or other specific areas. This information is necessary to provide an informed response.',
      source: 'strategy:REQUEST_INSPECTION_SCOPE',
    });
  }

  // Authority/source request
  if (input.strategies.includes('REQUEST_PROCEDURAL_BASIS')) {
    sections.push({
      heading: 'Authority and Procedural Basis',
      content: 'I respectfully request that the agency identify the specific statute, ordinance, or regulation that authorizes the requested inspection. This information will help me understand the agency\'s authority and my rights in this process.',
      source: 'strategy:REQUEST_PROCEDURAL_BASIS',
    });
  }

  // Deadline clarification
  if (input.strategies.includes('REQUEST_DEADLINE_CLARIFICATION') && input.deadlineDate) {
    sections.push({
      heading: 'Deadline Clarification',
      content: `I note that the notice states a response deadline of ${input.deadlineDate}. I respectfully request confirmation of how this deadline was calculated, including whether it is measured from the notice date, the service date, or another date. I also request confirmation of whether the deadline accounts for weekends and holidays.`,
      source: 'strategy:REQUEST_DEADLINE_CLARIFICATION',
    });
  }

  // Requested records
  if (input.strategies.includes('REQUEST_CASE_RECORDS')) {
    sections.push({
      heading: 'Requested Records',
      content: 'I respectfully request copies of all records related to this matter, including the complaint file, inspection history, correspondence, and any prior enforcement actions related to this property.',
      source: 'strategy:REQUEST_CASE_RECORDS',
    });
  }

  // Proposed next step
  sections.push({
    heading: 'Proposed Next Step',
    content: 'I am committed to resolving this matter and request the opportunity to review the requested information before responding to the inspection request. I respectfully request a reasonable extension of the response deadline to allow for this review.',
  });

  // Contact
  sections.push({
    heading: 'Contact',
    content: '[YOUR CONTACT INFORMATION — to be completed]\n\nRespectfully,\n[YOUR NAME]',
  });

  // Build full text
  const fullText = sections.map(s => `${s.heading}\n\n${s.content}`).join('\n\n---\n\n');

  // Fabrication check
  const fabricationCheck = checkFabrication(sections, input.extraction);
  if (!fabricationCheck.passed) {
    warnings.push(...fabricationCheck.issues);
  }

  return {
    sections,
    fullText,
    warnings,
    fabricationCheck,
    draftVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
  };
}

// ─── Fabrication Check ─────────────────────────────────────────────────────────

function checkFabrication(sections: DraftSection[], extraction: NoticeExtraction): FabricationCheck {
  const issues: string[] = [];

  // Check for fabricated legal citations
  for (const section of sections) {
    // Look for code references that don't appear in the extraction
    const citedSections = section.content.match(/(?:§|Section)\s*\d+(?:\.\d+)?/g);
    if (citedSections) {
      const extractedRefs = [...(extraction.codeReferences.value || []), ...(extraction.statutoryReferences.value || [])];
      for (const cited of citedSections) {
        const citedNum = cited.match(/\d+(?:\.\d+)?/)?.[0];
        if (citedNum && !extractedRefs.some(ref => ref.includes(citedNum))) {
          issues.push(`Potential fabricated legal citation: "${cited}" in section "${section.heading}" — not found in extracted references.`);
        }
      }
    }

    // Check for unsupported accusations
    if (/(?:illegal|unlawful|violated|constitutional\s+violation)/i.test(section.content)) {
      issues.push(`Potential unsupported legal conclusion in section "${section.heading}".`);
    }
  }

  // Check for placeholders that weren't filled
  for (const section of sections) {
    if (/\[.*to be (confirmed|completed).*\]/i.test(section.content)) {
      // This is OK — placeholders are expected for unconfirmed information
    }
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}
