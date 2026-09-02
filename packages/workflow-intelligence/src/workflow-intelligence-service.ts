/**
 * Workflow Intelligence Service
 *
 * Main orchestration service that ties together all intelligence components.
 * Handles workflow analysis, generation, and continuous improvement.
 */

import type {
  WorkflowSpecification,
  WorkflowAnalysis,
  PipelineStageConfig,
  WorkflowPipelineConfig,
  Question,
  ValidationRule,
  WorkflowOutcome,
  WorkflowLearnings,
  WorkflowImprovement,
  RegulatoryResearch,
  WorkflowIntelligenceService,
} from "./core";
import { WorkflowAnalyzer, analyzer } from "./workflow-analyzer";
import { RegulatoryResearcher, researcher } from "./regulatory-research";
import { PipelineGenerator, pipelineGenerator } from "./pipeline-generator";
import { LearningEngine, learningEngine } from "./learning-engine";
import { DSLParser, dslParser } from "./dsl-parser";

export class WorkflowIntelligence implements WorkflowIntelligenceService {
  private analyzer: WorkflowAnalyzer;
  private researcher: RegulatoryResearcher;
  private pipelineGenerator: PipelineGenerator;
  private learningEngine: LearningEngine;
  private dslParser: DSLParser;

  private analysisCache = new Map<string, WorkflowAnalysis>();
  private learningsCache = new Map<string, WorkflowLearnings>();

  constructor() {
    this.analyzer = analyzer;
    this.researcher = researcher;
    this.pipelineGenerator = pipelineGenerator;
    this.learningEngine = learningEngine;
    this.dslParser = dslParser;
  }

  /**
   * Full workflow generation pipeline
   * Takes a workflow idea and generates everything needed to execute it
   */
  async generateCompleteWorkflow(
    spec: WorkflowSpecification
  ): Promise<{
    analysis: WorkflowAnalysis;
    pipelineConfig: WorkflowPipelineConfig;
    questions: Question[];
    validationRules: ValidationRule[];
  }> {
    // Step 1: Research regulations
    const regulatory = await this.researchRegulations({
      agency: spec.context.agency,
      jurisdiction: spec.context.jurisdiction,
      applicableRules: spec.context.applicableRules,
      caseType: spec.caseType,
      query: spec.goal,
    });

    // Step 2: Analyze workflow
    const analysis = await this.analyzeWorkflow(spec, regulatory);
    this.analysisCache.set(spec.id, analysis);

    // Step 3: Generate pipeline
    const stages = this.pipelineGenerator.generatePipeline(analysis);
    const pipelineConfig: WorkflowPipelineConfig = {
      workflowId: spec.id,
      stages,
      validation: analysis.validationRules,
      successCriteria: analysis.successFactors,
    };

    // Step 4: Generate questions
    const questions = await this.analyzer.generateIntakeQuestions(analysis);

    return {
      analysis,
      pipelineConfig,
      questions,
      validationRules: analysis.validationRules,
    };
  }

  /**
   * Analyze a workflow specification
   */
  async analyzeWorkflow(
    spec: WorkflowSpecification,
    research?: RegulatoryResearch
  ): Promise<WorkflowAnalysis> {
    // Check cache
    if (this.analysisCache.has(spec.id)) {
      return this.analysisCache.get(spec.id)!;
    }

    // Analyze with Claude
    const analysis = await this.analyzer.analyzeWorkflow(spec, research);

    // Cache result
    this.analysisCache.set(spec.id, analysis);

    return analysis;
  }

  /**
   * Research regulations for a query
   */
  async researchRegulations(query: any): Promise<RegulatoryResearch> {
    return this.researcher.researchRegulations(query);
  }

  /**
   * Generate pipeline stages from analysis
   */
  generatePipeline(analysis: WorkflowAnalysis): PipelineStageConfig[] {
    return this.pipelineGenerator.generatePipeline(analysis);
  }

  /**
   * Generate intake questions
   */
  async generateQuestions(analysis: WorkflowAnalysis): Promise<Question[]> {
    return this.analyzer.generateIntakeQuestions(analysis);
  }

  /**
   * Generate validation rules
   */
  async generateValidationRules(
    analysis: WorkflowAnalysis
  ): Promise<ValidationRule[]> {
    return this.analyzer.generateValidationRules(analysis);
  }

  /**
   * Learn from workflow outcomes
   */
  async learnFromOutcomes(
    workflowId: string,
    outcomes: WorkflowOutcome[]
  ): Promise<WorkflowLearnings> {
    const learnings = await this.learningEngine.learnFromOutcomes(
      workflowId,
      outcomes
    );

    // Cache learnings
    this.learningsCache.set(workflowId, learnings);

    return learnings;
  }

  /**
   * Update workflow based on learnings
   */
  async updateWorkflowFromLearnings(
    workflowId: string,
    learnings: WorkflowLearnings
  ): Promise<void> {
    // TODO: Update workflow definition based on learnings
    // - Adjust validation rules
    // - Add/remove required documents
    // - Reorder questions
    // - Update success factors
    console.log(
      `Workflow ${workflowId} updated based on learnings:`,
      learnings
    );
  }

  /**
   * Analyze workflow and recommend improvements
   */
  async analyzeAndImprove(
    workflowId: string,
    outcomes: WorkflowOutcome[]
  ): Promise<WorkflowImprovement[]> {
    const learnings = await this.learnFromOutcomes(workflowId, outcomes);

    const improvements: WorkflowImprovement[] = [];

    // 1. Check success rate
    if (learnings.successRate < 0.4) {
      improvements.push({
        area: "case_strength",
        issue: `Low success rate (${(learnings.successRate * 100).toFixed(1)}%)`,
        suggestion: "Add stricter validation rules to improve case quality before sending",
        evidence: learnings.failurePatterns,
        estimatedImpact: "Could improve success rate by 15-25%",
        priority: 10,
      });
    }

    // 2. Check for common issues
    if (learnings.commonIssues.length > 0) {
      for (const issue of learnings.commonIssues.slice(0, 3)) {
        improvements.push({
          area: "user_guidance",
          issue: `Common problem: ${issue.issue}`,
          suggestion: issue.suggestedFix,
          estimatedImpact: `Affects ${(issue.frequency * 100).toFixed(1)}% of cases`,
          priority: Math.round(issue.frequency * 10),
        });
      }
    }

    // 3. Check document combinations
    if (learnings.strongDocumentCombinations.length > 0) {
      const weakCombos = learnings.strongDocumentCombinations.filter(
        (c) => c.successRate < 0.5
      );

      if (weakCombos.length > 0) {
        improvements.push({
          area: "validation",
          issue: "Some document combinations have low success rates",
          suggestion:
            "Consider requiring additional documents or providing better guidance",
          estimatedImpact: "Could improve success rate by 10-20%",
          priority: 7,
        });
      }
    }

    // 4. Check dropoff stages
    if (learnings.dropoffStages.length > 0) {
      improvements.push({
        area: "user_experience",
        issue: `Users drop off at: ${learnings.dropoffStages.join(", ")}`,
        suggestion: "Simplify or clarify these stages",
        estimatedImpact: "Could improve completion rate",
        priority: 8,
      });
    }

    // 5. Check average time to completion
    if (learnings.averageTimeToComplete > 120) {
      improvements.push({
        area: "user_experience",
        issue: "Workflow takes too long to complete",
        suggestion: "Streamline stages or reduce required information",
        estimatedImpact: "Could improve user satisfaction",
        priority: 5,
      });
    }

    return improvements.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Get cached analysis
   */
  getAnalysis(workflowId: string): WorkflowAnalysis | undefined {
    return this.analysisCache.get(workflowId);
  }

  /**
   * Get cached learnings
   */
  getLearnings(workflowId: string): WorkflowLearnings | undefined {
    return this.learningsCache.get(workflowId);
  }

  /**
   * Clear caches
   */
  clearCaches(): void {
    this.analysisCache.clear();
    this.learningsCache.clear();
  }

  /**
   * Parse DSL
   */
  parseDSL(yamlContent: string): WorkflowSpecification {
    return this.dslParser.parseYaml(yamlContent);
  }

  /**
   * Export to DSL
   */
  exportToDSL(spec: WorkflowSpecification): string {
    return this.dslParser.exportToDSL(spec);
  }
}

// Export singleton instance
export const workflowIntelligence = new WorkflowIntelligence();
