import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { parseJsonResponse, AiGatewayError } from "../src/lib/secure-core/ai-gateway.server";

/* ═══════════════════════════════════════════════════════════
   Model response parsing

   A model can wrap JSON in prose or a code fence, and it can
   return something unusable. None of that should surface to a
   caller as a 500, and none of it should produce a half-parsed
   analysis that later gets stored as fact.
   ═══════════════════════════════════════════════════════════ */

describe("parseJsonResponse", () => {
  test("reads a bare JSON object", () => {
    assert.deepEqual(parseJsonResponse('{"decision":"denied","confidence":"high"}'), {
      decision: "denied",
      confidence: "high",
    });
  });

  test("reads JSON out of a fenced block", () => {
    const text = 'Here is the analysis:\n```json\n{"decision":"denied"}\n```\nHope that helps.';
    assert.deepEqual(parseJsonResponse(text), { decision: "denied" });
  });

  test("reads JSON out of an unlabelled fence", () => {
    assert.deepEqual(parseJsonResponse('```\n{"deadline":null}\n```'), { deadline: null });
  });

  test("reads JSON surrounded by prose", () => {
    assert.deepEqual(
      parseJsonResponse('I reviewed the notice. {"issuer":"SSA"} That is my conclusion.'),
      { issuer: "SSA" },
    );
  });

  test("preserves nested structure", () => {
    const parsed = parseJsonResponse<{ reasons: string[]; nested: { a: number } }>(
      '{"reasons":["one","two"],"nested":{"a":1}}',
    );
    assert.deepEqual(parsed.reasons, ["one", "two"]);
    assert.equal(parsed.nested.a, 1);
  });

  test("refuses a response with no object rather than returning something half-formed", () => {
    assert.throws(() => parseJsonResponse("I could not read the document."), AiGatewayError);
    assert.throws(() => parseJsonResponse(""), AiGatewayError);
  });

  test("refuses malformed JSON rather than guessing at it", () => {
    assert.throws(() => parseJsonResponse('{"decision": "denied"'), AiGatewayError);
    assert.throws(() => parseJsonResponse('{decision: denied}'), AiGatewayError);
  });
});
