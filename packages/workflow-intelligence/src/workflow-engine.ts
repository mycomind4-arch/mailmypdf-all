/**
 * Workflow Engine - Core Execution System
 *
 * Executes workflows stage-by-stage with:
 * - State management
 * - User input collection
 * - AI task execution
 * - Document generation
 * - Progress tracking
 * - Persistence
 */

import { llmProvider } from "./llm-provider";
import { WorkflowSpecification, PipelineStageConfig } from "./core";
import { generateWorkflow, type GeneratedWorkflow } from "./workflow-generator";

/* ─────────────────────────────────────────────────────────────────────────── */
/* WORKFLOW EXECUTION STATE                                                    */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface WorkflowExecutionState {
  id: string;
  userId: string;
  workflowId: string;
  workflowName: string;
  currentStage: number;
  stages: WorkflowStageExecution[];
  caseData: Record<string, any>;
  documents: GeneratedDocument[];
  messages: WorkflowMessage[];
  status: "not_started" | "in_progress" | "paused" | "completed" | "error";
  progress: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface WorkflowStageExecution {
  stageName: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  userInput?: Record<string, any>;
  aiAnalysis?: Record<string, any>;
  generatedOutput?: Record<string, any>;
  startedAt?: Date;
  completedAt?: Date;
  notes?: string;
}

export interface GeneratedDocument {
  id: string;
  name: string;
  type: string; // "letter", "affidavit", "form", "brief", etc.
  content: string;
  status: "draft" | "reviewed" | "approved" | "finalized";
  stage: string;
  createdAt: Date;
  reviews?: DocumentReview[];
}

export interface DocumentReview {
  reviewedBy: string;
  timestamp: Date;
  feedback?: string;
  approved: boolean;
}

export interface WorkflowMessage {
  id: string;
  type: "system" | "ai" | "user" | "error";
  content: string;
  timestamp: Date;
  stage?: string;
  metadata?: Record<string, any>;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* WORKFLOW ENGINE                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */

export class WorkflowEngine {
  private executionState: WorkflowExecutionState;
  private specification: WorkflowSpecification;

  constructor(
    userId: string,
    workflowName: string,
    specification: WorkflowSpecification
  ) {
    this.specification = specification;
    this.executionState = {
      id: `workflow-${Date.now()}`,
      userId,
      workflowId: specification.id,
      workflowName,
      currentStage: 0,
      stages: specification.stages.map((s) => ({
        stageName: s.name,
        status: "pending",
      })),
      caseData: {},
      documents: [],
      messages: [
        {
          id: `msg-${Date.now()}`,
          type: "system",
          content: `Starting workflow: ${workflowName}. Let's begin!`,
          timestamp: new Date(),
        },
      ],
      status: "not_started",
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Get current state
   */
  getState(): WorkflowExecutionState {
    return this.executionState;
  }

  /**
   * Get current stage configuration
   */
  getCurrentStage(): PipelineStageConfig | null {
    const stage = this.specification.stages[this.executionState.currentStage];
    return stage || null;
  }

  /**
   * Move to next stage
   */
  async nextStage(): Promise<void> {
    if (this.executionState.currentStage < this.specification.stages.length) {
      this.executionState.currentStage++;
      this.updateProgress();
    }
  }

  /**
   * Collect user input for current stage
   */
  async submitUserInput(input: Record<string, any>): Promise<void> {
    const currentStage = this.getCurrentStage();
    if (!currentStage) {
      throw new Error("No current stage");
    }

    // Store input
    this.executionState.stages[this.executionState.currentStage].userInput =
      input;
    this.executionState.caseData = { ...this.executionState.caseData, ...input };

    // Add message
    this.addMessage(
      "user",
      `Submitted information for ${currentStage.title}`,
      currentStage.name
    );

    // Mark stage in progress
    this.executionState.stages[this.executionState.currentStage].status =
      "in_progress";
    this.executionState.stages[this.executionState.currentStage].startedAt =
      new Date();

    // Execute AI tasks if any
    if ((currentStage.aiTasks || []).length > 0) {
      await this.executeAITasks(currentStage);
    }

    // Mark stage completed
    this.executionState.stages[this.executionState.currentStage].status =
      "completed";
    this.executionState.stages[this.executionState.currentStage].completedAt =
      new Date();

    this.executionState.updatedAt = new Date();
  }

  /**
   * Execute AI tasks for a stage
   */
  private async executeAITasks(stage: PipelineStageConfig): Promise<void> {
    this.addMessage(
      "system",
      `Analyzing information for ${stage.title}...`,
      stage.name
    );

    try {
      // Build prompt with current case data
      const prompt = this.buildStagePrompt(stage);

      // Send to Claude
      const response = await llmProvider.sendMessage([
        {
          role: "user",
          content: prompt,
        },
      ]);

      // Parse response
      let analysis;
      try {
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { analysis: response.text };
      } catch {
        analysis = { analysis: response.text };
      }

      // Store analysis
      this.executionState.stages[this.executionState.currentStage].aiAnalysis =
        analysis;

      // Generate documents if needed
      if (stage.name === "draft") {
        await this.generateDocuments(stage, analysis);
      }

      // Add message with findings
      this.addMessage(
        "ai",
        `Completed analysis for ${stage.title}. ${this.summarizeAnalysis(analysis)}`,
        stage.name
      );
    } catch (error) {
      const errorMsg = `Error in ${stage.title}: ${(error as Error).message}`;
      this.addMessage("error", errorMsg, stage.name);
      throw error;
    }
  }

  /**
   * Build prompt for AI stage execution
   */
  private buildStagePrompt(stage: PipelineStageConfig): string {
    const caseDataStr = JSON.stringify(this.executionState.caseData, null, 2);

    return `You are an expert ${this.specification.caseType} advisor.

CURRENT CASE DATA:
${caseDataStr}

STAGE: ${stage.title}
DESCRIPTION: ${stage.description}

TASKS TO COMPLETE:
${(stage.aiTasks || []).map((t) => `- ${t}`).join("\n")}

REQUIRED OUTPUTS:
${(stage.outputs || []).map((o) => `- ${o}`).join("\n")}

SUCCESS CRITERIA:
${(stage.successCriteria || []).map((c) => `- ${c}`).join("\n")}

Complete these tasks thoroughly. Respond with JSON containing your analysis, findings, and outputs.

Format your response as JSON with this structure:
{
  "findings": "Your analysis of the case",
  "recommendations": ["recommendation 1", "recommendation 2"],
  "outputs": {
    "output_name": "content or summary"
  },
  "nextSteps": ["step 1", "step 2"]
}`;
  }

  /**
   * Generate documents (letters, affidavits, etc.)
   */
  private async generateDocuments(
    stage: PipelineStageConfig,
    analysis: any
  ): Promise<void> {
    const documentTypes = stage.outputs
      ?.filter((o) => o.toLowerCase().includes("letter") || o.toLowerCase().includes("affidavit") || o.toLowerCase().includes("form"))
      .slice(0, 3) || [];

    for (const docType of documentTypes) {
      const prompt = `Generate a ${docType} for this ${this.specification.caseType} case.

CASE DATA:
${JSON.stringify(this.executionState.caseData, null, 2)}

ANALYSIS:
${JSON.stringify(analysis, null, 2)}

Create a professional, persuasive ${docType} that:
1. Addresses the specific issues in this case
2. Is formatted for official delivery
3. Includes all necessary legal arguments
4. Is ready for the user to review and send

Respond with the complete document text.`;

      const response = await llmProvider.sendMessage([
        {
          role: "user",
          content: prompt,
        },
      ]);

      const doc: GeneratedDocument = {
        id: `doc-${Date.now()}-${Math.random()}`,
        name: docType,
        type: this.inferDocumentType(docType),
        content: response.text,
        status: "draft",
        stage: stage.name,
        createdAt: new Date(),
      };

      this.executionState.documents.push(doc);
      this.addMessage(
        "ai",
        `Generated ${docType} - ready for your review`,
        stage.name
      );
    }
  }

  /**
   * Infer document type
   */
  private inferDocumentType(name: string): string {
    if (name.toLowerCase().includes("letter")) return "letter";
    if (name.toLowerCase().includes("affidavit")) return "affidavit";
    if (name.toLowerCase().includes("form")) return "form";
    if (name.toLowerCase().includes("brief")) return "brief";
    if (name.toLowerCase().includes("appeal")) return "appeal";
    return "document";
  }

  /**
   * Summarize analysis for display
   */
  private summarizeAnalysis(analysis: any): string {
    if (analysis.findings) return analysis.findings.substring(0, 200);
    if (analysis.analysis) return analysis.analysis.substring(0, 200);
    return "Analysis complete";
  }

  /**
   * Add message to workflow
   */
  private addMessage(
    type: "system" | "ai" | "user" | "error",
    content: string,
    stage?: string
  ): void {
    this.executionState.messages.push({
      id: `msg-${Date.now()}`,
      type,
      content,
      timestamp: new Date(),
      stage,
    });
  }

  /**
   * Approve/finalize a document
   */
  approveDocument(
    documentId: string,
    feedback?: string
  ): void {
    const doc = this.executionState.documents.find((d) => d.id === documentId);
    if (!doc) throw new Error("Document not found");

    if (!doc.reviews) doc.reviews = [];

    doc.reviews.push({
      reviewedBy: this.executionState.userId,
      timestamp: new Date(),
      feedback,
      approved: true,
    });

    doc.status = "approved";
    this.addMessage(
      "user",
      `Approved ${doc.name}`,
      doc.stage
    );
  }

  /**
   * Request revision to document
   */
  requestRevision(
    documentId: string,
    feedback: string
  ): void {
    const doc = this.executionState.documents.find((d) => d.id === documentId);
    if (!doc) throw new Error("Document not found");

    if (!doc.reviews) doc.reviews = [];

    doc.reviews.push({
      reviewedBy: this.executionState.userId,
      timestamp: new Date(),
      feedback,
      approved: false,
    });

    doc.status = "draft";
    this.addMessage(
      "user",
      `Requested revision: ${feedback}`,
      doc.stage
    );
  }

  /**
   * Complete workflow
   */
  async completeWorkflow(): Promise<void> {
    // Finalize all documents
    for (const doc of this.executionState.documents) {
      if (doc.status !== "approved") {
        doc.status = "finalized";
      }
    }

    this.executionState.status = "completed";
    this.executionState.completedAt = new Date();
    this.executionState.progress = 100;

    this.addMessage(
      "system",
      `Workflow completed! You have ${this.executionState.documents.length} documents ready to send.`
    );
  }

  /**
   * Update progress percentage
   */
  private updateProgress(): void {
    const completed = this.executionState.stages.filter(
      (s) => s.status === "completed"
    ).length;
    const total = this.executionState.stages.length;
    this.executionState.progress = Math.round((completed / total) * 100);
  }

  /**
   * Pause workflow
   */
  pause(): void {
    this.executionState.status = "paused";
    this.addMessage("system", "Workflow paused");
  }

  /**
   * Resume workflow
   */
  resume(): void {
    this.executionState.status = "in_progress";
    this.addMessage("system", "Workflow resumed");
  }

  /**
   * Get summary for display
   */
  getSummary(): {
    name: string;
    stage: string;
    progress: number;
    documentsCount: number;
    status: string;
    nextAction?: string;
  } {
    const currentStage = this.getCurrentStage();
    return {
      name: this.executionState.workflowName,
      stage: currentStage?.title || "Completed",
      progress: this.executionState.progress,
      documentsCount: this.executionState.documents.length,
      status: this.executionState.status,
      nextAction: currentStage?.requiresUserInput
        ? `Answer questions for ${currentStage.title}`
        : "Processing...",
    };
  }
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* WORKFLOW PERSISTENCE                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Store workflow execution in database
 */
export async function persistWorkflowState(
  state: WorkflowExecutionState
): Promise<void> {
  // Save to database
  // await supabase.from('workflow_executions').upsert({
  //   id: state.id,
  //   user_id: state.userId,
  //   workflow_id: state.workflowId,
  //   state: JSON.stringify(state),
  //   status: state.status,
  //   progress: state.progress,
  //   updated_at: state.updatedAt
  // });

  console.log("Workflow state persisted:", state.id);
}

/**
 * Load workflow execution from database
 */
export async function loadWorkflowState(
  executionId: string
): Promise<WorkflowExecutionState | null> {
  // const { data } = await supabase
  //   .from('workflow_executions')
  //   .select('*')
  //   .eq('id', executionId)
  //   .single();

  // return data ? JSON.parse(data.state) : null;

  return null; // Placeholder
}
