import { canonicalChatFactoryReport } from "../packages/workflows/src/chat-execution-registry";
import { MAILMYPDF_MCP_TOOLS } from "../mailmypdf/src/lib/mcp/tool-catalog";

const requested = process.argv[2]?.trim() || null;
const report = canonicalChatFactoryReport(
  MAILMYPDF_MCP_TOOLS.map((tool) => tool.name),
);

const targets = report.filter((entry) =>
  requested ? entry.id === requested : entry.policyFamily === "records-request",
);

if (targets.length === 0) {
  throw new Error(
    requested
      ? `Factory workflow ${requested} was not found in the canonical factory report.`
      : "No canonical Records Request workflows were found for factory verification.",
  );
}

const failed = targets.filter((entry) => !entry.chatExecutable);
if (failed.length > 0) {
  console.error(JSON.stringify({
    requested,
    failed: failed.map((entry) => ({
      id: entry.id,
      reason: entry.reason,
      diagnostics: entry.diagnostics,
    })),
  }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    verified: targets.map((entry) => ({
      id: entry.id,
      policyFamily: entry.policyFamily,
      chatExecutable: entry.chatExecutable,
    })),
  }, null, 2));
}
