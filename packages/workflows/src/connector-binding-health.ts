import type { CapabilityId } from "./capability-registry.js";
import type { ConnectorBindingHealth } from "./connector-readiness.js";

export type ConnectorBindingProbeOutcome = {
  health: ConnectorBindingHealth;
  message?: string;
};

export type ConnectorBindingProbe = {
  id: string;
  capabilities: readonly CapabilityId[];
  check(): Promise<ConnectorBindingProbeOutcome>;
};

export type ConnectorBindingProbeResult = {
  capability: CapabilityId;
  health: ConnectorBindingHealth;
  source: string;
  checkedAt: string;
  message?: string;
};

export type ConnectorBindingHealthReport = {
  bindingHealth: Readonly<Partial<Record<CapabilityId, ConnectorBindingHealth>>>;
  probes: readonly ConnectorBindingProbeResult[];
  checkedAt: string;
};

class BindingProbeTimeoutError extends Error {}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new BindingProbeTimeoutError("Binding health check timed out.")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

/** Runs each provider-family probe once and strips provider errors from output. */
export async function probeConnectorBindings(
  capabilities: readonly CapabilityId[],
  probes: readonly ConnectorBindingProbe[],
  options: {
    timeoutMs?: number;
    now?: () => string;
  } = {},
): Promise<ConnectorBindingHealthReport> {
  const timeoutMs = options.timeoutMs ?? 5_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) {
    throw new Error("Binding probe timeout must be between 1 and 30000 milliseconds.");
  }
  const now = options.now ?? (() => new Date().toISOString());
  const checkedAt = now();
  const requested = [...new Set(capabilities)];
  const probeByCapability = new Map<CapabilityId, ConnectorBindingProbe>();
  const probeIds = new Set<string>();

  for (const probe of probes) {
    const probeId = probe.id.trim();
    if (!probeId) throw new Error("Binding probe id is required.");
    if (probeIds.has(probeId)) {
      throw new Error(`Duplicate binding probe id: ${probeId}.`);
    }
    probeIds.add(probeId);
    for (const capability of probe.capabilities) {
      if (probeByCapability.has(capability)) {
        throw new Error(`Multiple binding probes registered for ${capability}.`);
      }
      probeByCapability.set(capability, probe);
    }
  }

  const selected = [...new Map(
    requested
      .map((capability) => probeByCapability.get(capability))
      .filter((probe): probe is ConnectorBindingProbe => Boolean(probe))
      .map((probe) => [probe.id.trim(), probe]),
  ).values()];
  const outcomes = new Map<string, ConnectorBindingProbeOutcome>();

  await Promise.all(selected.map(async (probe) => {
    try {
      const outcome = await withTimeout(probe.check(), timeoutMs);
      outcomes.set(probe.id.trim(), outcome);
    } catch (error) {
      outcomes.set(probe.id.trim(), {
        health: "unavailable",
        message: error instanceof BindingProbeTimeoutError
          ? "Binding health check timed out."
          : "Binding health check failed.",
      });
    }
  }));

  const results = requested.map((capability): ConnectorBindingProbeResult => {
    const probe = probeByCapability.get(capability);
    if (!probe) {
      return {
        capability,
        health: "unknown",
        source: "unregistered",
        checkedAt,
        message: "No live binding probe is registered.",
      };
    }
    const source = probe.id.trim();
    const outcome = outcomes.get(source) ?? {
      health: "unavailable" as const,
      message: "Binding health check failed.",
    };
    return {
      capability,
      health: outcome.health,
      source,
      checkedAt,
      ...(outcome.message ? { message: outcome.message } : {}),
    };
  });

  return {
    checkedAt,
    probes: results,
    bindingHealth: Object.fromEntries(
      results.map((result) => [result.capability, result.health]),
    ) as Partial<Record<CapabilityId, ConnectorBindingHealth>>,
  };
}
