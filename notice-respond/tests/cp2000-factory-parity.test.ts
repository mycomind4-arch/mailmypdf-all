import { describe, expect, it } from "vitest";

import workflowConfig from "../workflows/cp2000-response/config";
import { getNoticeResponseFactoryArtifact } from "@mailmypdf/workflows";

describe("CP2000 factory parity", () => {
  it("keeps reviewed landing identity aligned with the generated factory artifact", () => {
    const artifact = getNoticeResponseFactoryArtifact("cp2000-response");

    expect(artifact).toBeTruthy();
    expect(artifact?.factoryReady).toBe(true);
    expect(artifact?.diagnostics).toEqual([]);

    expect(workflowConfig.id).toBe(artifact?.workflowId);
    expect(workflowConfig.sectionId).toBe(artifact?.canonical.sectionId);
    expect(workflowConfig.path).toBe(artifact?.canonical.publicHref);
    expect(workflowConfig.startPath).toBe(artifact?.manifest.route);
    expect(artifact?.canonical.id).toBe("notice-respond/cp2000-response");
    expect(artifact?.profile.primaryDocumentId).toBe("cp2000-notice");
    expect(artifact?.profile.extractionSchema).toBe("irs.cp2000.v1");
    expect(artifact?.runtimePolicy.chatContract).toBeTruthy();
  });
});
