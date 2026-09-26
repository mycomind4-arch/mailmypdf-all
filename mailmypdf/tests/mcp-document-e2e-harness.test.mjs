import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root=path.resolve(import.meta.dirname,"..");
const source=fs.readFileSync(path.join(root,"scripts/mcp-document-e2e.mjs"),"utf8");

test("document E2E harness requires explicit write opt-in",()=>{
  assert.match(source,/MCP_E2E_ALLOW_WRITES/);
  assert.match(source,/Refusing to create test data/);
});

test("document E2E harness has a separate production interlock",()=>{
  assert.match(source,/https:\/\/mailmypdf\.ai/);
  assert.match(source,/MCP_E2E_ALLOW_PRODUCTION/);
  assert.match(source,/Refusing to write test data to production/);
});

test("document E2E harness stops before consequential money or mailing tools",()=>{
  for(const forbidden of [
    '"approve_packet"',
    '"prepare_checkout"',
    '"submit_mail_order"',
    '"charge_card"',
  ]){
    assert.equal(source.includes(forbidden),false,`harness must not call ${forbidden}`);
  }

  for(const required of [
    '"get_workflow"',
    '"create_matter"',
    '"ingest_document"',
    '"get_document_status"',
    '"analyze_matter"',
  ]){
    assert.equal(source.includes(required),true,`harness should call ${required}`);
  }
});
