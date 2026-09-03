/**
 * Workflow Initialization System
 *
 * Allows users to customize and start workflows with their specific requirements.
 * Each workflow is customized before execution to ensure all case-specific details
 * are captured and integrated into the workflow logic.
 */

import { createServerFn } from "@tanstack/start";
import { v4 as uuid } from "uuid";
import {
  validateInput,
  logger,
  logAuditEvent,
  withErrorHandling,
} from "@/lib/security";
import { z } from "zod";

/* ─────────────────────────────────────────────────────────────────────────── */
/* TYPES                                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface WorkflowInitConfig {
  workflowId: string;
  userId: string;
  matterId?: string; // Case/matter this workflow is for
  customRequirements: Record<string, unknown>; // User-specific details
  respondent?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  deadline?: string; // ISO date
  priority: "low" | "normal" | "urgent";
  tags?: string[];
  notes?: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  userId: string;
  matterId?: string;
  status: "initialized" | "in_progress" | "paused" | "completed" | "failed";
  stage: string; // Current pipeline stage
  customRequirements: Record<string, unknown>;
  respondent?: Record<string, unknown>;
  deadline?: string;
  priority: "low" | "normal" | "urgent";
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  documents: WorkflowDocument[];
  messages: WorkflowMessage[];
  nextAction?: string;
  progress: number; // 0-100
}

export interface WorkflowDocument {
  id: string;
  name: string;
  type: string;
  status: "pending" | "draft" | "review" | "approved" | "sent";
  content?: string;
  url?: string;
  createdAt: string;
}

export interface WorkflowMessage {
  id: string;
  type: "system" | "user" | "ai";
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowCustomizationForm {
  workflowId: string;
  title: string;
  description: string;
  fields: WorkflowFormField[];
  estimatedDuration: string;
  successCriteria: string[];
}

export interface WorkflowFormField {
  id: string;
  name: string;
  label: string;
  type: "text" | "email" | "phone" | "date" | "select" | "textarea" | "checkbox";
  required: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  validation?: string; // Regex pattern or validation rule
  help?: string;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* IMMIGRATION MAIL WORKFLOW - CRITICAL EXAMPLE                               */
/* ─────────────────────────────────────────────────────────────────────────── */

export const IMMIGRATION_MAIL_FORM: WorkflowCustomizationForm = {
  workflowId: "immigration-mail",
  title: "Immigration Mail Request",
  description:
    "Send official immigration correspondence to government agencies with proof of delivery",
  fields: [
    {
      id: "recipient_agency",
      name: "recipient_agency",
      label: "Recipient Government Agency",
      type: "select",
      required: true,
      options: [
        { label: "USCIS", value: "uscis" },
        { label: "DOS (Consular)", value: "dos_consular" },
        { label: "CBP", value: "cbp" },
        { label: "ICE", value: "ice" },
        { label: "State Department", value: "state_dept" },
        { label: "Local Immigration Office", value: "local_immigration" },
        { label: "Other", value: "other" },
      ],
      help: "Select the government agency you're contacting",
    },
    {
      id: "case_type",
      name: "case_type",
      label: "Immigration Case Type",
      type: "select",
      required: true,
      options: [
        { label: "Green Card (I-485)", value: "green_card" },
        { label: "Visa Application (I-765, I-131)", value: "visa_application" },
        { label: "Asylum Claim", value: "asylum" },
        { label: "Removal/Deportation Defense", value: "removal_defense" },
        { label: "Travel Document (Advance Parole)", value: "travel_document" },
        { label: "Work Permit (EAD)", value: "work_permit" },
        { label: "FOIA Request", value: "foia_request" },
        { label: "I-90 Replacement Card", value: "i90_replacement" },
        { label: "Name Change/Correction", value: "name_change" },
        { label: "Other", value: "other" },
      ],
      help: "What type of immigration matter is this?",
    },
    {
      id: "client_name",
      name: "client_name",
      label: "Your Full Name (or Client Name)",
      type: "text",
      required: true,
      validation: "^[a-zA-Z\\s]{2,100}$",
      help: "As it appears on immigration documents",
    },
    {
      id: "alien_number",
      name: "alien_number",
      label: "A-Number (Alien Number)",
      type: "text",
      required: false,
      placeholder: "A123456789 (if available)",
      help: "If you have been assigned an A-number by USCIS",
    },
    {
      id: "receipt_number",
      name: "receipt_number",
      label: "Receipt Number (if applicable)",
      type: "text",
      required: false,
      placeholder: "e.g., EAC/SRC/LIN format",
      help: "Previous USCIS receipt number if any",
    },
    {
      id: "purpose",
      name: "purpose",
      label: "Purpose of Letter",
      type: "textarea",
      required: true,
      help: "What are you requesting or informing the agency about?",
    },
    {
      id: "urgency",
      name: "urgency",
      label: "Urgency Level",
      type: "select",
      required: true,
      options: [
        { label: "Low - Routine (30 days)", value: "low" },
        { label: "Normal - Standard (14 days)", value: "normal" },
        { label: "Urgent - Time Sensitive (7 days)", value: "urgent" },
      ],
      help: "How soon do you need this sent?",
    },
    {
      id: "deadline_date",
      name: "deadline_date",
      label: "Deadline Date (if critical)",
      type: "date",
      required: false,
      help: "If there's a specific deadline (e.g., legal response deadline)",
    },
    {
      id: "supporting_documents",
      name: "supporting_documents",
      label: "Supporting Documents Needed",
      type: "textarea",
      required: false,
      help: "List any documents that should be attached (passport copy, birth certificate, etc.)",
    },
    {
      id: "contact_info",
      name: "contact_info",
      label: "Your Phone Number",
      type: "phone",
      required: true,
      help: "For agency to contact you",
    },
  ],
  estimatedDuration: "2-3 business days",
  successCriteria: [
    "Letter delivered and signed for by government agency",
    "Receipt of delivery confirmation",
    "Documentation for immigration file",
  ],
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* WORKFLOW INITIALIZATION                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Get customization form for a workflow
 */
export const getWorkflowCustomizationForm = createServerFn(
  { method: "POST" },
  async (workflowId: unknown) => {
    // Validate workflow ID
    const validated = validateInput(
      workflowId,
      z.string().uuid("Invalid workflow ID")
    );
    if (!validated.success) {
      throw new Error(validated.error);
    }

    return withErrorHandling(
      async () => {
        // Return appropriate form based on workflow type
        if (validated.data === "immigration-mail") {
          return IMMIGRATION_MAIL_FORM;
        }

        // Default form for other workflows
        return {
          workflowId: validated.data,
          title: "Workflow Customization",
          description: "Customize this workflow for your specific needs",
          fields: [],
          estimatedDuration: "1-2 hours",
          successCriteria: ["Workflow completed successfully"],
        };
      },
      { path: "/workflows/customize", method: "POST" }
    );
  }
);

/**
 * Initialize a workflow with user-provided requirements
 *
 * This is where the workflow actually gets created and customized
 * based on user inputs. The workflow intelligence system analyzes
 * the requirements and generates the complete workflow.
 */
export const initializeWorkflow = createServerFn(
  { method: "POST" },
  async (config: unknown) => {
    // Validate configuration
    const configSchema = z.object({
      workflowId: z.string().uuid(),
      customRequirements: z.record(z.unknown()),
      respondent: z
        .object({
          name: z.string(),
          address: z.string().optional(),
          phone: z.string().optional(),
          email: z.string().email().optional(),
        })
        .optional(),
      deadline: z.string().datetime().optional(),
      priority: z.enum(["low", "normal", "urgent"]),
      notes: z.string().optional(),
    });

    const validated = validateInput(config, configSchema);
    if (!validated.success) {
      throw new Error(`Invalid workflow configuration: ${validated.error}`);
    }

    return withErrorHandling(
      async () => {
        const workflowConfig = validated.data;
        const workflowRunId = uuid();

        // Log workflow initialization
        logger.info("Workflow initialized", {
          workflowId: workflowConfig.workflowId,
          runId: workflowRunId,
          priority: workflowConfig.priority,
        });

        // Create workflow run record
        const workflowRun: WorkflowRun = {
          id: workflowRunId,
          workflowId: workflowConfig.workflowId,
          userId: "current-user-id", // Would come from auth
          status: "initialized",
          stage: "intake", // First stage: gather requirements
          customRequirements: workflowConfig.customRequirements,
          respondent: workflowConfig.respondent,
          deadline: workflowConfig.deadline,
          priority: workflowConfig.priority,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          documents: [],
          messages: [
            {
              id: uuid(),
              type: "system",
              content: `Workflow "${workflowConfig.workflowId}" initialized. Analyzing requirements...`,
              timestamp: new Date().toISOString(),
            },
          ],
          nextAction: "Review requirements and generate strategy",
          progress: 10,
        };

        // Save to database
        // await supabase.from('workflow_runs').insert(workflowRun);

        // Audit log
        await logAuditEvent(
          "current-user-id",
          "workflow_initialized",
          "workflow_run",
          workflowRunId,
          workflowConfig,
          "success"
        );

        return workflowRun;
      },
      {
        userId: "current-user-id",
        path: "/workflows/initialize",
        method: "POST",
      }
    );
  }
);

/**
 * Progress workflow to next stage
 *
 * Moves workflow through pipeline:
 * intake → research → analysis → strategy → draft → review → assembly → approval
 */
export const progressWorkflow = createServerFn(
  { method: "POST" },
  async (runId: unknown, nextStage: unknown) => {
    const runIdValidated = validateInput(runId, z.string().uuid());
    const stageValidated = validateInput(
      nextStage,
      z.enum([
        "intake",
        "research",
        "analysis",
        "strategy",
        "draft",
        "review",
        "assembly",
        "approval",
      ])
    );

    if (!runIdValidated.success || !stageValidated.success) {
      throw new Error("Invalid workflow progress request");
    }

    return withErrorHandling(
      async () => {
        // Fetch current workflow run
        // const { data: workflowRun } = await supabase
        //   .from('workflow_runs')
        //   .select('*')
        //   .eq('id', runIdValidated.data)
        //   .single();

        const workflowRun: WorkflowRun = {
          id: runIdValidated.data,
          workflowId: "immigration-mail",
          userId: "current-user-id",
          status: "in_progress",
          stage: stageValidated.data,
          customRequirements: {},
          priority: "normal",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          documents: [],
          messages: [],
          progress: 30,
        };

        // Log stage progression
        logger.info("Workflow progressed", {
          runId: runIdValidated.data,
          newStage: stageValidated.data,
        });

        // Update in database
        // await supabase
        //   .from('workflow_runs')
        //   .update({ stage: stageValidated.data, updated_at: new Date().toISOString() })
        //   .eq('id', runIdValidated.data);

        return workflowRun;
      },
      { path: "/workflows/progress", method: "POST" }
    );
  }
);

/**
 * Add document to workflow
 */
export const addWorkflowDocument = createServerFn(
  { method: "POST" },
  async (runId: unknown, document: unknown) => {
    const runIdValidated = validateInput(runId, z.string().uuid());

    const documentSchema = z.object({
      name: z.string(),
      type: z.string(),
      content: z.string(),
    });

    const documentValidated = validateInput(document, documentSchema);

    if (!runIdValidated.success || !documentValidated.success) {
      throw new Error("Invalid document");
    }

    return withErrorHandling(
      async () => {
        const doc: WorkflowDocument = {
          id: uuid(),
          name: documentValidated.data.name,
          type: documentValidated.data.type,
          status: "draft",
          content: documentValidated.data.content,
          createdAt: new Date().toISOString(),
        };

        // Save to database
        // await supabase.from('workflow_documents').insert({
        //   id: doc.id,
        //   workflow_run_id: runIdValidated.data,
        //   ...doc
        // });

        logger.info("Document added to workflow", {
          runId: runIdValidated.data,
          documentId: doc.id,
          documentType: doc.type,
        });

        return doc;
      },
      { path: "/workflows/documents/add", method: "POST" }
    );
  }
);

/**
 * Get workflow run status and details
 */
export const getWorkflowRunStatus = createServerFn(
  { method: "POST" },
  async (runId: unknown) => {
    const validated = validateInput(runId, z.string().uuid());
    if (!validated.success) {
      throw new Error("Invalid run ID");
    }

    return withErrorHandling(
      async () => {
        // Fetch from database
        // const { data: workflowRun } = await supabase
        //   .from('workflow_runs')
        //   .select('*')
        //   .eq('id', validated.data)
        //   .single();

        // Return mock for now
        const workflowRun: WorkflowRun = {
          id: validated.data,
          workflowId: "immigration-mail",
          userId: "current-user-id",
          status: "in_progress",
          stage: "research",
          customRequirements: {},
          priority: "urgent",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          documents: [],
          messages: [
            {
              id: uuid(),
              type: "system",
              content: "Researching USCIS procedures for your case...",
              timestamp: new Date().toISOString(),
            },
          ],
          nextAction: "Analyzing case requirements",
          progress: 40,
        };

        logger.info("Workflow status retrieved", {
          runId: validated.data,
          stage: workflowRun.stage,
        });

        return workflowRun;
      },
      { path: "/workflows/status", method: "POST" }
    );
  }
);

/**
 * Complete workflow and send/submit
 */
export const completeWorkflow = createServerFn(
  { method: "POST" },
  async (runId: unknown, sendMethod: unknown) => {
    const runIdValidated = validateInput(runId, z.string().uuid());
    const methodValidated = validateInput(
      sendMethod,
      z.enum(["email", "lob_mail", "portal"])
    );

    if (!runIdValidated.success || !methodValidated.success) {
      throw new Error("Invalid completion request");
    }

    return withErrorHandling(
      async () => {
        logger.info("Workflow completed and submitted", {
          runId: runIdValidated.data,
          sendMethod: methodValidated.data,
        });

        // Update status to completed
        // await supabase
        //   .from('workflow_runs')
        //   .update({
        //     status: 'completed',
        //     completed_at: new Date().toISOString()
        //   })
        //   .eq('id', runIdValidated.data);

        // Queue for sending (Lob integration, email, etc.)
        // Based on sendMethod

        return {
          success: true,
          runId: runIdValidated.data,
          message: `Workflow submitted via ${methodValidated.data}`,
        };
      },
      { path: "/workflows/complete", method: "POST" }
    );
  }
);
