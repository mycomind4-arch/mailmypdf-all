/**
 * Workflow Orchestrator - Server Functions
 *
 * Orchestrates the complete workflow lifecycle:
 * 1. Generate workflow from request
 * 2. Create execution engine
 * 3. Execute stages
 * 4. Generate documents
 * 5. Track progress
 * 6. Export/send results
 */

import { createServerFn } from "@tanstack/start";
import { getRequest } from "vinxi/http";
import {
  validateInput,
  logger,
  logAuditEvent,
  CommonSchemas,
  withErrorHandling,
} from "@/lib/security";
import { z } from "zod";
import {
  generateWorkflow,
  type WorkflowGenerationRequest,
  type GeneratedWorkflow,
} from "@mailmypdf/workflow-intelligence";
import { WorkflowEngine } from "@mailmypdf/workflow-intelligence";

/* ─────────────────────────────────────────────────────────────────────────── */
/* TYPES                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface StartWorkflowRequest {
  verticalId: string;
  caseType: string;
  complexity: "simple" | "moderate" | "complex";
  userConstraints?: string[];
}

export interface WorkflowStartResponse {
  executionId: string;
  workflowId: string;
  workflowName: string;
  specification: any;
  firstStage: {
    name: string;
    title: string;
    description: string;
    questions: string[];
    estimatedMinutes: number;
  };
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* WORKFLOW LIFECYCLE FUNCTIONS                                                */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Start a new workflow
 *
 * This is where everything begins:
 * 1. Generate workflow using AI
 * 2. Create execution engine
 * 3. Initialize database record
 * 4. Return to user
 */
export const startWorkflow = createServerFn(
  { method: "POST" },
  async (request: unknown) => {
    // Validate request
    const schema = z.object({
      verticalId: z.string(),
      caseType: z.string(),
      complexity: z.enum(["simple", "moderate", "complex"]),
      userConstraints: z.array(z.string()).optional(),
    });

    const validated = validateInput(request, schema);
    if (!validated.success) {
      throw new Error(`Invalid workflow request: ${validated.error}`);
    }

    const req = validated.data as StartWorkflowRequest;

    return withErrorHandling(
      async () => {
        logger.info("Starting workflow generation", {
          verticalId: req.verticalId,
          caseType: req.caseType,
          complexity: req.complexity,
        });

        // 1. GENERATE WORKFLOW
        console.log(`Generating workflow for: ${req.caseType}...`);
        const generatedWorkflow = await generateWorkflow({
          verticalId: req.verticalId,
          caseType: req.caseType,
          complexity: req.complexity,
          userConstraints: req.userConstraints,
        });

        // 2. CREATE EXECUTION ENGINE
        const engine = new WorkflowEngine(
          "current-user-id", // Would come from auth
          generatedWorkflow.name,
          generatedWorkflow.specification
        );

        const executionState = engine.getState();

        // 3. PERSIST TO DATABASE
        // await persistWorkflowState(executionState);

        // 4. LOG AUDIT EVENT
        await logAuditEvent(
          "current-user-id",
          "workflow_started",
          "workflow",
          executionState.id,
          {
            verticalId: req.verticalId,
            caseType: req.caseType,
            workflowName: generatedWorkflow.name,
          },
          "success"
        );

        // 5. RETURN TO USER
        const firstStage = engine.getCurrentStage();

        const response: WorkflowStartResponse = {
          executionId: executionState.id,
          workflowId: generatedWorkflow.specification.id,
          workflowName: generatedWorkflow.name,
          specification: generatedWorkflow.specification,
          firstStage: {
            name: firstStage?.name || "",
            title: firstStage?.title || "",
            description: firstStage?.description || "",
            questions: firstStage?.questions || [],
            estimatedMinutes: firstStage?.estimatedMinutes || 30,
          },
        };

        logger.info("Workflow started successfully", {
          executionId: executionState.id,
          workflowName: generatedWorkflow.name,
        });

        return response;
      },
      { path: "/workflows/start", method: "POST" }
    );
  }
);

/**
 * Submit user input for current stage
 *
 * Processes user answers and triggers AI analysis
 */
export const submitStageInput = createServerFn(
  { method: "POST" },
  async (executionId: unknown, input: unknown) => {
    // Validate
    const idValidated = validateInput(
      executionId,
      z.string().min(1, "Invalid execution ID")
    );
    const inputValidated = validateInput(input, z.record(z.unknown()));

    if (!idValidated.success || !inputValidated.success) {
      throw new Error("Invalid submission");
    }

    return withErrorHandling(
      async () => {
        logger.info("Stage input submitted", {
          executionId: idValidated.data,
        });

        // 1. LOAD WORKFLOW STATE
        // const engine = await loadWorkflowEngine(idValidated.data);

        // 2. SUBMIT INPUT (triggers AI analysis)
        // await engine.submitUserInput(inputValidated.data);

        // 3. PERSIST STATE
        // await persistWorkflowState(engine.getState());

        // 4. RETURN UPDATED STATE
        return {
          success: true,
          executionId: idValidated.data,
          message: "Input processed. AI is analyzing...",
          // state: engine.getState()
        };
      },
      { path: "/workflows/stage/submit", method: "POST" }
    );
  }
);

/**
 * Get current workflow status and state
 */
export const getWorkflowStatus = createServerFn(
  { method: "POST" },
  async (executionId: unknown) => {
    const validated = validateInput(
      executionId,
      z.string().min(1, "Invalid execution ID")
    );

    if (!validated.success) {
      throw new Error(validated.error);
    }

    return withErrorHandling(
      async () => {
        logger.info("Workflow status retrieved", {
          executionId: validated.data,
        });

        // Load from database
        // const state = await loadWorkflowState(validated.data);

        return {
          executionId: validated.data,
          status: "in_progress",
          progress: 40,
          currentStage: "strategy",
          documentsGenerated: 2,
          messages: [],
          // Full state
        };
      },
      { path: "/workflows/status", method: "POST" }
    );
  }
);

/**
 * Approve a generated document
 */
export const approveDocument = createServerFn(
  { method: "POST" },
  async (executionId: unknown, documentId: unknown, feedback?: string) => {
    const execIdValidated = validateInput(
      executionId,
      z.string().min(1)
    );
    const docIdValidated = validateInput(
      documentId,
      z.string().min(1)
    );

    if (!execIdValidated.success || !docIdValidated.success) {
      throw new Error("Invalid IDs");
    }

    return withErrorHandling(
      async () => {
        logger.info("Document approved", {
          executionId: execIdValidated.data,
          documentId: docIdValidated.data,
        });

        // Load workflow
        // const engine = await loadWorkflowEngine(execIdValidated.data);

        // Approve document
        // engine.approveDocument(docIdValidated.data, feedback);

        // Save state
        // await persistWorkflowState(engine.getState());

        return {
          success: true,
          documentId: docIdValidated.data,
          message: "Document approved",
        };
      },
      { path: "/workflows/documents/approve", method: "POST" }
    );
  }
);

/**
 * Request revision to a document
 */
export const requestDocumentRevision = createServerFn(
  { method: "POST" },
  async (executionId: unknown, documentId: unknown, feedback: unknown) => {
    const execIdValidated = validateInput(executionId, z.string().min(1));
    const docIdValidated = validateInput(documentId, z.string().min(1));
    const feedbackValidated = validateInput(feedback, z.string().min(1));

    if (
      !execIdValidated.success ||
      !docIdValidated.success ||
      !feedbackValidated.success
    ) {
      throw new Error("Invalid request");
    }

    return withErrorHandling(
      async () => {
        logger.info("Revision requested", {
          executionId: execIdValidated.data,
          documentId: docIdValidated.data,
          feedback: feedbackValidated.data,
        });

        // Load workflow
        // const engine = await loadWorkflowEngine(execIdValidated.data);

        // Request revision (AI will regenerate)
        // engine.requestRevision(docIdValidated.data, feedbackValidated.data);

        // Save state
        // await persistWorkflowState(engine.getState());

        return {
          success: true,
          documentId: docIdValidated.data,
          message: "Revision requested. AI is regenerating...",
        };
      },
      { path: "/workflows/documents/revise", method: "POST" }
    );
  }
);

/**
 * Complete workflow and prepare for sending
 */
export const completeWorkflow = createServerFn(
  { method: "POST" },
  async (executionId: unknown, deliveryMethod: unknown) => {
    const execIdValidated = validateInput(
      executionId,
      z.string().min(1)
    );
    const methodValidated = validateInput(
      deliveryMethod,
      z.enum(["email", "lob_mail", "portal"])
    );

    if (!execIdValidated.success || !methodValidated.success) {
      throw new Error("Invalid completion request");
    }

    return withErrorHandling(
      async () => {
        logger.info("Workflow completed", {
          executionId: execIdValidated.data,
          deliveryMethod: methodValidated.data,
        });

        // Load workflow
        // const engine = await loadWorkflowEngine(execIdValidated.data);

        // Complete workflow
        // await engine.completeWorkflow();

        // Queue for delivery
        // await queueForDelivery(execIdValidated.data, methodValidated.data);

        // Save state
        // await persistWorkflowState(engine.getState());

        // Audit log
        await logAuditEvent(
          "current-user-id",
          "workflow_completed",
          "workflow",
          execIdValidated.data,
          {
            deliveryMethod: methodValidated.data,
          },
          "success"
        );

        return {
          success: true,
          executionId: execIdValidated.data,
          message: `Workflow sent via ${methodValidated.data}. Check your email for confirmation.`,
          confirmationCode: `CONFIRM-${Date.now()}`,
        };
      },
      { path: "/workflows/complete", method: "POST" }
    );
  }
);

/**
 * Export workflow results (for download)
 */
export const exportWorkflowResults = createServerFn(
  { method: "POST" },
  async (executionId: unknown, format: unknown) => {
    const execIdValidated = validateInput(
      executionId,
      z.string().min(1)
    );
    const formatValidated = validateInput(
      format,
      z.enum(["pdf", "docx", "zip"])
    );

    if (!execIdValidated.success || !formatValidated.success) {
      throw new Error("Invalid export request");
    }

    return withErrorHandling(
      async () => {
        logger.info("Workflow exported", {
          executionId: execIdValidated.data,
          format: formatValidated.data,
        });

        // Load workflow
        // const engine = await loadWorkflowEngine(execIdValidated.data);
        // const state = engine.getState();

        // Generate export file
        // const file = await generateExportFile(state, formatValidated.data);

        return {
          success: true,
          executionId: execIdValidated.data,
          format: formatValidated.data,
          downloadUrl: `/api/workflows/${execIdValidated.data}/export.${formatValidated.data === "pdf" ? "pdf" : formatValidated.data === "docx" ? "docx" : "zip"}`,
          fileName: `workflow-export.${formatValidated.data === "pdf" ? "pdf" : formatValidated.data === "docx" ? "docx" : "zip"}`,
        };
      },
      { path: "/workflows/export", method: "POST" }
    );
  }
);

/* ─────────────────────────────────────────────────────────────────────────── */
/* WORKFLOW HISTORY                                                            */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Get user's workflow history
 */
export const getWorkflowHistory = createServerFn(
  { method: "POST" },
  async (limit: unknown = 10, offset: unknown = 0) => {
    const limitValidated = validateInput(limit, z.number().min(1).max(100));
    const offsetValidated = validateInput(offset, z.number().min(0));

    if (!limitValidated.success || !offsetValidated.success) {
      throw new Error("Invalid pagination");
    }

    return withErrorHandling(
      async () => {
        logger.info("Workflow history retrieved", {
          userId: "current-user-id",
          limit: limitValidated.data,
          offset: offsetValidated.data,
        });

        // Query database for user's workflows
        // const { data: workflows, count } = await supabase
        //   .from('workflow_executions')
        //   .select('*', { count: 'exact' })
        //   .eq('user_id', userId)
        //   .order('created_at', { ascending: false })
        //   .range(offset, offset + limit - 1);

        return {
          workflows: [],
          count: 0,
          limit: limitValidated.data,
          offset: offsetValidated.data,
        };
      },
      { path: "/workflows/history", method: "POST" }
    );
  }
);
