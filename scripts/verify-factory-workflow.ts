async function main(): Promise<void> {
  const [{ canonicalChatFactoryReport }, { MAILMYPDF_MCP_TOOLS }] =
    await Promise.all([
      import("../packages/workflows/src/chat-execution-registry.ts"),
      import("../mailmypdf/src/lib/mcp/tool-catalog.ts"),
    ]);

  const requested = process.argv[2]?.trim() || null;
  const report = canonicalChatFactoryReport(
    MAILMYPDF_MCP_TOOLS.map((tool) => tool.name),
  );

  const targets = requested
    ? report.filter((entry) => entry.id === requested)
    : report.filter(
        (entry) =>
          entry.policyFamily === "records-request" ||
          entry.policyFamily === "notice-response",
      );

  if (targets.length === 0) {
    console.error(
      JSON.stringify(
        requested
          ? { workflowId: requested, error: "missing-from-factory-report" }
          : { error: "no-supported-generated-workflows" },
        null,
        2,
      ),
    );
    process.exitCode = 1;
    return;
  }

  const failed = targets.filter((entry) => !entry.chatExecutable);
  if (failed.length > 0) {
    console.error(
      JSON.stringify(
        {
          requested,
          failed: failed.map((entry) => ({
            workflowId: entry.id,
            chatExecutable: entry.chatExecutable,
            reason: entry.reason,
            diagnostics: entry.diagnostics,
          })),
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    JSON.stringify(
      {
        requested,
        verified: targets.map((entry) => ({
          workflowId: entry.id,
          chatExecutable: entry.chatExecutable,
          policyFamily: entry.policyFamily,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
