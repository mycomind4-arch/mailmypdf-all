import { describe, expect, it } from "vitest";
import { assertTransition, canTransition } from "./mail-job-lifecycle";

describe("mail job lifecycle", () => {
  it("allows the production path", () => {
    expect(canTransition("draft", "queued")).toBe(true);
    expect(canTransition("queued", "processing")).toBe(true);
    expect(canTransition("processing", "accepted")).toBe(true);
    expect(canTransition("accepted", "mailed")).toBe(true);
    expect(canTransition("mailed", "delivered")).toBe(true);
  });
  it("rejects terminal-state resurrection", () => {
    expect(canTransition("delivered", "queued")).toBe(false);
    expect(canTransition("cancelled", "mailed")).toBe(false);
    expect(() => assertTransition("delivered", "queued")).toThrow(/Invalid mail job transition/);
  });
  it("allows failed work to retry safely", () => {
    expect(canTransition("failed", "queued")).toBe(true);
  });
});
