import test from "node:test";
import assert from "node:assert/strict";
import { countArrayElements } from "./roles";

/**
 * The SEO gate used to test `field: [` with a regex, which an empty array
 * satisfies — so a config declaring `faqs: []` reported "faqs is populated"
 * and the page shipped with an empty FAQ section. These cover the shapes that
 * distinguish a real count from that check.
 */

test("an empty array counts as zero rather than reading as populated", () => {
  assert.equal(countArrayElements("faqs: []", "faqs"), 0);
  assert.equal(countArrayElements("faqs: [\n  \n]", "faqs"), 0);
});

test("a missing field is distinguishable from an empty one", () => {
  assert.equal(countArrayElements("outputs: []", "faqs"), null);
});

test("trailing commas do not add a phantom element", () => {
  assert.equal(countArrayElements('whatYouDo: ["a", "b", "c",]', "whatYouDo"), 3);
  assert.equal(countArrayElements('whatYouDo: ["a", "b", "c"]', "whatYouDo"), 3);
});

test("commas inside strings and nested objects do not inflate the count", () => {
  const source = `faqs: [
    { question: "Do I need a title, a bill of sale, or both?", answer: "Either, plus payment proof." },
    { question: "What if the seller vanished?", answer: "Record it as unknown, not as a guess." },
  ]`;
  assert.equal(countArrayElements(source, "faqs"), 2);
});

test("nested arrays are counted as one element, not flattened", () => {
  assert.equal(countArrayElements("workflowSteps: [[1, 2, 3], [4, 5]]", "workflowSteps"), 2);
});

test("commented-out entries are not counted", () => {
  const source = `readyItems: [
    "real entry",
    // "commented out entry",
    /* "block commented entry", */
  ]`;
  assert.equal(countArrayElements(source, "readyItems"), 1);
});

test("a field name that is a suffix of another does not match it", () => {
  assert.equal(countArrayElements('relatedFaqs: ["a", "b"]', "faqs"), null);
});
