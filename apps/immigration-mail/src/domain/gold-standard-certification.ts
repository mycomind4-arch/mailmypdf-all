import type { ImmigrationCase } from './immigration-case';
import { preflightResponse } from './immigration-preflight';

export type ImmigrationGoldStage =
  | 'document'
  | 'facts'
  | 'deadlines'
  | 'evidence'
  | 'authority'
  | 'strategy'
  | 'draft'
  | 'validation'
  | 'review'
  | 'approval'
  | 'mailing'
  | 'tracking'
  | 'proof';

export type ImmigrationStageEvidence = {
  stage: ImmigrationGoldStage;
  evidenceIds: string[];
  status: 'passed' | 'blocked';
  messages: string[];
};

export function certifyImmigrationPreflight(input: {
  caseData: ImmigrationCase;
  recipient?: string;
  address?: string;
  draft: string;
  requiredFacts?: string[];
  requireDeadlineVerification?: boolean;
  humanReviewApproved?: boolean;
  mailingConfigured?: boolean;
  proofConfigured?: boolean;
}): ImmigrationStageEvidence[] {
  const issues = preflightResponse(input);
  const blocking = issues.filter(issue => issue.severity === 'error');
  const evidenceIds = [
    ...input.caseData.facts.filter(fact => fact.verified).map(fact => `fact:${fact.key}`),
    ...input.caseData.deadlines.filter(deadline => deadline.status !== 'uncertain').map(deadline => `deadline:${deadline.date}`),
  ];

  const preflightStage: ImmigrationStageEvidence = {
    stage: 'validation',
    evidenceIds,
    status: blocking.length === 0 ? 'passed' : 'blocked',
    messages: blocking.map(issue => issue.message),
  };

  const gated = blocking.length === 0;
  const stages: ImmigrationStageEvidence[] = [preflightStage];

  stages.push({
    stage: 'review',
    evidenceIds,
    status: gated && input.humanReviewApproved ? 'passed' : 'blocked',
    messages: gated && input.humanReviewApproved ? [] : ['Human review approval is required before mailing.'],
  });
  stages.push({
    stage: 'approval',
    evidenceIds,
    status: gated && input.humanReviewApproved ? 'passed' : 'blocked',
    messages: gated && input.humanReviewApproved ? [] : ['Authorized approval is required before mailing.'],
  });
  stages.push({
    stage: 'mailing',
    evidenceIds,
    status: gated && input.humanReviewApproved && input.mailingConfigured ? 'passed' : 'blocked',
    messages: gated && input.humanReviewApproved && input.mailingConfigured ? [] : ['A configured mailing provider is required before submission.'],
  });
  stages.push({
    stage: 'proof',
    evidenceIds,
    status: gated && input.humanReviewApproved && input.mailingConfigured && input.proofConfigured ? 'passed' : 'blocked',
    messages: gated && input.humanReviewApproved && input.mailingConfigured && input.proofConfigured ? [] : ['Proof/tracking configuration is required for Gold certification.'],
  });

  return stages;
}
