/**
 * Document Classification
 *
 * Classifies code-enforcement related documents into types.
 * Every classification requires: confidence, source, model, provider.
 * If confidence is too low: BLOCK or REVIEW_REQUIRED.
 */

import type { AIProvider } from './ai-provider';

// ─── Document Types ──────────────────────────────────────────────────────────

export type CEDocumentType =
  | 'INSPECTION_REQUEST'
  | 'NOTICE_OF_INSPECTION'
  | 'NOTICE_OF_VIOLATION'
  | 'COMPLAINT_NOTICE'
  | 'INSPECTION_ORDER'
  | 'ADMINISTRATIVE_ORDER'
  | 'WARRANT_REFERENCE'
  | 'HEARING_NOTICE'
  | 'CORRESPONDENCE'
  | 'PERMIT'
  | 'INSPECTION_REPORT'
  | 'PROPERTY_RECORD'
  | 'POLICE_RECORD'
  | 'OTHER';

export type ClassificationConfidence = 'high' | 'medium' | 'low' | 'blocked';

export interface DocumentClassification {
  documentId: string;
  documentType: CEDocumentType;
  confidence: number;
  confidenceLevel: ClassificationConfidence;
  source: string;
  model: string;
  provider: AIProvider;
  reasoning?: string;
  reviewRequired: boolean;
}

// ─── Classification Patterns ─────────────────────────────────────────────────

interface ClassificationPattern {
  type: CEDocumentType;
  patterns: RegExp[];
  description: string;
}

const CLASSIFICATION_PATTERNS: ClassificationPattern[] = [
  {
    type: 'INSPECTION_REQUEST',
    patterns: [
      /request(?:ed)?\s+(?:permission|consent)\s+(?:to\s+)?inspect/i,
      /permission\s+to\s+(?:inspect|search|enter)/i,
      /consent\s+to\s+(?:inspect|search)/i,
      /inspection\s+request/i,
    ],
    description: 'Document requests permission/consent to inspect property',
  },
  {
    type: 'NOTICE_OF_INSPECTION',
    patterns: [
      /notice\s+of\s+inspection/i,
      /inspection\s+(?:scheduled|will\s+be\s+conducted)/i,
      /inspect(?:ion)?\s+(?:is\s+)?scheduled/i,
    ],
    description: 'Notice scheduling or announcing an inspection',
  },
  {
    type: 'NOTICE_OF_VIOLATION',
    patterns: [
      /notice\s+of\s+violation/i,
      /violation\s+(?:of|notice)/i,
      /code\s+violation/i,
      /municipal\s+code\s+violation/i,
      /ordinance\s+violation/i,
    ],
    description: 'Notice alleging code violations',
  },
  {
    type: 'COMPLAINT_NOTICE',
    patterns: [
      /complaint\s+(?:has\s+been|was|received|filed)/i,
      /(?:a|the)\s+complaint\s+(?:alleges|states|reports)/i,
      /based\s+on\s+(?:a\s+)?complaint/i,
      /complaint\s+number/i,
    ],
    description: 'Notice based on a complaint',
  },
  {
    type: 'INSPECTION_ORDER',
    patterns: [
      /inspection\s+order/i,
      /ordered\s+to\s+(?:inspect|allow\s+inspection)/i,
    ],
    description: 'Administrative order for inspection',
  },
  {
    type: 'ADMINISTRATIVE_ORDER',
    patterns: [
      /administrative\s+(?:order|citation)/i,
      /abatement\s+order/i,
      /compliance\s+order/i,
    ],
    description: 'Administrative order or citation',
  },
  {
    type: 'WARRANT_REFERENCE',
    patterns: [
      /administrative\s+(?:inspection\s+)?warrant/i,
      /inspection\s+warrant/i,
      /warrant\s+(?:may|will)\s+be\s+(?:sought|obtained|requested)/i,
      /seek\s+(?:an?\s+)?warrant/i,
    ],
    description: 'Document references or threatens an inspection warrant',
  },
  {
    type: 'HEARING_NOTICE',
    patterns: [
      /hearing\s+(?:notice|scheduled|date)/i,
      /appear\s+(?:at|before)\s+(?:a\s+)?hearing/i,
      /administrative\s+hearing/i,
    ],
    description: 'Notice of hearing',
  },
  {
    type: 'CORRESPONDENCE',
    patterns: [
      /dear\s+(?:mr|ms|mrs|resident|property\s+owner)/i,
      /sincerely|regards/i,
      /re:\s+/i,
    ],
    description: 'General correspondence',
  },
  {
    type: 'PERMIT',
    patterns: [
      /permit\s+(?:number|application|issued)/i,
      /building\s+permit/i,
      /construction\s+permit/i,
    ],
    description: 'Permit document',
  },
  {
    type: 'INSPECTION_REPORT',
    patterns: [
      /inspection\s+report/i,
      /inspection\s+findings/i,
      /inspector\s+(?:found|observed|noted)/i,
    ],
    description: 'Report of inspection findings',
  },
  {
    type: 'PROPERTY_RECORD',
    patterns: [
      /assessor'?s?\s+(?:parcel|record|map)/i,
      /parcel\s+number/i,
      /APN\s*:/i,
      /property\s+(?:tax|assessment)\s+record/i,
      /deed\s+record/i,
    ],
    description: 'Property/parcel record',
  },
  {
    type: 'POLICE_RECORD',
    patterns: [
      /incident\s+report/i,
      /case\s+number/i,
      /call\s+for\s+service/i,
      /cad\s+(?:event|record|number)/i,
      /law\s+enforcement\s+(?:report|record)/i,
    ],
    description: 'Police/law enforcement record',
  },
];

// ─── Classification Function ─────────────────────────────────────────────────

export function classifyDocument(
  documentId: string,
  text: string,
  provider: AIProvider = 'gemini',
  model: string = 'gemini-2.0-flash',
): DocumentClassification {
  let bestType: CEDocumentType = 'OTHER';
  let bestScore = 0;
  let bestDescription = '';
  let matchCount = 0;

  for (const patternDef of CLASSIFICATION_PATTERNS) {
    let typeMatchCount = 0;
    for (const pattern of patternDef.patterns) {
      if (pattern.test(text)) {
        typeMatchCount++;
      }
    }
    if (typeMatchCount > matchCount) {
      matchCount = typeMatchCount;
      bestType = patternDef.type;
      bestScore = typeMatchCount / patternDef.patterns.length;
      bestDescription = patternDef.description;
    }
  }

  // Calculate confidence
  const confidence = matchCount === 0 ? 0.1 : Math.min(0.5 + bestScore * 0.5, 0.99);
  let confidenceLevel: ClassificationConfidence;
  let reviewRequired = false;

  if (confidence >= 0.8) {
    confidenceLevel = 'high';
  } else if (confidence >= 0.6) {
    confidenceLevel = 'medium';
  } else if (confidence >= 0.3) {
    confidenceLevel = 'low';
    reviewRequired = true;
  } else {
    confidenceLevel = 'blocked';
    reviewRequired = true;
  }

  return {
    documentId,
    documentType: bestType,
    confidence,
    confidenceLevel,
    source: 'pattern-matching + ai-routing',
    model,
    provider,
    reasoning: bestDescription || 'No matching classification pattern found',
    reviewRequired,
  };
}

// ─── Document Type Labels ────────────────────────────────────────────────────

export function documentTypeLabel(type: CEDocumentType): string {
  const labels: Record<CEDocumentType, string> = {
    INSPECTION_REQUEST: 'Inspection Request',
    NOTICE_OF_INSPECTION: 'Notice of Inspection',
    NOTICE_OF_VIOLATION: 'Notice of Violation',
    COMPLAINT_NOTICE: 'Complaint Notice',
    INSPECTION_ORDER: 'Inspection Order',
    ADMINISTRATIVE_ORDER: 'Administrative Order',
    WARRANT_REFERENCE: 'Warrant Reference',
    HEARING_NOTICE: 'Hearing Notice',
    CORRESPONDENCE: 'Correspondence',
    PERMIT: 'Permit',
    INSPECTION_REPORT: 'Inspection Report',
    PROPERTY_RECORD: 'Property Record',
    POLICE_RECORD: 'Police Record',
    OTHER: 'Other',
  };
  return labels[type];
}
