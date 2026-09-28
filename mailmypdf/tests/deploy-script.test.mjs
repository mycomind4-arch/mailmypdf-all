import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root=path.resolve(import.meta.dirname,"..");
const source=fs.readFileSync(path.join(root,"deploy.sh"),"utf8");

test("deploy script verifies the public website and MCP connector after wrangler deploy",()=>{
  const deployIndex=source.indexOf("npx wrangler deploy --config wrangler.json");
  const verifyIndex=source.indexOf("pnpm verify:deployment");
  const readinessIndex=source.indexOf("pnpm mcp:readiness");
  assert.ok(deployIndex>=0,"deploy command missing");
  assert.ok(verifyIndex>deployIndex,"deployment verification must run after wrangler deploy");
  assert.ok(readinessIndex>verifyIndex,"MCP launch-readiness must run after deployment smoke");
  assert.match(source,/mailmypdf\.mycomind4\.workers\.dev/);
  assert.match(source,/MCP_BASE_URL="\$MAILMYPDF_BASE_URL"/);
  assert.match(source,/cd "\$APP_DIR"/);
});

test("deploy script still runs production configuration preflight before build and deployment",()=>{
  const preflight=source.indexOf("pnpm verify:production-config -- --live");
  const build=source.indexOf("pnpm build");
  const deploy=source.indexOf("npx wrangler deploy --config wrangler.json");
  assert.ok(preflight>=0);
  assert.ok(build>preflight);
  assert.ok(deploy>build);
});
