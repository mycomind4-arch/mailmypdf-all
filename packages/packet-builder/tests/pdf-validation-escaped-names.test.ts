import assert from "node:assert/strict";
import test from "node:test";
import { findUnsafePdfFeature } from "../src/pdf-validation.ts";

// PDF name objects permit #xx hex escapes. A raw substring scan misses
// active-content names such as /Java#53cript even though a PDF reader sees
// /JavaScript. These files must not enter the debt-validation notice vault
// or any other outgoing/evidence PDF path.
const sample = (name: string) =>
  new TextEncoder().encode("%PDF-1.7\n1 0 obj\n<< " + name + " 2 0 R >>\nendobj\n%%EOF");

test("PDF safety scan rejects hex-escaped active-content dictionary names", () => {
  const cases = [
    ["/Java#53cript", "ActiveContent.JavaScript"],
    ["/Open#41ction", "ActiveContent.OpenAction"],
    ["/Embe#64dedFile", "ActiveContent.EmbeddedFile"],
    ["/Laun#63h", "ActiveContent.Launch"],
    ["/GoTo#45", "ActiveContent.GoToE"],
  ] as const;
  for (const [name, expected] of cases) {
    assert.equal(findUnsafePdfFeature(sample(name)), expected, name);
  }
});

test("PDF safety scan rejects escaped encryption but not harmless similar names", () => {
  assert.equal(findUnsafePdfFeature(sample("/Encr#79pt")), "Encrypted");
  assert.equal(findUnsafePdfFeature(sample("/Java#53cripture")), null);
  assert.equal(findUnsafePdfFeature(sample("/UnrelatedName")), null);
});
