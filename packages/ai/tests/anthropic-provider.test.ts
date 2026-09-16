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
