import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getConfig } from "@/config";
import { flags } from "@/lib/feature-flags";
import { SECTION_REGISTRY } from "@/lib/section-registry";
import { studioProjects } from "@/studio/domain/studio-project";
import {
  WORKFLOW_EXECUTION_REGISTRY,
  buildFactoryGraduationReport,
} from "@mailmypdf/workflows";
import {
  MAILMYPDF_MCP_TOOLS,
  MCP_CONNECTOR_CONTRACT_VERSION,
  MCP_CONNECTOR_VERSION,
} from "@/lib/mcp/tool-catalog";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin access required");
}

async function safeCount(db: any, table: string): Promise<number | null> {
  try {
    const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
    return error ? null : count ?? 0;
  } catch {
    return null;
  }
}

export const getStudioCommandCenter = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const [{ supabaseAdmin }, publicationModule] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("../../../Projects/Publications/catalog").catch(() => null),
    ]);
    const db = supabaseAdmin as any;
    const config = getConfig();

    const [
      orderCount,
      profileCount,
      matterCount,
      failedOrdersResult,
      queueResult,
      providersResult,
      routesResult,
    ] = await Promise.all([
      safeCount(db, "orders"),
      safeCount(db, "user_profiles"),
      safeCount(db, "workflow_cases"),
      db
        .from("orders")
        .select("id,created_at,email,recipient_name,status,price_cents,lob_letter_id")
        .in("status", ["failed_fulfillment", "failed_provider_submission"])
        .order("created_at", { ascending: false })
        .limit(8),
      db
        .from("orders")
        .select("id,status")
        .in("status", [
          "paid_pending_manual_fulfillment",
          "manual_fulfillment_in_progress",
          "submitted_to_provider",
          "provider_processing",
          "failed_fulfillment",
          "failed_provider_submission",
        ]),
      db.from("ai_provider_configs").select("id,provider,label,enabled,default_model"),
      db.from("ai_workflow_routes").select("id,enabled"),
    ]);

    const executionTotal = WORKFLOW_EXECUTION_REGISTRY.length;
    const executable = WORKFLOW_EXECUTION_REGISTRY.filter(
      (workflow) => workflow.executionStatus === "executable",
    ).length;
    const graduation = buildFactoryGraduationReport(MAILMYPDF_MCP_TOOLS.map((tool) => tool.name));
    const chatCertified = graduation.summary.chatContractCertified;

    const publicTools = MAILMYPDF_MCP_TOOLS.filter((tool) =>
      tool.securitySchemes.some((scheme) => scheme.type === "noauth"),
    ).length;
    const protectedTools = MAILMYPDF_MCP_TOOLS.length - publicTools;

    const sectionsByState = SECTION_REGISTRY.reduce<Record<string, number>>((acc, section) => {
      acc[section.executionState] = (acc[section.executionState] ?? 0) + 1;
      return acc;
    }, {});

    const project = studioProjects.find((candidate) => candidate.id === "mailmypdf") ?? studioProjects[0];
    const serviceStatus = {
      supabase:
        Boolean(config.supabase.url) &&
        Boolean(config.supabase.projectId) &&
        Boolean(config.supabase.publishableKey),
      stripe:
        Boolean(config.stripe.secretKey) &&
        Boolean(config.stripe.publishableKey) &&
        Boolean(config.stripe.webhookSecret),
      lob: Boolean(config.lob.apiKey) && Boolean(config.lob.webhookSecret),
      email: Boolean(config.email.resendApiKey),
      autoSubmit: flags.isAutoSubmitEnabled(),
      deploymentTarget: Boolean(project?.cloudflare),
    };

    const failedOrders = failedOrdersResult.error ? [] : failedOrdersResult.data ?? [];
    const queue = queueResult.error ? [] : queueResult.data ?? [];
    const providers = providersResult.error ? [] : providersResult.data ?? [];
    const routes = routesResult.error ? [] : routesResult.data ?? [];

    const alerts = [
      ...(!serviceStatus.stripe
        ? [{ severity: "critical" as const, code: "stripe", message: "Stripe production configuration is incomplete." }]
        : []),
      ...(!serviceStatus.lob
        ? [{ severity: "critical" as const, code: "lob", message: "Lob API or webhook configuration is incomplete." }]
        : []),
      ...(failedOrders.length > 0
        ? [{ severity: "critical" as const, code: "fulfillment-failures", message: `${failedOrders.length} recent fulfillment failure${failedOrders.length === 1 ? "" : "s"} need review.` }]
        : []),
      ...(!serviceStatus.email
        ? [{ severity: "warning" as const, code: "email", message: "Transactional email is not configured." }]
        : []),
      ...(!serviceStatus.deploymentTarget
        ? [{ severity: "warning" as const, code: "deployment", message: "Studio does not have a Cloudflare deploy target wired for MailMyPDF." }]
        : []),
      ...(chatCertified < executable
        ? [{ severity: "info" as const, code: "chat-certification", message: `${executable - chatCertified} executable workflow${executable - chatCertified === 1 ? "" : "s"} still lack certified chat execution.` }]
        : []),
    ];

    return {
      generatedAt: new Date().toISOString(),
      operations: {
        orders: orderCount,
        profiles: profileCount,
        workflowCases: matterCount,
        queue: queue.length,
        recentFailures: failedOrders,
      },
      workflows: {
        total: executionTotal,
        executable,
        notConnected: executionTotal - executable,
        chatCertified,
        sections: SECTION_REGISTRY.length,
        sectionsByState,
        graduation: {
          summary: graduation.summary,
          references: graduation.references,
          queue: graduation.queue.slice(0, 12),
        },
      },
      connector: {
        version: MCP_CONNECTOR_VERSION,
        contractVersion: MCP_CONNECTOR_CONTRACT_VERSION,
        tools: MAILMYPDF_MCP_TOOLS.length,
        publicTools,
        protectedTools,
        certifiedWorkflows: chatCertified,
      },
      services: {
        ...serviceStatus,
        stripeMode: config.stripe.env,
        appBaseUrl: config.urls.appBaseUrl,
      },
      ai: {
        providers: providers.length,
        enabledProviders: providers.filter((provider: any) => provider.enabled).length,
        routes: routes.length,
        enabledRoutes: routes.filter((route: any) => route.enabled).length,
      },
      publications: {
        total: Array.isArray((publicationModule as any)?.publicationCatalog)
          ? (publicationModule as any).publicationCatalog.length
          : null,
      },
      deployment: {
        project: project?.name ?? "MailMyPDF",
        repository: project?.repoUrl ?? "https://github.com/mycomind4-arch/mailmypdf-all",
        branch: project?.defaultBranch ?? "main",
        cloudflareTargetConfigured: Boolean(project?.cloudflare),
        cloudflareMode: project?.cloudflare?.deployment ?? null,
        workerName: project?.cloudflare?.workerName ?? null,
        appPath: project?.cloudflare?.appPath ?? null,
        deployScript: project?.cloudflare?.deployScript ?? null,
        executionBoundary: "local-admin-only" as const,
      },
      alerts,
    };
  });
