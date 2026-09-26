import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = (path) => readFile(join(root, path), "utf8");

test("Worker boundary applies the shared security headers to success and error responses", async () => {
  const server = await source("src/server.ts");
  assert.match(server, /import \{ applySecurityHeaders \} from "\.\/lib\/security-headers"/);
  assert.match(server, /applySecurityHeaders\(await normalizeCatastrophicSsrResponse\(response\)\)/);
  assert.match(server, /return applySecurityHeaders\(new Response\(renderErrorPage\(\)/);
});

test("CSP permits the external resources that the root shell can intentionally load", async () => {
  const headers = await source("src/lib/security-headers.ts");
  assert.match(headers, /https:\/\/fonts\.googleapis\.com/);
  assert.match(headers, /https:\/\/fonts\.gstatic\.com/);
  assert.match(headers, /https:\/\/plausible\.io/);
  assert.match(headers, /https:\/\/js\.stripe\.com/);
});

test("Plausible is not injected into static head metadata before analytics consent", async () => {
  const rootRoute = await source("src/routes/__root.tsx");
  assert.doesNotMatch(rootRoute, /scripts:\s*ANALYTICS_DOMAIN/);
  assert.match(rootRoute, /getConsent\(\)\?\.analytics/);
  assert.match(rootRoute, /document\.createElement\("script"\)/);
  assert.match(rootRoute, /mmp-consent-changed/);
});
