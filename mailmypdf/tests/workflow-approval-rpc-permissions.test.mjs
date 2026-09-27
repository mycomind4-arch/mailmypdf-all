import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

test("the current workflow approval RPC remains server-only after all migrations", async () => {
  const directory = new URL("../supabase/migrations/", import.meta.url);
  const files = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
  const roles = new Set(["public"]);
  let found = false;
  for (const file of files) {
    const sql = (await readFile(new URL(file, directory), "utf8")).replace(/--[^\n]*/g, "");
    const permissions = /\b(revoke\s+(?:all|execute)|grant\s+execute)\s+on\s+function\s+public\.approve_case_packet\s*\(([^)]*)\)\s+(?:from|to)\s+([^;]+);/gi;
    for (const match of sql.matchAll(permissions)) {
      if (match[2].replace(/\s/g, "").toLowerCase() !== "uuid,text,jsonb,integer,integer,jsonb,text,jsonb,uuid") continue;
      found = true;
      for (const role of match[3].toLowerCase().split(",").map((value) => value.trim())) {
        if (match[1].toLowerCase().startsWith("revoke")) roles.delete(role);
        else roles.add(role);
      }
    }
  }
  assert.equal(found, true, "the current nine-argument RPC permissions must be declared");
  assert.deepEqual([...roles].sort(), ["service_role"], "clients must not manufacture an approval/price through the Data API");
});
