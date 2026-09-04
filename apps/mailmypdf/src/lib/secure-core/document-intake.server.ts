import { computeSha256, sanitizeFilename, validateDocument } from "@mailmypdf/documents";
import type { AuthenticatedUserContext } from "./auth.server";

const DOCUMENT_BUCKET = "secure-documents";

export interface SecureDocumentInput {
  file: File;
  workflowId: string;
  purpose: string;
  consent: boolean;
}

export class SecureDocumentValidationError extends Error {}

export async function intakeSecureDocument(
  input: SecureDocumentInput,
  context: AuthenticatedUserContext,
) {
  if (!input.consent) throw new SecureDocumentValidationError("Explicit document-processing consent is required");
  if (!input.workflowId.trim()) throw new SecureDocumentValidationError("A workflow ID is required");
  const purposeCode = input.purpose.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(purposeCode)) {
    throw new SecureDocumentValidationError("Document purpose must be a 3-64 character purpose code");
  }

  const content = new Uint8Array(await input.file.arrayBuffer());
  const validation = validateDocument({
    filename: input.file.name,
    mimeType: input.file.type,
    sizeBytes: content.byteLength,
    content,
  });
  if (!validation.ok) throw new SecureDocumentValidationError(validation.error.message);

  const documentId = crypto.randomUUID();
  const safeFilename = sanitizeFilename(input.file.name);
  const storagePath = `${context.user.id}/${documentId}/${safeFilename}`;
  const sha256 = computeSha256(content);

  const { data: consent, error: consentError } = await context.supabase
    .from("document_consents")
    .insert({
      owner_id: context.user.id,
      workflow_id: input.workflowId,
      purpose: purposeCode,
      consent_version: "secure-document-intake-v1",
    })
    .select("id")
    .single();
  if (consentError || !consent) throw new Error("Unable to record document-processing consent");

  const { error: uploadError } = await context.supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, content, { contentType: input.file.type, upsert: false });
  if (uploadError) throw new Error("Unable to store document in quarantine");

  const { data: document, error: documentError } = await context.supabase
    .from("secure_documents")
    .insert({
      id: documentId,
      owner_id: context.user.id,
      workflow_id: input.workflowId,
      consent_id: consent.id,
      original_filename: input.file.name,
      safe_filename: safeFilename,
      storage_path: storagePath,
      mime_type: input.file.type,
      size_bytes: content.byteLength,
      sha256,
      security_status: "quarantined",
    })
    .select("id, workflow_id, safe_filename, mime_type, size_bytes, sha256, security_status, created_at")
    .single();

  if (documentError || !document) {
    await context.supabase.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
    throw new Error("Unable to register quarantined document");
  }

  return document;
}
