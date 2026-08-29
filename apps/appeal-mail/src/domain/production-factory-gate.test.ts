import { describe, expect, it } from "vitest";
import { constructWorkflow, getDomainPack } from "./workflow-capabilities";
import { evaluateGoldStandardGate } from "./gold-standard-gate";
import { workflows } from "./workflows";
import "./insurance-packs";

describe("production factory registration", () => {
  it("registers denied-claim before constructing the production workflow", () => {
    expect(getDomainPack("denied-claim")).toBeDefined();

    const workflow = constructWorkflow(workflows["denied-claim"]);
    const gate = evaluateGoldStandardGate(workflow);

    expect(workflow.packs).toBeDefined();
    expect(workflow.lifecycle).toBe("authority");
    expect(gate.passed).toBe(true);
  });
});
