import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isAdapterCompatible, getPipeline, getAdapter } from "@mailmypdf/workflows";
import {
  securedTransactionWorkflowCatalog,
  isSecuredTransactionWorkflowId,
} from "../shared/config/workflow-registry";
import {
  securedTransactionStartRoutes,
  securedTransactionStartRouteFor,
} from "../runtime";

describe("Secured Transactions section registry", () => {
  test("registers all 17 planned workflows exactly once", () => {
    assert.equal(securedTransactionWorkflowCatalog.length, 17);
    assert.equal(
      new Set(securedTransactionWorkflowCatalog.map((item) => item.slug)).size,
      17,
    );
    for (const item of securedTransactionWorkflowCatalog) {
      assert.equal(isSecuredTransactionWorkflowId(item.slug), true);
    }
  });

  test("registers one unique authenticated start route per workflow", () => {
    assert.equal(securedTransactionStartRoutes.length, 17);
    assert.equal(new Set(securedTransactionStartRoutes.map((item) => item.path)).size, 17);
    assert.deepEqual(
      new Set(securedTransactionStartRoutes.map((item) => item.workflowId)),
      new Set(securedTransactionWorkflowCatalog.map((item) => item.slug)),
    );
    for (const item of securedTransactionStartRoutes) {
      assert.equal(securedTransactionStartRouteFor(item.workflowId)?.path, item.path);
    }
  });

  test("P11 and the secured-transactions adapter are native compatible runtime primitives", () => {
    assert.equal(getPipeline("P11_SECURED_TRANSACTION").id, "P11_SECURED_TRANSACTION");
    assert.equal(getAdapter("secured-transactions").id, "secured-transactions");
    assert.equal(isAdapterCompatible("P11_SECURED_TRANSACTION", "secured-transactions"), true);
  });

  test("workflow manifests compose with truthful maturity states", async () => {
    let wired = 0;
    let placeholders = 0;

    for (const item of securedTransactionWorkflowCatalog) {
      const module = await import(`../workflows/${item.slug}/manifest`);
      const defined = module.workflowManifest;
      assert.equal(defined.manifest.id, item.slug);
      assert.equal(defined.manifest.vertical, "secured-transactions");
      assert.equal(defined.manifest.pipeline, "P11_SECURED_TRANSACTION");
      assert.deepEqual(defined.manifest.adapters, ["secured-transactions"]);
      assert.equal(defined.manifest.requiresHumanReview, true);
      assert.equal(defined.manifest.allowsConsequentialAction, false);

      if (item.slug === "secured-transaction-eligibility") {
        assert.equal(defined.manifest.maturity, "wired");
        assert.deepEqual(
          new Set(defined.manifest.requiredCapabilities),
          new Set(["matterState", "findings", "validation", "humanReview"]),
        );
        wired += 1;
      } else {
        assert.equal(defined.manifest.maturity, "placeholder");
        placeholders += 1;
      }
    }

    assert.equal(wired, 1);
    assert.equal(placeholders, 16);
  });
});
