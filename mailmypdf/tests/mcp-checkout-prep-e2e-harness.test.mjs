import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root=path.resolve(import.meta.dirname,"..");
const source=fs.readFileSync(path.join(root,"scripts/mcp-checkout-prep-e2e.mjs"),"utf8");

test("checkout-prep E2E requires separate write and checkout opt-ins",()=>{
  assert.match(source,/MCP_E2E_ALLOW_WRITES/);
  assert.match(source,/MCP_E2E_ALLOW_CHECKOUT_PREP/);
  assert.match(source,/Refusing to create a Stripe checkout session/);
});

test("checkout-prep E2E refuses the production MailMyPDF origin",()=>{
  assert.match(source,/baseUrl==="https:\/\/mailmypdf\.ai"/);
  assert.match(source,/staging\/local only/);
  assert.equal(source.includes("MCP_E2E_ALLOW_PRODUCTION"),false);
});

test("checkout-prep E2E requires Stripe test mode and stops before payment or mailing",()=>{
  assert.match(source,/checkoutUrl\.includes\("cs_test_"\)/);
  assert.match(source,/Stripe TEST checkout session created/);

  for(const forbidden of [
    '"submit_mail_order"',
    '"charge_card"',
    '"complete_checkout"',
    '"pay_order"',
    "window.open(",
    "openExternal(",
  ]){
    assert.equal(source.includes(forbidden),false,`harness must not contain ${forbidden}`);
  }

  for(const required of [
    '"create_matter"',
    '"ingest_document"',
    '"get_document_status"',
    '"analyze_matter"',
    '"save_matter_input"',
    '"generate_draft"',
    '"save_draft"',
    '"preview_packet"',
    '"approve_packet"',
    '"prepare_checkout"',
  ]){
    assert.equal(source.includes(required),true,`harness should call ${required}`);
  }
});

test("checkout-prep E2E requires explicit sender and recipient test addresses",()=>{
  assert.match(source,/MCP_TEST_RECIPIENT_JSON/);
  assert.match(source,/MCP_TEST_SENDER_JSON/);
  assert.match(source,/TEST DATA - NOT FOR DELIVERY/);
  assert.match(source,/Do not mail/);
});
