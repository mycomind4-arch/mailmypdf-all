/**
 * POST /api/cases/cp2000
 *
 * Creates a new CP2000 case with the extracted document and analysis.
 * Server-side persistence — the case survives browser refresh.
 */

import { createFileRoute } from "@tanstack/react-router";
import { authErrorResponse, requireAuthenticatedUser } from "@/lib/auth-guard";
import { classifyContent, validateTextInput } from "@/domain/security";
import { extractCP2000, type CP2000Extraction } from "@/domain/cp2000";
import { classifyNoticeType } from "@/domain/notice-type";
import { analyzeCP2000Discrepancies } from "@/domain/cp2000-discrepancy";
import { buildCP2000EvidenceChecklist } from "@/domain/cp2000-evidence";
import { generateCP2000Strategy } from "@/domain/cp2000-strategy";
import { getCP2000ResearchPack } from "@/domain/cp2000-research";
import { createCP2000Case, setCaseAnalysis, setCaseResearch, setCaseStrategy, type CP2000Case } from "@/domain/cp2000-case";

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

          // ── Security: classify and sanitize ──────────────────
          const contentClassification = classifyContent(rawText);
          const textValidation = validateTextInput(rawText);
          const sanitizedText = textValidation.sanitized;

          // ── CP2000 extraction ─────────────────────────────────
          const extraction = extractCP2000(sanitizedText);

          // ── Classification gate ───────────────────────────────
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

          // ── Build the case ────────────────────────────────────
          let case_ = createCP2000Case(extraction);

          // ── Discrepancy analysis ──────────────────────────────
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

          // ── Research ──────────────────────────────────────────
          const researchPack = getCP2000ResearchPack();
          case_ = setCaseResearch(case_, researchPack);

          // ── Strategy ──────────────────────────────────────────
          const strategy = generateCP2000Strategy({
            discrepancies: discrepancies.discrepancies,
            findings: discrepancies.findings,
            evidence: checklist.items,
            hasDeadline: !!extraction.responseDeadline,
            extractionConfident: extraction.isCP2000,
          });
          case_ = setCaseStrategy(case_, strategy);

          // ── Return the complete case ──────────────────────────
          return Response.json({
            ok: true,
            case: case_,
            extraction,
            discrepancies: discrepancies.discrepancies,
            evidenceChecklist: checklist,
            strategy,
            securityWarning: contentClassification.detectedInjectionPatterns.length > 0
              ? `${contentClassification.detectedInjectionPatterns.length} potential prompt injection pattern(s) detected. Content treated as DATA.`
              : null,
          }, { status: 201 });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unable to process document.";
          return Response.json({ error: message }, { status: 500 });
        }
      },
    },
  },
});
