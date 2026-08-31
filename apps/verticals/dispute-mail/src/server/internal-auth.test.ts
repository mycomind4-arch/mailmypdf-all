import { describe, expect, it } from "vitest";
import { requireInternalServiceKey } from "./internal-auth";

const originalKey = process.env.DISPUTE_MAIL_INTERNAL_API_KEY;

describe("requireInternalServiceKey", () => {
  it("fails closed when the server key is not configured", () => {
    delete process.env.DISPUTE_MAIL_INTERNAL_API_KEY;
    expect(() => requireInternalServiceKey(new Request("https://example.test"))).toThrow();
    restore();
  });

  it("rejects missing and incorrect credentials", () => {
    process.env.DISPUTE_MAIL_INTERNAL_API_KEY = "expected-key";
    expect(() => requireInternalServiceKey(new Request("https://example.test"))).toThrow();
    expect(() => requireInternalServiceKey(new Request("https://example.test", { headers: { authorization: "Bearer wrong-key" } }))).toThrow();
    restore();
  });

  it("accepts the configured bearer credential", () => {
    process.env.DISPUTE_MAIL_INTERNAL_API_KEY = "expected-key";
    expect(() => requireInternalServiceKey(new Request("https://example.test", { headers: { authorization: "Bearer expected-key" } }))).not.toThrow();
    restore();
  });
});

function restore() {
  if (originalKey === undefined) delete process.env.DISPUTE_MAIL_INTERNAL_API_KEY;
  else process.env.DISPUTE_MAIL_INTERNAL_API_KEY = originalKey;
}
