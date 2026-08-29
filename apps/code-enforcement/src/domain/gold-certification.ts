/**
 * Gold Standard Certification
 *
 * The workflow is GOLD only if ALL stages pass.
 * A successful stage without evidence must NOT pass.
 *
 * Gold stages: secure_ingest, classify, extract, complaint_provenance,
 * recipient_reconciliation, property_intelligence, jurisdiction_identification,
 * jurisdiction_research, scope_analysis, authority_analysis, warrant_analysis,
 * timeline, evidence_graph, discrepancies, multi_llm_routing, gemini_default,
 * fallback_providers, independent_review, disagreement_handling, grounded_strategy,
 * draft, independent_draft_critique, final_validation, provenance, human_review,
 * human_authorization, fulfillment_adapter, tracking, proof, prompt_injection_defenses,
 * tests, production_build, seo_canonical.
 */

import type { CEWorkflowStage } from './workflow';

// ─── Gold Stage Types ──────────────────────────────────────────────────────────

export type GoldStage =
  | 'secure_ingest'
  | 'classify'
  | 'extract'
  | 'complaint_provenance'
  | 'recipient_reconciliation'
  | 'property_intelligence'
  | 'jurisdiction_identification'
  | 'jurisdiction_research'
  | 'scope_analysis'
  | 'authority_analysis'
  | 'warrant_analysis'
  | 'timeline'
  | 'evidence_graph'
  | 'discrepancies'
  | 'multi_llm_routing'
  | 'gemini_default'
  | 'fallback_providers'
  | 'independent_review'
  | 'disagreement_handling'
  | 'grounded_strategy'
  | 'draft'
  | 'independent_draft_critique'
  | 'final_validation'
  | 'provenance'
  | 'human_review'
  | 'human_authorization'
  | 'fulfillment_adapter'
  | 'tracking'
  | 'proof'
  | 'prompt_injection_defenses'
  | 'tests'
  | 'production_build'
  | 'seo_canonical';

export interface GoldStageEvidence {
  stage: GoldStage;
  evidenceIds: string[];
  status: 'passed' | 'blocked';
  messages: string[];
}

export interface GoldCertificationResult {
  stages: GoldStageEvidence[];
  allPassed: boolean;
  goldCertified: boolean;
  summary: string;
}

// ─── Certification Function ────────────────────────────────────────────────────

export function certifyGold(input: {
  // Secure ingest
  secureIngestPassed?: boolean;
  documentsIngested?: number;
  // Classify
  classifyPassed?: boolean;
  classificationConfidence?: number;
  // Extract
  extractPassed?: boolean;
  fieldsExtracted?: number;
  // Complaint provenance
  complaintProvenancePassed?: boolean;
  // Recipient reconciliation
  recipientReconciliationPassed?: boolean;
  // Property intelligence
  propertyIntelligencePassed?: boolean;
  // Jurisdiction identification
  jurisdictionIdentified?: boolean;
  jurisdictionConfidence?: number;
  // Jurisdiction research
  jurisdictionResearchPassed?: boolean;
  // Scope analysis
  scopeAnalysisPassed?: boolean;
  // Authority analysis
  authorityAnalysisPassed?: boolean;
  // Warrant analysis
  warrantAnalysisPassed?: boolean;
  // Timeline
  timelinePassed?: boolean;
  // Evidence graph
  evidenceGraphPassed?: boolean;
  // Discrepancies
  discrepanciesPassed?: boolean;
  // Multi-LLM routing
  multiLlmRoutingPassed?: boolean;
  // Gemini default
  geminiDefaultPassed?: boolean;
  // Fallback providers
  fallbackProvidersPassed?: boolean;
  // Independent review
  independentReviewPassed?: boolean;
  // Disagreement handling
  disagreementHandlingPassed?: boolean;
  // Grounded strategy
  groundedStrategyPassed?: boolean;
  // Draft
  draftPassed?: boolean;
  // Independent draft critique
  draftCritiquePassed?: boolean;
  // Final validation
  finalValidationPassed?: boolean;
  // Provenance
  provenancePassed?: boolean;
  // Human review
  humanReviewPassed?: boolean;
  // Human authorization
  humanAuthorizationPassed?: boolean;
  // Fulfillment adapter
  fulfillmentAdapterPassed?: boolean;
  // Tracking
  trackingPassed?: boolean;
  // Proof
  proofPassed?: boolean;
  // Prompt injection defenses
  promptInjectionDefensesPassed?: boolean;
  // Tests
  testsPassed?: boolean;
  testCount?: number;
  // Production build
  productionBuildPassed?: boolean;
  // SEO canonical
  seoCanonicalPassed?: boolean;
}): GoldCertificationResult {
  const stages: GoldStageEvidence[] = [];

  const addStage = (stage: GoldStage, passed: boolean, evidence: string[], messages: string[]) => {
    stages.push({
      stage,
      evidenceIds: evidence,
      status: passed ? 'passed' : 'blocked',
      messages: passed ? [] : messages,
    });
  };

  addStage('secure_ingest', !!input.secureIngestPassed && (input.documentsIngested ?? 0) > 0,
    [`documents:${input.documentsIngested ?? 0}`],
    ['Secure ingestion did not pass or no documents were ingested.']);

  addStage('classify', !!input.classifyPassed && (input.classificationConfidence ?? 0) >= 0.5,
    [`confidence:${input.classificationConfidence ?? 0}`],
    ['Classification did not pass or confidence too low.']);

  addStage('extract', !!input.extractPassed && (input.fieldsExtracted ?? 0) > 0,
    [`fields:${input.fieldsExtracted ?? 0}`],
    ['Extraction did not pass or no fields extracted.']);

  addStage('complaint_provenance', !!input.complaintProvenancePassed,
    ['complaint-provenance-analysis'], ['Complaint provenance analysis not completed.']);

  addStage('recipient_reconciliation', !!input.recipientReconciliationPassed,
    ['recipient-reconciliation'], ['Recipient reconciliation not completed.']);

  addStage('property_intelligence', !!input.propertyIntelligencePassed,
    ['property-intelligence'], ['Property intelligence not completed.']);

  addStage('jurisdiction_identification', !!input.jurisdictionIdentified && (input.jurisdictionConfidence ?? 0) >= 0.7,
    [`jurisdiction-confidence:${input.jurisdictionConfidence ?? 0}`],
    ['Jurisdiction not identified or confidence too low.']);

  addStage('jurisdiction_research', !!input.jurisdictionResearchPassed,
    ['jurisdiction-research'], ['Jurisdiction research not completed.']);

  addStage('scope_analysis', !!input.scopeAnalysisPassed,
    ['scope-analysis'], ['Scope analysis not completed.']);

  addStage('authority_analysis', !!input.authorityAnalysisPassed,
    ['authority-analysis'], ['Authority analysis not completed.']);

  addStage('warrant_analysis', !!input.warrantAnalysisPassed,
    ['warrant-analysis'], ['Warrant analysis not completed.']);

  addStage('timeline', !!input.timelinePassed,
    ['timeline'], ['Timeline not completed.']);

  addStage('evidence_graph', !!input.evidenceGraphPassed,
    ['evidence-graph'], ['Evidence graph not completed.']);

  addStage('discrepancies', !!input.discrepanciesPassed,
    ['discrepancy-engine'], ['Discrepancy engine not completed.']);

  addStage('multi_llm_routing', !!input.multiLlmRoutingPassed,
    ['multi-llm-routing'], ['Multi-LLM routing not configured.']);

  addStage('gemini_default', !!input.geminiDefaultPassed,
    ['gemini-default'], ['Gemini is not set as default provider.']);

  addStage('fallback_providers', !!input.fallbackProvidersPassed,
    ['fallback-providers'], ['Fallback providers not configured.']);

  addStage('independent_review', !!input.independentReviewPassed,
    ['independent-review'], ['Independent review not completed.']);

  addStage('disagreement_handling', !!input.disagreementHandlingPassed,
    ['disagreement-handling'], ['Disagreement handling not configured.']);

  addStage('grounded_strategy', !!input.groundedStrategyPassed,
    ['grounded-strategy'], ['Strategy engine not completed.']);

  addStage('draft', !!input.draftPassed,
    ['draft-engine'], ['Draft not generated.']);

  addStage('independent_draft_critique', !!input.draftCritiquePassed,
    ['draft-critique'], ['Independent draft critique not completed.']);

  addStage('final_validation', !!input.finalValidationPassed,
    ['final-validation'], ['Final validation not completed.']);

  addStage('provenance', !!input.provenancePassed,
    ['provenance'], ['Provenance not recorded.']);

  addStage('human_review', !!input.humanReviewPassed,
    ['human-review'], ['Human review not completed.']);

  addStage('human_authorization', !!input.humanAuthorizationPassed,
    ['human-authorization'], ['Human authorization not obtained.']);

  addStage('fulfillment_adapter', !!input.fulfillmentAdapterPassed,
    ['fulfillment-adapter'], ['Fulfillment adapter not configured.']);

  addStage('tracking', !!input.trackingPassed,
    ['tracking'], ['Tracking not configured.']);

  addStage('proof', !!input.proofPassed,
    ['proof'], ['Proof generation not configured.']);

  addStage('prompt_injection_defenses', !!input.promptInjectionDefensesPassed,
    ['prompt-injection-defenses'], ['Prompt injection defenses not tested.']);

  addStage('tests', !!input.testsPassed && (input.testCount ?? 0) > 0,
    [`test-count:${input.testCount ?? 0}`],
    ['Tests not passing or no tests.']);

  addStage('production_build', !!input.productionBuildPassed,
    ['production-build'], ['Production build not passing.']);

  addStage('seo_canonical', !!input.seoCanonicalPassed,
    ['seo-canonical'], ['SEO canonical route not configured.']);

  const allPassed = stages.every(s => s.status === 'passed');
  const passedCount = stages.filter(s => s.status === 'passed').length;
  const totalCount = stages.length;

  const summary = allPassed
    ? `GOLD CERTIFIED: All ${totalCount} stages passed.`
    : `NOT GOLD: ${passedCount}/${totalCount} stages passed. ${totalCount - passedCount} stage(s) blocked.`;

  return {
    stages,
    allPassed,
    goldCertified: allPassed,
    summary,
  };
}
