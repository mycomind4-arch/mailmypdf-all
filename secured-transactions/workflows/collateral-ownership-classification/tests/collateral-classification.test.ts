import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { resolveCollateralClassification } from "../rules/collateral-classification";
import workflowManifest from "../manifest";
import workflowRuntimeClient from "../start/runtime-client";

describe("Collateral Ownership & Classification workflow", () => {
  test("blocks unsupported classification rather than inferring from a label alone", () => {
    const result = resolveCollateralClassification({
      assetId: "asset-1",
      claims: [],
    });
    assert.equal(result.disposition, "insufficient-evidence");
  });

  test("remains a non-executable placeholder", () => {
    assert.equal(workflowManifest.manifest.allowsConsequentialAction, false);
    assert.equal(workflowRuntimeClient.executable, false);
  });
});
