import type { ImmigrationCase } from './immigration-case';

export type CaseSnapshot = {
  title: string;
  documentCount: number;
  openDeadlines: number;
  incompleteChecklistItems: number;
  requestedActions: string[];
  nextBestAction?: string;
};

export function createCaseSnapshot(caseData: ImmigrationCase): CaseSnapshot {
  const openDeadlines = caseData.deadlines.filter(d => d.status === 'open').length;
  const incompleteChecklistItems = caseData.checklist.filter(item => !item.completed).length;
  return {
    title: caseData.title,
    documentCount: caseData.documents.length,
    openDeadlines,
    incompleteChecklistItems,
    requestedActions: caseData.requestedActions,
    nextBestAction: caseData.requestedActions[0] ?? (openDeadlines > 0 ? 'Review open deadlines' : incompleteChecklistItems > 0 ? 'Complete your checklist' : undefined),
  };
}
