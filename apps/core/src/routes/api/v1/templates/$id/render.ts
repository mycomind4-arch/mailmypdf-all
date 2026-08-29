// POST /api/v1/templates/$id/render — Render a template with variables → returns a Document.
//
// Accepts: { "variables": { "recipient_name": "Jane Doe", ... } }
// Returns: a ProofDocument record (with computed SHA-256) that can then be
// used in POST /api/v1/communications to send.
//
// The rendering uses pdf-lib (already in the project's dependencies) to
// generate a PDF from the template body HTML → simple text layout.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAuth, errorResponse, parseJsonBody } from "@/lib/proof-of-service/api-helpers";
import { uploadProofDocument } from "@/lib/proof-of-service/documents";
import { randomUUID } from "node:crypto";

const renderSchema = z.object({
  variables: z.record(z.string(), z.string()).default({}),
});

export const Route = createFileRoute("/api/v1/templates/$id/render")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const auth = await requireAuth(request);
        if ("error" in auth) return auth.error;
        const { tenant, supabaseAdmin } = auth;

        // 1. Fetch the template
        const { data: template, error: templateError } = await supabaseAdmin
          .from("proof_templates")
          .select("*")
          .eq("id", params.id)
          .eq("tenant_id", tenant.id)
          .maybeSingle();

        if (templateError || !template) {
          return errorResponse(404, "not_found", "Template not found", "NOT_FOUND");
        }

        // 2. Parse input
        const parsed = await parseJsonBody(request, (data) => {
          const result = renderSchema.safeParse(data);
          if (!result.success) {
            return { error: result.error.issues[0].message, field: "variables" };
          }
          return result.data;
        });

        if ("error" in parsed) return parsed.error;

        // 3. Render the template — replace {{variable}} with values
        let renderedBody = template.body_html;
        for (const [key, value] of Object.entries(parsed.variables)) {
          renderedBody = renderedBody.replaceAll(`{{${key}}}`, value);
          // Also support [VARIABLE_NAME] style (legacy templates)
          renderedBody = renderedBody.replaceAll(`[${key.toUpperCase()}]`, value);
        }

        // 4. Generate PDF using pdf-lib
        const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 11;
        const lineHeight = fontSize * 1.5;
        const margin = 72; // 1 inch
        const pageWidth = 612; // 8.5in at 72dpi
        const pageHeight = 792; // 11in at 72dpi
        const maxWidth = pageWidth - margin * 2;

        // Simple text wrapping
        const lines: string[] = [];
        for (const paragraph of renderedBody.split("\n")) {
          if (paragraph.trim() === "") {
            lines.push("");
            continue;
          }
          // Word wrap
          const words = paragraph.split(" ");
          let currentLine = "";
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const width = font.widthOfTextAtSize(testLine, fontSize);
            if (width > maxWidth && currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) lines.push(currentLine);
        }

        // Lay out text across pages
        let page = pdfDoc.addPage([pageWidth, pageHeight]);
        let y = pageHeight - margin;
        for (const line of lines) {
          if (y < margin) {
            page = pdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
          page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
          y -= lineHeight;
        }

        const pdfBytes = await pdfDoc.save();

        // 5. Upload the rendered PDF as a document
        const { document } = await uploadProofDocument(
          {
            tenant_id: tenant.id,
            filename: `${template.name.replace(/\s+/g, "_")}_${Date.now()}.pdf`,
            mime_type: "application/pdf",
            file_data: pdfBytes,
            source: "generated_from_template",
            template_id: template.id,
          },
          { supabaseAdmin },
        );

        // 6. Return the document record
        return Response.json(document, { status: 201 });
      },
    },
  },
});
