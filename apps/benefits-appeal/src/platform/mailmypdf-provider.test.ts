import { describe, expect, it } from "vitest";
import { mapMailMyPDFStatus } from "./mailmypdf-provider";

describe("MailMyPDF provider status mapping", () => {
  it("maps known provider states without ambiguity", () => {
    expect(mapMailMyPDFStatus("created")).toBe("submitted");
    expect(mapMailMyPDFStatus("submitted")).toBe("submitted");
    expect(mapMailMyPDFStatus("mailed")).toBe("mailed");
    expect(mapMailMyPDFStatus("sent")).toBe("mailed");
    expect(mapMailMyPDFStatus("in_transit")).toBe("in_transit");
    expect(mapMailMyPDFStatus("in-transit")).toBe("in_transit");
    expect(mapMailMyPDFStatus("delivered")).toBe("delivered");
    expect(mapMailMyPDFStatus("failed")).toBe("failed");
    expect(mapMailMyPDFStatus("cancelled")).toBe("cancelled");
    expect(mapMailMyPDFStatus("canceled")).toBe("cancelled");
    expect(mapMailMyPDFStatus("refunded")).toBe("refunded");
  });

  it("fails closed on unknown provider states", () => {
    expect(() => mapMailMyPDFStatus("processing"))
      .toThrow("unknown communication status");
    expect(() => mapMailMyPDFStatus(undefined))
      .toThrow("unknown communication status");
  });
});
