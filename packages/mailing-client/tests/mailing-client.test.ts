import assert from "node:assert/strict";
import test from "node:test";
import { createCommunication, getCommunication, MailMyPDFPlatformError } from "../src/index.ts";

test("communication submission requires an idempotency key before network access", async () => {
  await assert.rejects(()=>createCommunication({
    document_id:"d1",recipient:{name:"A",address_line1:"1 Main",city:"Town",state:"CA",postal_code:"95501"},
    mail_type:"certified",matter_reference:"m1",matter_type:"test",idempotency_key:"",
  }), (error:any)=>error instanceof MailMyPDFPlatformError && error.code==="MISSING_IDEMPOTENCY_KEY");
});

test("mailing client rejects successful HTTP responses with missing provider ids", async () => {
  process.env.MAILMYPDF_API_URL="https://example.test";
  process.env.MAILMYPDF_API_KEY="test-key";
  const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({status:"submitted"}),{status:200,headers:{"content-type":"application/json"}});
  try {
    await assert.rejects(()=>getCommunication("comm-1"),/invalid communication response/);
  } finally {
    globalThis.fetch=original;
  }
});
