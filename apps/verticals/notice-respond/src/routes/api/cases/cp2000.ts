/**
 * POST /api/cases/cp2000
 *
 * Authenticated CP2000 intake boundary.
 * The live user-facing route must pass through the canonical executable
 * workflow factory before a case is accepted, and the resulting owned case
 * is persisted before it is returned to the browser.
 */

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/auth-guard";
import { classifyContent, validateTextInput } from "@/domain/security";
import { extractCP2000 } from "@/domain/cp2000";
import { classifyNoticeType } from "@/domain/notice-type";
import { analyzeCP2000Discrepancies } from "@/domain/cp2000-discrepancy";
import { buildCP2000EvidenceChecklist } from "@/domain/cp2000-evidence";
import { generateCP2000Strategy } from "@/domain/cp2000-strategy";
import { getCP2000ResearchPack } from "@/domain/cp2000-research";
import { createCP2000Case, setCaseAnalysis, setCaseResearch, setCaseStrategy } from "@/domain/cp2000-case";
import { createCase, serializeCase, toCaseSummary, updateCase } from "@/domain/notice";
import { getWorkflowById } from "@/domain/workflow-catalog";
import "@/domain/runtime/cp2000-executable-pack";
import { constructExecutableWorkflow } from "@/domain/runtime/factory-construction";
import { runWorkflowPipeline } from "@/domain/runtime/pipeline";

function serviceSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error("Supabase server configuration is incomplete.");
  }
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const Route = createFileRoute("/api/cases/cp2000")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const user = await requireAuthenticatedUser(request);
          if (!user) return authErrorResponse();

          const body = await request.json() as {
            text?: string;
            fileName?: string;
            fileSize?: number;
            fileType?: string;
            documentHash?: string;
            extractionMethod?: string;
            pageCount?: number;
          };

          const rawText = body.text ?? "";
          if (rawText.trim().length < 20) {
            return Response.json(
              { error: "Document text is too short for analysis. Upload a CP2000 notice with extractable text." },
              { status: 400 },
            );
          }

          const contentClassification = classifyContent(rawText);
          const textValidation = validateTextInput(rawText);
          const sanitizedText = textValidation.sanitized;

          // Keep the full CP2000 extraction for the CP2000-specific UI fields.
          const extraction = extractCP2000(sanitizedText);

          if (!extraction.isCP2000 && extraction.classificationConfidence < 0.5) {
            return Response.json(
              {
                error: "CP2000 not confidently confirmed",
                classification: classifyNoticeType(sanitizedText),
                extraction,
                securityWarning: contentClassification.detectedInjectionPatterns.length > 0
                  ? `${contentClassification.detectedInjectionPatterns.length} potential prompt injection pattern(s) detected. Content treated as DATA.`
                  : null,
              },
              { status: 422 },
            );
          }

          // Canonical factory is a mandatory production gate for this live route.
          const definition = getWorkflowById("cp2000-response");
          if (!definition) {
            return Response.json({ error: "CP2000 workflow definition is unavailable." }, { status: 500 });
          }
          const executable = constructExecutableWorkflow(definition);
          if (!executable.ready) {
            return Response.json(
              { error: "CP2000 workflow runtime is not executable.", details: executable.errors },
              { status: 500 },
            );
          }

          const pipeline = runWorkflowPipeline({
            definition,
            pack: executable.pack,
            enginePolicy: executable.enginePolicy,
            input: {
              rawText: sanitizedText,
              fileName: body.fileName,
              fileSize: body.fileSize,
              fileType: body.fileType,
            },
          });

          if (!pipeline.context.extraction) {
            return Response.json(
              { error: "Canonical CP2000 runtime did not produce an extraction.", details: pipeline.errors },
              { status: 422 },
            );
          }

          // CP2000-specific projections remain adapters over the same tested
          // domain functions while the canonical factory controls executability.
          let case_ = createCP2000Case(extraction);
          const discrepancies = analyzeCP2000Discrepancies({ extraction });
          const checklist = buildCP2000EvidenceChecklist({
            extraction,
            discrepancies: discrepancies.discrepancies,
            findings: discrepancies.findings,
          });

          case_ = setCaseAnalysis(case_, {
            discrepancies: discrepancies.discrepancies,
            findings: discrepancies.findings,
            evidence: checklist.items,
          });

          const researchPack = getCP2000ResearchPack();
          case_ = setCaseResearch(case_, researchPack);

          const strategy = generateCP2000Strategy({
            discrepancies: discrepancies.discrepancies,
            findings: discrepancies.findings,
            evidence: checklist.items,
            hasDeadline: !!extraction.responseDeadline,
            extractionConfident: extraction.isCP2000,
          });
          case_ = setCaseStrategy(case_, strategy);

          // Persist the canonical owned Case before returning it.  The runtime
          // stage record is durable so later resume/invalidation work has a
          // trustworthy server-side execution baseline.
          const durableCase = updateCase(createCase("cp2000-response"), {
            id: case_.id,
            ownerId: user.id,
            status: "analyzed",
            noticeType: "irs_cp2000",
            typeConfidence: extraction.classificationConfidence,
            category: "tax-notice",
            agency: "IRS",
            referenceNumber: extraction.noticeNumber ?? undefined,
            noticeDate: extraction.noticeDate ?? undefined,
            noticeText: sanitizedText,
            facts: extraction.facts,
            // Requirement/checklist state is preserved in runtimeExecution.
            // The canonical evidence array contains only actual uploaded files.
            evidence: [],
            strategies: [strategy],
            runtimeExecution: {
              runtime: "canonical-factory",
              runtimeVersion: 1,
              workflowId: definition.id,
              engine: executable.pack.engine,
              blocked: pipeline.context.blocked,
              blockReasons: pipeline.context.blockReasons,
              stages: pipeline.stages,
              document: {
                hash: body.documentHash ?? null,
                extractionMethod: body.extractionMethod ?? null,
                pageCount: body.pageCount ?? null,
                fileName: body.fileName ?? null,
              },
              cp2000: {
                case: case_,
                extraction,
                discrepancies: discrepancies.discrepancies,
                evidenceChecklist: checklist,
                strategy,
              },
              updatedAt: new Date().toISOString(),
            },
          });

          const summary = toCaseSummary(durableCase);
          const { error: persistError } = await serviceSupabase()
            .from("cases")
            .upsert({
              id: durableCase.id,
              owner_id: user.id,
              workflow_id: durableCase.workflowId,
              status: durableCase.status,
              notice_type: durableCase.noticeType,
              agency: durableCase.agency ?? null,
              reference_number: durableCase.referenceNumber ?? null,
              notice_date: durableCase.noticeDate ?? null,
              readiness_score: durableCase.readinessScore,
              health_status: durableCase.healthStatus,
              deadline_date: summary.deadlineDate ?? null,
              has_draft: summary.hasDraft,
              has_mailing: summary.hasMailing,
              created_at: durableCase.createdAt,
              updated_at: durableCase.updatedAt,
              data: serializeCase(durableCase),
            }, { onConflict: "id" });

          if (persistError) {
            return Response.json(
              { error: `Unable to persist CP2000 case: ${persistError.message}` },
              { status: 502 },
            );
          }

          return Response.json({
            ok: true,
            case: case_,
            extraction,
            discrepancies: discrepancies.discrepancies,
            evidenceChecklist: checklist,
            strategy,
            runtime: {
              workflowId: definition.id,
              engine: executable.pack.engine,
              stages: pipeline.stages,
              blocked: pipeline.context.blocked,
              blockReasons: pipeline.context.blockReasons,
            },
            securityWarning: contentClassification.detectedInjectionPatterns.length > 0
              ? `${contentClassification.detectedInjectionPatterns.length} potential prompt injection pattern(s) detected. Content treated as DATA.`
              : null,
          }, { status: 201 });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to process document.";
          if (/authentication|required|token/i.test(message)) {
            return authErrorResponse(error);
          }
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
