import assert from "node:assert/strict";
import test from "node:test";
import { normalizeMailMyPDFStatus, preflightPostalAddress, verifyAddressForMailing } from "../src/index.js";

test("canonical mailing status preserves returned and refusal outcomes", () => {
  assert.equal(normalizeMailMyPDFStatus("printed"),"provider_processing");
  assert.equal(normalizeMailMyPDFStatus("returned_to_sender"),"returned");
  assert.equal(normalizeMailMyPDFStatus("undelivered"),"undeliverable");
  assert.equal(normalizeMailMyPDFStatus("refused"),"refused");
  assert.throws(()=>normalizeMailMyPDFStatus("mystery"));
});

test("address preflight fails missing required fields without calling provider", async () => {
  let calls=0;
  const address={name:"IRS",line1:"",city:"Fresno",state:"CA",postal:"93727"};
  const preflight=preflightPostalAddress(address);
  assert.equal(preflight.valid,false);
  const result=await verifyAddressForMailing(address,{name:"lob",async verify(){calls+=1;throw new Error("should not call");}});
  assert.equal(result.isDeliverable,false);
  assert.equal(calls,0);
});
