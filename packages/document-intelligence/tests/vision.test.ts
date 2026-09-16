import assert from "node:assert/strict";
import test from "node:test";
import { analyzeVisualDocument } from "../src/vision.js";

async function sha256(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, "0")).join("");
}

test("visual analysis verifies source bytes and returns source provenance", async () => {
  const bytes = new TextEncoder().encode("%PDF-1.4 example");
  const hash = await sha256(bytes);
  const result = await analyzeVisualDocument(
    { documentId:"doc-1",fileName:"CP2000.pdf",mimeType:"application/pdf",bytes,sha256:hash,securityStatus:"clean" },
    { purpose:"notice_analysis",instruction:"Extract the notice fields",outputSchema:"object",promptVersion:"v1" },
    { async analyze() { return { output:{ notice:"CP2000" },provider:"anthropic",model:"claude",confidence:0.98 }; } },
    (value): value is {notice:string} => typeof value === "object" && value !== null && typeof (value as any).notice === "string",
  );
  assert.equal(result.source.documentId, "doc-1");
  assert.equal(result.source.sha256, hash);
  assert.equal(result.output.notice, "CP2000");
});

test("visual analysis refuses swapped bytes before invoking provider", async () => {
  const bytes = new TextEncoder().encode("image bytes");
  let called=false;
  await assert.rejects(() => analyzeVisualDocument(
    { documentId:"doc-1",fileName:"scan.jpg",mimeType:"image/jpeg",bytes,sha256:"0".repeat(64),securityStatus:"clean" },
    { purpose:"image_analysis",instruction:"Read it",outputSchema:"object",promptVersion:"v1" },
    { async analyze() { called=true; return { output:{},provider:"anthropic",model:"claude",confidence:1 }; } },
    (_): _ is Record<string,unknown> => true,
  ), /SHA-256/);
  assert.equal(called,false);
});


test("vision analysis enforces timeout and provider policy", async () => {
  const bytes = new TextEncoder().encode("%PDF-1.4 example");
  const hash = await sha256(bytes);
  await assert.rejects(
    () => analyzeVisualDocument(
      { documentId:"doc-2",fileName:"notice.pdf",mimeType:"application/pdf",bytes,sha256:hash,securityStatus:"clean" },
      { purpose:"notice_analysis",instruction:"Analyze",outputSchema:"object",promptVersion:"v1" },
      { async analyze({signal}) {
          await new Promise((resolve,reject) => {
            const timer=setTimeout(resolve,100);
            signal?.addEventListener("abort",()=>{clearTimeout(timer);reject(new Error("aborted"));},{once:true});
          });
          return {output:{ok:true},provider:"anthropic",model:"claude",confidence:1};
        } },
      (value): value is {ok:boolean} => typeof value === "object" && value !== null,
      { maxBytes:1024*1024, timeoutMs:5, allowedProviders:["anthropic"] },
    ),
    /TIMEOUT|aborted/,
  );

  await assert.rejects(
    () => analyzeVisualDocument(
      { documentId:"doc-3",fileName:"notice.pdf",mimeType:"application/pdf",bytes,sha256:hash,securityStatus:"clean" },
      { purpose:"notice_analysis",instruction:"Analyze",outputSchema:"object",promptVersion:"v1" },
      { async analyze(){return {output:{ok:true},provider:"unknown",model:"x",confidence:1};} },
      (value): value is {ok:boolean} => typeof value === "object" && value !== null,
      { maxBytes:1024*1024, timeoutMs:1000, allowedProviders:["anthropic"] },
    ),
    /not allowed/,
  );
});
