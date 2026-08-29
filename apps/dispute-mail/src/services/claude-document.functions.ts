import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { uploadDocument } from "@/platform/mailmypdf";
import { workflows, type WorkflowId } from "@/domain/workflows";
import { analyzeWithClaudeDocument, draftWithClaude, validateDraftWithClaude } from "./claude-dispute-document";
import { accountAuthMiddleware } from "@/lib/server-function-auth";

const inputSchema = z.object({
  workflowId: z.string(),
  facts: z.record(z.string(), z.string().optional()).default({}),
  objective: z.string().max(10_000).optional(),
  evidenceStatuses: z.record(z.string(), z.string()).default({}),
});

export const analyzeUploadedWorkflowDocument = createServerFn({ method: "POST" })
  .middleware([accountAuthMiddleware])
  .handler(async ({ data }: { data: FormData }) => {
    const file = data.get("file");
    if (!(file instanceof File)) throw new Error("A document file is required");
    if (file.type !== "application/pdf") throw new Error("Dispute Mail currently requires PDF documents for direct Claude document analysis");
    if (file.size <= 0) throw new Error("The document is empty");
    if (file.size > 15 * 1024 * 1024) throw new Error("The document exceeds the 15 MB upload limit");

    let facts: Record<string, string | undefined> = {};
    let evidenceStatuses: Record<string, string> = {};
    try { facts = JSON.parse(String(data.get("facts") ?? "{}")); } catch { throw new Error("Invalid facts payload"); }
    try { evidenceStatuses = JSON.parse(String(data.get("evidenceStatuses") ?? "{}")); } catch { throw new Error("Invalid evidence status payload"); }

    const parsed = inputSchema.parse({
      workflowId: String(data.get("workflowId") ?? ""),
      facts,
      objective: String(data.get("objective") ?? "") || undefined,
      evidenceStatuses,
    });
    if (!(parsed.workflowId in workflows)) throw new Error(`Unknown workflow: ${parsed.workflowId}`);
    const workflowId = parsed.workflowId as WorkflowId;

    const stored = await uploadDocument(file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    const pdfBase64 = btoa(binary);

    const analysis = await analyzeWithClaudeDocument({
      workflowId,
      documentId: stored.id,
      filename: stored.filename,
      pdfBase64,
      facts: parsed.facts,
      objective: parsed.objective,
      evidenceStatuses: parsed.evidenceStatuses,
    });

    if (analysis.documentId !== stored.id || analysis.classification.type !== workflowId) throw new Error("Claude returned an analysis for the wrong workflow or stored document");

    const requiredEvidenceIds = new Set(analysis.evidence.map((item) => item.id));
    const suppliedEvidenceIds = new Set(Object.keys(parsed.evidenceStatuses));
    if ([...requiredEvidenceIds].some((id) => !suppliedEvidenceIds.has(id))) return { document: stored, analysis, draft: null, validation: { passed: false, issues: ["AI analysis did not receive complete evidence-state coverage"] }, blocked: true };
    if (analysis.blockingIssues.length > 0) return { document: stored, analysis, draft: null, validation: { passed: false, issues: analysis.blockingIssues }, blocked: true };

    const draft = await draftWithClaude({ workflowId, analysis });
    const validation = await validateDraftWithClaude({ workflowId, analysis, draft });
    return { document: stored, analysis, draft, validation, blocked: !validation.passed };
  });
