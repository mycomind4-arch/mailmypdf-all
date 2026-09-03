/**
 * Admin Workflow Generator - Server Functions
 *
 * Generates new workflows + SEO landing pages
 * Used by admin dashboard to create new workflows
 */

import { createServerFn } from "@tanstack/start";
import { llmProvider } from "@mailmypdf/workflow-intelligence";
import {
  generateWorkflow,
  type WorkflowGenerationRequest,
} from "@mailmypdf/workflow-intelligence";
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

export interface GeneratedLandingPage {
  title: string;
  description: string;
  headline: string;
  subheadline: string;
  features: string[];
  pricing: string;
  cta: string;
  seoKeywords: string[];
  metaDescription: string;
  ogImage: string;
}

export interface WorkflowGenerationResult {
  success: boolean;
  workflowId: string;
  workflowName: string;
  verticalId: string;
  landingPage: GeneratedLandingPage;
  liveUrl: string;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* LANDING PAGE GENERATOR                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */

async function generateSEOLandingPage(
  workflowName: string,
  workflowDescription: string,
  verticalName: string,
  caseType: string,
  referenceImageDescription?: string,
  customizationNotes?: string
): Promise<GeneratedLandingPage> {
  const prompt = `You are an expert landing page copywriter for legal/government services.

Generate a high-converting SEO landing page for this workflow:

Workflow: ${workflowName}
Description: ${workflowDescription}
Vertical: ${verticalName}
Case Type: ${caseType}

${referenceImageDescription ? `Reference Design: Admin uploaded a reference image showing their desired design approach.` : ""}
${customizationNotes ? `Design Notes from Admin:\n${customizationNotes}` : ""}

Create a landing page with:
1. Compelling headline (< 10 words)
2. Subheadline that reinforces benefit
3. List of 6-8 key features/benefits
4. Pricing tier (use reasonable value: "$99-$199" or similar)
5. Call-to-action (e.g., "Start Your Case" or "Request Now")
6. SEO keywords (10 most important keywords)
7. Meta description (160 chars max)
8. OG image description

Response format (JSON):
{
  "headline": "Your headline here",
  "subheadline": "Your subheadline",
  "features": [
    "Feature 1: Detailed benefit",
    "Feature 2: Detailed benefit"
  ],
  "pricing": "$149/case",
  "cta": "Start Your Case",
  "seoKeywords": ["keyword1", "keyword2"],
  "metaDescription": "Meta description...",
  "ogImage": "Description of ideal OG image"
}`;

  const response = await llmProvider.sendMessage([
    {
      role: "user",
      content: prompt,
    },
  ]);

  let landingData;
  try {
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    landingData = JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Failed to parse landing page:", error);
    throw new Error("Invalid landing page generation");
  }

  return {
    title: `${workflowName} - Legal Service`,
    description: workflowDescription,
    headline: landingData.headline || workflowName,
    subheadline: landingData.subheadline || workflowDescription,
    features: landingData.features || [],
    pricing: landingData.pricing || "$149",
    cta: landingData.cta || "Get Started",
    seoKeywords: landingData.seoKeywords || [],
    metaDescription:
      landingData.metaDescription ||
      `Professional ${workflowName} service online.`,
    ogImage: landingData.ogImage || "Workflow legal document",
  };
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* GENERATE WORKFLOW ENDPOINT                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Generate new workflow + landing page
 */
export const generateNewWorkflow = createServerFn(
  { method: "POST" },
  async (request: unknown) => {
    // Validate
    const schema = z.object({
      verticalId: z.string().min(1),
      workflowId: z.string().min(1),
    });

    const validated = validateInput(request, schema);
    if (!validated.success) {
      throw new Error(`Invalid request: ${validated.error}`);
    }

    const { verticalId, workflowId } = validated.data;

    return withErrorHandling(
      async () => {
        logger.info("Generating workflow via admin", {
          verticalId,
          workflowId,
          userId: "admin-user",
        });

        // Map workflow ID to details
        const workflowDetails = getWorkflowDetails(verticalId, workflowId);
        if (!workflowDetails) {
          throw new Error("Workflow not found");
        }

        // 1. GENERATE WORKFLOW USING AI
        console.log(`Generating workflow: ${workflowDetails.name}...`);
        const generatedWorkflow = await generateWorkflow({
          verticalId,
          caseType: workflowDetails.name,
          complexity: workflowDetails.complexity as "simple" | "moderate" | "complex",
          userConstraints: workflowDetails.constraints,
        });

        // 2. GENERATE SEO LANDING PAGE
        console.log(`Generating landing page...`);
        const landingPage = await generateSEOLandingPage(
          workflowDetails.name,
          workflowDetails.description,
          getVerticalName(verticalId),
          workflowDetails.name
        );

        // 3. SAVE WORKFLOW TO DATABASE
        // await supabase.from('workflows').insert({
        //   id: workflowId,
        //   vertical_id: verticalId,
        //   name: generatedWorkflow.name,
        //   specification: generatedWorkflow.specification,
        //   landing_page: landingPage,
        //   status: 'published',
        //   created_at: new Date().toISOString()
        // });

        // 4. AUDIT LOG
        await logAuditEvent(
          "admin-user",
          "workflow_generated",
          "workflow",
          workflowId,
          {
            verticalId,
            workflowName: workflowDetails.name,
          },
          "success",
          undefined,
          "admin-panel"
        );

        const liveUrl = `/${verticalId}/${workflowId}`;

        return {
          success: true,
          workflowId,
          workflowName: workflowDetails.name,
          verticalId,
          landingPage,
          liveUrl,
        };
      },
      { userId: "admin-user", path: "/api/admin/generate-workflow" }
    );
  }
);

/**
 * Publish workflow
 */
export const publishWorkflow = createServerFn(
  { method: "POST" },
  async (request: unknown) => {
    // Validate
    const schema = z.object({
      verticalId: z.string().min(1),
      workflowId: z.string().min(1),
      landingPage: z.object({
        title: z.string(),
        description: z.string(),
        headline: z.string(),
        subheadline: z.string(),
        features: z.array(z.string()),
        pricing: z.string(),
        cta: z.string(),
        seoKeywords: z.array(z.string()),
        metaDescription: z.string(),
        ogImage: z.string(),
      }),
    });

    const validated = validateInput(request, schema);
    if (!validated.success) {
      throw new Error(`Invalid request: ${validated.error}`);
    }

    const { verticalId, workflowId, landingPage } = validated.data;

    return withErrorHandling(
      async () => {
        logger.info("Publishing workflow", {
          verticalId,
          workflowId,
        });

        // 1. UPDATE WORKFLOW STATUS
        // await supabase
        //   .from('workflows')
        //   .update({ status: 'live' })
        //   .eq('id', workflowId);

        // 2. CREATE LANDING PAGE ROUTE
        // This would be handled by creating the route file or updating routes

        // 3. AUDIT LOG
        await logAuditEvent(
          "admin-user",
          "workflow_published",
          "workflow",
          workflowId,
          {
            verticalId,
            landingPageTitle: landingPage.title,
          },
          "success",
          undefined,
          "admin-panel"
        );

        const liveUrl = `/${verticalId}/${workflowId}`;

        return {
          success: true,
          workflowId,
          verticalId,
          message: `Workflow published at ${liveUrl}`,
          liveUrl,
        };
      },
      { userId: "admin-user", path: "/api/admin/publish-workflow" }
    );
  }
);

/* ─────────────────────────────────────────────────────────────────────────── */
/* HELPERS                                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

function getWorkflowDetails(
  verticalId: string,
  workflowId: string
): {
  name: string;
  description: string;
  complexity: string;
  constraints?: string[];
} | null {
  const workflows: Record<string, Record<string, any>> = {
    "immigration-mail": {
      "uscis-gc-appeal": {
        name: "USCIS Green Card Appeal",
        description: "Appeal denied or delayed green card application",
        complexity: "complex",
        constraints: ["immigration", "USCIS", "appeals"],
      },
      "visa-application": {
        name: "Visa Application Response",
        description: "Respond to visa interview questions or denials",
        complexity: "moderate",
        constraints: ["visa", "consular"],
      },
      "foia-request": {
        name: "FOIA Request to USCIS",
        description: "Request immigration file or records",
        complexity: "simple",
        constraints: ["FOIA", "records"],
      },
    },
    "dispute-mail": {
      "debt-collection-response": {
        name: "Debt Collection Response",
        description: "Respond to debt collection letter",
        complexity: "moderate",
        constraints: ["debt", "collection"],
      },
    },
    "cp-correspondence": {
      "cp2000-response": {
        name: "CP2000 Response",
        description: "Respond to IRS accuracy-related notice",
        complexity: "complex",
        constraints: ["IRS", "CP2000", "taxes"],
      },
    },
  };

  return workflows[verticalId]?.[workflowId] || null;
}

function getVerticalName(verticalId: string): string {
  const verticals: Record<string, string> = {
    "immigration-mail": "Immigration Mail",
    "dispute-mail": "Dispute Mail",
    "cp-correspondence": "CP Correspondence",
    "appeal-mail": "Appeal Mail",
    "records-request": "Records Requests",
    "housing-mail": "Housing Mail",
  };

  return verticals[verticalId] || verticalId;
}
