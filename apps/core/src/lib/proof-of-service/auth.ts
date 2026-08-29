/**
 * Proof-of-Service — Tenant Authentication
 *
 * API key validation for the Proof-of-Service API.
 * Keys are of the form sk_live_... or sk_test_...
 *
 * Two-layer hashing architecture:
 * - `key_hash` (SHA-256): used as a lookup index in the database
 * - `key_bcrypt_hash` (bcrypt): used for timing-safe verification
 *
 * The SHA-256 lookup index allows O(1) key retrieval without scanning
 * all keys with bcrypt. The bcrypt verification provides defense-in-depth:
 * even if the database is compromised, the plaintext keys cannot be
 * recovered from the bcrypt hashes.
 *
 * For backward compatibility, if `key_bcrypt_hash` is NULL (legacy keys),
 * we fall back to SHA-256 verification. This allows gradual migration.
 *
 * Tenant secrets (lob_api_key, webhook_secret) are encrypted at rest
 * using AES-256-GCM with ENCRYPTION_MASTER_KEY.
 */

import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { encryptSecret, decryptSecret } from "./encryption";

export interface AuthenticatedTenant {
  id: string;
  name: string;
  webhook_url: string | null;
  webhook_secret: string | null;
  environment: "live" | "test";
}

/**
 * Extract and validate an API key from a request's Authorization header.
 * Returns the authenticated tenant, or null if the key is invalid/missing.
 *
 * Expected header: Authorization: Bearer sk_live_...
 */
export async function authenticateRequest(
  request: Request,
  deps: { supabaseAdmin: import("@supabase/supabase-js").SupabaseClient },
): Promise<AuthenticatedTenant | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey.startsWith("sk_")) {
    return null;
  }

  return validateApiKey(apiKey, deps);
}

/**
 * Validate an API key against the database.
 *
 * Lookup flow:
 * 1. Compute SHA-256 of the full key → lookup index
 * 2. Find matching non-revoked key record by lookup hash
 * 3. If `key_bcrypt_hash` is set: verify with bcrypt.compare (timing-safe)
 *    If `key_bcrypt_hash` is NULL (legacy): verify SHA-256 match (backward compat)
 * 4. Decrypt tenant secrets (webhook_secret) for use
 * 5. Return the tenant
 */
export async function validateApiKey(
  apiKey: string,
  deps: { supabaseAdmin: import("@supabase/supabase-js").SupabaseClient },
): Promise<AuthenticatedTenant | null> {
  const { supabaseAdmin } = deps;

  // Compute lookup hash (SHA-256 of the key — used as a DB index, not for auth)
  const lookupHash = createHash("sha256").update(apiKey).digest("hex");

  // Look up the key by its SHA-256 lookup index
  const { data: keyRecord, error } = await supabaseAdmin
    .from("proof_api_keys")
    .select(`
      id,
      tenant_id,
      key_hash,
      key_bcrypt_hash,
      environment,
      revoked_at,
      proof_tenants!inner (
        id,
        name,
        webhook_url,
        webhook_secret,
        lob_api_key
      )
    `)
    .eq("key_hash", lookupHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (error || !keyRecord) {
    return null;
  }

  // Two-layer verification:
  // - If bcrypt hash exists, use it for defense-in-depth verification
  // - If bcrypt hash is NULL (legacy key created before this fix), fall back
  //   to SHA-256 match (the lookup hash already matched, so this is sufficient)
  if (keyRecord.key_bcrypt_hash) {
    const bcryptMatch = await bcrypt.compare(apiKey, keyRecord.key_bcrypt_hash);
    if (!bcryptMatch) {
      return null;
    }
  }
  // Legacy keys (no bcrypt hash): the SHA-256 lookup already verified the key.
  // This is acceptable for existing keys; new keys always get bcrypt.

  const tenant = keyRecord.proof_tenants as Record<string, unknown>;

  // Decrypt tenant secrets at rest
  let webhookSecret = tenant.webhook_secret as string | null;
  if (webhookSecret) {
    try {
      webhookSecret = await decryptSecret(webhookSecret);
    } catch {
      // If decryption fails, the value may be plaintext (pre-encryption)
      // Keep the original value
    }
  }

  return {
    id: tenant.id as string,
    name: tenant.name as string,
    webhook_url: tenant.webhook_url as string | null,
    webhook_secret: webhookSecret,
    environment: keyRecord.environment as "live" | "test",
  };
}

/**
 * Generate a new API key for a tenant.
 * Returns the full key (only shown once) and stores the hash.
 */
export function generateApiKey(environment: "live" | "test"): string {
  const prefix = environment === "live" ? "sk_live_" : "sk_test_";
  const random = createHash("sha256")
    .update(crypto.randomUUID() + Date.now() + Math.random())
    .digest("hex")
    .slice(0, 32);
  return prefix + random;
}

/**
 * Hash an API key for storage.
 * Returns the SHA-256 lookup hash.
 * Call `hashApiKeyForBcrypt()` separately to get the bcrypt hash.
 */
export function hashApiKeyForStorage(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

/**
 * Generate a bcrypt hash of an API key for storage alongside the SHA-256
 * lookup index. This provides defense-in-depth: even if the database is
 * compromised, plaintext keys cannot be recovered.
 */
export function hashApiKeyForBcrypt(apiKey: string): string {
  return bcrypt.hashSync(apiKey, 10);
}

/**
 * Create a tenant and return the first API key.
 * Used during tenant onboarding (dashboard or API).
 * Tenant secrets (webhook_secret, lob_api_key) are encrypted at rest.
 */
export async function createTenant(
  name: string,
  deps: { supabaseAdmin: import("@supabase/supabase-js").SupabaseClient },
  options?: {
    webhook_url?: string;
    webhook_secret?: string;
    lob_api_key?: string;
  },
): Promise<{ tenant_id: string; api_key: string }> {
  const { supabaseAdmin } = deps;

  // Encrypt tenant secrets at rest
  const encryptedWebhookSecret = options?.webhook_secret
    ? await encryptSecret(options.webhook_secret)
    : null;
  const encryptedLobApiKey = options?.lob_api_key
    ? await encryptSecret(options.lob_api_key)
    : null;

  // Create tenant
  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from("proof_tenants")
    .insert({
      name,
      webhook_url: options?.webhook_url ?? null,
      webhook_secret: encryptedWebhookSecret,
      lob_api_key: encryptedLobApiKey,
    })
    .select()
    .single();

  if (tenantError || !tenant) {
    throw new Error(`Failed to create tenant: ${tenantError?.message ?? "unknown"}`);
  }

  // Generate API key with both SHA-256 lookup hash and bcrypt verification hash
  const apiKey = generateApiKey("live");
  const keyHash = hashApiKeyForStorage(apiKey);
  const keyBcryptHash = hashApiKeyForBcrypt(apiKey);

  const { error: keyError } = await supabaseAdmin
    .from("proof_api_keys")
    .insert({
      tenant_id: tenant.id,
      key_prefix: apiKey.slice(0, 11), // "sk_live_abc"
      key_hash: keyHash,
      key_bcrypt_hash: keyBcryptHash,
      environment: "live",
      label: "Default",
    });

  if (keyError) {
    throw new Error(`Failed to create API key: ${keyError.message}`);
  }

  return { tenant_id: tenant.id, api_key: apiKey };
}

/**
 * Decrypt a tenant's Lob API key for use with Lob API calls.
 */
export async function getDecryptedLobApiKey(
  encryptedKey: string | null,
): Promise<string | null> {
  if (!encryptedKey) return null;
  try {
    return await decryptSecret(encryptedKey);
  } catch {
    // If decryption fails, the value may be plaintext (pre-encryption)
    return encryptedKey;
  }
}
