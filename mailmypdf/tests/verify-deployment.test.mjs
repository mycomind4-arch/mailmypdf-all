import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root=path.resolve(import.meta.dirname,"..");
const source=fs.readFileSync(path.join(root,"scripts/verify-deployment.mjs"),"utf8");

test("deployment verification checks the MCP endpoint and OAuth metadata",()=>{
  assert.match(source,/\/\.well-known\/oauth-protected-resource/);
  assert.match(source,/server\/discover/);
  assert.match(source,/tools\/list/);
  assert.match(source,/mcp-protocol-version/);
  assert.match(source,/2026-07-28/);
});

test("deployment verification requires conversational-mail connector tools",()=>{
  for(const tool of [
    "prepare_conversational_letter",
    "get_mailing_context",
    "review_direct_pdf_mail",
    "approve_direct_pdf_mail",
    "prepare_direct_pdf_checkout",
    "get_order_status",
  ]){
    assert.ok(source.includes(`"${tool}"`),`deployment verifier should require ${tool}`);
  }
});

test("deployment verification supports exact OpenAI challenge validation",()=>{
  assert.match(source,/OPENAI_CHALLENGE_EXPECTED_TOKEN/);
  assert.match(source,/\.well-known\/openai-apps-challenge/);
  assert.match(source,/returned token does not match/);
});

test("deployment verification remains read-only",()=>{
  assert.doesNotMatch(source,/prepare_conversational_letter",\s*\{/);
  assert.doesNotMatch(source,/approve_direct_pdf_mail",\s*\{/);
  assert.doesNotMatch(source,/prepare_direct_pdf_checkout",\s*\{/);
  assert.doesNotMatch(source,/submit_mail_order/);
  assert.doesNotMatch(source,/charge_card/);
});
