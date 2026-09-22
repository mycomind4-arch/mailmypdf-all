export type {
  CorrectionStrategyType,
  CorrectionCategory,
  CorrectionIssue,
  CorrectionStrategy,
  CorrectionStrategyReport,
  ClassifiedFact,
} from './types.js';

export {
  generateCorrectionStrategies,
  detectContradictions,
  isLegallyConsequentialStrategy,
  requiresHumanReview,
  mapIssuesToStrategies,
} from './engine.js';
