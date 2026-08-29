import type { DocumentAnalysis } from '@/lib/document-analysis';

export type RecommendedAction = {
  id: 'understand' | 'respond' | 'prepare' | 'review' | 'seek_review';
  title: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  requiresHumanReview?: boolean;
};

export function recommendActions(analysis: DocumentAnalysis): RecommendedAction[] {
  const actions: RecommendedAction[] = [];
  if (analysis.document_type === 'request_for_evidence' || analysis.document_type === 'notice_of_intent_to_deny' || analysis.requested_actions.length > 0) {
    actions.push({ id: 'respond', title: 'Prepare a response', reason: 'The document appears to request information or action.', confidence: analysis.confidence });
  } else {
    actions.push({ id: 'understand', title: 'Understand this document', reason: 'Start by reviewing what the document says and what it asks for.', confidence: analysis.confidence });
  }
  if (analysis.uncertainty_flags.length > 0 || analysis.warnings.length > 0) {
    actions.push({ id: 'seek_review', title: 'Get an additional review', reason: 'The analysis contains uncertainty or warnings that should be checked against the original document.', confidence: 'high', requiresHumanReview: true });
  }
  actions.push({ id: 'prepare', title: 'Organize supporting documents', reason: 'Keep the response package and supporting evidence together.', confidence: 'medium' });
  return actions;
}
