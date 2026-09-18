import {
  computeRetentionUntil,
  intakeDocumentToQuarantine,
  type SecureDocumentEnvelope,
} from "@mailmypdf/documents";
import { ValidationError } from "@mailmypdf/core";
import type { AuthenticatedUserContext } from "./auth.server";

const DOCUMENT_BUCKET = "secure-documents";
const RETENTION_DAYS = 30;

export interface SecureDocumentInput {
  file: File;
  workflowId: string;
  purpose: string;
  consent: boolean;
}

export class SecureDocumentValidationError extends Error {}

type RegisteredDocument = {
  id: string;
  workflow_id: string;
  safe_filename: string;
  mime_type: string;
  size_bytes: number;
  sha256: string;
  security_status: string;
  created_at: string;
};

/**
 * Application adapter for @mailmypdf/documents secure-vault intake.
 *
 * The package owns validation, owner-scoped path construction, hashing,
 * consent sequencing, quarantine semantics, retention validation, and cleanup.
 * This adapter only maps those contracts onto the canonical Supabase tables.
 */
export async function intakeSecureDocument(
  input: SecureDocumentInput,
  context: AuthenticatedUserContext,
): Promise<RegisteredDocument> {
  const bytes = new Uint8Array(await input.file.arrayBuffer());
  let registered: RegisteredDocument | null = null;

  try {
    await intakeDocumentToQuarantine(
      {
        ownerId: context.user.id,
        workflowId: input.workflowId,
        purpose: input.purpose,
        consent: input.consent,
        filename: input.file.name,
        mimeType: input.file.type,
        bytes,
        retentionUntil: computeRetentionUntil(RETENTION_DAYS),
      },
      {
        consents: {
          async recordConsent(consent) {
            const { data, error } = await context.supabase
              .from("document_consents")
              .insert({
                owner_id: consent.ownerId,
                workflow_id: consent.workflowId,
                purpose: consent.purpose,
                consent_version: consent.consentVersion,
                consented_at: consent.recordedAt,
              })
              .select("id")
              .single();

            if (error || !data) {
              throw new Error("Unable to record document-processing consent");
            }
            return data.id;
          },
        },

        storage: {
          async put(path, data, contentType) {
            const { error } = await context.supabase.storage
              .from(DOCUMENT_BUCKET)
              .upload(path, data, { contentType, upsert: false });
            if (error) throw new Error("Unable to store document in quarantine");
          },

          async remove(path) {
            const { error } = await context.supabase.storage
              .from(DOCUMENT_BUCKET)
              .remove([path]);
            if (error) throw new Error("Unable to remove quarantined document");
          },
        },

        registry: {
          async register(document): Promise<SecureDocumentEnvelope> {
            const { data, error } = await context.supabase
              .from("secure_documents")
              .insert({
                id: document.id,
                owner_id: document.ownerId,
                workflow_id: document.workflowId,
                consent_id: (document as SecureDocumentEnvelope & { consentId: string }).consentId,
                original_filename: input.file.name,
                safe_filename: document.safeFilename,
                storage_path: document.storagePath,
                mime_type: document.mimeType,
                size_bytes: document.sizeBytes,
                sha256: document.sha256,
                security_status: document.securityStatus,
                retention_until: document.retentionUntil,
              })
              .select(
                "id, workflow_id, safe_filename, mime_type, size_bytes, sha256, security_status, created_at",
              )
              .single();

            if (error || !data) {
              throw new Error("Unable to register quarantined document");
            }

            registered = data as RegisteredDocument;
            return document;
          },
        },
      },
    );
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new SecureDocumentValidationError(error.message);
    }
    throw error;
  }

  if (!registered) throw new Error("Unable to register quarantined document");
  return registered;
}

export class SecureDocumentNotFoundError extends Error {}

export interface DescribedSecureDocument {
  filename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  /** Measured later, at packet-assembly time; not known at intake/describe time. */
  pageCount: number | null;
  securityStatus: string;
  usable: boolean;
}

/**
 * Reads one already-quarantined document's current status, independent of
 * whether it has been attached to any case. Used before attaching a document
 * to a workflow matter so the caller can record its role without trusting
 * client-supplied metadata.
 */
export async function describeSecureDocument(
  documentId: string,
  context: AuthenticatedUserContext,
): Promise<DescribedSecureDocument> {
  const { data, error } = await context.supabase
    .from("secure_documents")
    .select("safe_filename, mime_type, size_bytes, security_status, deleted_at, deletion_requested_at")
    .eq("id", documentId)
    .eq("owner_id", context.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new SecureDocumentNotFoundError("Document not found");

  const usable = data.security_status === "clean" && !data.deleted_at && !data.deletion_requested_at;
  return {
    filename: data.safe_filename,
    mimeType: data.mime_type ?? null,
    sizeBytes: data.size_bytes ?? null,
    pageCount: null,
    securityStatus: data.security_status ?? "unknown",
    usable,
  };
}
