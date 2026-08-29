/**
 * Encryption at rest for tenant secrets.
 *
 * Uses AES-256-GCM with a key derived from the ENCRYPTION_MASTER_KEY env var.
 * The master key should be 32 bytes (256 bits), base64-encoded.
 *
 * Format: enc:v1:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>
 *
 * Usage:
 *   const enc = await encryptSecret(plaintext);
 *   const dec = await decryptSecret(enc);
 *
 * If ENCRYPTION_MASTER_KEY is not set, functions are pass-through (plaintext).
 * This allows development without encryption but logs a warning.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard IV length
const TAG_LENGTH = 16;
const PREFIX = "enc:v1:";
const SALT = "mailmypdf-tenant-encryption-salt";

let cachedKey: Buffer | null = null;

function getMasterKey(): Buffer | null {
  if (cachedKey !== null) return cachedKey;

  const masterKeyEnv = process.env.ENCRYPTION_MASTER_KEY;
  if (!masterKeyEnv) {
    console.warn(
      "[encryption] ENCRYPTION_MASTER_KEY not set — tenant secrets will be stored in plaintext",
    );
    cachedKey = null;
    return null;
  }

  // Derive a 32-byte key from the master key using scrypt
  cachedKey = scryptSync(masterKeyEnv, SALT, 32);
  return cachedKey;
}

/**
 * Encrypt a secret string using AES-256-GCM.
 * Returns a formatted string: enc:v1:<iv>:<tag>:<ciphertext>
 * If ENCRYPTION_MASTER_KEY is not set, returns the plaintext (with warning).
 */
export async function encryptSecret(plaintext: string): Promise<string> {
  const key = getMasterKey();
  if (!key) return plaintext; // Pass-through if no key configured

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a secret encrypted with encryptSecret().
 * If the value doesn't start with the encryption prefix, returns it as-is
 * (for backward compatibility with plaintext values).
 */
export async function decryptSecret(encrypted: string): Promise<string> {
  // Pass-through for plaintext values (backward compat)
  if (!encrypted.startsWith(PREFIX)) {
    return encrypted;
  }

  const key = getMasterKey();
  if (!key) {
    throw new Error("ENCRYPTION_MASTER_KEY not set but encrypted value found");
  }

  const parts = encrypted.slice(PREFIX.length).split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted value");
  }

  const iv = Buffer.from(parts[0], "hex");
  const tag = Buffer.from(parts[1], "hex");
  const ciphertext = Buffer.from(parts[2], "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Check if a value is encrypted (starts with the encryption prefix).
 */
export function isEncrypted(value: string): boolean {
  return value?.startsWith(PREFIX) ?? false;
}

/**
 * Check if encryption is enabled (master key is set).
 */
export function isEncryptionEnabled(): boolean {
  return !!process.env.ENCRYPTION_MASTER_KEY;
}
