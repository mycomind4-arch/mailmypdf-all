/**
 * Document storage utilities — upload to Supabase Storage, get signed URLs.
 */
import { supabase } from "./supabase";
import { useAuth } from "./auth";

const BUCKET = "immigration-documents";

export interface UploadedDocument {
  path: string;
  name: string;
  size: number;
  mimeType: string;
}

/**
 * Upload a file to Supabase Storage under the user's folder.
 * Path structure: {user_id}/{document_id}/{filename}
 */
export async function uploadDocument(
  file: File,
  userId: string
): Promise<{ data: UploadedDocument | null; error: string | null }> {
  const fileExt = file.name.split(".").pop() || "bin";
  const documentId = crypto.randomUUID();
  const path = `${userId}/${documentId}/${file.name}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: {
      path,
      name: file.name,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
    },
    error: null,
  };
}

/**
 * Create a signed URL for a stored document (time-limited, private).
 */
export async function getSignedUrl(
  path: string,
  expiresIn: number = 300
): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) {
    return { url: null, error: error.message };
  }

  return { url: data?.signedUrl ?? null, error: null };
}

/**
 * Delete a document from storage.
 */
export async function deleteDocument(
  path: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  return { error: error?.message ?? null };
}

/**
 * Validate file before upload.
 * Accepts: PDF, JPG, PNG. Max 25MB.
 */
export function validateFile(file: File): string | null {
  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
  ];
  const maxBytes = 25 * 1024 * 1024; // 25MB

  if (!allowedTypes.includes(file.type)) {
    return "Please upload a PDF, JPG, or PNG file.";
  }
  if (file.size > maxBytes) {
    return "File is too large. Maximum size is 25MB.";
  }
  return null;
}

/**
 * Format file size for display.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
