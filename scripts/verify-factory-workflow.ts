import { canonicalChatFactoryReport } from "../packages/workflows/src/chat-execution-registry";
import { MAILMYPDF_MCP_TOOLS } from "../mailmypdf/src/lib/mcp/tool-catalog";

const workflowId = process.argv[2]?.trim();
if (!workflowId) {
  throw new Error("Provide a canonical workflow ID to verify.");
}

const report = canonicalChatFactoryReport(
  MAILMYPDF_MCP_TOOLS.map((tool) => tool.name),
).find((entry) => entry.id === workflowId);

if (!report) {
  console.error(JSON.stringify({ workflowId, error: "missing-from-factory-report" }, null, 2));
  process.exitCode = 1;
} else if (!report.executable || !report.chatExecutable) {
  console.error(
    JSON.stringify(
      {
        workflowId,
        executable: report.executable,
        chatExecutable: report.chatExecutable,
        reason: report.reason,
        diagnostics: report.diagnostics,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify(
      {
        workflowId,
        executable: report.executable,
        chatExecutable: report.chatExecutable,
        policyFamily: report.policyFamily,
      },
      null,
      2,
    ),
  );
}
