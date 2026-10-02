import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

const homepage = readFileSync(
  new URL("../src/routes/index.tsx", import.meta.url),
  "utf8",
);
const chatgpt = readFileSync(
  new URL("../src/routes/chatgpt.tsx", import.meta.url),
  "utf8",
);
const shell = readFileSync(
  new URL("../src/components/ecosystem-shell.tsx", import.meta.url),
  "utf8",
);
const links = readFileSync(
  new URL("../src/lib/chatgpt-links.ts", import.meta.url),
  "utf8",
);

test("public site keeps a prominent MailMyPDF ChatGPT conversion path", () => {
  assert.match(homepage, /Open ChatGPT Plugins/);
  assert.match(homepage, /See connector setup/);
  assert.match(shell, /Use in ChatGPT/);
  assert.match(shell, /Use MailMyPDF in ChatGPT/);
});

test("ChatGPT landing page exposes both directory and MCP setup paths", () => {
  assert.match(chatgpt, /Open ChatGPT Plugins/);
  assert.match(chatgpt, /MailMyPDF MCP endpoint/);
  assert.match(chatgpt, /MAILMYPDF_MCP_ENDPOINT/);
  assert.match(links, /https:\/\/chatgpt\.com\/plugins\?q=MailMyPDF/);
  assert.match(
    links,
    /https:\/\/mailmypdf\.mycomind4\.workers\.dev\/mcp/,
  );
});
