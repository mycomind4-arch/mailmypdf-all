import assert from "node:assert/strict";
import test from "node:test";
import { adminFactoryAccessError, studioAccessError } from "../src/studio/access";

test("remote factory inspection requires authentication while machine tools remain local-only", async () => {
  const remote = new Request("https://mailmypdf.example/api/studio/workflows/readiness");
  assert.equal((await adminFactoryAccessError(remote))?.status, 401);
  assert.equal((await studioAccessError(remote))?.status, 403);
});

test("factory endpoints reject cross-origin requests and URL query tokens", async () => {
  const crossOrigin = new Request("https://mailmypdf.example/api/studio/workflows/plan", {
    headers: { origin: "https://untrusted.example" },
  });
  assert.equal((await adminFactoryAccessError(crossOrigin))?.status, 403);
  const queryToken = new Request("https://mailmypdf.example/api/studio/workflows/readiness?access_token=not-a-session");
  assert.equal((await adminFactoryAccessError(queryToken))?.status, 401);
});
