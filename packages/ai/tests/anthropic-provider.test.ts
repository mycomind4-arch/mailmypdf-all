import assert from "node:assert/strict";
import test from "node:test";
import { createAnthropicProvider } from "../src/anthropic-provider.js";

test("anthropic provider parses bounded JSON output without exposing provider error bodies", async () => {
  const provider=createAnthropicProvider({
    apiKey:"test",model:"claude-test",
    fetchImpl:async()=>new Response(JSON.stringify({
      model:"claude-test",stop_reason:"end_turn",content:[{type:"text",text:'{"ok":true}'}],
    }),{status:200,headers:{"content-type":"application/json"}}),
  });
  const result=await provider.execute({
    id:"t1",input:{system:"System",instruction:"Instruction",outputMode:"json"},
    outputSchema:"object",
  });
  assert.deepEqual(result.output,{ok:true});
  assert.equal(result.model,"claude-test");
});


test("anthropic provider sends PDF and image media as multimodal blocks", async () => {
  let requestBody: any = null;

  const provider = createAnthropicProvider({
    apiKey: "test",
    model: "claude-test",
    fetchImpl: async (_url, init) => {
      requestBody = JSON.parse(String(init?.body ?? "{}"));
      return new Response(
        JSON.stringify({
          model: "claude-test",
          stop_reason: "end_turn",
          content: [{ type: "text", text: '{"notice":"CP2000"}' }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });

  const result = await provider.execute({
    id: "vision-1",
    input: {
      system: "Analyze the notice",
      instruction: "Return the notice type",
      outputMode: "json",
      media: [
        {
          kind: "document",
          mediaType: "application/pdf",
          base64: "JVBERi0xLjQKJSVFT0Y=",
        },
        {
          kind: "image",
          mediaType: "image/png",
          base64: "iVBORw0KGgo=",
        },
      ],
    },
    outputSchema: "object",
  });

  assert.deepEqual(result.output, { notice: "CP2000" });
  assert.equal(Array.isArray(requestBody.messages[0].content), true);
  assert.equal(requestBody.messages[0].content[0].type, "document");
  assert.equal(requestBody.messages[0].content[1].type, "image");
  assert.match(requestBody.system, /untrusted user-supplied content/);
});
