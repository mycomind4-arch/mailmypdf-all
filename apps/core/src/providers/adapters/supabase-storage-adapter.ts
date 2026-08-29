/**
 * Supabase Storage adapter — implements StorageProvider.
 *
 * Wraps Supabase Storage operations behind the StorageProvider interface.
 * Uses the supabaseAdmin client for server-side operations.
 */

import {
  type StorageProvider,
  type SignedUrlResult,
  type UploadResult,
} from "@/providers/interfaces";

export class SupabaseStorageAdapter implements StorageProvider {
  readonly name = "supabase-storage";

  private async getAdmin() {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return supabaseAdmin;
  }

  isConfigured(): boolean {
    try {
      return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    } catch {
      return false;
    }
  }

  async createSignedUrl(path: string, ttlSeconds: number): Promise<SignedUrlResult> {
    const admin = await this.getAdmin();
    const { data, error } = await admin.storage
      .from("order-pdfs")
      .createSignedUrl(path, ttlSeconds);
    if (error || !data) throw new Error(`Could not sign URL: ${error?.message ?? "unknown"}`);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    return { url: data.signedUrl, expiresAt };
  }

  async upload(
    path: string,
    data: Buffer | Uint8Array,
    contentType: string,
  ): Promise<UploadResult> {
    const admin = await this.getAdmin();
    const { error } = await admin.storage
      .from("order-pdfs")
      .upload(path, data, { contentType });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    return {
      path,
      size: data.byteLength,
      contentType,
    };
  }

  async delete(path: string): Promise<void> {
    const admin = await this.getAdmin();
    const { error } = await admin.storage.from("order-pdfs").remove([path]);
    if (error) throw new Error(`Delete failed: ${error.message}`);
  }

  async exists(path: string): Promise<boolean> {
    const admin = await this.getAdmin();
    const { data, error } = await admin.storage
      .from("order-pdfs")
      .list(path.split("/").slice(0, -1).join("/"), {
        search: path.split("/").pop() || "",
      });
    if (error) return false;
    return !!(data && data.length > 0);
  }
}
