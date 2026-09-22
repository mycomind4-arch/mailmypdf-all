import assert from "node:assert/strict";
import test from "node:test";
import { validateLetterDraft } from "../src/draft-validator.js";

const longBody =
  "The supporting documents explain the issue and provide the information needed for review. ".repeat(14);

test("shared draft validator passes a grounded well-formed letter", () => {
  const draft = `Dear Sir/Madam,

Re: Claim #CLM-12345

I am writing about the decision dated 2026-01-15. The response deadline is 2026-03-15.
The amount at issue is $5,000.

${longBody}

Sincerely,
John Doe`;

  const result = validateLetterDraft(draft, {
    referenceNumber: "CLM-12345",
    decisionDate: "2026-01-15",
    deadline: "2026-03-15",
    amount: "$5,000",
  });

  assert.equal(result.passed, true);
  assert.equal(result.errors, 0);
  assert.equal(result.blocks, 0);
});

test("shared draft validator blocks placeholders and forbidden phrases", () => {
  const draft = `Dear Sir/Madam,

Re: Test

[your name here]
This guarantees approval.
${longBody}

Sincerely,
Test`;

  const result = validateLetterDraft(
    draft,
    {},
    { forbiddenPhrases: ["guarantees approval"] },
  );

  assert.equal(result.passed, false);
  assert.ok(result.blocks > 0);
  assert.ok(
    result.findings.some(
      (finding) => finding.check === "unresolved_placeholders" && !finding.passed,
    ),
  );
});

test("minimum word requirement is policy-controlled", () => {
  const result = validateLetterDraft(
    "Dear recipient. Re: Test. Sincerely, Sender.",
    {},
    { minimumWords: 5 },
  );
  assert.equal(
    result.findings.find((finding) => finding.check === "minimum_length")?.passed,
    true,
  );
});

test("insurance appeal validation flags legal-advice language", async () => {
  const { validateAppealDraft } = await import("../src/draft-validator.js");
  const { insuranceValidationPack } = await import("../src/domain-packs/appeal/insurance-packs.js");
  const draft = "Re: Claim 12345\nDear Claims Review,\nI appeal this denial. If it is not reversed, you should sue the plan.\nSincerely,\nA. Member";
  const result = validateAppealDraft(draft, {}, [], [], insuranceValidationPack);
  assert.ok(result.findings.some((finding) => finding.check === "prohibited_claim:legal advice" && !finding.passed));
});
