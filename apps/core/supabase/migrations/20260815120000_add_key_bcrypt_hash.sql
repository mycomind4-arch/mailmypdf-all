-- Add bcrypt hash column for API key verification (defense-in-depth)
-- The key_hash column (SHA-256) remains as the lookup index
-- The key_bcrypt_hash column stores a bcrypt hash for timing-safe verification
-- Existing keys will have NULL bcrypt hashes and fall back to SHA-256 verification

ALTER TABLE proof_api_keys
ADD COLUMN IF NOT EXISTS key_bcrypt_hash text;

-- Add comment for documentation
COMMENT ON COLUMN proof_api_keys.key_bcrypt_hash IS
'Bcrypt hash of the API key for defense-in-depth verification. NULL for legacy keys (SHA-256 lookup only).';
