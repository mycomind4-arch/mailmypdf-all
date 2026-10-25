import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root=path.resolve(import.meta.dirname,"..");
const source=fs.readFileSync(path.join(root,"scripts/mcp-order-resume-e2e.mjs"),"utf8");

test("resume verifier is read-only and calls only get_order_status",()=>{
  assert.match(source,/callTool\("get_order_status"/);
  for(const forbidden of [
    'callTool("prepare_conversational_letter"',
    'callTool("review_direct_pdf_mail"',
    'callTool("approve_direct_pdf_mail"',
    'callTool("prepare_direct_pdf_checkout"',
    'callTool("schedule_direct_pdf_mail"',
    'callTool("prepare_checkout"',
    'callTool("submit_mail_order"',
    'callTool("charge_card"',
  ]){
    assert.equal(source.includes(forbidden),false,`resume verifier must not execute ${forbidden}`);
  }
});

test("resume verifier checks lifecycle stage and provider reference",()=>{
  assert.match(source,/MCP_E2E_EXPECT_STAGE/);
  for(const stage of ["draft","paid","submitted","mailed","delivered"]){
    assert.equal(source.includes(stage),true,`resume verifier should understand ${stage}`);
  }
  assert.match(source,/providerReference/);
  assert.match(source,/conversational_letter/);
});
