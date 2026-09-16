import assert from "node:assert/strict";
import test from "node:test";
import { createAnthropicVisionProvider } from "../src/anthropic-vision-provider.js";
import { analyzeVisualDocument } from "../src/vision.js";

async function hash(bytes:Uint8Array){
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,"0")).join("");
}

test("anthropic vision provider handles verified PDF input through shared boundary", async () => {
  const bytes=new TextEncoder().encode("%PDF-1.4 example");
  const sha256=await hash(bytes);
  const provider=createAnthropicVisionProvider({
    apiKey:"test",model:"claude-test",
    fetchImpl:async(_url,init)=>{
      const body=JSON.parse(String(init?.body));
      assert.equal(body.messages[0].content[0].type,"document");
      return new Response(JSON.stringify({
        model:"claude-test",stop_reason:"end_turn",content:[{type:"text",text:'{"notice":"CP2000"}'}],
      }),{status:200});
    },
  });
  const result=await analyzeVisualDocument(
    {documentId:"d1",fileName:"cp2000.pdf",mimeType:"application/pdf",bytes,sha256,securityStatus:"clean"},
    {purpose:"notice_analysis",instruction:"Extract notice",outputSchema:"object",promptVersion:"v1"},
    provider,
    (value):value is {notice:string}=>!!value&&typeof value==="object"&&typeof (value as any).notice==="string",
    {maxBytes:1024*1024,timeoutMs:1000,allowedProviders:["anthropic"]},
  );
  assert.equal(result.output.notice,"CP2000");
});
