import type { FactSource } from './immigration-case';

export type ExplanationBlock = { id: string; text: string; sources: FactSource[]; confidence: 'high'|'medium'|'low'; kind: 'stated'|'inferred'|'guidance' };

export function createExplanationBlock(input: Omit<ExplanationBlock, 'id'>): ExplanationBlock {
  return { ...input, id: `explanation-${Math.random().toString(36).slice(2, 10)}` };
}

export function canPresentAsFact(block: ExplanationBlock): boolean {
  return block.kind === 'stated' && block.sources.length > 0 && block.sources.every(source => source.confidence >= 0.8);
}
