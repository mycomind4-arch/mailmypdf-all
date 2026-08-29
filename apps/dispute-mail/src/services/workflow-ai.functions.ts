import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { workflows, type WorkflowId } from "@/domain/workflows";
import { analyzeWithClaude, draftWithClaude, validateDraftWithClaude } from "./claude-dispute";

const workflowInputSchema = z.object({
  workflowId: z.string(),
  documentId: z.string().min(1),
  text: z.string().min(1).max(120_000),
  facts: z.record(z.string(), z.string().optional()).default({}),
  objective: z.string().max(10_000).optional(),
});

export const runWorkflowAI = createServerFn({ method: "POST" })
  .validator((data: z.infer<typeof workflowInputSchema>) => workflowInputSchema.parse(data))
  .handler(async ({ data }) => {
    if (!(data.workflowId in workflows)) {
      throw new Error(`Unknown workflow: ${data.workflowId}`);
    }

    const workflowId = data.workflowId as WorkflowId;
    const analysis = await analyzeWithClaude({
      workflowId,
      documentId: data.documentId,
      text: data.text,
      facts: data.facts,
      objective: data.objective,
    });

    if (analysis.blockingIssues.length > 0) {
      return {
        workflowId,
        analysis,
        draft: null,
        validation: { passed: false, issues: analysis.blockingIssues },
        blocked: true,
      };
    }

    const draft = await draftWithClaude({ workflowId, analysis });
    const validation = await validateDraftWithClaude({ workflowId, analysis, draft });

    return {
      workflowId,
      analysis,
      draft,
      validation,
      blocked: !validation.passed,
    };
  });
