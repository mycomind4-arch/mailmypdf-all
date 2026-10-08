import { test } from "node:test";
import assert from "node:assert/strict";
import { validateTrustedRemoteFileHosts } from "../scripts/validate-remote-file-hosts.mjs";

test("remote file host preflight accepts only scoped public DNS names", () => {
  assert.deepEqual(validateTrustedRemoteFileHosts("files.provider.example,*.cdn.provider.example"), { ok: true, count: 2 });
  for (const value of [
    "", "*", "*.com", "https://files.provider.example", "files.provider.example/path",
    "files.provider.example,,cdn.provider.example", "127.0.0.1", "api.local",
    "*.internal", "localhost", "files.provider.example:443",
    "files.provider.example.evil.net,*.invalid", "  ",
  ]) {
    const result = validateTrustedRemoteFileHosts(value);
    // The attacker-controlled .evil.net host is a syntactically valid domain
    // and must be excluded by provider selection, not misleading syntax rules.
    if (value === "files.provider.example.evil.net,*.invalid") {
      assert.equal(result.ok, false, value);
    } else {
      assert.equal(result.ok, false, value);
    }
  }
});

test("remote file preflight rejects missing host configuration", () => {
  assert.equal(validateTrustedRemoteFileHosts(undefined).ok, false);
  assert.equal(validateTrustedRemoteFileHosts(null).ok, false);
});
