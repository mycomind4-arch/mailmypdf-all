import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const goldContent = readFileSync(path.join(process.cwd(), "src/lib/workflow-gold-content.ts"), "utf8");

const entryMatches = [...goldContent.matchAll(/"([a-z]+\/[a-z0-9-]+)":\s*\{/g)];
const entryKeys = entryMatches.map(m => m[1]);

test("gold content file exists and has at least 40 entries", () => {
  assert.ok(goldContent.length > 5000, "gold content file must be substantial");
  assert.ok(entryKeys.length >= 40, `Expected at least 40 entries, got ${entryKeys.length}`);
});

test("gold content covers 4 verticals: appeal, dispute, immigration, notice", () => {
  const verticals = new Set(entryKeys.map(k => k.split("/")[0]));
  assert.ok(verticals.has("appeal"), "must have appeal entries");
  assert.ok(verticals.has("dispute"), "must have dispute entries");
  assert.ok(verticals.has("immigration"), "must have immigration entries");
  assert.ok(verticals.has("notice"), "must have notice entries");
  assert.ok(verticals.size >= 4, `Expected at least 4 verticals, got ${verticals.size}`);
});

test("appeal/denied-claim entry is preserved with NAIC sources", () => {
  assert.ok(entryKeys.includes("appeal/denied-claim"));
  assert.match(goldContent, /NAIC/);
});

test("SSDI and SSI entries reference SSA", () => {
  for (const key of ["appeal/ssdi-denial", "appeal/ssi-denial"]) {
    assert.ok(entryKeys.includes(key), `${key} must exist`);
  }
  const ssaRefs = (goldContent.match(/ssa\.gov/g) || []).length;
  assert.ok(ssaRefs >= 3, `Expected at least 3 ssa.gov references, got ${ssaRefs}`);
});

test("medical insurance entries reference CMS or Medicare.gov", () => {
  for (const key of ["appeal/medical-insurance-denial", "appeal/medical-necessity-appeal", "appeal/prior-authorization-denial"]) {
    assert.ok(entryKeys.includes(key));
  }
  assert.match(goldContent, /cms\.gov/);
  assert.match(goldContent, /medicare\.gov/);
});

test("out-of-network denial references No Surprises Act", () => {
  assert.ok(entryKeys.includes("appeal/out-of-network-denial"));
  assert.match(goldContent, /nosurprises/);
});

test("dispute entries reference CFPB and FTC", () => {
  assert.match(goldContent, /consumerfinance\.gov/);
  assert.match(goldContent, /ftc\.gov/);
});

test("debt validation references FDCPA Regulation F", () => {
  assert.ok(entryKeys.includes("dispute/debt-validation"));
  assert.match(goldContent, /1006\.34/);
});

test("cease-contact references FDCPA Section 805", () => {
  assert.ok(entryKeys.includes("dispute/cease-contact"));
  assert.match(goldContent, /1006\.6/);
});

test("credit card billing references FCBA", () => {
  assert.ok(entryKeys.includes("dispute/credit-card-billing"));
  assert.match(goldContent, /1026\.13/);
});

test("unauthorized charge references EFTA Regulation E", () => {
  assert.ok(entryKeys.includes("dispute/unauthorized-charge"));
  assert.match(goldContent, /1005\.11/);
});

test("medical collections references CFPB medical debt rule", () => {
  assert.ok(entryKeys.includes("dispute/medical-collections"));
  assert.match(goldContent, /medical-bills-from-credit-reports/);
});

test("student loan references FSA Ombudsman", () => {
  assert.ok(entryKeys.includes("dispute/student-loan"));
  assert.match(goldContent, /feedback-ombudsman/);
});

test("immigration entries reference USCIS", () => {
  for (const key of ["immigration/respond-to-notice", "immigration/supporting-documents"]) {
    assert.ok(entryKeys.includes(key));
  }
  assert.match(goldContent, /uscis\.gov/);
});

test("IRS notice references IRS.gov", () => {
  assert.ok(entryKeys.includes("notice/irs-notice"));
  assert.match(goldContent, /irs\.gov/);
});

test("CP2000 response entry exists", () => {
  assert.ok(entryKeys.includes("notice/cp2000-response"));
  assert.match(goldContent, /CP2000/);
});

test("court summons references US Courts", () => {
  assert.ok(entryKeys.includes("notice/court-summons"));
  assert.match(goldContent, /uscourts\.gov/);
});

test("EDD denial references California EDD", () => {
  assert.ok(entryKeys.includes("appeal/edd-denial"));
  assert.match(goldContent, /edd\.ca\.gov/);
});

test("financial aid entries reference Federal Student Aid", () => {
  for (const key of ["appeal/financial-aid-appeal", "appeal/fafsa-appeal"]) {
    assert.ok(entryKeys.includes(key));
  }
  assert.match(goldContent, /studentaid\.gov/);
});

test("drivers license suspension references DMV", () => {
  assert.ok(entryKeys.includes("appeal/drivers-license-suspension"));
  assert.match(goldContent, /dmv\.ca\.gov/);
});

test("every entry has all required fields", () => {
  for (const key of entryKeys) {
    const blockRegex = new RegExp(`"${key}":\\s*\\{([\\s\\S]*?)\\n\\s*\\},`);
    const blockMatch = goldContent.match(blockRegex);
    assert.ok(blockMatch, `${key}: entry block not found`);
    const block = blockMatch[1];
    assert.match(block, /overview:/, `${key}: missing overview`);
    assert.match(block, /whenToUse:/, `${key}: missing whenToUse`);
    assert.match(block, /whenNotToUse:/, `${key}: missing whenNotToUse`);
    assert.match(block, /officialSources:/, `${key}: missing officialSources`);
    assert.match(block, /checklist:/, `${key}: missing checklist`);
    assert.match(block, /faq:/, `${key}: missing faq`);
    assert.match(block, /authorityNote:/, `${key}: missing authorityNote`);
  }
});

test("all official source URLs use https", () => {
  const urlMatches = [...goldContent.matchAll(/url:\s*"(https:\/\/[^"]+)"/g)];
  assert.ok(urlMatches.length >= 20, `Expected at least 20 source URLs, got ${urlMatches.length}`);
  for (const m of urlMatches) {
    assert.ok(m[1].startsWith("https://"), `URL must be https: ${m[1]}`);
  }
});

test("REVIEWED constant is defined as ISO date", () => {
  assert.match(goldContent, /const REVIEWED\s*=\s*"\d{4}-\d{2}-\d{2}"/, "REVIEWED constant must be defined with ISO date");
  const reviewedAtUses = (goldContent.match(/reviewedAt:\s*REVIEWED/g) || []).length;
  assert.ok(reviewedAtUses >= 20, `Expected at least 20 reviewedAt: REVIEWED uses, got ${reviewedAtUses}`);
});

test("no entry states a hard universal deadline in the overview", () => {
  const hardDeadlines = [...goldContent.matchAll(/overview:.*?must be filed within \d+ days/g)];
  assert.equal(hardDeadlines.length, 0, "No overview should state hard deadline as universal fact");
});

test("Dispute Mail vertical has at least 15 entries", () => {
  const disputeEntries = entryKeys.filter(k => k.startsWith("dispute/"));
  assert.ok(disputeEntries.length >= 15, `Expected at least 15 dispute entries, got ${disputeEntries.length}`);
});

test("Appeal Mail vertical has at least 15 entries", () => {
  const appealEntries = entryKeys.filter(k => k.startsWith("appeal/"));
  assert.ok(appealEntries.length >= 15, `Expected at least 15 appeal entries, got ${appealEntries.length}`);
});
