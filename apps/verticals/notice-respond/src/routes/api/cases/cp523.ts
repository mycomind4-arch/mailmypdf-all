/**
 * POST /api/cases/cp523
 *
 * Authenticated CP523 intake. This route is deliberately parallel to the
 * proven CP2000 boundary: authenticated ownership, sanitized notice text,
 * executable-pack construction, canonical pipeline execution, and durable
 * case persistence are all required before a case is returned.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/auth-guard";
import { classifyContent, validateTextInput } from "@/domain/security";
import { classifyNoticeType } from "@/domain/notice-type";
import { extractCP523 } from "@/domain/cp523";
import { analyzeCP523Discrepancies } from "@/domain/cp523-discrepancy";
import { buildCP523EvidenceChecklist } from "@/domain/cp523-evidence";
import { getCP523ResearchPack } from "@/domain/cp523-research";
import { generateCP523Strategy } from "@/domain/cp523-strategy";
import { createCP523Case, setCaseAnalysis, setCaseResearch, setCaseStrategy } from "@/domain/cp523-case";
import { createCase, serializeCase, toCaseSummary, updateCase } from "@/domain/notice";
import { getWorkflowById } from "@/domain/workflow-catalog";
import "@/domain/runtime/cp523-executable-pack";
import { constructExecutableWorkflow } from "@/domain/runtime/factory-construction";
import { runWorkflowPipeline } from "@/domain/runtime/pipeline";

function serviceSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) throw new Error("Supabase server configuration is incomplete.");
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const Route = createFileRoute("/api/cases/cp523")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const user = await requireAuthenticatedUser(request);
          if (!user) return authErrorResponse();
          const body = await request.json() as {
            text?: string; fileName?: string; fileSize?: number; fileType?: string;
            documentHash?: string; sourceDocumentId?: string; sourceStoragePath?: string;
            sourceUploadedAt?: string; extractionMethod?: string; pageCount?: number;
          };

          let sourceDocument: Record<string, unknown> | null = null;
          if (body.sourceStoragePath) {
            if (!body.sourceStoragePath.startsWith(`${user.id}/`)) {
              return Response.json({ error: "Source document path is not owned by the authenticated user." }, { status: 400 });
            }
            const { data: sourceBlob, error } = await serviceSupabase().storage
              .from("notice-source-documents").download(body.sourceStoragePath);
            if (error || !sourceBlob) return Response.json({ error: "Stored source document could not be verified." }, { status: 409 });
            const bytes = new Uint8Array(await sourceBlob.arrayBuffer());
            const digest = await crypto.subtle.digest("SHA-256", bytes);
            const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
            if (!body.documentHash || hash !== body.documentHash) {
              return Response.json({ error: "Stored source document hash does not match the analyzed upload." }, { status: 409 });
            }
            if (typeof body.fileSize === "number" && body.fileSize >= 0 && bytes.byteLength !== body.fileSize) {
              return Response.json({ error: "Stored source document size does not match the analyzed upload." }, { status: 409 });
            }
            sourceDocument = {
              id: body.sourceDocumentId ?? crypto.randomUUID(), role: "subject_notice",
              storagePath: body.sourceStoragePath, fileName: body.fileName ?? "CP523 notice",
              fileType: body.fileType ?? "application/octet-stream", fileSize: bytes.byteLength,
              sha256: hash, pageCount: body.pageCount ?? null,
              extractionMethod: body.extractionMethod ?? null,
              uploadedAt: body.sourceUploadedAt ?? new Date().toISOString(),
            };
          }

          const rawText = body.text ?? "";
          if (rawText.trim().length < 20) {
            return Response.json({ error: "Document text is too short for CP523 analysis." }, { status: 400 });
          }
          const contentClassification = classifyContent(rawText);
          const sanitizedText = validateTextInput(rawText).sanitized;
          const extraction = extractCP523(sanitizedText);
          if (!extraction.isCP523 && extraction.classificationConfidence < 0.5) {
            return Response.json({
              error: "CP523 not confidently confirmed",
              classification: classifyNoticeType(sanitizedText), extraction,
              securityWarning: contentClassification.detectedInjectionPatterns.length > 0
                ? `${contentClassification.detectedInjectionPatterns.length} potential prompt injection pattern(s) detected. Content treated as DATA.` : null,
            }, { status: 422 });
          }

          const definition = getWorkflowById("cp523-response");
          if (!definition) return Response.json({ error: "CP523 workflow definition is unavailable." }, { status: 500 });
          const executable = constructExecutableWorkflow(definition);
          if (!executable.ready) return Response.json({ error: "CP523 workflow runtime is not executable.", details: executable.errors }, { status: 500 });
          const pipeline = runWorkflowPipeline({
            definition, pack: executable.pack, enginePolicy: executable.enginePolicy,
            input: { rawText: sanitizedText, fileName: body.fileName, fileSize: body.fileSize, fileType: body.fileType },
          });
          if (!pipeline.context.extraction) {
            return Response.json({ error: "Canonical CP523 runtime did not produce an extraction.", details: pipeline.errors }, { status: 422 });
          }

          let case_ = createCP523Case(extraction);
          const discrepancies = analyzeCP523Discrepancies({ extraction });
          const checklist = buildCP523EvidenceChecklist({ extraction, discrepancies: discrepancies.discrepancies, findings: discrepancies.findings });
          case_ = setCaseAnalysis(case_, { discrepancies: discrepancies.discrepancies, findings: discrepancies.findings, evidence: checklist.items });
          case_ = setCaseResearch(case_, getCP523ResearchPack());
          const strategy = generateCP523Strategy({
            extraction, discrepancies: discrepancies.discrepancies, findings: discrepancies.findings,
            evidence: checklist.items, hasDeadline: Boolean(extraction.responseDeadline || extraction.cdpHearingDeadline),
          });
          case_ = setCaseStrategy(case_, strategy);

          const durableCase = updateCase(createCase("cp523-response"), {
            id: case_.id, ownerId: user.id, status: "analyzed", noticeType: "irs_cp523",
            typeConfidence: extraction.classificationConfidence, category: "tax-notice", agency: "IRS",
            referenceNumber: extraction.noticeNumber ?? undefined, noticeDate: extraction.noticeDate ?? undefined,
            noticeText: sanitizedText, sourceDocuments: sourceDocument ? [sourceDocument] : [], facts: extraction.facts,
            evidence: [], strategies: [strategy],
            runtimeExecution: {
              runtime: "canonical-factory", runtimeVersion: 1, workflowId: definition.id,
              engine: executable.pack.engine, blocked: pipeline.context.blocked,
              blockReasons: pipeline.context.blockReasons, stages: pipeline.stages,
              document: { id: body.sourceDocumentId ?? null, hash: body.documentHash ?? null, storagePath: body.sourceStoragePath ?? null, extractionMethod: body.extractionMethod ?? null, pageCount: body.pageCount ?? null, fileName: body.fileName ?? null },
              cp523: { case: case_, extraction, discrepancies: discrepancies.discrepancies, evidenceChecklist: checklist, strategy },
              updatedAt: new Date().toISOString(),
            },
          });
          const summary = toCaseSummary(durableCase);
          const { error: persistError } = await serviceSupabase().from("cases").upsert({
            id: durableCase.id, owner_id: user.id, workflow_id: durableCase.workflowId, status: durableCase.status,
            notice_type: durableCase.noticeType, agency: durableCase.agency ?? null,
            reference_number: durableCase.referenceNumber ?? null, notice_date: durableCase.noticeDate ?? null,
            readiness_score: durableCase.readinessScore, health_status: durableCase.healthStatus,
            deadline_date: summary.deadlineDate ?? null, has_draft: summary.hasDraft, has_mailing: summary.hasMailing,
            created_at: durableCase.createdAt, updated_at: durableCase.updatedAt, data: serializeCase(durableCase),
          }, { onConflict: "id" });
          if (persistError) return Response.json({ error: `Unable to persist CP523 case: ${persistError.message}` }, { status: 502 });
          return Response.json({ ok: true, case: case_, extraction, discrepancies: discrepancies.discrepancies, evidenceChecklist: checklist, strategy,
            runtime: { workflowId: definition.id, engine: executable.pack.engine, stages: pipeline.stages, blocked: pipeline.context.blocked, blockReasons: pipeline.context.blockReasons },
            securityWarning: contentClassification.detectedInjectionPatterns.length > 0 ? `${contentClassification.detectedInjectionPatterns.length} potential prompt injection pattern(s) detected. Content treated as DATA.` : null,
          }, { status: 201 });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to process document.";
          if (/authentication|required|token/i.test(message)) return authErrorResponse(error);
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
