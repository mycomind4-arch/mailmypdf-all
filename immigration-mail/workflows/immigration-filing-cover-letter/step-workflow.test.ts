import { describe, expect, it } from "vitest";

import {
  approveMatter,
  completeStep,
  createStepMatterState,
} from "@mailmypdf/step-workflow";

import {
  IMMIGRATION_COVER_LETTER_STEPS,
  immigrationFilingCoverLetterStepWorkflow,
} from "./start/workflow";

describe("immigration filing cover letter StepWorkflow", () => {
  it("uses the canonical seven-step immigration flow", () => {
    expect(immigrationFilingCoverLetterStepWorkflow.steps).toEqual(
      [...IMMIGRATION_COVER_LETTER_STEPS],
    );

    expect(
      immigrationFilingCoverLetterStepWorkflow.requiresApprovalBeforeStep,
    ).toBe("mail");
  });

  it("moves through the workflow and blocks mailing until approval", () => {
    let state = createStepMatterState({
      id: "test-matter",
      ownerId: "test-owner",
      definition: immigrationFilingCoverLetterStepWorkflow,
      now: "2026-09-23T00:00:00.000Z",
    });

    expect(state.currentStepId).toBe("filing");

    for (const stepId of [
      "filing",
      "analysis",
      "facts",
      "documents",
      "draft",
      "review",
    ]) {
      state = completeStep(
        state,
        immigrationFilingCoverLetterStepWorkflow,
        stepId,
        "2026-09-23T00:00:00.000Z",
      );
    }

    expect(state.currentStepId).toBe("mail");

    expect(() =>
      completeStep(
        state,
        immigrationFilingCoverLetterStepWorkflow,
        "mail",
        "2026-09-23T00:00:00.000Z",
      ),
    ).toThrow(/requires matter approval/i);

    state = approveMatter(state, "2026-09-23T00:00:00.000Z");

    state = completeStep(
      state,
      immigrationFilingCoverLetterStepWorkflow,
      "mail",
      "2026-09-23T00:00:00.000Z",
    );

    expect(state.steps.mail.status).toBe("complete");
    expect(state.approved).toBe(true);
  });
});
