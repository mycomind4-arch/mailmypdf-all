/** Run with Node's module mocks/tsx and an installed Playwright. All tool calls use the synthetic local harness. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { harnessUrl, closeHarness } from "./recovery-case-harness.ts";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const artifacts = path.resolve(
  process.env.RECOVERY_BROWSER_ARTIFACTS ??
    path.join(import.meta.dirname, "../../../docs/verification/recovery-case-browser"),
);
await fs.mkdir(artifacts, { recursive: true });
const report = {
  browser: "",
  syntheticHost: true,
  journeys: [],
  layouts: [],
  accessibility: [],
  pageErrors: [],
  consoleErrors: [],
  networkFailures: [],
};
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
  args: ["--no-sandbox", "--no-zygote", "--single-process"],
});
report.browser = browser.version();
const context = await browser.newContext({
  viewport: { width: 1280, height: 960 },
  timezoneId: "America/Los_Angeles",
  locale: "en-US",
});
const page = await context.newPage();
page.on("pageerror", (error) => report.pageErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") report.consoleErrors.push(message.text());
});
page.on("requestfailed", (request) =>
  report.networkFailures.push({ url: request.url(), failure: request.failure()?.errorText }),
);
const frame = () => page.frames().find((f) => f.url() === harnessUrl + "/app");
async function waitText(id, text) {
  await page.waitForFunction(
    ({ id, text }) =>
      document
        .querySelector("iframe")
        ?.contentDocument?.getElementById(id)
        ?.textContent.includes(text),
    { id, text },
  );
}
async function screenshot(name) {
  const app = frame();
  const height = await app.evaluate(() => document.body.scrollHeight);
  await page.locator("iframe").evaluate((element, height) => {
    element.style.height = height + "px";
  }, height);
  await app.locator("main").screenshot({ path: path.join(artifacts, name + ".png") });
}
async function layout(name) {
  const dimensions = await frame().evaluate(() => ({
    width: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  assert.ok(
    dimensions.documentWidth <= dimensions.width && dimensions.bodyWidth <= dimensions.width,
    name + " must not scroll horizontally",
  );
  report.layouts.push({ name, ...dimensions });
}
async function accessibility(name) {
  if (!process.env.AXE_SOURCE)
    throw new Error("Set AXE_SOURCE to axe-core's axe.min.js for the accessibility gate.");
  await frame().addScriptTag({ path: process.env.AXE_SOURCE });
  const results = await frame().evaluate(async () => {
    const result = await window.axe.run(document, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    });
    return {
      violations: result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.target),
      })),
      incomplete: result.incomplete.map((v) => v.id),
    };
  });
  report.accessibility.push({ name, ...results });
  assert.deepEqual(results.violations, [], name + " accessibility violations");
}
async function fixtureTool(name, args) {
  const response = await fetch(harnessUrl + "/test-mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 900,
      method: "tools/call",
      params: { name, arguments: args },
    }),
  });
  const rpc = await response.json();
  assert.equal(rpc.result.isError, false);
  return rpc.result.structuredContent;
}
const caseId = "20000000-0000-4000-8000-000000000001",
  evidenceId = "50000000-0000-4000-8000-000000000001";
try {
  await page.goto(harnessUrl);
  await waitText("list-count", "2 saved cases");
  await layout("desktop list");
  await accessibility("desktop list");
  await screenshot("desktop-list");
  await frame().locator(".case-row button").first().click();
  await waitText("case-title", "Northstar Internet");
  await frame().locator("#activate").focus();
  await page.keyboard.press("Enter");
  await waitText("status", "Active review");
  await frame().locator("#add-evidence").click();
  await page.waitForFunction(() => window.harness.messages.some((m) => m.method === "ui/message"));
  const prompt = await page.evaluate(
    () => window.harness.messages.find((m) => m.method === "ui/message").params.content[0].text,
  );
  assert.ok(prompt.includes(caseId));
  assert.ok(prompt.includes("Confirm the document"));
  // Simulate the user's subsequent conversation linking an owned uploaded document through the actual server tool.
  await fixtureTool("update_recovery_case", {
    case_id: caseId,
    expected_revision: 2,
    event: { type: "attach-evidence", evidenceId },
  });
  await frame().locator("#reload").click();
  await frame()
    .locator("#evidence-list")
    .getByText("October statement.pdf", { exact: true })
    .waitFor();
  await frame().locator("#show-waiting").click();
  assert.equal(
    await frame()
      .locator("#wait-reason")
      .evaluate((element) => element === document.activeElement),
    true,
  );
  await frame().locator("#wait-reason").fill("Merchant is reviewing the extra October charge.");
  await frame()
    .locator("#wait-due")
    .fill(new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) + "T10:00");
  await frame().locator("#confirm-waiting").click();
  await waitText("status", "Waiting for a reply");
  assert.equal(await frame().locator("#overdue").isVisible(), false);
  await frame().locator("#resume").click();
  await waitText("status", "Active review");
  await accessibility("desktop active detail");
  await screenshot("desktop-active");
  report.journeys.push(
    "List → open → keyboard start → evidence chat handoff → owned evidence attachment → wait → resume",
  );
  for (const [name, width, height] of [
    ["tablet", 768, 1024],
    ["mobile", 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await layout(name);
    await screenshot(name + "-active");
  }
  await frame().locator("#show-resolution").click();
  await frame()
    .locator("#outcome")
    .fill("The extra October charge was refunded to the original payment method.");
  await frame().locator("#recovered-amount").fill("89.00");
  await frame().locator("#confirm-resolution").click();
  await frame()
    .locator("#error")
    .getByText(/choose supporting evidence/)
    .waitFor();
  assert.equal((await (await fetch(harnessUrl + "/diagnostics")).json()).cases[0].state, "active");
  await frame().locator("#resolution-evidence input").check();
  await frame().locator("#confirm-outcome").check();
  await frame().locator("#recovered-amount").fill("89.001");
  await frame().locator("#confirm-resolution").click();
  await frame()
    .locator("#error")
    .getByText(/decimal places/)
    .waitFor();
  await frame().locator("#recovered-amount").fill("89.00");
  await accessibility("mobile confirmation form");
  await layout("mobile confirmation form");
  await screenshot("mobile-confirmation");
  await frame().locator("#confirm-resolution").click();
  await waitText("status", "Outcome confirmed");
  await waitText("confirmed-value", "$89.00");
  const resolved = (await (await fetch(harnessUrl + "/diagnostics")).json()).cases[0];
  assert.equal(resolved.state, "resolved");
  assert.equal(resolved.revision, 6);
  assert.equal(resolved.resolution.recoveredValue.amountMinor, 8900);
  assert.deepEqual(resolved.resolution.evidenceIds, [evidenceId]);
  assert.equal(await frame().locator("#show-resolution").isVisible(), false);
  await screenshot("mobile-confirmed");
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await accessibility("mobile dark confirmed");
  await screenshot("mobile-dark");
  report.journeys.push(
    "Confirmation and linked evidence required → decimal validation → exact $89.00 saved → terminal read-only view",
  );
  await fetch(harnessUrl + "/reset", { method: "POST" });
  await page.reload();
  await waitText("list-count", "2 saved cases");
  await frame().locator(".case-row button").first().click();
  await frame().locator("#activate").click();
  await waitText("status", "Active review");
  await fetch(harnessUrl + "/concurrent", { method: "POST" });
  await frame().locator("#show-waiting").click();
  await frame().locator("#wait-reason").fill("Awaiting reply");
  await frame().locator("#confirm-waiting").click();
  await frame()
    .locator("#error")
    .getByText(/Reload the latest/)
    .waitFor();
  assert.equal(await frame().locator("#show-resolution").isDisabled(), true);
  const calls = (await (await fetch(harnessUrl + "/diagnostics")).json()).wireCalls;
  assert.equal(
    calls.filter((c) => c.name === "update_recovery_case" && c.arguments.event.type === "wait")
      .length,
    1,
  );
  await frame().locator("#reload").click();
  await frame().locator("#show-cancel").waitFor({ state: "visible" });
  await page.waitForFunction(
    () => !document.querySelector("iframe").contentDocument.getElementById("show-cancel").disabled,
  );
  await frame().locator("#show-cancel").click();
  await frame().locator("#confirm-cancel").check();
  await frame().locator("#cancel-case").click();
  await waitText("status", "Cancelled");
  report.journeys.push(
    "Concurrent revision conflict → blocked changes without retry → explicit reload → confirmed closure",
  );
  const sizes = await page.evaluate(() =>
    window.harness.messages
      .filter((m) => m.method === "ui/notifications/size-changed")
      .map((m) => m.params),
  );
  assert.ok(sizes.length > 1, "content changes must report updated intrinsic size");
  report.sizing = sizes;
  assert.deepEqual(report.pageErrors, []);
  assert.deepEqual(report.consoleErrors, []);
  assert.deepEqual(report.networkFailures, []);
  report.result = "PASS";
} catch (error) {
  report.result = "FAIL";
  report.error = error.message;
  throw error;
} finally {
  await fs.writeFile(path.join(artifacts, "results.json"), JSON.stringify(report, null, 2) + "\n");
  await browser.close();
  await closeHarness();
  console.log(JSON.stringify(report));
}
