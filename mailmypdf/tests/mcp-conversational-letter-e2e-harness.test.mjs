import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root=path.resolve(import.meta.dirname,"..");
const source=fs.readFileSync(path.join(root,"scripts/mcp-conversational-letter-e2e.mjs"),"utf8");

test("conversational-letter E2E requires explicit write and production opt-ins",()=>{
  assert.match(source,/MCP_E2E_ALLOW_WRITES/);
  assert.match(source,/Refusing to create test data/);
  assert.match(source,/MCP_E2E_ALLOW_PRODUCTION/);
  assert.match(source,/Refusing to write test data to production/);
});

test("conversational-letter E2E gates postal review and approval separately",()=>{
  assert.match(source,/MCP_E2E_ALLOW_ADDRESS_REVIEW/);
  assert.match(source,/MCP_E2E_ALLOW_APPROVAL/);
  assert.match(source,/requires MCP_E2E_ALLOW_ADDRESS_REVIEW=true/);
});

test("conversational-letter E2E exercises resume and exact PDF review",()=>{
  for(const required of [
    '"prepare_conversational_letter"',
    '"get_mailing_context"',
    '"get_order_status"',
    '"review_direct_pdf_mail"',
    '"resources/read"',
  ]){
    assert.equal(source.includes(required),true,`harness should call ${required}`);
  }
});

test("conversational-letter E2E never creates checkout, charges, or submits mail",()=>{
  for(const forbidden of [
    'callTool("prepare_direct_pdf_checkout"',
    'callTool("prepare_checkout"',
    'callTool("submit_mail_order"',
    'callTool("charge_card"',
  ]){
    assert.equal(source.includes(forbidden),false,`harness must not execute ${forbidden}`);
  }
  assert.match(source,/stops before prepare_direct_pdf_checkout/);
});
