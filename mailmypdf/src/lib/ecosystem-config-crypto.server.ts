function masterKeyMaterial(): string {
  const key = process.env.MAILMYPDF_CONFIG_MASTER_KEY;
  if (!key || key.trim().length < 32) throw new Error('MAILMYPDF_CONFIG_MASTER_KEY must be configured with at least 32 characters');
  return key;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function derivedKey(): Promise<CryptoKey> {
  const material = new TextEncoder().encode(masterKeyMaterial());
  const digest = await crypto.subtle.digest('SHA-256', material);
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptConfigSecret(value: string): Promise<string> {
  const key = await derivedKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value)));
  return `${toBase64(iv)}.${toBase64(ciphertext)}`;
}

export async function decryptConfigSecret(value: string): Promise<string> {
  const [ivPart, ciphertextPart] = value.split('.');
  if (!ivPart || !ciphertextPart) throw new Error('Invalid encrypted configuration value');
  const key = await derivedKey();
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(ivPart) }, key, fromBase64(ciphertextPart));
  return new TextDecoder().decode(plaintext);
}
