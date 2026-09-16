import assert from "node:assert/strict";
import test from "node:test";
import { createCustodyEvent, createMatterArchiveManifest, createVerifiableProofBundle, verifyCustodyChain, verifyMatterArchiveManifest, verifyProofBundle } from "../src/index.ts";

test("custody chain detects metadata tampering", () => {
  const first=createCustodyEvent({priorEventHash:null,timestamp:"2026-09-16T00:00:00Z",eventType:"created",description:"Created",metadata:{document:"abc"}});
  const second=createCustodyEvent({priorEventHash:first.eventHash,timestamp:"2026-09-16T01:00:00Z",eventType:"mailed",description:"Mailed",metadata:{tracking:"T1"}});
  assert.equal(verifyCustodyChain([first,second]).valid,true);
  const tampered={...second,metadata:{tracking:"T2"}};
  assert.deepEqual(verifyCustodyChain([first,tampered]),{valid:false,brokenAt:1});
});

test("proof bundle hash covers the entire custody chain and delivery metadata", () => {
  const event=createCustodyEvent({priorEventHash:null,timestamp:"2026-09-16T00:00:00Z",eventType:"mailed",description:"Mailed"});
  const bundle=createVerifiableProofBundle({
    subjectId:"matter-1",documentSha256:"a".repeat(64),mailingId:"lob-1",trackingNumber:"TRACK-1",
    sentAt:"2026-09-16T00:00:00Z",custodyChain:[event],metadata:{mailClass:"certified"},
  });
  assert.equal(verifyProofBundle(bundle),true);
  assert.equal(verifyProofBundle({...bundle,trackingNumber:"TRACK-CHANGED"}),false);
});


test("matter archive manifest detects post-completion mutation", () => {
  const archive=createMatterArchiveManifest({
    matterId:"m1",workflowId:"cp2000-response",finalDocumentSha256:"b".repeat(64),
    artifactIds:["receipt","packet","packet"],proofBundleSha256:"c".repeat(64),
    completedAt:"2026-09-16T00:00:00Z",createdAt:"2026-09-16T00:00:01Z",
  });
  assert.deepEqual(archive.artifactIds,["packet","receipt"]);
  assert.equal(verifyMatterArchiveManifest(archive),true);
  assert.equal(verifyMatterArchiveManifest({...archive,artifactIds:["other"]}),false);
});
