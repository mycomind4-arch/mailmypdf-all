/**
 * Workflow Intelligence Export
 *
 * Complete workflow intelligence system for MailMyPDF.
 */

// Core types
export type {
  WorkflowSpecification,
  WorkflowAnalysis,
  PipelineStageConfig,
  WorkflowPipelineConfig,
  Question,
  ValidationRule,
  RegulatoryResearch,
  WorkflowOutcome,
  WorkflowLearnings,
  WorkflowImprovement,
  WorkflowIntelligenceService,
  WorkflowDSL,
} from "./core";

// Main service
export { WorkflowIntelligence, workflowIntelligence } from "./workflow-intelligence-service";

// Components
export { WorkflowAnalyzer, analyzer } from "./workflow-analyzer";
export { RegulatoryResearcher, researcher } from "./regulatory-research";
export { PipelineGenerator, pipelineGenerator } from "./pipeline-generator";
export { LearningEngine, learningEngine } from "./learning-engine";
export { DSLParser, dslParser } from "./dsl-parser";

// Default export
export default workflowIntelligence;
