import { describe, expect, it } from "vitest";
import {
  validateEcosystemCertificationLedger,
  type EcosystemCertification,
} from "./ecosystem-certification";

describe("ecosystem certification ledger invariants", () => {
  it("has no invalid entries in the canonical ledger", () => {
    const invalid = validateEcosystemCertificationLedger().filter((entry) => !entry.valid);
    expect(invalid).toEqual([]);
  });

  it("rejects Gold with unresolved blockers", () => {
    const entry: EcosystemCertification = {
      repo: "test",
      workflow: "test",
      engine: "document-action",
      status: "gold",
      executableCapabilities: ["drafting"],
      blockedBy: ["missing deployment"],
      evidence: ["test evidence"],
    };
    expect(validateEcosystemCertificationLedger([entry])[0].valid).toBe(false);
  });

  it("rejects executable certification without evidence", () => {
    const entry: EcosystemCertification = {
      repo: "test",
      workflow: "test",
      engine: "document-action",
      status: "executable",
      executableCapabilities: ["drafting"],
      blockedBy: [],
      evidence: [],
    };
    expect(validateEcosystemCertificationLedger([entry])[0].valid).toBe(false);
  });

  it("rejects catalog entries claiming executable capabilities", () => {
    const entry: EcosystemCertification = {
      repo: "test",
      workflow: "test",
      engine: "document-action",
      status: "catalog",
      executableCapabilities: ["drafting"],
      blockedBy: ["not implemented"],
      evidence: ["catalog definition"],
    };
    expect(validateEcosystemCertificationLedger([entry])[0].valid).toBe(false);
  });
});
