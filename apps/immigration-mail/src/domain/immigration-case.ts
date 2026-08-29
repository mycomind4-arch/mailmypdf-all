export type SupportedLanguage = 'en'|'es'|'zh'|'vi'|'ko'|'tl'|'ar'|'ru'|'ht'|'pt'|'fr'|'hi'|'ur'|'bn'|'pa';

export type FactSource = { documentId: string; page?: number; quote?: string; confidence: number };
export type CaseFact = { key: string; value: string; source: FactSource; verified: boolean };
export type Deadline = { id: string; label: string; date: string; source: FactSource; confidence: number; status: 'open'|'completed'|'uncertain' };
export type ImmigrationDocument = { id: string; filename: string; type: string; agency?: string; language?: SupportedLanguage; uploadedAt: string; facts: CaseFact[] };

export type ImmigrationCase = {
  id: string;
  title: string;
  primaryLanguage: SupportedLanguage;
  documents: ImmigrationDocument[];
  facts: CaseFact[];
  deadlines: Deadline[];
  requestedActions: string[];
  checklist: { id: string; label: string; required: boolean; completed: boolean }[];
  createdAt: string;
  updatedAt: string;
};

export function buildCaseContext(input: ImmigrationCase) {
  return {
    caseId: input.id,
    title: input.title,
    language: input.primaryLanguage,
    documents: input.documents.map(d => ({ id: d.id, type: d.type, agency: d.agency, language: d.language })),
    facts: input.facts.map(f => ({ key: f.key, value: f.value, verified: f.verified, source: f.source })),
    deadlines: input.deadlines,
    requestedActions: input.requestedActions,
    checklist: input.checklist,
  };
}
