import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root=path.resolve(import.meta.dirname,"..");
const readiness=fs.readFileSync(path.join(root,"scripts/mcp-launch-readiness.mjs"),"utf8");
const smoke=fs.readFileSync(path.join(root,"scripts/mcp-smoke.mjs"),"utf8");

test("launch readiness invokes only read-only MCP tools",()=>{
  const calls=[...readiness.matchAll(/callTool\("([^"]+)"/g)].map(match=>match[1]);
  assert.deepEqual([...new Set(calls)].sort(),["find_workflow","get_profile"]);
  for(const forbidden of [
    "create_matter",
    "ingest_document",
    "save_matter_input",
    "analyze_matter",
    "generate_draft",
    "save_draft",
    "preview_packet",
    "approve_packet",
    "prepare_checkout",
  ]){
    assert.equal(calls.includes(forbidden),false,`readiness must not invoke ${forbidden}`);
  }
});

test("launch readiness verifies public submission surfaces",()=>{
  for(const route of ["/support","/privacy","/terms","/security"]){
    assert.ok(readiness.includes(route),`readiness should check ${route}`);
  }
  assert.match(readiness,/resources\/list/);
  assert.match(readiness,/resources\/read/);
  assert.match(readiness,/View exact PDF/);
  assert.match(readiness,/OPENAI_CHALLENGE_EXPECTED_TOKEN/);
});

test("smoke test follows the current stateless discovery response",()=>{
  assert.match(smoke,/supportedVersions/);
  assert.match(smoke,/io\.modelcontextprotocol\/serverInfo/);
  assert.doesNotMatch(smoke,/result\?\.protocolVersion/);
  assert.doesNotMatch(smoke,/result\?\.serverInfo/);
});
