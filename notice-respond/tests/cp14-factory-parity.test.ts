import { describe, expect, it } from "vitest";

import workflowConfig from "../workflows/cp14-response/config";
import {
  getNoticeResponseFactoryArtifact,
  workflowById,
} from "@mailmypdf/workflows";

describe("CP14 factory parity", () => {
  it("keeps the public landing identity and generated execution artifact aligned", () => {
    const artifact = getNoticeResponseFactoryArtifact("cp14-response");
    expect(artifact).toBeTruthy();
    expect(artifact?.factoryReady).toBe(true);

    expect(workflowConfig.id).toBe(artifact?.workflowId);
    expect(workflowConfig.sectionId).toBe(artifact?.canonical.sectionId);
    expect(workflowConfig.path).toBe(artifact?.canonical.publicHref);
    expect(workflowConfig.startPath).toBe(artifact?.manifest.route);
    expect(workflowConfig.startPath).toBe(
      `${artifact?.canonical.publicHref}/start`,
    );
    expect(workflowConfig.indexable).toBe(true);
  });

  it("keeps canonical registry and factory identity singular", () => {
    const canonical = workflowById("notice-respond/cp14-response");
    const artifact = getNoticeResponseFactoryArtifact("cp14-response");

    expect(canonical).toBeTruthy();
    expect(artifact?.canonical).toEqual(canonical);
    expect(artifact?.manifest.vertical).toBe("notice-respond");
    expect(artifact?.profile.primaryDocumentId).toBe("cp14-notice");
    expect(artifact?.profile.extractionSchema).toBe("irs.cp14.v1");
  });
});
