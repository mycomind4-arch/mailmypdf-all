import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  ECOSYSTEM_CERTIFICATIONS,
  getEcosystemCertification,
  isEcosystemExecutable,
  isEcosystemGold,
} from "../src/index.js";

describe("ecosystem certification ledger", () => {
  test("finds the inspected credit-report workflow", () => {
    const entry = getEcosystemCertification("dispute-mail", "credit-report");
    assert.ok(entry);
    assert.equal(entry.status, "executable");
    assert.equal(isEcosystemExecutable(entry), true);
  });

  test("does not call blocked executable work Gold", () => {
    for (const entry of ECOSYSTEM_CERTIFICATIONS.filter((candidate) => candidate.status === "executable")) {
      assert.equal(isEcosystemGold(entry), false);
    }
  });

  test("domain-ready entries remain non-executable", () => {
    const permit = getEcosystemCertification("permit-response", "permit-response");
    const benefits = getEcosystemCertification("benefits-appeal", "benefits-appeal");
    assert.equal(permit?.status, "domain-ready");
    assert.equal(benefits?.status, "domain-ready");
    assert.equal(permit ? isEcosystemExecutable(permit) : true, false);
    assert.equal(benefits ? isEcosystemExecutable(benefits) : true, false);
  });

  test("every executable entry carries an explicit blocker or evidence trail", () => {
    for (const entry of ECOSYSTEM_CERTIFICATIONS.filter((candidate) => candidate.status === "executable")) {
      assert.ok(entry.evidence.length > 0, `${entry.repo}/${entry.workflow} needs evidence`);
      assert.ok(entry.blockedBy.length > 0, `${entry.repo}/${entry.workflow} must not be silently Gold`);
    }
  });
});
