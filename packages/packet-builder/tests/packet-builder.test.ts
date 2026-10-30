import assert from "node:assert/strict";
import test from "node:test";
import { PDFDocument } from "pdf-lib";
import { assemblePacket, generateLetterPdf, generatePlainTextPdf } from "../src/index.ts";

test("letter PDF safely paginates wrapped text and smart punctuation", async () => {
  const body=("This is a long line with “smart quotes” and an em dash — repeated many times. ".repeat(500)) + "\n" + "X".repeat(1000);
  const bytes=await generateLetterPdf({
    letterText:body,senderName:"Sender",senderLine1:"1 Main St",senderCity:"Town",senderState:"CA",senderPostal:"95501",
    recipientName:"Recipient",recipientLine1:"2 Main St",recipientCity:"City",recipientState:"CA",recipientPostal:"95502",
  });
  const pdf=await PDFDocument.load(bytes);
  assert.ok(pdf.getPageCount()>1);
});

test("packet assembly rejects attachment bytes that do not match the intake hash", async () => {
  const response=await generateLetterPdf({
    letterText:"Hello",senderName:"Sender",senderLine1:"1 Main St",senderCity:"Town",senderState:"CA",senderPostal:"95501",
    recipientName:"Recipient",recipientLine1:"2 Main St",recipientCity:"City",recipientState:"CA",recipientPostal:"95502",
  });
  await assert.rejects(()=>assemblePacket(response,[{
    document_id:"d1",role:"evidence",evidence_kind:null,page_count:null,position:0,
    sha256:"0".repeat(64),storage_path:"x",safe_filename:"evidence.pdf",mime_type:"application/pdf",
  }],async()=>response),/integrity check/);
});

test("plain-text review PDF has deterministic bytes and metadata for later exact-document comparison", async () => {
  const text = "Synthetic IRS response\\n\\nPlease review the enclosed evidence.".replaceAll("\\n", "\n");
  const first = await generatePlainTextPdf(text);
  const second = await generatePlainTextPdf(text);
  assert.deepEqual(first, second, "unchanged review text must produce identical PDF bytes");
  const pdf = await PDFDocument.load(first, { updateMetadata: false });
  assert.equal(pdf.getCreationDate()?.getTime(), 0, "creation date must not depend on preview time");
  assert.equal(pdf.getModificationDate()?.getTime(), 0, "modification date must not depend on approval time");
  assert.equal(pdf.getPageCount(), 1);
});
