import {
  probeConnectorBindings,
  type ConnectorBindingHealthReport,
  type ConnectorBindingProbe,
} from "@mailmypdf/workflows/connector-binding-health";
import type { CapabilityId } from "@mailmypdf/workflows/connector-readiness";
import type { AuthenticatedUserContext } from "@/lib/secure-core/auth.server";
import { providers } from "@/providers";
import type { ProviderHealth } from "@/providers/interfaces";

const DATABASE_CAPABILITIES: readonly CapabilityId[] = [
  "matterState",
  "facts",
  "provenance",
  "draftProvenance",
  "approval",
  "proofAudit",
  "retention",
];
const STORAGE_CAPABILITIES: readonly CapabilityId[] = [
  "secureUpload",
  "documentSourceImport",
  "documentStorage",
  "archive",
];
const SCANNER_CAPABILITIES: readonly CapabilityId[] = ["documentScanning"];
const AI_CAPABILITIES: readonly CapabilityId[] = [
  "aiExecution",
  "classification",
  "extraction",
  "understand",
  "draft",
  "visionAnalysis",
];
const MAIL_CAPABILITIES: readonly CapabilityId[] = [
  "addressVerification",
  "mailing",
  "tracking",
];
const PAYMENT_CAPABILITIES: readonly CapabilityId[] = ["payment", "savedPayment"];
const NOTIFICATION_CAPABILITIES: readonly CapabilityId[] = ["notifications"];
const IN_PROCESS_CAPABILITIES: readonly CapabilityId[] = [
  "security",
  "validation",
  "pdfGeneration",
  "packetAssembly",
  "pricing",
  "humanReview",
  "blockingGate",
  "identity",
];

function providerOutcome(health: ProviderHealth) {
  if (health.status === "healthy") return { health: "healthy" as const };
  if (health.status === "unknown") {
    return { health: "unknown" as const, message: "Provider health is unknown." };
  }
  return {
    health: "unavailable" as const,
    message: health.status === "degraded"
      ? "Provider reported degraded health."
      : "Provider is unavailable.",
  };
}

function configured(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function buildProbes(
  context: AuthenticatedUserContext,
  matterId?: string,
): ConnectorBindingProbe[] {
  return [
    {
      id: "supabase-workflow-database",
      capabilities: DATABASE_CAPABILITIES,
      async check() {
        let query = context.supabase
          .from("workflow_cases")
          .select("id")
          .eq("owner_id", context.user.id)
          .limit(1);
        if (matterId) query = query.eq("id", matterId);
        const { error } = await query;
        return error
          ? { health: "unavailable", message: "Workflow database is unavailable." }
          : { health: "healthy" };
      },
    },
    {
      id: "supabase-secure-storage",
      capabilities: STORAGE_CAPABILITIES,
      async check() {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
        if (!configured(process.env.SUPABASE_URL) || !configured(serviceKey)) {
          return { health: "unavailable", message: "Secure storage is not configured." };
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.getBucket("secure-documents");
        return error || !data
          ? { health: "unavailable", message: "Secure storage is unavailable." }
          : { health: "healthy" };
      },
    },
    {
      id: "malware-scanner-configuration",
      capabilities: SCANNER_CAPABILITIES,
      async check() {
        const ready =
          configured(process.env.MAILMYPDF_MALWARE_SCANNER_URL) &&
          configured(process.env.MAILMYPDF_MALWARE_SCANNER_KEY) &&
          configured(process.env.MAILMYPDF_SCANNER_JOB_SECRET);
        return ready
          ? {
              health: "unknown",
              message: "Scanner is configured; no side-effect-free provider probe is available.",
            }
          : { health: "unavailable", message: "Malware scanner is not configured." };
      },
    },
    {
      id: "anthropic-configuration",
      capabilities: AI_CAPABILITIES,
      async check() {
        const ready = configured(process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY);
        return ready
          ? {
              health: "unknown",
              message: "AI provider is configured; reachability is verified on execution.",
            }
          : { health: "unavailable", message: "AI provider is not configured." };
      },
    },
    {
      id: "stripe-live-health",
      capabilities: PAYMENT_CAPABILITIES,
      async check() {
        const provider = providers.payment();
        if (!provider.checkHealth) {
          return provider.isConfigured()
            ? { health: "unknown", message: "Payment provider has no live health probe." }
            : { health: "unavailable", message: "Payment provider is not configured." };
        }
        return providerOutcome(await provider.checkHealth());
      },
    },
    {
      id: "lob-live-health",
      capabilities: MAIL_CAPABILITIES,
      async check() {
        const provider = providers.mail();
        if (!provider.checkHealth) {
          return provider.isConfigured()
            ? { health: "unknown", message: "Mail provider has no live health probe." }
            : { health: "unavailable", message: "Mail provider is not configured." };
        }
        return providerOutcome(await provider.checkHealth());
      },
    },
    {
      id: "notification-provider-health",
      capabilities: NOTIFICATION_CAPABILITIES,
      async check() {
        const provider = providers.notification();
        if (!provider.checkHealth) {
          return provider.isConfigured()
            ? { health: "unknown", message: "Notification provider has no live health probe." }
            : { health: "unavailable", message: "Notification provider is not configured." };
        }
        return providerOutcome(await provider.checkHealth());
      },
    },
    {
      id: "mailmypdf-in-process-bindings",
      capabilities: IN_PROCESS_CAPABILITIES,
      async check() {
        return { health: "healthy" };
      },
    },
  ];
}

export async function probeMcpToolBindingHealth(input: {
  context: AuthenticatedUserContext;
  capabilities: readonly CapabilityId[];
  matterId?: string;
}): Promise<ConnectorBindingHealthReport> {
  return probeConnectorBindings(
    input.capabilities,
    buildProbes(input.context, input.matterId),
    { timeoutMs: 7_500 },
  );
}
