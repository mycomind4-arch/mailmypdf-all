/**
 * Pipeline Generator
 *
 * Generates pipeline stages from workflow analysis.
 * Creates the actual execution stages based on requirements.
 */

import type {
  WorkflowAnalysis,
  PipelineStageConfig,
  WorkflowPipelineConfig,
} from "./core";

export class PipelineGenerator {
  /**
   * Generate pipeline stages from analysis
   */
  generatePipeline(analysis: WorkflowAnalysis): PipelineStageConfig[] {
    const stages: PipelineStageConfig[] = [];
    let order = 1;

    // Stage 1: Intake
    stages.push({
      id: "intake",
      name: "Understand Your Situation",
      description: analysis.userGuidance.intake,
      order: order++,
      type: "intake",
      requires: [],
      produces: ["user_situation"],
      requiresUserInput: true,
      userGuidance:
        "Answer questions about your situation. This helps us build the strongest case.",
      canSkip: false,
    });

    // Stage 2: Research (auto)
    stages.push({
      id: "research",
      name: "Research Applicable Rules",
      description:
        "We'll research the specific regulations and legal precedent applicable to your case.",
      order: order++,
      type: "research",
      produces: ["regulations", "precedent"],
      requiresUserInput: false,
      userGuidance:
        "Our system is researching the latest regulations and case law for your situation.",
      canSkip: false,
    });

    // Stage 3: Document Analysis
    if (analysis.requiredDocuments.length > 0) {
      stages.push({
        id: "document_analysis",
        name: "Analyze Your Documents",
        description: "Upload and analyze documents supporting your case.",
        order: order++,
        type: "analysis",
        requires: [],
        produces: ["analyzed_documents"],
        requiresUserInput: true,
        userGuidance: analysis.userGuidance.documentGuidance,
        canSkip: false,
      });
    }

    // Stage 4: Strategy
    stages.push({
      id: "strategy",
      name: "Develop Strategy",
      description: analysis.userGuidance.strategyExplanation,
      order: order++,
      type: "strategy",
      requires: ["user_situation", "regulations", "analyzed_documents"],
      produces: ["strategy"],
      requiresUserInput: false,
      aiAnalysisPrompt: analysis.strategyPrompt,
      userGuidance:
        "Based on your situation and the applicable regulations, we're developing the strongest strategy for your case.",
      canSkip: false,
    });

    // Stage 5: Draft Letter
    stages.push({
      id: "draft",
      name: "Draft Your Letter",
      description: "Generate the actual letter/response based on strategy.",
      order: order++,
      type: "draft",
      requires: ["strategy"],
      produces: ["draft_letter"],
      requiresUserInput: false,
      aiGenerationPrompt: this.buildDraftPrompt(analysis),
      userGuidance:
        "Our system is drafting your letter using the strongest arguments and proper legal language.",
      canSkip: false,
    });

    // Stage 6: Human Review
    stages.push({
      id: "review",
      name: "Review Your Letter",
      description: "Review the generated letter before sending.",
      order: order++,
      type: "review",
      requires: ["draft_letter"],
      produces: ["reviewed_letter"],
      requiresUserInput: true,
      requiresHumanReview: true,
      userGuidance:
        "Review the letter carefully. You can request changes or regenerate if needed.",
      canRevise: true,
      canSkip: false,
    });

    // Stage 7: Document Assembly (if documents required)
    if (analysis.requiredDocuments.length > 0) {
      stages.push({
        id: "document_assembly",
        name: "Attach Supporting Documents",
        description: "Organize and attach supporting documents.",
        order: order++,
        type: "assembly",
        requires: ["reviewed_letter"],
        produces: ["final_package"],
        requiresUserInput: true,
        userGuidance:
          "Upload or confirm the supporting documents to include with your letter.",
        canSkip: false,
      });
    }

    // Stage 8: Final Review
    stages.push({
      id: "approval",
      name: "Final Review",
      description: "Review complete package before sending.",
      order: order++,
      type: "approval",
      requires: [
        analysis.requiredDocuments.length > 0
          ? "final_package"
          : "reviewed_letter",
      ],
      produces: ["approved_for_mailing"],
      requiresUserInput: true,
      requiresHumanReview: true,
      userGuidance:
        "Final review of your complete package. Once approved, we'll mail it with tracking.",
      canSkip: false,
    });

    return stages;
  }

  /**
   * Generate complete pipeline configuration
   */
  generatePipelineConfig(analysis: WorkflowAnalysis): WorkflowPipelineConfig {
    const stages = this.generatePipeline(analysis);

    return {
      workflowId: analysis.workflowId,
      stages,
      validation: analysis.validationRules,
      successCriteria: analysis.successFactors,
    };
  }

  /**
   * Build the AI prompt for drafting the letter
   */
  private buildDraftPrompt(analysis: WorkflowAnalysis): string {
    return `
      You are an expert in ${analysis.workflowName} who will draft a compelling letter/response.

      CONTEXT:
      - User Situation: [Will be provided by system]
      - Applicable Regulations: [Will be provided by system]
      - Strategy: [Will be provided by system]
      - Uploaded Documents: [Will be provided by system]

      SUCCESS FACTORS (What makes this letter compelling):
      ${analysis.successFactors.map((f) => `- ${f}`).join("\n")}

      STYLE & TONE:
      - Drafting Style: ${analysis.draftingStyle}
      - Recommended Tone: ${analysis.recommendedTone}

      YOUR TASK:
      Draft a ${analysis.recommendedTone} letter that:
      1. Clearly states the purpose and request
      2. Cites applicable regulations and precedent
      3. Addresses the specific reason for denial/dispute
      4. Presents strongest arguments first
      5. References supporting documents
      6. Requests specific action/relief
      7. Includes appropriate closing

      REQUIREMENTS:
      - Use proper legal citation format
      - Be specific, not generic
      - Address counter-arguments
      - Include dates and facts
      - Reference supporting documents
      - Make the request crystal clear
      - Use professional but accessible language

      Generate a complete, ready-to-mail letter.
    `;
  }

  /**
   * Get stage by ID
   */
  getStage(
    pipeline: PipelineStageConfig[],
    stageId: string
  ): PipelineStageConfig | undefined {
    return pipeline.find((s) => s.id === stageId);
  }

  /**
   * Get next stage after given stage
   */
  getNextStage(
    pipeline: PipelineStageConfig[],
    currentStageId: string
  ): PipelineStageConfig | undefined {
    const currentStage = this.getStage(pipeline, currentStageId);
    if (!currentStage) return undefined;

    return pipeline.find((s) => s.order === currentStage.order + 1);
  }

  /**
   * Get all downstream stages
   */
  getDownstreamStages(
    pipeline: PipelineStageConfig[],
    stageId: string
  ): PipelineStageConfig[] {
    const stage = this.getStage(pipeline, stageId);
    if (!stage) return [];

    return pipeline.filter((s) => s.order > stage.order);
  }

  /**
   * Check if stage has all required inputs
   */
  canExecuteStage(
    pipeline: PipelineStageConfig[],
    stageId: string,
    availableData: Set<string>
  ): boolean {
    const stage = this.getStage(pipeline, stageId);
    if (!stage || !stage.requires) return true;

    return stage.requires.every((req) => availableData.has(req));
  }
}

export const pipelineGenerator = new PipelineGenerator();
