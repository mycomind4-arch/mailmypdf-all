import assert from "node:assert/strict";
import test from "node:test";
import {
  findUnresolvedPlaceholders,
  unresolvedPlaceholderMessage,
} from "../src/draft-placeholders.js";

const clean = `Dear Sir/Madam,

Re: Notice CP14, tax period 2023

I received the notice dated March 3, 2026 and enclose the payment confirmation
described above. Please review the account and update the balance.

Sincerely,
Jane Doe`;

test("a fully filled draft has no placeholders", () => {
  assert.deepEqual(findUnresolvedPlaceholders(clean), []);
  assert.equal(unresolvedPlaceholderMessage(clean), null);
});

test("catches the signature placeholder that was once treated as a signature", () => {
  const draft = `${clean.replace("Jane Doe", "[Your Name]")}`;
  assert.deepEqual(findUnresolvedPlaceholders(draft), ["[Your Name]"]);
  assert.match(unresolvedPlaceholderMessage(draft) ?? "", /\[Your Name\]/);
});

test("catches all-caps template slots and reports each one once", () => {
  const draft = "Re: [NOTICE NUMBER]\n\n[DATE]\n\nSincerely,\n[YOUR NAME]\n[DATE]";
  assert.deepEqual(findUnresolvedPlaceholders(draft), [
    "[NOTICE NUMBER]",
    "[DATE]",
    "[YOUR NAME]",
  ]);
});

test("does not flag ordinary bracketed prose a customer may write", () => {
  const draft = `${clean}

P.S. The enclosed transcript [see page 2] shows the payment posted on time.`;
  assert.deepEqual(findUnresolvedPlaceholders(draft), []);
});
