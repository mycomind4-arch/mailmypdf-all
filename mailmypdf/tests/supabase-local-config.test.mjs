import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("local Supabase has one enabled OAuth server configuration", async () => {
  const config = await readFile(new URL("../supabase/config.toml", import.meta.url), "utf8");
  const blocks = config.split(/(?=^\[)/m).filter((block) => block.startsWith("[auth.oauth_server]\n"));
  assert.equal(blocks.length, 1, "duplicate TOML tables prevent the Supabase CLI from starting");
  assert.match(blocks[0], /^enabled = true$/m);
  assert.match(blocks[0], /^allow_dynamic_registration = true$/m);
  assert.match(blocks[0], /^authorization_url_path = "\/oauth\/consent"$/m);
});
