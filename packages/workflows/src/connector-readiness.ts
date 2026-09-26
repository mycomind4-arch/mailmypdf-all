import {
  CAPABILITIES,
  capabilityRegistry,
  compileCapabilityManifest,
  hasCapability,
  resolveCapabilityDependencies,
  type CapabilityId,
  type CapabilityManifest,
} from "./capability-registry.js";

export type { CapabilityId } from "./capability-registry.js";

export type ConnectorCapabilityRequirement = {
  id: string;
  required?: boolean;
  version?: string;
  requiresOwnership?: boolean;
  requiresApproval?: boolean;
};

export type ConnectorBindingHealth = "healthy" | "unknown" | "unavailable";

export type ConnectorCapabilityContext = {
  actor: "anonymous" | "authenticated";
  ownership: "not-applicable" | "verified" | "unverified";
  approvedCapabilities?: readonly CapabilityId[];
  jurisdiction?: string;
  domain?: string;
  requireHealthyBindings?: boolean;
  bindingHealth?: Readonly<Record<string, ConnectorBindingHealth>>;
};

export type ConnectorReadinessCode =
  | "UNKNOWN_CAPABILITY"
  | "VERSION_INCOMPATIBLE"
  | "AUTHENTICATION_REQUIRED"
  | "OWNERSHIP_REQUIRED"
  | "APPROVAL_REQUIRED"
  | "JURISDICTION_UNSUPPORTED"
  | "DOMAIN_UNSUPPORTED"
  | "BINDING_UNAVAILABLE";

export type ConnectorReadinessDiagnostic = {
  capability: string;
  code: ConnectorReadinessCode;
  severity: "error" | "warning";
  message: string;
};

export type ConnectorCapabilityAssessment = {
  requested: readonly string[];
  resolved: readonly CapabilityId[];
  required: readonly CapabilityId[];
  diagnostics: readonly ConnectorReadinessDiagnostic[];
  ready: boolean;
};

export function isRegisteredConnectorCapability(id: string): id is CapabilityId {
  return hasCapability(id);
}

export function connectorCapabilityVersion(id: string): string | undefined {
  return hasCapability(id) ? CAPABILITIES[id].version : undefined;
}

type SemanticVersion = { major: number; minor: number; patch: number };

function semanticVersion(value: string): SemanticVersion | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value.trim());
  return match
    ? { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) }
    : null;
}

function compareVersions(left: SemanticVersion, right: SemanticVersion): number {
  return left.major - right.major || left.minor - right.minor || left.patch - right.patch;
}

/** Exact requirements match exactly. Caret requirements accept a version at
 * or above the requested floor within the same semantic major. */
export function isCapabilityVersionCompatible(
  requested: string,
  available: string,
): boolean {
  const caret = requested.startsWith("^");
  const requestedVersion = semanticVersion(caret ? requested.slice(1) : requested);
  const availableVersion = semanticVersion(available);
  if (!requestedVersion || !availableVersion) return false;
  if (!caret) return compareVersions(availableVersion, requestedVersion) === 0;
  if (compareVersions(availableVersion, requestedVersion) < 0) return false;
  if (requestedVersion.major > 0) return availableVersion.major === requestedVersion.major;
  if (requestedVersion.minor > 0) {
    return availableVersion.major === 0 && availableVersion.minor === requestedVersion.minor;
  }
  return availableVersion.major === 0 &&
    availableVersion.minor === 0 &&
    availableVersion.patch === requestedVersion.patch;
}

function applicabilityDiagnostics(
  id: CapabilityId,
  context: ConnectorCapabilityContext,
  severity: "error" | "warning",
): ConnectorReadinessDiagnostic[] {
  const definition = CAPABILITIES[id];
  const diagnostics: ConnectorReadinessDiagnostic[] = [];

  if (
    context.jurisdiction &&
    !definition.applicability.jurisdictions.includes("unspecified") &&
    !definition.applicability.jurisdictions.includes(context.jurisdiction)
  ) {
    diagnostics.push({
      capability: id,
      code: "JURISDICTION_UNSUPPORTED",
      severity,
      message: `${id} is not registered for jurisdiction ${context.jurisdiction}.`,
    });
  }

  if (
    context.domain &&
    definition.applicability.domains.length > 0 &&
    !definition.applicability.domains.includes("shared") &&
    !definition.applicability.domains.includes(definition.category) &&
    !definition.applicability.domains.includes(context.domain)
  ) {
    diagnostics.push({
      capability: id,
      code: "DOMAIN_UNSUPPORTED",
      severity,
      message: `${id} is not registered for domain ${context.domain}.`,
    });
  }

  return diagnostics;
}

function bindingDiagnostics(
  id: CapabilityId,
  context: ConnectorCapabilityContext,
  severity: "error" | "warning",
): ConnectorReadinessDiagnostic[] {
  const definition = CAPABILITIES[id];
  const hasImplementedBinding = definition.runtimeBindings.some(
    (binding) => binding.status === "implemented",
  );
  const health = context.bindingHealth?.[id] ?? "unknown";
  const unavailable =
    !hasImplementedBinding ||
    health === "unavailable" ||
    (context.requireHealthyBindings === true && health !== "healthy");

  if (!unavailable) return [];
  return [{
    capability: id,
    code: "BINDING_UNAVAILABLE",
    severity,
    message: !hasImplementedBinding
      ? `${id} has no implemented runtime binding.`
      : `${id} runtime health is ${health}.`,
  }];
}

export function assessConnectorCapabilities(
  requirements: readonly ConnectorCapabilityRequirement[],
  context: ConnectorCapabilityContext,
): ConnectorCapabilityAssessment {
  const diagnostics: ConnectorReadinessDiagnostic[] = [];
  const known = requirements.filter((requirement) => {
    if (hasCapability(requirement.id)) return true;
    diagnostics.push({
      capability: requirement.id,
      code: "UNKNOWN_CAPABILITY",
      severity: requirement.required === false ? "warning" : "error",
      message: `Unknown capability ${requirement.id}.`,
    });
    return false;
  }) as Array<ConnectorCapabilityRequirement & { id: CapabilityId }>;

  const resolution = resolveCapabilityDependencies(known.map((item) => item.id));
  const requiredRoots = known.filter((item) => item.required !== false).map((item) => item.id);
  const requiredResolution = resolveCapabilityDependencies(requiredRoots);
  const required = new Set(requiredResolution.ordered);
  const requirementById = new Map(known.map((item) => [item.id, item]));

  for (const message of [...resolution.errors, ...requiredResolution.errors]) {
    diagnostics.push({
      capability: "registry",
      code: "BINDING_UNAVAILABLE",
      severity: "error",
      message,
    });
  }

  for (const requirement of known) {
    if (
      requirement.version &&
      !isCapabilityVersionCompatible(requirement.version, CAPABILITIES[requirement.id].version)
    ) {
      diagnostics.push({
        capability: requirement.id,
        code: "VERSION_INCOMPATIBLE",
        severity: requirement.required === false ? "warning" : "error",
        message: `${requirement.id} requires ${requirement.version}; ${CAPABILITIES[requirement.id].version} is registered.`,
      });
    }
  }

  for (const id of resolution.ordered) {
    const definition = CAPABILITIES[id];
    const severity = required.has(id) ? "error" : "warning";

    const requirement = requirementById.get(id);
    const requiresOwnership = requirement?.requiresOwnership ?? definition.security.requiresOwnership;
    const requiresApproval = requirement?.requiresApproval ?? definition.security.requiresApproval;

    if (requiresOwnership) {
      if (context.actor !== "authenticated") {
        diagnostics.push({
          capability: id,
          code: "AUTHENTICATION_REQUIRED",
          severity,
          message: `${id} requires an authenticated connector account.`,
        });
      } else if (context.ownership !== "verified") {
        diagnostics.push({
          capability: id,
          code: "OWNERSHIP_REQUIRED",
          severity,
          message: `${id} requires verified matter ownership.`,
        });
      }
    }

    if (
      requiresApproval &&
      !context.approvedCapabilities?.includes(id)
    ) {
      diagnostics.push({
        capability: id,
        code: "APPROVAL_REQUIRED",
        severity,
        message: `${id} requires explicit approval before connector execution.`,
      });
    }

    diagnostics.push(...applicabilityDiagnostics(id, context, severity));
    diagnostics.push(...bindingDiagnostics(id, context, severity));
  }

  const unique = [...new Map(
    diagnostics.map((item) => [`${item.capability}:${item.code}:${item.message}`, item]),
  ).values()];

  return {
    requested: requirements.map((item) => item.id),
    resolved: resolution.ordered,
    required: requiredResolution.ordered,
    diagnostics: unique,
    ready: !unique.some((item) => item.severity === "error"),
  };
}

export type ConnectorDryRun = {
  workflowId: string;
  ready: boolean;
  sideEffectsPerformed: false;
  manifest: CapabilityManifest | null;
  diagnostics: readonly ConnectorReadinessDiagnostic[];
};

export function dryRunConnectorPlan(input: {
  workflowId: string;
  required: readonly ConnectorCapabilityRequirement[];
  optional?: readonly ConnectorCapabilityRequirement[];
  context: ConnectorCapabilityContext;
}): ConnectorDryRun {
  const requirements = [
    ...input.required.map((item) => ({ ...item, required: true })),
    ...(input.optional ?? []).map((item) => ({ ...item, required: false })),
  ];
  const assessment = assessConnectorCapabilities(requirements, input.context);
  const composition = capabilityRegistry.compose({
    required: input.required.map((item) => item.id),
    optional: (input.optional ?? []).map((item) => item.id),
    jurisdiction: input.context.jurisdiction,
    domain: input.context.domain,
  });
  const compositionDiagnostics: ConnectorReadinessDiagnostic[] = composition.diagnostics.map(
    (message) => ({
      capability: "registry",
      code: "BINDING_UNAVAILABLE",
      severity: "error",
      message,
    }),
  );
  const manifest = composition.executable
    ? compileCapabilityManifest({ workflowId: input.workflowId, composition })
    : null;
  const diagnostics = [...assessment.diagnostics, ...compositionDiagnostics];

  return {
    workflowId: input.workflowId,
    ready: assessment.ready && composition.executable,
    sideEffectsPerformed: false,
    manifest,
    diagnostics,
  };
}

export type ConnectorCapabilityCoverage = {
  id: CapabilityId;
  bindingImplemented: boolean;
  acceptanceFixturePresent: boolean;
  certificationEvidencePresent: boolean;
  gaps: readonly string[];
};

export type ConnectorAcceptanceCoverage = {
  capabilities: readonly ConnectorCapabilityCoverage[];
  complete: boolean;
};

export function buildConnectorAcceptanceCoverage(
  ids: readonly CapabilityId[],
): ConnectorAcceptanceCoverage {
  const capabilities = ids.map((id): ConnectorCapabilityCoverage => {
    const definition = CAPABILITIES[id];
    const bindingImplemented = definition.runtimeBindings.some(
      (binding) => binding.status === "implemented",
    );
    const acceptanceFixturePresent = definition.fixtures.some(
      (fixture) => fixture.kind === "acceptance" && fixture.status === "present",
    );
    const certificationEvidencePresent = definition.certification.evidence.length > 0;
    const gaps = [
      ...definition.certification.gaps,
      ...(bindingImplemented ? [] : ["No implemented runtime binding."]),
      ...(acceptanceFixturePresent ? [] : ["No present acceptance fixture."]),
      ...(certificationEvidencePresent ? [] : ["No certification evidence recorded."]),
    ];
    return {
      id,
      bindingImplemented,
      acceptanceFixturePresent,
      certificationEvidencePresent,
      gaps: [...new Set(gaps)],
    };
  });

  return {
    capabilities,
    complete: capabilities.every((item) => item.gaps.length === 0),
  };
}
