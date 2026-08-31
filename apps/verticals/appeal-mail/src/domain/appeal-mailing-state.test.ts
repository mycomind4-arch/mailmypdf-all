import { describe, expect, it } from "vitest";
import { canPersistMailedStatus, updateAppeal, type Appeal } from "./appeal";

const baseAppeal = { proof: undefined } as unknown as Appeal;

describe("Appeal mailing state", () => {
  it("blocks mailed status without provider fulfillment evidence", () => {
    expect(canPersistMailedStatus(baseAppeal)).toBe(false);
    expect(() => updateAppeal(baseAppeal, { status: "mailed" })).toThrow(/provider order/i);
  });

  it("requires provider id, mailing timestamp, and provider-backed proof status", () => {
    const incomplete = {
      proof: {
        providerOrderId: "provider-1",
        mailingTimestamp: "2026-08-20T18:00:00.000Z",
        status: "assembled",
      },
    } as unknown as Appeal;
    expect(canPersistMailedStatus(incomplete)).toBe(false);

    const complete = {
      proof: {
        providerOrderId: "provider-1",
        mailingTimestamp: "2026-08-20T18:00:00.000Z",
        status: "mailed",
      },
    } as unknown as Appeal;
    expect(canPersistMailedStatus(complete)).toBe(true);
  });
});
