import assert from "node:assert/strict";
import test from "node:test";
import { createCustodyEvent, createMatterArchiveManifest, createVerifiedMatterArchiveManifest, createVerifiableProofBundle, hashDocumentBytes, hashRecord, verifyCustodyChain, verifyMatterArchiveManifest, verifyProofBundle, verifyRecordChain, verifyVerifiedMatterArchiveManifest } from "../src/index.ts";

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


test("strict archive hash covers every retained artifact hash", () => {
  const archive = createVerifiedMatterArchiveManifest({
    matterId: "m1",
    workflowId: "cp2000-response",
    finalDocumentSha256: "d".repeat(64),
    proofBundleSha256: "e".repeat(64),
    artifacts: [
      { id: "packet", kind: "document", sha256: "a".repeat(64), sizeBytes: 1024 },
      { id: "receipt", kind: "receipt", sha256: "b".repeat(64), sizeBytes: 128 },
    ],
    completedAt: "2026-09-16T00:00:00Z",
    createdAt: "2026-09-16T00:00:01Z",
  });

  assert.equal(verifyVerifiedMatterArchiveManifest(archive), true);
  assert.equal(
    verifyVerifiedMatterArchiveManifest({
      ...archive,
      artifacts: archive.artifacts.map((artifact) =>
        artifact.id === "packet"
          ? { ...artifact, sha256: "c".repeat(64) }
          : artifact,
      ),
    }),
    false,
  );
});

test("strict archive rejects duplicate artifact ids with conflicting hashes", () => {
  assert.throws(() =>
    createVerifiedMatterArchiveManifest({
      matterId: "m1",
      workflowId: "cp2000-response",
      finalDocumentSha256: "d".repeat(64),
      artifacts: [
        { id: "packet", kind: "document", sha256: "a".repeat(64) },
        { id: "packet", kind: "document", sha256: "b".repeat(64) },
      ],
      completedAt: "2026-09-16T00:00:00Z",
      createdAt: "2026-09-16T00:00:01Z",
    }),
    /conflicting metadata/,
  );
});


test("raw document-byte hashing matches the SHA-256 test vector", async () => {
  const digest = await hashDocumentBytes(new TextEncoder().encode("abc"));
  assert.equal(
    digest,
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("generic record chain detects content and linkage tampering", () => {
  const firstContent = { type: "created", subjectId: "matter-1" };
  const firstHash = hashRecord(firstContent);
  const secondContent = { type: "reviewed", subjectId: "matter-1" };
  const secondHash = hashRecord(secondContent);

  const chain = [
    { recordSha256: firstHash, priorRecordHash: null, content: firstContent },
    { recordSha256: secondHash, priorRecordHash: firstHash, content: secondContent },
  ];

  assert.deepEqual(verifyRecordChain(chain), { valid: true, brokenAt: null });
  assert.deepEqual(
    verifyRecordChain([
      chain[0]!,
      { ...chain[1]!, content: { ...secondContent, subjectId: "tampered" } },
    ]),
    { valid: false, brokenAt: 1 },
  );
  assert.deepEqual(
    verifyRecordChain([
      chain[0]!,
      { ...chain[1]!, priorRecordHash: "f".repeat(64) },
    ]),
    { valid: false, brokenAt: 1 },
  );
});
