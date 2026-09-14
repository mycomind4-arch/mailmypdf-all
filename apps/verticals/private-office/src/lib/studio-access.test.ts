import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { studioAccessError } from "./studio-access";

const request = (host: string, headers: Record<string, string> = {}) =>
  new Request(`http://${host}/api/studio/run`, { headers: { host, ...headers } });

describe("Studio machine access", () => {
  it("permits the local development UI and CLI", () => {
    for (const host of ["localhost:8090", "127.0.0.1:8090", "[::1]:8090"]) {
      expect(studioAccessError(request(host), "development")).toBeNull();
      expect(studioAccessError(request(host, { origin: `http://${host}` }), "development")).toBeNull();
    }
  });
  it("rejects production even with an authenticated token and localhost host", () => {
    expect(studioAccessError(request("localhost:8090", { authorization: "Bearer user-token" }), "production")?.status).toBe(403);
    expect(studioAccessError(request("studio.example.com"), "development")?.status).toBe(403);
  });
  it("rejects cross-site browser calls and mismatched request hosts", () => {
    expect(studioAccessError(request("localhost:8090", { origin: "https://evil.example" }), "development")?.status).toBe(403);
    expect(studioAccessError(request("localhost:8090", { "sec-fetch-site": "cross-site" }), "development")?.status).toBe(403);
    expect(studioAccessError(request("evil.example", { host: "localhost:8090" }), "development")?.status).toBe(403);
  });
  it("guards every Studio API before processing input or running tools", () => {
    const dir = new URL("../routes/api/studio/", import.meta.url);
    for (const file of readdirSync(dir, { recursive: true }).filter(f => String(f).endsWith(".ts"))) {
      const source = readFileSync(new URL(String(file), dir), "utf8");
      expect(source, String(file)).toContain("const accessError = studioAccessError(request)");
      expect(source, String(file)).toContain("if (accessError) return accessError");
    }
  });
});
