import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getSsaReconsiderationRuntimePolicy,
  platformWorkflowRuntimePolicyFor,
  requiredSsaReconsiderationFormKinds,
  type WorkflowMatterAnalysis,
  type WorkflowMatterDocument,
} from "../src/index.js";

function analysis(details: Record<string, unknown>): WorkflowMatterAnalysis {
  return {
    version: 1,
    documentId: "notice",
    model: "test",
    createdAt: "2026-09-22T00:00:00Z",
    result: {
      decision: "denied", issuer: "SSA", referenceNumber: null, decisionDate: null, deadline: null,
      confidence: "high", summary: "Denied.", reasons: [], missingInformation: [], suggestedEvidence: [],
      promptInjectionObserved: false, workflowDetails: details,
    },
  } as WorkflowMatterAnalysis;
}

function form(kind: string, overrides: Partial<WorkflowMatterDocument> = {}): WorkflowMatterDocument {
  return {
    documentId: kind, role: "evidence", evidenceKind: kind, mimeType: "application/pdf", included: true, usable: true,
    securityStatus: "clean", position: 1, ...overrides,
  } as WorkflowMatterDocument;
}

import {
  getSsaReconsiderationFactoryArtifact,
} from "../src/domain-packs/appeal/ssa-reconsideration-factory-artifact.js";

const claimant = {
  claimantName: "Pat Doe", claimantAddress: "1 Main St", phone: "555-0100",
  responseMode: "reconsideration", confirmedReconsideration: true, reasonsForDisagreement: "My condition worsened.",
};

test("SSDI and SSI reconsideration are registered in the platform policy registry", () => {
  assert.ok(platformWorkflowRuntimePolicyFor("appeal-ssdi-denial"));
  assert.ok(platformWorkflowRuntimePolicyFor("appeal-ssi-denial"));
  assert.equal(getSsaReconsiderationRuntimePolicy("ssdi-denial"), null);
  assert.equal(getSsaReconsiderationRuntimePolicy("toString"), null);
  assert.throws(() => platformWorkflowRuntimePolicyFor("appeal-ssdi-denial")!.validateMatter({
    workflowId: "appeal-ssdi-denial", verticalId: "benefits-appeal",
  }));
});

test("the appeal level and basis must come from the analysed notice", () => {
  const policy = getSsaReconsiderationRuntimePolicy("appeal-ssdi-denial")!;
  assert.throws(() => policy.validateAnalysis!(analysis({})), /not confirmed/);
  assert.throws(() => policy.validateAnalysis!(analysis({ appealStage: "hearing", decisionBasis: "medical" })), /not hearing/);
  assert.throws(() => policy.validateAnalysis!(analysis({ appealStage: "reconsideration", decisionBasis: "unknown" })), /medical or non-medical/);
  assert.doesNotThrow(() => policy.validateAnalysis!(analysis({ appealStage: "reconsideration", decisionBasis: "nonmedical" })));
});

test("SSDI and SSI reconsideration reject non-denial and unconfirmed decisions", () => {
  const details = { appealStage: "reconsideration", decisionBasis: "medical" };
  for (const workflowId of ["appeal-ssdi-denial", "appeal-ssi-denial"] as const) {
    const policy = getSsaReconsiderationRuntimePolicy(workflowId)!;
    const approved = analysis(details);
    approved.result.decision = "approved";
    assert.throws(() => policy.validateAnalysis!(approved), /denial/i, workflowId);

    const unconfirmed = analysis(details);
    unconfirmed.result.decision = null;
    assert.throws(() => policy.validateAnalysis!(unconfirmed), /denial/i, workflowId);

    assert.doesNotThrow(() => policy.validateAnalysis!(analysis(details)), workflowId);
  }
});

test("SSDI and SSI reconsideration reject non-SSA or unverified issuing agencies", () => {
  const details = { appealStage: "reconsideration", decisionBasis: "medical" };
  for (const workflowId of ["appeal-ssdi-denial", "appeal-ssi-denial"] as const) {
    const policy = getSsaReconsiderationRuntimePolicy(workflowId)!;
    for (const issuer of ["Private Insurance Company", "Internal Revenue Service", "SSA and Another Agency", null]) {
      const wrongAgency = analysis(details);
      wrongAgency.result.issuer = issuer;
      assert.throws(
        () => policy.validateAnalysis!(wrongAgency),
        /Social Security Administration.*issuer/i,
        `${workflowId}: ${String(issuer)} must not be treated as an SSA denial`,
      );
    }
    for (const issuer of ["SSA", "Social Security", "Social Security Administration", "U.S. Social Security Administration"]) {
      const ssaNotice = analysis(details);
      ssaNotice.result.issuer = issuer;
      assert.doesNotThrow(() => policy.validateAnalysis!(ssaNotice), `${workflowId}: ${issuer}`);
    }
  }
});

test("the required SSA forms follow the decision basis", () => {
  assert.deepEqual(requiredSsaReconsiderationFormKinds("medical"), ["ssa_561", "ssa_3441", "ssa_827"]);
  assert.deepEqual(requiredSsaReconsiderationFormKinds("nonmedical"), ["ssa_561"]);
  assert.deepEqual(requiredSsaReconsiderationFormKinds("unknown"), []);

  const policy = getSsaReconsiderationRuntimePolicy("appeal-ssi-denial")!;
  const medical = analysis({ appealStage: "reconsideration", decisionBasis: "medical" });
  assert.throws(() => policy.validateDocumentsBeforePacket!([form("ssa_561")], medical), /SSA-3441/);
  assert.throws(
    () => policy.validateDocumentsBeforePacket!([form("ssa_561"), form("ssa_3441"), form("ssa_827", { securityStatus: "quarantined" })], medical),
    /SSA-827/,
  );
  assert.doesNotThrow(() => policy.validateDocumentsBeforePacket!([form("ssa_561"), form("ssa_3441"), form("ssa_827")], medical));
});

test("SSA official forms must be clean included PDFs for both SSI and SSDI packets", () => {
  const medical = analysis({ appealStage: "reconsideration", decisionBasis: "medical" });
  const nonmedical = analysis({ appealStage: "reconsideration", decisionBasis: "nonmedical" });
  for (const workflowId of ["appeal-ssdi-denial", "appeal-ssi-denial"] as const) {
    const policy = getSsaReconsiderationRuntimePolicy(workflowId)!;
    const forms = [form("ssa_561"), form("ssa_3441"), form("ssa_827")];
    assert.doesNotThrow(() => policy.validateDocumentsBeforePacket!(forms, medical));
    assert.throws(
      () => policy.validateDocumentsBeforePacket!([form("ssa_561", { mimeType: "image/jpeg" }), ...forms.slice(1)], medical),
      /SSA-561/,
    );
    assert.throws(
      () => policy.validateDocumentsBeforePacket!([form("ssa_561", { mimeType: null }), ...forms.slice(1)], medical),
      /SSA-561/,
    );
    assert.throws(
      () => policy.validateDocumentsBeforePacket!([form("ssa_561", { included: false }), ...forms.slice(1)], medical),
      /SSA-561/,
    );
    assert.throws(
      () => policy.validateDocumentsBeforePacket!([form("ssa_561", { usable: false }), ...forms.slice(1)], medical),
      /SSA-561/,
    );
    assert.doesNotThrow(() => policy.validateDocumentsBeforePacket!([form("ssa_561")], nonmedical));
  }
});

test("SSA packet rejects duplicate included official forms without blocking excluded history", () => {
  const medical = analysis({ appealStage: "reconsideration", decisionBasis: "medical" });
  const nonmedical = analysis({ appealStage: "reconsideration", decisionBasis: "nonmedical" });
  for (const workflowId of ["appeal-ssdi-denial", "appeal-ssi-denial"] as const) {
    const policy = getSsaReconsiderationRuntimePolicy(workflowId)!;
    const first561 = form("ssa_561");
    const duplicate561 = form("ssa_561", { documentId: "another-ssa-561" });
    assert.throws(
      () => policy.validateDocumentsBeforePacket!([first561, duplicate561], nonmedical),
      /SSA-561.*duplicate/i,
      workflowId,
    );
    assert.doesNotThrow(
      () => policy.validateDocumentsBeforePacket!([first561, { ...duplicate561, included: false }], nonmedical),
      workflowId,
    );

    const requiredMedical = [form("ssa_561"), form("ssa_3441"), form("ssa_827")];
    assert.throws(
      () => policy.validateDocumentsBeforePacket!([
        ...requiredMedical,
        form("ssa_3441", { documentId: "second-ssa-3441" }),
      ], medical),
      /SSA-3441.*duplicate/i,
      workflowId,
    );
    assert.doesNotThrow(
      () => policy.validateDocumentsBeforePacket!([
        ...requiredMedical,
        form("ssa_3441", { documentId: "excluded-old-ssa-3441", included: false }),
      ], medical),
      workflowId,
    );
  }
});

test("SSA medical packets reject one PDF relabeled as different required official forms", () => {
  const medical = analysis({ appealStage: "reconsideration", decisionBasis: "medical" });
  for (const workflowId of ["appeal-ssdi-denial", "appeal-ssi-denial"] as const) {
    const policy = getSsaReconsiderationRuntimePolicy(workflowId)!;
    const reused = [
      form("ssa_561", { documentId: "one-uploaded-pdf" }),
      form("ssa_3441", { documentId: "one-uploaded-pdf" }),
      form("ssa_827"),
    ];
    assert.throws(
      () => policy.validateDocumentsBeforePacket!(reused, medical),
      /same uploaded PDF|distinct completed PDFs/i,
      workflowId,
    );
    assert.doesNotThrow(
      () => policy.validateDocumentsBeforePacket!([
        form("ssa_561"), form("ssa_3441"), form("ssa_827"),
        form("ssa_3441", { documentId: "ssa_561", included: false }),
      ], medical),
      `${workflowId}: excluded historical uploads must not cause false conflicts`,
    );
  }
});

test("SSDI and SSI packets reject duplicate included supplemental evidence while allowing excluded history", () => {
  const medical = analysis({ appealStage: "reconsideration", decisionBasis: "medical" });
  const nonmedical = analysis({ appealStage: "reconsideration", decisionBasis: "nonmedical" });
  for (const workflowId of ["appeal-ssdi-denial", "appeal-ssi-denial"] as const) {
    const policy = getSsaReconsiderationRuntimePolicy(workflowId)!;
    for (const [basis, required] of [
      [nonmedical, [form("ssa_561")]],
      [medical, [form("ssa_561"), form("ssa_3441"), form("ssa_827")]],
    ] as const) {
      const repeatedForm = form("other-evidence", {
        documentId: "ssa_561", evidenceKind: "other", position: 4,
      });
      assert.throws(
        () => policy.validateDocumentsBeforePacket!([...required, repeatedForm], basis),
        /duplicate included|same uploaded PDF/i,
        `${workflowId}: a required form must not be mailed twice under another evidence kind`,
      );
      assert.doesNotThrow(
        () => policy.validateDocumentsBeforePacket!([
          ...required, { ...repeatedForm, included: false },
        ], basis),
        `${workflowId}: excluded historical evidence must not block a valid packet`,
      );
    }
  }
});

test("SSDI and SSI official forms cannot reuse the analyzed denial notice PDF", () => {
  for (const workflowId of ["appeal-ssdi-denial", "appeal-ssi-denial"] as const) {
    const policy = getSsaReconsiderationRuntimePolicy(workflowId)!;
    for (const basis of ["medical", "nonmedical"] as const) {
      const source = form("notice", {
        role: "subject_notice", evidenceKind: null, included: false,
      });
      const requiredKinds = requiredSsaReconsiderationFormKinds(basis);
      const currentAnalysis = analysis({ appealStage: "reconsideration", decisionBasis: basis });
      const separateForms = requiredKinds.map((kind) => form(kind));
      assert.doesNotThrow(
        () => policy.validateDocumentsBeforePacket!([source, ...separateForms], currentAnalysis),
        `${workflowId}: distinct completed forms are valid`,
      );
      for (const reusedKind of requiredKinds) {
        const attachments = separateForms.map((document) =>
          document.evidenceKind === reusedKind ? { ...document, documentId: source.documentId } : document,
        );
        assert.throws(
          () => policy.validateDocumentsBeforePacket!([source, ...attachments], currentAnalysis),
          /denial notice/i,
          `${workflowId}: ${reusedKind} must not be the denial notice PDF`,
        );
      }
    }
  }
});

test("non-medical SSI and SSDI packets require an included clean SSA-561 PDF", () => {
  const nonmedical = analysis({ appealStage: "reconsideration", decisionBasis: "nonmedical" });
  for (const workflowId of ["appeal-ssdi-denial", "appeal-ssi-denial"] as const) {
    const policy = getSsaReconsiderationRuntimePolicy(workflowId)!;
    assert.throws(() => policy.validateDocumentsBeforePacket!([], nonmedical), /SSA-561/, workflowId);
    for (const overrides of [
      { mimeType: "image/jpeg" },
      { mimeType: null },
      { included: false },
      { usable: false },
      { securityStatus: "quarantined" },
    ] as Partial<WorkflowMatterDocument>[]) {
      assert.throws(
        () => policy.validateDocumentsBeforePacket!([form("ssa_561", overrides)], nonmedical),
        /SSA-561/,
        workflowId,
      );
    }
    assert.doesNotThrow(
      () => policy.validateDocumentsBeforePacket!([form("ssa_561")], nonmedical),
      workflowId,
    );
  }
});

test("SSA packet form identity and pre-draft security gates reject misclassified or unsafe evidence", () => {
  const nonmedical = analysis({ appealStage: "reconsideration", decisionBasis: "nonmedical" });
  const medical = analysis({ appealStage: "reconsideration", decisionBasis: "medical" });

  for (const workflowId of ["appeal-ssdi-denial", "appeal-ssi-denial"] as const) {
    const policy = getSsaReconsiderationRuntimePolicy(workflowId)!;
    for (const invalidForm of [
      form("ssa_561", { role: "subject_notice" }),
      form("ssa_561", { evidenceKind: "ssa_827" }),
    ]) {
      assert.throws(
        () => policy.validateDocumentsBeforePacket!([invalidForm], nonmedical),
        /SSA-561/,
        workflowId,
      );
    }

    const medicalForms = [form("ssa_561"), form("ssa_3441"), form("ssa_827")];
    assert.throws(
      () => policy.validateDocumentsBeforePacket!(
        [medicalForms[0], form("ssa_3441", { role: "subject_notice" }), medicalForms[2]],
        medical,
      ),
      /SSA-3441/,
      workflowId,
    );

    const unsafeExtra = form("extra-evidence", { evidenceKind: "other", securityStatus: "quarantined" });
    assert.throws(
      () => policy.validateDocumentsBeforeDraft!([form("ssa_561"), unsafeExtra], nonmedical),
      /security scanning/,
      workflowId,
    );
    assert.doesNotThrow(
      () => policy.validateDocumentsBeforeDraft!([form("ssa_561"), { ...unsafeExtra, included: false }], nonmedical),
      workflowId,
    );
    // The denial notice itself is also untrusted uploaded content. Do not
    // permit drafting from a quarantined or unusable included source notice.
    const unsafeNotice = form("source-notice", {
      role: "subject_notice", evidenceKind: null, securityStatus: "quarantined",
    });
    assert.throws(
      () => policy.validateDocumentsBeforeDraft!([form("ssa_561"), unsafeNotice], nonmedical),
      /security scanning/,
      workflowId,
    );
    assert.throws(
      () => policy.validateDocumentsBeforeDraft!([form("ssa_561"), { ...unsafeNotice, securityStatus: "clean", usable: false }], nonmedical),
      /security scanning/,
      workflowId,
    );
    assert.doesNotThrow(
      () => policy.validateDocumentsBeforeDraft!([form("ssa_561"), { ...unsafeNotice, included: false }], nonmedical),
      workflowId,
    );
  }
});

test("claimant facts are validated per program", () => {
  const ssdi = getSsaReconsiderationRuntimePolicy("appeal-ssdi-denial")!;
  const ssi = getSsaReconsiderationRuntimePolicy("appeal-ssi-denial")!;
  const nonmedical = analysis({ appealStage: "reconsideration", decisionBasis: "nonmedical" });
  const matter = { documents: [form("notice", { role: "subject_notice", evidenceKind: null })] } as never;

  assert.throws(() => ssdi.validateInput({ ...claimant, confirmedReconsideration: false }, nonmedical, matter), /confirm reconsideration/);
  assert.throws(() => ssdi.validateInput(claimant, null, matter), /Analyze the SSDI denial/);
  assert.equal(ssdi.validateInput({ ...claimant, workChanges: "Stopped working." }, nonmedical, matter).workChanges, "Stopped working.");

  assert.throws(() => ssi.validateInput(claimant, nonmedical, matter), /SSI non-medical facts/);
  const saved = ssi.validateInput({ ...claimant, incomeFacts: "No income since May." }, nonmedical, matter);
  assert.equal(saved.incomeFacts, "No income since May.");
  assert.equal("workChanges" in saved, false);
});


test("SSA chat inputs derive the fixed reconsideration mode without requiring a redundant client field", () => {
  const nonmedical = analysis({ appealStage: "reconsideration", decisionBasis: "nonmedical" });
  const currentMatter = { documents: [form("notice", { role: "subject_notice", evidenceKind: null })] } as never;
  for (const workflowId of ["appeal-ssdi-denial", "appeal-ssi-denial"] as const) {
    const artifact = getSsaReconsiderationFactoryArtifact(workflowId);
    assert.ok(artifact);
    const fields = artifact.manifest.steps?.flatMap((step) => step.fields ?? []) ?? [];
    assert.equal(fields.some((field) => field.id === "responseMode"), false, workflowId);
    assert.equal(artifact.runtimePolicy.chatContract?.inputFields.some((field) => field.id === "responseMode"), false, workflowId);

    const input = {
      claimantName: "Pat Doe", claimantAddress: "1 Main St", phone: "555-0100",
      confirmedReconsideration: true, reasonsForDisagreement: "I disagree.",
      ...(workflowId === "appeal-ssi-denial" ? { incomeFacts: "No income." } : {}),
    };
    const policy = artifact.runtimePolicy;
    const saved = policy.validateInput(input, nonmedical, currentMatter);
    assert.equal(saved.responseMode, "reconsideration", workflowId);
    assert.throws(() => policy.validateInput({ ...input, responseMode: "hearing" }, nonmedical, currentMatter), /confirm reconsideration/);
    assert.throws(() => policy.validateInput({ ...input, confirmedReconsideration: false }, nonmedical, currentMatter), /confirm reconsideration/);
  }
});


test("SSA reconsideration refuses a stale notice analysis before drafting or packet approval", () => {
  const medical = analysis({ appealStage: "reconsideration", decisionBasis: "medical" });
  const matchingSource = form("notice", { role: "subject_notice", evidenceKind: null });
  const replacedSource = form("replacement-notice", { role: "subject_notice", evidenceKind: null });
  const caseInput = {} as never;
  for (const workflowId of ["appeal-ssdi-denial", "appeal-ssi-denial"] as const) {
    const policy = getSsaReconsiderationRuntimePolicy(workflowId)!;
    for (const gate of [policy.validateBeforeDraft!, policy.validateBeforePacket!]) {
      assert.ok(gate, `${workflowId} must bind source analysis at both gates`);
      const invoke = (documents: WorkflowMatterDocument[]) => gate({
        matter: { matter: {} as never, documents },
        caseInput,
        analysis: medical,
      });
      assert.doesNotThrow(() => invoke([matchingSource]), workflowId);
      assert.throws(() => invoke([replacedSource]), /source notice.*analy[sz]/i, workflowId);
      assert.throws(() => invoke([]), /source notice.*analy[sz]/i, workflowId);
      // Source notices are analyzed but are not outgoing packet attachments.
      // The runtime attaches subject_notice with included=false by default.
      assert.doesNotThrow(
        () => invoke([{ ...matchingSource, included: false }]),
        workflowId,
      );
      assert.throws(
        () => invoke([matchingSource, replacedSource]),
        /source notice.*analy[sz]/i,
        workflowId,
      );
      assert.throws(
        () => invoke([{ ...matchingSource, securityStatus: "quarantined" }]),
        /security scanning/i,
        workflowId,
      );
    }
  }
});


test("SSDI and SSI reject stale notice analysis when saving claimant facts", () => {
  const nonmedical = analysis({ appealStage: "reconsideration", decisionBasis: "nonmedical" });
  const matching = { documents: [form("notice", { role: "subject_notice", evidenceKind: null })] } as never;
  const replaced = { documents: [form("new-notice", { role: "subject_notice", evidenceKind: null })] } as never;
  const missing = { documents: [] } as never;
  for (const workflowId of ["appeal-ssdi-denial", "appeal-ssi-denial"] as const) {
    const policy = getSsaReconsiderationRuntimePolicy(workflowId)!;
    const input = { ...claimant, ...(workflowId === "appeal-ssi-denial" ? { incomeFacts: "Income stopped." } : {}) };
    assert.doesNotThrow(() => policy.validateInput(input, nonmedical, matching), workflowId);
    assert.throws(() => policy.validateInput(input, nonmedical, replaced), /source notice.*analy[sz]/i, workflowId);
    assert.throws(() => policy.validateInput(input, nonmedical, missing), /source notice.*analy[sz]/i, workflowId);
    assert.doesNotThrow(
      () => policy.validateInput(input, nonmedical, {
        documents: [form("notice", { role: "subject_notice", evidenceKind: null, included: false })],
      } as never),
      workflowId,
    );
    assert.throws(
      () => policy.validateInput(input, nonmedical, {
        documents: [
          form("notice", { role: "subject_notice", evidenceKind: null }),
          form("other-notice", { role: "subject_notice", evidenceKind: null }),
        ],
      } as never),
      /source notice.*analy[sz]/i,
      workflowId,
    );
    assert.throws(
      () => policy.validateInput(input, nonmedical, {
        documents: [form("notice", { role: "subject_notice", evidenceKind: null, securityStatus: "quarantined" })],
      } as never),
      /security scanning/i,
      workflowId,
    );
  }
});


test("SSDI and SSI packet policy rechecks included supplemental evidence after drafting", () => {
  // A document can become quarantined or unusable after the draft was saved.
  // Required SSA forms alone are not the complete outgoing packet: optional
  // included evidence must also be clean at packet review/approval time.
  const medical = analysis({ appealStage: "reconsideration", decisionBasis: "medical" });
  const nonmedical = analysis({ appealStage: "reconsideration", decisionBasis: "nonmedical" });
  for (const workflowId of ["appeal-ssdi-denial", "appeal-ssi-denial"] as const) {
    const policy = getSsaReconsiderationRuntimePolicy(workflowId)!;
    for (const [decision, required] of [
      [medical, [form("ssa_561"), form("ssa_3441"), form("ssa_827")]],
      [nonmedical, [form("ssa_561")]],
    ] as const) {
      const supplemental = form("supporting-record", {
        evidenceKind: "other", position: 10, securityStatus: "quarantined",
      });
      assert.throws(
        () => policy.validateDocumentsBeforePacket!([...required, supplemental], decision),
        /security scanning/i,
        `${workflowId}: a quarantined supplemental PDF cannot be packet-ready`,
      );
      assert.throws(
        () => policy.validateDocumentsBeforePacket!([
          ...required, { ...supplemental, securityStatus: "clean", usable: false },
        ], decision),
        /security scanning/i,
        `${workflowId}: an unusable supplemental PDF cannot be packet-ready`,
      );
      assert.doesNotThrow(
        () => policy.validateDocumentsBeforePacket!([
          ...required, { ...supplemental, included: false },
        ], decision),
        `${workflowId}: excluded historical evidence must not block a packet`,
      );
    }
  }
});

test("SSDI and SSI reject unsupported included supplemental formats before draft and packet assembly", () => {
  const nonmedical = analysis({ appealStage: "reconsideration", decisionBasis: "nonmedical" });
  for (const workflowId of ["appeal-ssdi-denial", "appeal-ssi-denial"] as const) {
    const policy = getSsaReconsiderationRuntimePolicy(workflowId)!;
    const required = form("ssa_561");
    const supplemental = form("supplemental", {
      evidenceKind: "other", mimeType: "application/zip", position: 9,
    });

    assert.throws(
      () => policy.validateDocumentsBeforeDraft!([required, supplemental], nonmedical),
      /supported PDF or image/i,
      `${workflowId}: a clean ZIP must not enter draft evidence`,
    );
    assert.throws(
      () => policy.validateDocumentsBeforePacket!([required, supplemental], nonmedical),
      /supported PDF or image/i,
      `${workflowId}: a clean ZIP must not enter the outgoing packet`,
    );
    assert.doesNotThrow(
      () => policy.validateDocumentsBeforePacket!([required, { ...supplemental, included: false }], nonmedical),
      `${workflowId}: excluded historical uploads are not outgoing evidence`,
    );
    for (const mimeType of ["application/pdf", "image/png", "image/jpeg"]) {
      assert.doesNotThrow(
        () => policy.validateDocumentsBeforePacket!([required, { ...supplemental, mimeType }], nonmedical),
        `${workflowId}: mail-renderable ${mimeType} evidence must remain valid`,
      );
    }
    assert.throws(
      () => policy.validateDocumentsBeforeDraft!([required, { ...supplemental, mimeType: "image/tiff" }], nonmedical),
      /convert TIFF/i,
      `${workflowId}: TIFF supplemental evidence must be converted before drafting an outgoing packet`,
    );
    assert.throws(
      () => policy.validateDocumentsBeforePacket!([required, { ...supplemental, mimeType: "image/tiff" }], nonmedical),
      /convert TIFF/i,
      `${workflowId}: a clean TIFF must not be marked packet-ready when the PDF builder cannot render it`,
    );
    assert.doesNotThrow(
      () => policy.validateDocumentsBeforePacket!([required, { ...supplemental, mimeType: "image/tiff", included: false }], nonmedical),
      `${workflowId}: excluded TIFF evidence must not block outgoing mail`,
    );
  }
});


test("SSDI and SSI reject unsupported clean denial-notice formats even when the notice is not mailed", () => {
  const current = analysis({ appealStage: "reconsideration", decisionBasis: "nonmedical" });
  for (const workflowId of ["appeal-ssdi-denial", "appeal-ssi-denial"] as const) {
    const policy = getSsaReconsiderationRuntimePolicy(workflowId)!;
    const source = form("notice", { role: "subject_notice", evidenceKind: null, included: false });
    const officialForm = form("ssa_561");
    const snapshot = (mimeType: string | null) => ({
      matter: {} as never,
      documents: [{ ...source, mimeType }, officialForm],
    });
    for (const mimeType of ["application/zip", "application/octet-stream", null]) {
      const matter = snapshot(mimeType);
      assert.throws(
        () => policy.validateInput(claimant, current, matter as never),
        /denial notice.*supported PDF or image/i,
        `${workflowId}: unsupported source must not enter claimant fact intake`,
      );
      assert.throws(
        () => policy.validateDocumentsBeforeDraft!(matter.documents, current),
        /denial notice.*supported PDF or image/i,
        `${workflowId}: source excluded from outgoing mail still needs a supported input format`,
      );
      assert.throws(
        () => policy.validateDocumentsBeforePacket!(matter.documents, current),
        /denial notice.*supported PDF or image/i,
        `${workflowId}: unsupported source must not be packet-ready`,
      );
      for (const gate of [policy.validateBeforeDraft!, policy.validateBeforePacket!]) {
        assert.throws(
          () => gate({ matter: matter as never, caseInput: {} as never, analysis: current }),
          /denial notice.*supported PDF or image/i,
          `${workflowId}: unsupported source cannot advance past a runtime gate`,
        );
      }
    }
    for (const mimeType of ["application/pdf", "image/png", "image/jpeg", "image/tiff"]) {
      const matter = snapshot(mimeType);
      assert.doesNotThrow(
        () => policy.validateDocumentsBeforePacket!(matter.documents, current),
        `${workflowId}: manifest-supported source ${mimeType} remains eligible`,
      );
      assert.doesNotThrow(
        () => policy.validateBeforePacket!({ matter: matter as never, caseInput: {} as never, analysis: current }),
        `${workflowId}: manifest-supported source ${mimeType} passes source validation`,
      );
      if (mimeType === "image/tiff") {
        assert.throws(
          () => policy.validateDocumentsBeforePacket!([
            { ...matter.documents[0]!, included: true }, officialForm,
          ], current),
          /convert TIFF/i,
          `${workflowId}: a TIFF notice is valid for analysis but cannot be enclosed in the mailed PDF`,
        );
      }
    }
  }
});

test("SSDI and SSI evidence manifests match the shared physical-mail packet renderer", () => {
  for (const workflowId of ["appeal-ssdi-denial", "appeal-ssi-denial"]) {
    const artifact = getSsaReconsiderationFactoryArtifact(workflowId);
    assert.ok(artifact, `${workflowId}: canonical factory artifact exists`);
    const documents = artifact.manifest.documents ?? [];
    const evidence = documents.find((document) => document.id === "supporting-evidence");
    const source = documents.find((document) => document.role === "primary");
    assert.deepEqual(evidence?.acceptedKinds, ["application/pdf", "image/png", "image/jpeg"]);
    assert.ok(source?.acceptedKinds?.includes("image/tiff"), "TIFF denial notices remain analyzable");
  }
});


test("SSDI and SSI require notice-confirmed destination and explicit packet/mailing authorization contracts", () => {
  for (const workflowId of ["appeal-ssdi-denial", "appeal-ssi-denial"] as const) {
    const artifact = getSsaReconsiderationFactoryArtifact(workflowId);
    assert.ok(artifact, `${workflowId}: canonical factory artifact must exist`);
    const { manifest, runtimePolicy } = artifact;

    const review = manifest.steps?.find((step) => step.id === "review");
    const recipient = review?.fields?.find((field) => field.id === "recipientAddress");
    assert.ok(recipient, `${workflowId}: packet review must collect the SSA destination`);
    assert.equal(recipient.required, true, `${workflowId}: destination cannot be optional`);
    assert.equal(recipient.origin, "extracted_confirmation", `${workflowId}: destination needs source confirmation`);
    assert.match(recipient.hint ?? "", /controlling denial notice|verified SSA instructions/i);

    const connectorRecipient = runtimePolicy.chatContract?.connectorFields.find(
      (field) => field.id === "recipientAddress",
    );
    assert.ok(connectorRecipient, `${workflowId}: chat must request the same destination`);
    assert.equal(connectorRecipient.required, true);
    assert.equal(connectorRecipient.toolName, "preview_packet");
    assert.equal(connectorRecipient.argumentName, "recipient");

    for (const gateId of ["source-document-ready", "facts-confirmed", "exact-packet-review", "mailing-authorization"]) {
      assert.ok(manifest.gates?.some((gate) => gate.id === gateId && gate.required),
        `${workflowId}: manifest must require ${gateId}`);
      assert.ok(runtimePolicy.chatContract?.enforcedGateIds.includes(gateId),
        `${workflowId}: chat must enforce ${gateId}`);
    }
    assert.equal(manifest.gates?.find((gate) => gate.id === "exact-packet-review")?.beforeCapability, "approval");
    assert.equal(manifest.gates?.find((gate) => gate.id === "mailing-authorization")?.beforeCapability, "mailing");
    assert.ok(manifest.steps?.find((step) => step.id === "mail")?.requires?.includes("exact_packet_approved"),
      `${workflowId}: physical mailing cannot precede exact packet approval`);
  }
});
