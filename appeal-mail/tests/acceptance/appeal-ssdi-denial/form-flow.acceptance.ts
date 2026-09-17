import { describe, expect, it } from "vitest";

import {
  SSDI_REQUIRED_FORMS,
  hasRequiredSsdiForms,
} from "../../../workflows/appeal-ssdi-denial/start/workflow";

describe("SSDI normalized official-form flow", () => {
  it("publishes only the normalized bundled SSA copies from the workflow module", () => {
    for (const form of SSDI_REQUIRED_FORMS) {
      expect(form.href).toContain("/forms/generated/");
      expect(form.href).toContain(form.bundledMailReadyFilename);
      expect(form.href).not.toMatch(/\/forms\/generated\/(ssa-(?:561-u2|3441|827))\.pdf$/);
    }
  });

  it("fails closed until every required form has cleared security scanning", () => {
    const cleanMedicalForms = SSDI_REQUIRED_FORMS.map((form, index) => ({
      evidence_kind: form.kind,
      included: true,
      usable: true,
      security_status: "clean",
      position: index + 1,
    }));

    expect(hasRequiredSsdiForms(cleanMedicalForms, "medical")).toBe(true);
    expect(hasRequiredSsdiForms(cleanMedicalForms, "nonmedical")).toBe(true);

    expect(
      hasRequiredSsdiForms(
        cleanMedicalForms.map((document) =>
          document.evidence_kind === "ssa_3441"
            ? { ...document, security_status: "pending" }
            : document,
        ),
        "medical",
      ),
    ).toBe(false);

    expect(
      hasRequiredSsdiForms(
        cleanMedicalForms.map((document) =>
          document.evidence_kind === "ssa_827"
            ? { ...document, usable: false, security_status: "rejected" }
            : document,
        ),
        "medical",
      ),
    ).toBe(false);

    expect(hasRequiredSsdiForms([], "unknown")).toBe(false);
  });
});
