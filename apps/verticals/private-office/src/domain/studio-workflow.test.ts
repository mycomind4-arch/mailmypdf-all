import { describe, expect, it } from "vitest";
import {
  validateStudioWorkflow,
  type StudioPhase,
  type StudioWorkflow,
} from "./studio-workflow";

function phase(overrides: Partial<StudioPhase> = {}): StudioPhase {
  return {
    id: "intake",
    title: "Matter intake",
    objective: "Collect the records needed to start the matter.",
    kind: "input",
    position: { x: 0, y: 0 },
    dependencies: [],
    capabilities: [],
    gates: [],
    riskLevel: "moderate",
    ...overrides,
  };
}

function workflow(phases: StudioPhase[]): StudioWorkflow {
  return {
    id: "test-workflow",
    title: "Test workflow",
    description: "A test workflow.",
    objective: "Verify Studio safeguards.",
    classification: "experimental",
    riskLevel: "high",
    version: 1,
    phases,
    edges: [],
    provenancePolicy: {
      requireSourceForFacts: true,
      allowAIInference: true,
      requireHumanVerificationFor: [],
    },
    mode: "design",
    updatedAt: "2026-09-11T00:00:00.000Z",
  };
}

describe("validateStudioWorkflow", () => {
  it("blocks an external service phase without an approval gate", () => {
    const findings = validateStudioWorkflow(
      workflow([
        phase({
          id: "deliver",
          title: "Deliver correspondence",
          kind: "action",
          capabilities: [
            {
              capabilityId: "mailing-submit",
              executionMode: "external_service",
              required: true,
              configuration: {},
            },
          ],
        }),
      ]),
    );

    expect(findings).toContainEqual(
      expect.objectContaining({ code: "UNGUARDED_ACTION", severity: "critical" }),
    );
  });

  it("accepts an external service phase guarded by owner approval", () => {
    const findings = validateStudioWorkflow(
      workflow([
        phase({
          id: "deliver",
          title: "Deliver correspondence",
          kind: "action",
          capabilities: [
            {
              capabilityId: "mailing-submit",
              executionMode: "external_service",
              required: true,
              configuration: {},
            },
          ],
          gates: [
            {
              type: "consequential-action",
              label: "Owner authorizes delivery",
              required: true,
            },
          ],
        }),
      ]),
    );

    expect(findings).not.toContainEqual(
      expect.objectContaining({ code: "UNGUARDED_ACTION" }),
    );
  });
});
