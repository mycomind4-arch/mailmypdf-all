import { describe, expect, it } from "vitest";
import { mapStatus } from "./mailmypdf-provider";

describe("MailMyPDF provider status mapping", () => {
  it("maps known fulfillment states", () => {
    expect(mapStatus("submitted")).toBe("submitted");
    expect(mapStatus("mailed")).toBe("mailed");
    expect(mapStatus("in_transit")).toBe("in_transit");
    expect(mapStatus("delivered")).toBe("delivered");
    expect(mapStatus("failed")).toBe("failed");
    expect(mapStatus("cancelled")).toBe("cancelled");
    expect(mapStatus("refunded")).toBe("refunded");
  });

  it("rejects unknown provider states instead of treating them as submitted", () => {
    expect(() => mapStatus("mystery_state")).toThrow(/Unknown MailMyPDF fulfillment status/);
    expect(() => mapStatus(undefined)).toThrow(/Unknown MailMyPDF fulfillment status/);
  });
});
