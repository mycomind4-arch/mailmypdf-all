import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { MAILMYPDF_MCP_TOOLS } from "../src/lib/mcp/tool-catalog";

const repoRoot=path.resolve(import.meta.dirname,"../..");
const review=JSON.parse(
  fs.readFileSync(path.join(repoRoot,"plugins/mailmypdf/annotation-justifications.json"),"utf8"),
);

test("every MCP tool has reviewer-ready annotation justifications matching the server",()=>{
  const entries=review.tools;
  assert.equal(Object.keys(entries).length,MAILMYPDF_MCP_TOOLS.length);

  for(const tool of MAILMYPDF_MCP_TOOLS){
    const item=entries[tool.name];
    assert.ok(item,`missing annotation review for ${tool.name}`);

    for(const key of ["readOnlyHint","destructiveHint","openWorldHint"]){
      assert.equal(
        item[key]?.value,
        tool.annotations[key],
        `${tool.name} ${key} review value must match server annotation`,
      );
      assert.equal(typeof item[key]?.justification,"string");
      assert.ok(
        item[key].justification.trim().length>=40,
        `${tool.name} ${key} justification is too thin`,
      );
    }
  }

  const serverNames=new Set(MAILMYPDF_MCP_TOOLS.map((tool)=>tool.name));
  for(const name of Object.keys(entries)){
    assert.ok(serverNames.has(name),`stale annotation justification for unknown tool ${name}`);
  }
});

test("consequential boundaries have conservative annotations",()=>{
  const byName=Object.fromEntries(MAILMYPDF_MCP_TOOLS.map((tool)=>[tool.name,tool.annotations]));

  assert.equal(byName.ingest_document.readOnlyHint,false);
  assert.equal(byName.ingest_document.openWorldHint,true);
  assert.equal(byName.analyze_matter.openWorldHint,true);
  assert.equal(byName.generate_draft.openWorldHint,true);
  assert.equal(byName.preview_packet.readOnlyHint,false);
  assert.equal(byName.approve_packet.readOnlyHint,false);
  assert.equal(byName.prepare_checkout.readOnlyHint,false);
  assert.equal(byName.prepare_checkout.openWorldHint,true);

  for(const annotations of Object.values(byName)){
    assert.equal(typeof annotations.destructiveHint,"boolean");
  }
});
