/**
 * G3 — IntakeSession → Case bridge
 *
 * Connects the human intake layer to the canonical ImmigrationCase model
 * and feeds it into the case reasoner.
 *
 * The user never sees workflow IDs or internal case models.
 */

import type { SupportedLanguage, CaseFact, Deadline, ImmigrationDocument, FactSource } from './immigration-case';
import type { LanguageContext } from './multilingual';
import type { DocumentUnderstanding } from './document-understanding';
import type { ReasonerInput } from './case-reasoning';

// ─── IntakeSession ───────────────────────────────────────────────────────────
// Represents the state of a user's intake session, before it becomes a Case.

export type IntakeModality = 'voice' | 'upload' | 'type' | 'unsure';

export interface IntakeSession {
  id: string;
  /** What the user told us (free text — transcribed from voice, typed, or empty). */
  narrative: string;
  /** How the user provided input. */
  modality: IntakeModality;
  /** Whether the user explicitly said they're not sure what happened. */
  isUnsure: boolean;
  /** Documents uploaded during intake. */
  uploadedDocuments: ImmigrationDocument[];
  /** Document understandings from analysis. */
  documentUnderstandings: DocumentUnderstanding[];
  /** Language context for the session. */
  language: LanguageContext;
  /** Timestamp. */
  createdAt: string;
}

// ─── Intake → Case transition ─────────────────────────────────────────────────
// Creates the canonical ImmigrationCase from an IntakeSession.

export function intakeToCase(session: IntakeSession): {
  caseId: string;
  facts: CaseFact[];
  deadlines: Deadline[];
  documents: ImmigrationDocument[];
} {
  // Extract facts from document understandings
  const facts: CaseFact[] = [];
  const deadlines: Deadline[] = [];

  for (const du of session.documentUnderstandings) {
    // Agency fact
    if (du.agency !== 'UNKNOWN') {
      const source: FactSource = { documentId: '', confidence: 0.9 };
      facts.push({ key: 'agency', value: du.agency, source, verified: true });
    }
    // Notice type fact
    if (du.noticeType !== 'unknown') {
      const source: FactSource = { documentId: '', confidence: 0.85 };
      facts.push({ key: 'notice_type', value: du.noticeType, source, verified: true });
    }
    // Deadlines from document understandings
    for (const dl of du.deadlines) {
      if (dl.date) {
        deadlines.push({
          id: `dl-${dl.label}-${dl.date}`,
          label: dl.label,
          date: dl.date,
          source: dl.source,
          confidence: dl.confidence,
          status: 'open',
        });
      }
    }
  }

  return {
    caseId: session.id,
    facts,
    deadlines,
    documents: session.uploadedDocuments,
  };
}

// ─── Intake → ReasonerInput ──────────────────────────────────────────────────
// Bridges the IntakeSession directly to the reasoner, via the canonical Case.

export function intakeToReasonerInput(session: IntakeSession): ReasonerInput {
  const caseData = intakeToCase(session);
  return {
    case: {
      id: caseData.caseId,
      facts: caseData.facts,
      deadlines: caseData.deadlines,
      documents: caseData.documents,
    },
    documentUnderstandings: session.documentUnderstandings,
    narrative: session.narrative,
    language: session.language,
    userIsUnsure: session.isUnsure,
  };
}
