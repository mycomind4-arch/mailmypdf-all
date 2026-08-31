/**
 * Proof-of-Service — Document Service
 *
 * Handles document upload, hashing, and storage. The SHA-256 hash
 * computed here is the anchor for the entire proof chain.
 *
 * Storage uploads use the Supabase Storage REST API directly via fetch
 * to ensure correct header handling in Cloudflare Workers.
 */

import { randomUUID } from "node:crypto";
import { hashDocument } from "./hashing";
import type { ProofDocument } from "./types";

export interface UploadDocumentParams {
  tenant_id: string;
  filename: string;
  mime_type: string;
  file_data: Uint8Array | Buffer;
  source?: "uploaded" | "generated_from_template";
  template_id?: string | null;
}

export interface UploadDocumentResult {
  document: ProofDocument;
}

/**
 * Upload a document, compute its SHA-256 hash, store it, and return the
 * document record. The hash is computed server-side — the caller can
 * independently verify it matches their local file.
 *
 * Storage: Uses the same Supabase Storage bucket as the consumer app
 * ("order-pdfs"), but under a `proof-of-service/{tenant_id}/{document_id}` path.
 */
export async function uploadProofDocument(
  params: UploadDocumentParams,
  deps: {
    supabaseAdmin: import("@supabase/supabase-js").SupabaseClient;
    bucketName?: string;
  },
): Promise<UploadDocumentResult> {
  const { supabaseAdmin } = deps;
  const bucketName = deps.bucketName ?? "order-pdfs";

  // Compute SHA-256 hash
  const sha256 = hashDocument(params.file_data);
  const documentId = randomUUID();
  const storagePath = `proof-of-service/${params.tenant_id}/${documentId}/${params.filename}`;

  // Upload to Supabase Storage via direct REST API
  // The SDK's storage upload has header issues with new-format keys in Workers
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${storagePath}`;

  const fileBody = params.file_data instanceof Uint8Array
    ? params.file_data
    : new Uint8Array(params.file_data);

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${supabaseKey}`,
      "apikey": supabaseKey,
      "Content-Type": params.mime_type,
    },
    body: fileBody,
  });

  if (!uploadResponse.ok) {
    const errorBody = await uploadResponse.text().catch(() => "unknown error");
    throw new Error(`Failed to store document: ${errorBody}`);
  }

  // Insert document record
  const { data, error } = await supabaseAdmin
    .from("proof_documents")
    .insert({
      id: documentId,
      tenant_id: params.tenant_id,
      filename: params.filename,
      mime_type: params.mime_type,
      sha256,
      size_bytes: params.file_data.byteLength || params.file_data.length,
      storage_path: storagePath,
      source: params.source ?? "uploaded",
      template_id: params.template_id ?? null,
    })
    .select()
    .single();

  if (error) {
    // Attempt cleanup of the uploaded file
    await fetch(`${supabaseUrl}/storage/v1/object/${bucketName}/${storagePath}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "apikey": supabaseKey,
      },
    }).catch(() => {});
    throw new Error(`Failed to create document record: ${error.message}`);
  }

  return {
    document: {
      id: data.id,
      tenant_id: data.tenant_id,
      filename: data.filename,
      mime_type: data.mime_type,
      sha256: data.sha256,
      size_bytes: data.size_bytes,
      storage_path: data.storage_path,
      source: data.source,
      template_id: data.template_id,
      created_at: data.created_at,
    },
  };
}

/**
 * Retrieve a document's metadata (not the file contents).
 */
export async function getProofDocument(
  documentId: string,
  tenantId: string,
  deps: { supabaseAdmin: import("@supabase/supabase-js").SupabaseClient },
): Promise<ProofDocument | null> {
  const { supabaseAdmin } = deps;
  const { data, error } = await supabaseAdmin
    .from("proof_documents")
    .select("*")
    .eq("id", documentId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch document: ${error.message}`);
  if (!data) return null;

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    filename: data.filename,
    mime_type: data.mime_type,
    sha256: data.sha256,
    size_bytes: data.size_bytes,
    storage_path: data.storage_path,
    source: data.source,
    template_id: data.template_id,
    created_at: data.created_at,
  };
}
