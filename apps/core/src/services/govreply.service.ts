import { DocumentService } from "./document.service";
import { getGovReplyExtractionService } from "./govreply.extraction.service";
import type { GovReplyExtraction } from "@/domain/govreply";
function randomToken(length = 32): string { const bytes = new Uint8Array(length); crypto.getRandomValues(bytes); return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""); }
export interface CreateGovReplyCaseParams { email: string; file: { name: string; sizeBytes: number; dataBase64: string } }
export class GovReplyService {
  private documents = new DocumentService(); private extraction = getGovReplyExtractionService();
  async createCase(params: CreateGovReplyCaseParams) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = params.email.trim().toLowerCase(); const fileName = params.file.name.replace(/[^a-zA-Z0-9._-]/g, "_"); const bytes = this.decodeBase64(params.file.dataBase64);
    if (bytes.byteLength !== params.file.sizeBytes) throw new Error("Uploaded file size did not match declared size.");
    await this.documents.validatePdf(bytes);
    const caseId = crypto.randomUUID(); const publicToken = randomToken(); const storagePath = `${caseId}/notice/${fileName}`;
    const { error: uploadError } = await supabaseAdmin.storage.from("govreply-notices").upload(storagePath, bytes, { contentType: "application/pdf", upsert: false });
    if (uploadError) throw new Error(`Notice upload failed: ${uploadError.message}`);
    const sha256 = await this.documents.computeHash(bytes);
    const { data, error } = await supabaseAdmin.from("govreply_cases").insert({ id: caseId, email, agency: "irs", status: "extraction_pending", notice_storage_path: storagePath, notice_sha256: sha256, public_token: publicToken }).select("id, email, agency, status, public_token").single();
    if (error) { await supabaseAdmin.storage.from("govreply-notices").remove([storagePath]); throw new Error(`Could not create GovReply case: ${error.message}`); }
    await supabaseAdmin.from("govreply_events").insert({ case_id: caseId, type: "notice.uploaded", label: "IRS notice uploaded", metadata: { fileName, sha256 } });
    let extraction: GovReplyExtraction; let extractionMethod: "pdf-text" | "unavailable";
    try { const result = await this.extraction.extract(bytes); extraction = result.extraction; extractionMethod = result.method; } catch (error) { extraction = { agency: "irs", warnings: [`Automatic extraction was unavailable: ${error instanceof Error ? error.message : "unknown error"}. Verify all fields manually.`] }; extractionMethod = "unavailable"; }
    const { error: extractionError } = await supabaseAdmin.from("govreply_cases").update({ status: "extraction_review", extracted: extraction, notice_date: extraction.notice_date || null, response_deadline: extraction.response_deadline || null, reference_numbers: extraction.reference_numbers || [], response_mail_name: extraction.response_address?.name || null, response_mail_line1: extraction.response_address?.line1 || null, response_mail_line2: extraction.response_address?.line2 || null, response_mail_city: extraction.response_address?.city || null, response_mail_state: extraction.response_address?.state || null, response_mail_postal: extraction.response_address?.postal || null, requested_action_summary: extraction.summary_plain || null }).eq("id", caseId);
    if (extractionError) throw new Error(`Could not save notice extraction: ${extractionError.message}`);
    await supabaseAdmin.from("govreply_events").insert({ case_id: caseId, type: "extraction.ready_for_review", label: "Notice ready for extraction review", metadata: { method: extractionMethod, noticeType: extraction.notice_type ?? null, deadline: extraction.response_deadline ?? null, referenceCount: extraction.reference_numbers?.length ?? 0 } });
    return { ...data, status: "extraction_review" as const, token: publicToken };
  }
  async getCase(id: string, token: string) { const { supabaseAdmin } = await import("@/integrations/supabase/client.server"); const { data, error } = await supabaseAdmin.from("govreply_cases").select("*").eq("id", id).eq("public_token", token).maybeSingle(); if (error) throw new Error(error.message); return data; }
  async confirmExtraction(caseId: string, token: string, extraction: GovReplyExtraction) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server"); const confirmed = { ...extraction, agency: "irs", deadline_source: extraction.response_deadline ? "extracted" : "unknown" } satisfies GovReplyExtraction; const address = extraction.response_address;
    const { data, error } = await supabaseAdmin.from("govreply_cases").update({ status: "awaiting_response", extracted: confirmed, extraction_confirmed_at: new Date().toISOString(), notice_date: extraction.notice_date || null, response_deadline: extraction.response_deadline || null, reference_numbers: extraction.reference_numbers || [], response_mail_name: address?.name || null, response_mail_line1: address?.line1 || null, response_mail_line2: address?.line2 || null, response_mail_city: address?.city || null, response_mail_state: address?.state || null, response_mail_postal: address?.postal || null, requested_action_summary: extraction.summary_plain || null }).eq("id", caseId).eq("public_token", token).eq("status", "extraction_review").select("*").maybeSingle();
    if (error) throw new Error(error.message); if (!data) throw new Error("Case not found or extraction review has already been completed.");
    await supabaseAdmin.from("govreply_events").insert({ case_id: caseId, type: "extraction.confirmed", label: "Notice extraction confirmed", metadata: { noticeType: extraction.notice_type, deadline: extraction.response_deadline } }); return data;
  }
  private decodeBase64(value: string): Uint8Array { const normalized = value.includes(",") ? value.slice(value.indexOf(",") + 1) : value; return new Uint8Array(Buffer.from(normalized, "base64")); }
}
let singleton: GovReplyService | null = null; export function getGovReplyService() { singleton ??= new GovReplyService(); return singleton; }
