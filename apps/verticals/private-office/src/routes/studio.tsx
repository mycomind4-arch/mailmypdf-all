import { createFileRoute } from "@tanstack/react-router";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  BookOpen,
  Bot,
  ChevronDown,
  CircleAlert,
  Copy,
  FileCode2,
  Folder,
  FolderTree,
  GitBranch,
  Github,
  Eye,
  EyeOff,
  MessageSquare,
  Paperclip,
  Play,
  Plus,
  Redo2,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import { createStudioPhases, type StudioProposal } from "@/domain/studio-proposal";
import {
  findStudioVertical,
  studioCatalog,
  studioVerticals,
  type StudioCatalogWorkflow,
  type StudioVertical,
} from "@/domain/studio-ecosystem";
import { studioProjects } from "@/domain/studio-project";
import { findStepWorkflow } from "@/domain/step-workflows";
import { readHiddenWorkflowIds, writeHiddenWorkflowIds } from "@/lib/workflow-visibility";
import { scanProjectFiles, type StudioFileTreeNode } from "@/lib/fns/scan-project-files";
import { scanWorkflowCatalog } from "@/lib/fns/scan-workflow-catalog";
import type { RunState, RoleName, AgentProviderName } from "@mailmypdf/dev-agent-swarm";
import { syncProjectToGithub } from "@/lib/fns/sync-project-to-github";
import { publishProjectToCloudflare } from "@/lib/fns/publish-project-to-cloudflare";
import {
  studioNodeKinds,
  validateStudioWorkflow,
  type StudioCapability,
  type StudioExecutionMode,
  type StudioGate,
  type StudioNodeKind,
  type StudioPhase,
  type StudioVariable,
  type StudioWorkflow,
  type StudioWorkflowTarget,
} from "@/domain/studio-workflow";

export const Route = createFileRoute("/studio")({ component: StudioPage });

const DRAFT_KEY = "private-office-studio-draft";
const PREVIEW_KEY = "private-office-studio-preview-workflow:";
const PUBLISHED_KEY = "private-office-studio-published-workflow:";
const ECOSYSTEM_PUBLISHED_KEY = "mailmypdf-studio-published-workflow:";
const ECOSYSTEM_DRAFT_KEY = "mailmypdf-studio-draft-workflow:";
const AGENT_PROGRESS_KEY = "mailmypdf-studio-agent-progress";

const nodeStyle: Record<StudioNodeKind, { badge: string; tone: string }> = {
  input: { badge: "INPUT", tone: "studio-node--navy" },
  research: { badge: "OFFICIAL SOURCE", tone: "studio-node--green" },
  analysis: { badge: "AI-ASSISTED", tone: "studio-node--slate" },
  authority: { badge: "AUTHORITY", tone: "studio-node--green" },
  gate: { badge: "GATE", tone: "studio-node--amber" },
  review: { badge: "REVIEW GATE", tone: "studio-node--amber" },
  action: { badge: "ACTION", tone: "studio-node--amber" },
  output: { badge: "OUTPUT", tone: "studio-node--navy" },
};

const capabilityCatalog: Array<{
  id: string;
  label: string;
  mode: StudioExecutionMode;
}> = [
  { id: "secure-ingest", label: "Secure document ingest", mode: "deterministic" },
  { id: "fact-provenance", label: "Fact provenance", mode: "deterministic" },
  { id: "timeline", label: "Timeline analysis", mode: "deterministic" },
  { id: "authority-research", label: "Authority research", mode: "ai_advisory" },
  { id: "evidence-analysis", label: "Evidence analysis", mode: "ai_advisory" },
  { id: "risk-assessment", label: "Risk assessment", mode: "ai_advisory" },
  { id: "strategy", label: "Strategy", mode: "ai_advisory" },
  { id: "draft-generation", label: "Draft generation", mode: "ai_advisory" },
  { id: "draft-validation", label: "Draft validation", mode: "deterministic" },
  { id: "owner-review", label: "Owner approval", mode: "human" },
  { id: "stripe-checkout", label: "Stripe checkout", mode: "external_service" },
  { id: "mailing-submit", label: "MailMyPDF fulfillment", mode: "external_service" },
  { id: "tracking", label: "Tracking and proof", mode: "deterministic" },
];

type TraceEvent = {
  id: string;
  at: string;
  type: string;
  label: string;
  detail?: string;
  data?: Record<string, unknown>;
};

type StudioChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  attachments?: string[];
};

type StudioFlowData = { phase: StudioPhase; selected: boolean };
type StudioFlowNode = Node<StudioFlowData, "studioPhase">;

// Mirrors @mailmypdf/workflow-acceptance's AcceptanceReport (packages/workflow-acceptance/src/types.ts)
// just enough to render it — see api/studio/acceptance/test.ts, which returns that shape verbatim.
type StudioAcceptanceReport = {
  runId: string;
  workflow: string;
  scenario: string;
  mailReady: boolean;
  checks: Record<string, "pass" | "fail" | "blocked" | "skipped">;
  failures: Array<{ code: string; message: string }>;
  artifacts: { runDir: string };
};
type StudioAcceptanceResult =
  | StudioAcceptanceReport
  | { workflow: string; scenarios: StudioAcceptanceReport[] };

function capability(capabilityId: string, executionMode: StudioExecutionMode): StudioCapability {
  return { capabilityId, executionMode, required: true, configuration: {} };
}

function gate(type: StudioGate["type"], label: string): StudioGate {
  return { type, label, required: true };
}

function defaultVariables(kind: StudioNodeKind): StudioVariable[] {
  if (kind === "input") {
    return [
      { id: "matter-summary", label: "Matter summary", value: "", description: "The owner's short description of the matter." },
      { id: "supporting-records", label: "Supporting records", value: "", description: "Records and information needed for this step." },
    ];
  }
  if (kind === "review" || kind === "gate") {
    return [
      { id: "approval-note", label: "Approval note", value: "", description: "The review decision or requested revision." },
    ];
  }
  if (kind === "action") {
    return [
      { id: "delivery-method", label: "Delivery method", value: "Certified mail", description: "The authorized fulfillment option." },
    ];
  }
  return [
    { id: "focus", label: "Focus", value: "", description: "The question this phase should address." },
  ];
}

function sequentialEdges(phases: StudioPhase[]): StudioWorkflow["edges"] {
  return phases.slice(1).map((phase, index) => ({ from: phases[index].id, to: phase.id }));
}

function createInitialWorkflow(): StudioWorkflow {
  const phases: StudioPhase[] = [
    {
      id: "intake",
      title: "Matter intake",
      objective: "Collect the matter information, records, and relevant dates.",
      kind: "input",
      position: { x: 80, y: 80 },
      dependencies: [],
      capabilities: [capability("secure-ingest", "deterministic")],
      gates: [],
      riskLevel: "moderate",
    },
    {
      id: "authority",
      title: "Authority reconstruction",
      objective: "Rebuild the authority graph from source records.",
      kind: "authority",
      position: { x: 80, y: 260 },
      dependencies: ["intake"],
      capabilities: [capability("authority-research", "ai_advisory")],
      gates: [gate("authority", "Verify authority sources")],
      riskLevel: "high",
    },
    {
      id: "review",
      title: "Professional review",
      objective: "Resolve conflicts and approve the proposed next step.",
      kind: "review",
      position: { x: 80, y: 440 },
      dependencies: ["authority"],
      capabilities: [capability("owner-review", "human")],
      gates: [gate("professional-review", "Professional review")],
      riskLevel: "high",
    },
    {
      id: "assessment",
      title: "Final assessment",
      objective: "Produce a sourced, reviewable findings packet.",
      kind: "output",
      position: { x: 80, y: 620 },
      dependencies: ["review"],
      capabilities: [capability("tracking", "deterministic")],
      gates: [],
      riskLevel: "moderate",
    },
  ];
  const workflowPhases = phases.map((phase) => ({
    ...phase,
    variables: defaultVariables(phase.kind),
  }));
  return {
    id: "studio-draft",
    title: "Estate Authority Reconstruction",
    description: "Owner-authored Private Office workflow.",
    objective: "Create a controlled and reviewable workflow.",
    classification: "experimental",
    riskLevel: "high",
    version: 1,
    phases: workflowPhases,
    edges: sequentialEdges(workflowPhases),
    provenancePolicy: {
      requireSourceForFacts: true,
      allowAIInference: true,
      requireHumanVerificationFor: ["authority", "consequential action"],
    },
    mode: "design",
    updatedAt: new Date().toISOString(),
    landingPage: {
      headline: "Bring order and evidence to a complex matter.",
      description:
        "Organize records, trace authority, and prepare a professional, reviewable correspondence packet.",
      primaryAction: "Start this matter",
    },
  };
}

function isWorkflow(value: unknown): value is StudioWorkflow {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StudioWorkflow>;
  return Array.isArray(candidate.phases) && Array.isArray(candidate.edges);
}

function getCapabilityLabel(capabilityId: string): string {
  return capabilityCatalog.find((entry) => entry.id === capabilityId)?.label ?? capabilityId.replaceAll("-", " ");
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}

function getWorkflowTarget(workflow: StudioWorkflow): StudioWorkflowTarget | undefined {
  if (workflow.target) return workflow.target;
  if (!workflow.sourceWorkflowId) return undefined;
  return {
    verticalId: "private-office",
    verticalTitle: "Private Office",
    workflowId: workflow.sourceWorkflowId,
    publicPath: `/workflows/${workflow.sourceWorkflowId}`,
    connection: "connected",
  };
}

function publicationKey(target: StudioWorkflowTarget): string {
  if (target.verticalId === "private-office") {
    return `${PUBLISHED_KEY}${target.workflowId}`;
  }
  return `${ECOSYSTEM_PUBLISHED_KEY}${target.verticalId}:${target.workflowId}`;
}

// Keyed by the Studio workflow's own unique `id` (not its publish target):
// catalog-derived ids are already deterministic per verticalId+workflowId
// (so reopening the same catalog row overwrites its own slot as before), but
// this also covers duplicates and untargeted drafts, which don't have — or
// intentionally share — a target.
function studioDraftKey(workflowId: string): string {
  return `${ECOSYSTEM_DRAFT_KEY}${workflowId}`;
}

function catalogWorkflowKey(verticalId: string, workflowId: string): string {
  return `${verticalId}:${workflowId}`;
}

/**
 * Clones a Studio workflow into a fresh, independent draft: new studio id,
 * "(Copy)" title, decoupled from whatever real Private Office workflow it
 * may have been opened from.
 *
 * The publish target (vertical/workflowId/publicPath) is kept unchanged
 * rather than minted fresh: for the 5 "gold" Private Office workflows, that
 * publicPath is a real, hardcoded TanStack file route (e.g.
 * /workflows/contractor-dispute) — Studio has no way to create a new page at
 * a made-up slug, so a fabricated publicPath would 404 the moment you tried
 * to preview it. Keeping the same target means duplicating is "start a new
 * draft of this page without touching what's published" — Preview/Publish
 * keep working exactly as they did for the original. Local Drafts (below)
 * gives the duplicate its own persisted identity via its unique studio `id`,
 * independent of the shared target.
 */
function duplicateStudioWorkflow(source: StudioWorkflow): StudioWorkflow {
  const suffix = crypto.randomUUID().slice(0, 6);

  return {
    ...source,
    id: `studio-duplicate-${suffix}`,
    title: `${source.title} (Copy)`,
    sourceWorkflowId: undefined,
    updatedAt: new Date().toISOString(),
  };
}

// Known local dev-server origins for verticals other than private-office
// (which runs in-process with Studio, so its own routes are same-origin).
// Not configured -> the preview pane shows "dev server not connected" instead
// of attempting to load anything. Add an entry here once you're running a
// vertical's `pnpm --filter <id> run dev` on a known port.
const VERTICAL_DEV_ORIGINS: Record<string, string> = {};

function devServerOriginForVertical(verticalId: string | undefined): string | null {
  // No verticalId means this node came from the mailmypdf core app, which
  // (unlike private-office) does not run in this process.
  if (!verticalId) return VERTICAL_DEV_ORIGINS.mailmypdf ?? null;
  if (verticalId === "private-office") return "";
  return VERTICAL_DEV_ORIGINS[verticalId] ?? null;
}

type WorkflowSignalTone = "red" | "yellow" | "green";
type CatalogAgentProgress = {
  state: "reviewing" | "draft-ready" | "blocked" | "published";
  summary?: string;
  updatedAt: string;
};

function workflowSignals(
  workflow: StudioCatalogWorkflow,
  target?: StudioWorkflowTarget,
  progress?: CatalogAgentProgress,
): Array<{ label: string; title: string; tone: WorkflowSignalTone }> {
  if (progress?.state === "reviewing") {
    return [
      { label: "B", title: "Claude is reviewing this workflow", tone: "yellow" },
      { label: "P", title: "Page review is in progress", tone: "yellow" },
      { label: "R", title: "Release review is in progress", tone: "yellow" },
    ];
  }
  if (progress?.state === "blocked") {
    return [
      { label: "B", title: progress.summary ?? "Claude could not complete this workflow", tone: "red" },
      { label: "P", title: "User-facing page is not ready", tone: "red" },
      { label: "R", title: "Release is blocked", tone: "red" },
    ];
  }
  if (progress?.state === "draft-ready") {
    return [
      { label: "B", title: "Claude prepared a workflow draft for review", tone: "green" },
      { label: "P", title: "Review and publish the user-facing page", tone: "yellow" },
      { label: "R", title: "Review and publish this Studio draft", tone: "yellow" },
    ];
  }
  if (progress?.state === "published" && target?.connection === "connected") {
    return [
      { label: "B", title: "Build complete", tone: "green" },
      { label: "P", title: "User-facing page live", tone: "green" },
      { label: "R", title: "Studio publication connected", tone: "green" },
    ];
  }
  const buildTone: WorkflowSignalTone =
    workflow.status === "gold" || workflow.status === "authority"
      ? "green"
      : workflow.status === "planned"
        ? "red"
        : "yellow";
  const pageTone: WorkflowSignalTone =
    target?.connection === "connected" && buildTone === "green"
      ? "green"
      : workflow.status === "planned"
        ? "red"
        : "yellow";
  const publishTone: WorkflowSignalTone =
    target?.connection === "connected" && buildTone === "green"
      ? "green"
      : workflow.status === "planned"
        ? "red"
        : "yellow";
  return [
    { label: "B", title: buildTone === "green" ? "Build complete" : buildTone === "yellow" ? "Build in progress or needs verification" : "Planned — not built", tone: buildTone },
    { label: "P", title: pageTone === "green" ? "User-facing page live" : pageTone === "yellow" ? "User-facing page needs connection or verification" : "No user-facing page yet", tone: pageTone },
    { label: "R", title: publishTone === "green" ? "Studio publication connected" : publishTone === "yellow" ? "Studio release is waiting for an app adapter" : "Not ready to publish", tone: publishTone },
  ];
}

const signalClasses: Record<WorkflowSignalTone, string> = {
  green: "border-success/40 bg-success/15 text-success",
  yellow: "border-warning/40 bg-warning/15 text-warning",
  red: "border-error/40 bg-error/15 text-error",
};

function StudioFlowNode({ data }: NodeProps<StudioFlowNode>) {
  const style = nodeStyle[data.phase.kind];
  return (
    <div className={`studio-node ${style.tone} ${data.selected ? "studio-node--selected" : ""}`}>
      <Handle type="target" position={Position.Top} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-charcoal">{data.phase.title}</div>
          <div className="mt-1 text-xs leading-relaxed text-stone">{data.phase.objective}</div>
        </div>
        <GitBranch size={16} className="shrink-0 text-stone-light" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="badge badge-stone">{style.badge}</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-stone">
          {data.phase.gates.some((item) => item.required) ? "Gate required" : "Ready"}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { studioPhase: StudioFlowNode };

function targetForCatalogWorkflow(definition: StudioCatalogWorkflow): StudioWorkflowTarget {
  const vertical = findStudioVertical(definition.verticalId);
  return {
    verticalId: definition.verticalId,
    verticalTitle: vertical?.title ?? definition.verticalId,
    workflowId: definition.id,
    publicPath: definition.publicPath,
    connection: vertical?.connection ?? "adapter-required",
  };
}

function workflowFromCatalog(definition: StudioCatalogWorkflow): StudioWorkflow {
  const target = targetForCatalogWorkflow(definition);
  const phaseRows: Array<{
    id: string;
    title: string;
    objective: string;
    kind: StudioNodeKind;
    capabilities: StudioCapability[];
    gates?: StudioGate[];
  }> = findStepWorkflow(definition.id)?.steps.map((step, index, steps) => ({
    id: step.id,
    title: step.label,
    objective: `Complete the ${step.label.toLowerCase()} step for this workflow.`,
    kind: index === 0 ? "input" : index === steps.length - 1 ? "action" : "analysis",
    capabilities: [],
  })) ?? [
    {
      id: "secure-intake",
      title: "Secure intake",
      objective: "Collect and extract records through the existing secure ingest, classify, extract, and understand stages.",
      kind: "input",
      capabilities: [capability("secure-ingest", "deterministic")],
    },
    {
      id: "facts-and-timeline",
      title: "Facts, provenance, and timeline",
      objective: "Trace each claim to source material and organize dates before any recommendation is made.",
      kind: "analysis",
      capabilities: [capability("fact-provenance", "deterministic"), capability("timeline", "deterministic")],
      gates: [gate("evidence", "Evidence and provenance check")],
    },
    {
      id: "authority-and-evidence",
      title: "Authority and evidence research",
      objective: "Evaluate conflicting evidence and research official authority with the existing research engines.",
      kind: "authority",
      capabilities: [capability("evidence-analysis", "ai_advisory"), capability("authority-research", "ai_advisory")],
      gates: [gate("authority", "Verify authority and evidence")],
    },
    {
      id: "strategy-and-draft",
      title: "Risk, strategy, and draft",
      objective: "Create a sourced strategy and draft correspondence while keeping conclusions reviewable.",
      kind: "analysis",
      capabilities: [
        capability("risk-assessment", "ai_advisory"),
        capability("strategy", "ai_advisory"),
        capability("draft-generation", "ai_advisory"),
        capability("draft-validation", "deterministic"),
      ],
    },
    {
      id: "approval",
      title: "Blocking gates and owner review",
      objective: "Stop for the required evidence, authority, and owner approval before any consequential action.",
      kind: "review",
      capabilities: [capability("owner-review", "human")],
      gates: [gate("human-review", "Owner approval"), gate("consequential-action", "Authorize delivery")],
    },
    {
      id: "delivery-and-proof",
      title: "Authorized delivery and proof",
      objective: "Use the existing payment, fulfillment, tracking, and proof stages only after authorization.",
      kind: "action",
      capabilities: [
        capability("stripe-checkout", "external_service"),
        capability("mailing-submit", "external_service"),
        capability("tracking", "deterministic"),
      ],
      gates: [gate("consequential-action", "Delivery authorization")],
    },
  ];
  const phases = phaseRows.map<StudioPhase>((phase, index) => ({
    ...phase,
    position: { x: 80, y: 80 + index * 180 },
    dependencies: index ? [phaseRows[index - 1].id] : [],
    gates: phase.gates ?? [],
    variables: defaultVariables(phase.kind),
    riskLevel: phase.kind === "action" || phase.kind === "review" ? "high" : "moderate",
  }));
  return {
    id: `studio-${definition.verticalId}-${definition.id}`,
    sourceWorkflowId:
      definition.verticalId === "private-office" ? definition.id : undefined,
    target,
    title: definition.title,
    description: definition.description,
    objective: definition.description,
    classification: "stable",
    riskLevel: "high",
    version: 1,
    phases,
    edges: sequentialEdges(phases),
    provenancePolicy: {
      requireSourceForFacts: true,
      allowAIInference: true,
      requireHumanVerificationFor: ["authority", "consequential action"],
    },
    mode: "design",
    updatedAt: new Date().toISOString(),
    landingPage: {
      headline: definition.title,
      description: definition.description,
      primaryAction: "Start this matter",
    },
  };
}

function applyStudioProposal(
  workflow: StudioWorkflow,
  proposal: StudioProposal,
  request: string,
): StudioWorkflow {
  const phases = createStudioPhases(proposal);
  return {
    ...workflow,
    title: proposal.title,
    description: proposal.explanation,
    objective: request,
    landingPage: proposal.landingPage ?? workflow.landingPage,
    phases,
    edges: sequentialEdges(phases),
    updatedAt: new Date().toISOString(),
  };
}

function EcosystemWorkflowPreview({
  workflow,
  target,
  previewTarget,
}: {
  workflow: StudioWorkflow;
  target: StudioWorkflowTarget;
  previewTarget: "landing" | string;
}) {
  const phase =
    previewTarget === "landing"
      ? undefined
      : workflow.phases.find((item) => item.id === previewTarget);
  const landing = workflow.landingPage ?? {
    headline: workflow.title,
    description: workflow.description,
    primaryAction: "Start now",
  };

  if (!phase) {
    return (
      <div className="h-full overflow-auto bg-ivory p-6 md:p-10">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between border-b border-rule pb-4 text-sm font-semibold text-navy">
            <span>MailMyPDF <span className="text-xs font-medium tracking-wider text-stone">{target.verticalTitle}</span></span>
            <span className="badge badge-stone">Studio draft</span>
          </div>
          <div className="py-14 text-center">
            <div className="section-kicker">{target.verticalTitle}</div>
            <h2 className="mx-auto mt-4 max-w-3xl text-4xl leading-tight text-charcoal">{landing.headline}</h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-stone">{landing.description}</p>
            <button className="btn-brass mt-7">{landing.primaryAction} <Play size={15} /></button>
          </div>
          <div className="rounded-xl border border-rule bg-paper p-5">
            <div className="section-kicker">Guided workflow</div>
            <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {workflow.phases.map((item, index) => (
                <li key={item.id} className="rounded-lg border border-rule bg-ivory p-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy text-xs font-semibold text-paper">{index + 1}</span>
                  <div className="mt-3 text-sm font-semibold text-charcoal">{item.title}</div>
                  <p className="mt-1 text-xs leading-relaxed text-stone">{item.objective}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-ivory p-6 md:p-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between border-b border-rule pb-4 text-sm font-semibold text-navy">
          <span>MailMyPDF <span className="text-xs font-medium tracking-wider text-stone">{target.verticalTitle}</span></span>
          <span className="text-xs text-stone">Phase {workflow.phases.findIndex((item) => item.id === phase.id) + 1} of {workflow.phases.length}</span>
        </div>
        <div className="mt-10 text-center">
          <div className="section-kicker">{workflow.title}</div>
          <h2 className="mt-3 text-4xl text-charcoal">{phase.title}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-stone">{phase.objective}</p>
        </div>
        <section className="mt-8 rounded-xl border border-rule bg-paper p-6 shadow-sm">
          <div className="section-kicker">Complete this step</div>
          {(phase.variables ?? []).length ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {(phase.variables ?? []).map((variable) => (
                <div key={variable.id} className="rounded-lg border border-rule bg-ivory p-3">
                  <div className="text-sm font-medium text-charcoal">{variable.label}</div>
                  <p className="mt-1 text-xs text-stone">{variable.value || variable.description || "Add the information needed for this step."}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-stone">This phase uses the documents, facts, and approvals gathered earlier in the workflow.</p>
          )}
          <button className="btn-brass mt-6 w-full justify-center">Continue <Play size={15} /></button>
        </section>
      </div>
    </div>
  );
}

const treeKindIcon: Partial<Record<StudioTreeNode["kind"], typeof Folder>> = {
  core: WandSparkles,
  "verticals-folder": FolderTree,
  vertical: Folder,
  folder: Folder,
  "workflows-folder": FolderTree,
};

const workflowStatusTone: Record<string, string> = {
  planned: "text-error",
  scaffolded: "text-white/55",
  functional: "text-white/85",
  authority: "text-success",
  gold: "text-success",
};

function ProjectTreeNode({
  node,
  depth,
  expandedPaths,
  onToggle,
  onSelectRoute,
  onSelectWorkflow,
  activePublicPath,
}: {
  node: StudioTreeNode;
  depth: number;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  onSelectRoute: (node: StudioTreeNode) => void;
  onSelectWorkflow: (node: StudioTreeNode) => void;
  activePublicPath: string | null;
}) {
  const hasChildren = Boolean(node.children?.length) || node.kind === "verticals-folder" || node.kind === "core";
  const isExpanded = expandedPaths.has(node.path);
  const Icon = treeKindIcon[node.kind];
  const isActive = Boolean(node.publicPath) && node.publicPath === activePublicPath;
  const isWorkflow = node.kind === "workflow";

  return (
    <div>
      <div className={`flex items-center gap-1 rounded-md px-1 ${isActive ? "bg-white/15" : "hover:bg-white/5"}`} style={{ paddingLeft: depth * 12 }}>
        {hasChildren ? (
          <button onClick={() => onToggle(node.path)} aria-expanded={isExpanded} className="shrink-0 p-1 text-white/45 hover:text-paper">
            <ChevronDown size={12} className={`transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
          </button>
        ) : (
          <span className="w-[22px] shrink-0" />
        )}
        <button
          onClick={() => (isWorkflow ? onSelectWorkflow(node) : onSelectRoute(node))}
          className={`flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-left text-xs ${isActive ? "text-paper" : isWorkflow ? workflowStatusTone[node.status ?? "scaffolded"] : "text-white/75 hover:text-paper"}`}
        >
          {Icon ? <Icon size={12} className="shrink-0" /> : <GitBranch size={11} className="shrink-0" />}
          <span className="min-w-0 flex-1 truncate">{node.label}</span>
          {isWorkflow && node.status && <span className="shrink-0 text-[9px] uppercase tracking-wide opacity-70">{node.status}</span>}
        </button>
      </div>
      {isExpanded && node.children?.map((child) => (
        <ProjectTreeNode
          key={child.path}
          node={child}
          depth={depth + 1}
          expandedPaths={expandedPaths}
          onToggle={onToggle}
          onSelectRoute={onSelectRoute}
          onSelectWorkflow={onSelectWorkflow}
          activePublicPath={activePublicPath}
        />
      ))}
    </div>
  );
}

function CodeTreeNode({
  node,
  depth,
  expandedPaths,
  onToggle,
}: {
  node: StudioFileTreeNode;
  depth: number;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
}) {
  const isDirectory = node.kind === "directory";
  const isExpanded = expandedPaths.has(node.path);

  return (
    <div>
      <div className="flex items-center gap-1 rounded-md px-1 hover:bg-white/5" style={{ paddingLeft: depth * 12 }}>
        {isDirectory ? (
          <button
            onClick={() => onToggle(node.path)}
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${node.label}`}
            className="shrink-0 p-1 text-white/45 hover:text-paper"
          >
            <ChevronDown size={12} className={`transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
          </button>
        ) : (
          <span className="w-[22px] shrink-0" />
        )}
        <span className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-xs text-white/75">
          {isDirectory ? <Folder size={12} className="shrink-0 text-brass" /> : <FileCode2 size={12} className="shrink-0 text-white/45" />}
          <span className="min-w-0 flex-1 truncate">{node.label}</span>
        </span>
      </div>
      {isDirectory && isExpanded && node.children?.map((child) => (
        <CodeTreeNode
          key={child.path}
          node={child}
          depth={depth + 1}
          expandedPaths={expandedPaths}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

function EcosystemVerticalLandingPreview({
  vertical,
  workflows,
  hiddenWorkflowIds,
  onSelectWorkflow,
}: {
  vertical: StudioVertical;
  workflows: StudioCatalogWorkflow[];
  hiddenWorkflowIds: Set<string>;
  onSelectWorkflow: (workflow: StudioCatalogWorkflow) => void;
}) {
  const visibleWorkflows = workflows.filter((workflow) => !hiddenWorkflowIds.has(catalogWorkflowKey(workflow.verticalId, workflow.id)));
  const readyCount = visibleWorkflows.filter((workflow) => workflow.status === "gold" || workflow.status === "authority").length;
  return (
    <div className="h-full overflow-auto bg-ivory p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between border-b border-rule pb-4 text-sm font-semibold text-navy">
          <span>MailMyPDF <span className="text-xs font-medium tracking-wider text-stone">{vertical.title}</span></span>
          <span className="badge badge-stone">Landing page</span>
        </div>
        <div className="py-12 text-center">
          <div className="section-kicker">{vertical.title}</div>
          <h2 className="mx-auto mt-4 max-w-3xl text-4xl leading-tight text-charcoal">A clear path from records to a prepared, reviewable response.</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-stone">Choose a workflow below to see each owner-facing page. This landing page is the front door for the {vertical.title} section of MailMyPDF.</p>
        </div>
        <section className="rounded-xl border border-rule bg-paper p-5">
          <div className="flex items-end justify-between gap-4">
            <div><div className="section-kicker">Workflow directory</div><h3 className="mt-1 text-xl text-charcoal">Choose a page to preview</h3></div>
            <div className="text-right text-xs text-stone"><div>{visibleWorkflows.length} workflows</div><div>{readyCount} ready</div></div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {visibleWorkflows.map((workflow) => (
              <button key={workflow.id} onClick={() => onSelectWorkflow(workflow)} className="rounded-lg border border-rule bg-ivory p-4 text-left transition hover:border-navy hover:bg-paper">
                <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-charcoal">{workflow.title}</span><ChevronDown size={15} className="-rotate-90 shrink-0 text-navy" /></div>
                <p className="mt-2 text-xs leading-relaxed text-stone">{workflow.description}</p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StudioPage() {
  const [history, setHistory] = useState({ past: [] as StudioWorkflow[], current: createInitialWorkflow(), future: [] as StudioWorkflow[] });
  const [selectedId, setSelectedId] = useState("intake");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<"idle" | "building" | "ready" | "error">("idle");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("General");
  const [leftPanelView, setLeftPanelView] = useState<"library" | "claude" | "code" | "agents">("library");
  const [chatMessages, setChatMessages] = useState<StudioChatMessage[]>([
    {
      id: "studio-welcome",
      role: "assistant",
      content: "Tell me what you want to create or change. I will turn it into an editable workflow for the selected vertical.",
    },
  ]);
  const [chatFiles, setChatFiles] = useState<File[]>([]);
  const [catalogProgress, setCatalogProgress] = useState<Record<string, CatalogAgentProgress>>({});
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [studioView, setStudioView] = useState<"preview" | "graph">("preview");
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [expandedWorkflowPhases, setExpandedWorkflowPhases] = useState<Record<string, boolean>>({});
  const [selectedVerticalId, setSelectedVerticalId] = useState<string | null>(null);
  const [selectedVerticalPage, setSelectedVerticalPage] = useState<"landing" | string>("landing");
  const [previewTarget, setPreviewTarget] = useState<"landing" | string>("landing");
  const [expandedVerticals, setExpandedVerticals] = useState<Record<string, boolean>>({
    "private-office": true,
  });
  const [expandedWorkflowFolders, setExpandedWorkflowFolders] = useState<Record<string, boolean>>({
    "private-office": true,
  });
  const [traceEvents, setTraceEvents] = useState<TraceEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [capabilityToAdd, setCapabilityToAdd] = useState(capabilityCatalog[0].id);
  const [localDrafts, setLocalDrafts] = useState<{ key: string; workflow: StudioWorkflow }[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(studioProjects[0]?.id ?? null);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [isRecentProjectsOpen, setIsRecentProjectsOpen] = useState(false);
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [hiddenWorkflowIds, setHiddenWorkflowIds] = useState<Set<string>>(() => readHiddenWorkflowIds());
  const activeProject = studioProjects.find((project) => project.id === activeProjectId) ?? null;
  const [codeTree, setCodeTree] = useState<StudioFileTreeNode | null>(null);
  const [isCodeTreeLoading, setIsCodeTreeLoading] = useState(false);
  const [liveCatalog, setLiveCatalog] = useState<StudioCatalogWorkflow[] | null>(null);
  const catalog = liveCatalog ?? studioCatalog;
  const [acceptanceRun, setAcceptanceRun] = useState<{
    workflowId: string;
    status: "running" | "done" | "error";
    scenario: string;
    reports?: StudioAcceptanceReport[];
    error?: string;
  } | null>(null);
  const [agentRuns, setAgentRuns] = useState<RunState[]>([]);
  const [agentProviderAvailability, setAgentProviderAvailability] = useState<{ claude: boolean; codex: boolean } | null>(null);
  const [agentVerticalId, setAgentVerticalId] = useState<string>("");
  const [agentWorkflowId, setAgentWorkflowId] = useState<string>("");
  const [agentInstructions, setAgentInstructions] = useState("");
  const [agentBuilderProvider, setAgentBuilderProvider] = useState<AgentProviderName>("codex");
  const [agentReviewerProvider, setAgentReviewerProvider] = useState<AgentProviderName>("codex");
  const [agentBuilderModel, setAgentBuilderModel] = useState("");
  const [agentReviewerModel, setAgentReviewerModel] = useState("");
  const [agentLaunchError, setAgentLaunchError] = useState<string | null>(null);
  const [isLaunchingAgentRun, setIsLaunchingAgentRun] = useState(false);
  const [expandedAgentRunId, setExpandedAgentRunId] = useState<string | null>(null);
  const [agentRunLog, setAgentRunLog] = useState<Record<string, string[]>>({});
  const [expandedCodePaths, setExpandedCodePaths] = useState<Set<string>>(() => new Set([""]));
  const [previewSource, setPreviewSource] = useState<
    { kind: "route"; publicPath: string; verticalId?: string; label: string } | null
  >(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "checking" | "syncing">("idle");
  const [publishStatus, setPublishStatus] = useState<"idle" | "publishing">("idle");
  const workflow = history.current;
  const workflowTarget = getWorkflowTarget(workflow);
  const targetCatalogEntry = workflowTarget
    ? catalog.find((row) => row.verticalId === workflowTarget.verticalId && row.id === workflowTarget.workflowId)
    : undefined;
  const selected = workflow.phases.find((phase) => phase.id === selectedId) ?? workflow.phases[0];
  const landingPage = workflow.landingPage ?? {
    headline: workflow.title,
    description: workflow.description,
    primaryAction: "Start this matter",
  };
  const findings = useMemo(() => validateStudioWorkflow(workflow), [workflow]);
  const blockingFindings = findings.filter((finding) => finding.severity === "critical");
  const flowNodes = useMemo<StudioFlowNode[]>(() => workflow.phases.map((phase) => ({
    id: phase.id,
    type: "studioPhase",
    position: phase.position,
    data: { phase, selected: phase.id === selectedId },
  })), [selectedId, workflow.phases]);
  const flowEdges = useMemo<Edge[]>(() => workflow.edges.map((edge) => ({
    id: `${edge.from}-${edge.to}`,
    source: edge.from,
    target: edge.to,
    label: edge.condition,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed, color: "#8b8173" },
    style: { stroke: "#8b8173", strokeWidth: 1.4 },
  })), [workflow.edges]);
  useEffect(() => {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as unknown;
      if (!isWorkflow(saved) || saved.phases.length === 0) throw new Error();
      setHistory({ past: [], current: saved, future: [] });
      setSelectedId(saved.phases[0].id);
      setStatus("ready");
      setMessage("Restored your saved Studio draft.");
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  }, []);

  useEffect(() => {
    const raw = window.localStorage.getItem(AGENT_PROGRESS_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as unknown;
      if (saved && typeof saved === "object" && !Array.isArray(saved)) {
        setCatalogProgress(saved as Record<string, CatalogAgentProgress>);
      }
    } catch {
      window.localStorage.removeItem(AGENT_PROGRESS_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(AGENT_PROGRESS_KEY, JSON.stringify(catalogProgress));
  }, [catalogProgress]);

  useEffect(() => {
    if (workflowTarget?.verticalId !== "private-office") return;
    window.localStorage.setItem(
      `${PREVIEW_KEY}${workflowTarget.workflowId}`,
      JSON.stringify(workflow),
    );
  }, [workflow, workflowTarget]);

  useEffect(() => {
    window.localStorage.setItem(studioDraftKey(workflow.id), JSON.stringify(workflow));
    refreshLocalDrafts();
  }, [workflow]);

  useEffect(() => {
    refreshLocalDrafts();
  }, []);

  /**
   * Every targeted workflow (from "New workflow in vertical", opening a
   * catalog workflow, or Duplicate) autosaves to its own ECOSYSTEM_DRAFT_KEY
   * slot above. Without this, that autosave is invisible the moment you
   * navigate away — this scans localStorage so those drafts stay discoverable
   * and reopenable instead of silently orphaned.
   */
  function refreshLocalDrafts() {
    const entries: { key: string; workflow: StudioWorkflow }[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || !key.startsWith(ECOSYSTEM_DRAFT_KEY)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (!isWorkflow(parsed) || parsed.phases.length === 0) continue;
        if (parsed.id === workflow.id) continue; // already the open workflow
        entries.push({ key, workflow: parsed });
      } catch {
        window.localStorage.removeItem(key);
      }
    }
    entries.sort((a, b) => (b.workflow.updatedAt ?? "").localeCompare(a.workflow.updatedAt ?? ""));
    setLocalDrafts(entries);
  }

  function openLocalDraft(entry: { key: string; workflow: StudioWorkflow }) {
    commit(() => entry.workflow);
    setSelectedId(entry.workflow.phases[0]?.id ?? "intake");
    setPreviewTarget("landing");
    setSelectedVerticalId(null);
    setPreviewSource(null);
    setStatus("ready");
    setMessage(`Reopened "${entry.workflow.title}".`);
  }

  function discardLocalDraft(entry: { key: string; workflow: StudioWorkflow }) {
    window.localStorage.removeItem(entry.key);
    refreshLocalDrafts();
    setMessage(`Discarded the local draft "${entry.workflow.title}".`);
  }

  function commit(change: (current: StudioWorkflow) => StudioWorkflow) {
    setHistory((previous) => {
      const next = change(previous.current);
      if (next === previous.current) return previous;
      return {
        past: [...previous.past.slice(-29), previous.current],
        current: { ...next, updatedAt: new Date().toISOString() },
        future: [],
      };
    });
  }

  function undo() {
    setHistory((previous) => {
      const prior = previous.past.at(-1);
      if (!prior) return previous;
      setSelectedId(prior.phases[0]?.id ?? "");
      return { past: previous.past.slice(0, -1), current: prior, future: [previous.current, ...previous.future] };
    });
  }

  function redo() {
    setHistory((previous) => {
      const next = previous.future[0];
      if (!next) return previous;
      setSelectedId(next.phases[0]?.id ?? "");
      return { past: [...previous.past, previous.current], current: next, future: previous.future.slice(1) };
    });
  }

  async function buildWorkflow(event: React.FormEvent) {
    event.preventDefault();
    const userRequest = prompt.trim();
    if (!userRequest || status === "building") return;
    const attachedFiles = chatFiles;
    setChatMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: userRequest,
        attachments: attachedFiles.map((file) => file.name),
      },
    ]);
    setStatus("building");
    setMessage("Claude is designing the workflow…");
    try {
      const attachmentContext = await Promise.all(
        attachedFiles.map(async (file) => {
          const canReadText = file.type.startsWith("text/") || /\.(csv|json|md|txt)$/i.test(file.name);
          if (!canReadText) return `${file.name} (${file.type || "attached file"}, ${file.size} bytes)`;
          const excerpt = (await file.text()).slice(0, 12_000);
          return `${file.name}:\n${excerpt}`;
        }),
      );
      const messageForClaude = attachmentContext.length
        ? `${userRequest}\n\nAttached context:\n${attachmentContext.join("\n\n")}`
        : userRequest;
      const response = await fetch("/api/studio/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: messageForClaude,
          currentWorkflow: {
            title: workflow.title,
            objective: workflow.objective,
            sourceWorkflowId: workflow.sourceWorkflowId,
            landingPage,
            phases: workflow.phases.map((phase) => ({
              id: phase.id,
              title: phase.title,
              objective: phase.objective,
              kind: phase.kind,
              variables: phase.variables,
              capabilities: phase.capabilities.map((item) => ({ capabilityId: item.capabilityId, executionMode: item.executionMode })),
            })),
          },
        }),
      });
      const data = (await response.json()) as { proposal?: StudioProposal; error?: string };
      if (!response.ok || !data.proposal) throw new Error(data.error ?? "Claude did not return a workflow.");
      const phases = createStudioPhases(data.proposal);
      commit(() => ({
        ...workflow,
        title: data.proposal!.title,
        description: data.proposal!.explanation,
        objective: userRequest,
        landingPage: data.proposal!.landingPage ?? landingPage,
        phases,
        edges: sequentialEdges(phases),
      }));
      setSelectedId(phases[0].id);
      setStatus("ready");
      setMessage(data.proposal.explanation);
      setChatMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", content: data.proposal!.explanation },
      ]);
      setPrompt("");
      setChatFiles([]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Studio request failed.";
      setStatus("error");
      setMessage(errorMessage);
      setChatMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", content: errorMessage },
      ]);
    }
  }

  function newWorkflow() {
    const next = createInitialWorkflow();
    commit(() => next);
    setSelectedId(next.phases[0].id);
    setPreviewTarget(next.phases[0].id);
    setPrompt("");
    setStatus("ready");
    setMessage("Started a new Studio workflow.");
  }

  function startWorkflowInVertical(vertical: StudioVertical) {
    const next = createInitialWorkflow();
    const workflowId = `new-${crypto.randomUUID().slice(0, 8)}`;
    const target: StudioWorkflowTarget = {
      verticalId: vertical.id,
      verticalTitle: vertical.title,
      workflowId,
      publicPath: `/workflows/${workflowId}`,
      connection: vertical.connection,
    };
    const targetedWorkflow: StudioWorkflow = {
      ...next,
      id: `studio-${vertical.id}-${workflowId}`,
      title: `New ${vertical.title} workflow`,
      description: "A new workflow being designed in Studio.",
      objective: "Create a controlled, reviewable workflow.",
      target,
      sourceWorkflowId: undefined,
      landingPage: {
        headline: `Start your ${vertical.title} workflow`,
        description: "A clear guided process built around the records and decisions that matter.",
        primaryAction: "Start now",
      },
    };
    commit(() => targetedWorkflow);
    setSelectedId(targetedWorkflow.phases[0].id);
    setPreviewTarget("landing");
    setTab("Landing");
    setStatus("ready");
    setMessage(`Started a new workflow in ${vertical.title}.`);
  }

  function openCatalogWorkflow(definition: StudioCatalogWorkflow) {
    const next = workflowFromCatalog(definition);
    commit(() => next);
    setSelectedId(next.phases[0].id);
    setPreviewTarget("landing");
    setSelectedVerticalId(definition.verticalId);
    setSelectedVerticalPage(definition.id);
    setPreviewSource(null);
    setExpandedWorkflowPhases((current) => ({
      ...current,
      [catalogWorkflowKey(definition.verticalId, definition.id)]: false,
    }));
    setStatus("ready");
    setMessage(`Opened ${definition.title} in ${next.target?.verticalTitle ?? "Studio"}.`);
  }

  /** Duplicates the workflow currently open in the editor (header toolbar action). */
  function duplicateCurrentWorkflow() {
    const duplicated = duplicateStudioWorkflow(workflow);
    commit(() => duplicated);
    setSelectedId(duplicated.phases[0]?.id ?? selectedId);
    setPreviewTarget("landing");
    setPreviewSource(null);
    setSelectedVerticalId(null);
    setStatus("ready");
    setMessage(
      duplicated.target
        ? `Duplicated "${workflow.title}" as "${duplicated.title}", now open as your current workflow. It's saved to Local Drafts; Publish will update the same ${duplicated.target.verticalTitle} page as the original once you're ready.`
        : `Duplicated "${workflow.title}" as "${duplicated.title}", now open as your current workflow and saved to Local Drafts.`,
    );
  }

  /** Duplicates a workflow straight from the library, without first opening it. */
  function duplicateCatalogWorkflow(definition: StudioCatalogWorkflow) {
    const duplicated = duplicateStudioWorkflow(workflowFromCatalog(definition));
    commit(() => duplicated);
    setSelectedId(duplicated.phases[0]?.id ?? "intake");
    setPreviewTarget("landing");
    setSelectedVerticalId(null);
    setPreviewSource(null);
    setStatus("ready");
    setMessage(
      `Duplicated "${definition.title}" as "${duplicated.title}", now open as your current workflow. It's saved to Local Drafts; Publish will update the same ${definition.title} page as the original once you're ready.`,
    );
  }

  function initiateClaudeBuild(definition: StudioCatalogWorkflow) {
    const next = workflowFromCatalog(definition);
    const workflowKey = catalogWorkflowKey(definition.verticalId, definition.id);
    commit(() => next);
    setSelectedId(next.phases[0].id);
    setPreviewTarget("landing");
    setLeftPanelView("claude");
    setStatus("ready");
    setPrompt(`I want to build ${definition.title}. Help me define the primary keyword, secondary long-tail keywords, research scope, landing page, workflow pages, and required uploads.`);
    setChatMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Let’s shape ${definition.title} together. First, what primary keyword should this workflow own? I’ll suggest secondary long-tail keywords, then research the governing authority and determine whether owners need one source document or multiple uploads—such as the original notice, any response deadline, and supporting records.`,
      },
    ]);
    setMessage(`Claude is ready to plan ${definition.title} with you.`);
    setCatalogProgress((current) => ({ ...current, [workflowKey]: { state: "reviewing", updatedAt: new Date().toISOString() } }));
  }

  function toggleVertical(verticalId: string) {
    setExpandedVerticals((current) => ({ ...current, [verticalId]: !current[verticalId] }));
  }

  function openVerticalLanding(verticalId: string) {
    const vertical = findStudioVertical(verticalId);
    setSelectedVerticalId(verticalId);
    setSelectedVerticalPage("landing");
    setPreviewSource({
      kind: "route",
      publicPath: "/",
      verticalId,
      label: vertical?.title ?? "Vertical landing page",
    });
    setStudioView("preview");
    setPreviewTarget("landing");
    setIsInspectorOpen(false);
  }

  function openVerticalWorkflowIndex(verticalId: string) {
    setSelectedVerticalId(verticalId);
    setSelectedVerticalPage("workflows-index");
    setPreviewSource(null);
    setStudioView("preview");
    setIsInspectorOpen(false);
  }

  function toggleWorkflowFolder(verticalId: string) {
    setExpandedWorkflowFolders((current) => ({ ...current, [verticalId]: !current[verticalId] }));
  }

  function toggleWorkflowVisibility(workflowId: string) {
    setHiddenWorkflowIds((current) => {
      const next = new Set(current);
      if (next.has(workflowId)) next.delete(workflowId);
      else next.add(workflowId);
      writeHiddenWorkflowIds(next);
      return next;
    });
  }

  function replaceCodeDirectory(
    current: StudioFileTreeNode | null,
    path: string,
    replacement: StudioFileTreeNode,
  ): StudioFileTreeNode | null {
    if (!current) return path === "" ? replacement : null;
    if (current.path === path) return replacement;
    if (!current.children) return current;
    return {
      ...current,
      children: current.children.map((child) => replaceCodeDirectory(child, path, replacement) ?? child),
    };
  }

  async function loadCodeDirectory(path = "", showLoading = true) {
    if (!activeProject) return;
    if (showLoading) setIsCodeTreeLoading(true);
    try {
      const directory = await scanProjectFiles({ data: { projectId: activeProject.id, path: path || undefined } });
      setCodeTree((current) => replaceCodeDirectory(current, path, directory));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to read the project files.");
      setStatus("error");
    } finally {
      if (showLoading) setIsCodeTreeLoading(false);
    }
  }

  async function refreshCodeTree() {
    if (!activeProject) return;
    const paths = [...new Set(["", ...expandedCodePaths])];
    setIsCodeTreeLoading(true);
    try {
      const directories = await Promise.all(
        paths.map(async (path) => ({ path, directory: await scanProjectFiles({ data: { projectId: activeProject.id, path: path || undefined } }) })),
      );
      setCodeTree((current) => directories.reduce(
        (tree, { path, directory }) => replaceCodeDirectory(tree, path, directory),
        current,
      ));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to refresh the project files.");
      setStatus("error");
    } finally {
      setIsCodeTreeLoading(false);
    }
  }

  useEffect(() => {
    if (leftPanelView !== "code") return;
    void refreshCodeTree();
    const interval = window.setInterval(() => void refreshCodeTree(), 5000);
    return () => window.clearInterval(interval);
    // The current expansion set intentionally determines which directories are refreshed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leftPanelView, expandedCodePaths]);

  // Keeps the workflow catalog in sync with the actual route-file tree — same
  // poll-while-visible pattern as refreshCodeTree above, so a workflow route
  // added or removed anywhere in the monorepo shows up here within ~5s.
  useEffect(() => {
    if (leftPanelView !== "library") return;
    let cancelled = false;
    async function refresh() {
      try {
        const next = await scanWorkflowCatalog();
        if (!cancelled) setLiveCatalog(next);
      } catch {
        // Keep showing the last-known (or static) catalog on a transient failure.
      }
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [leftPanelView]);

  async function runAcceptanceTest(workflowId: string, scenario: string) {
    setAcceptanceRun({ workflowId, scenario, status: "running" });
    try {
      const response = await fetch("/api/studio/acceptance/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(scenario === "all" ? { workflowId } : { workflowId, scenario }),
      });
      const data = (await response.json()) as StudioAcceptanceResult & { error?: string };
      if (!response.ok || data.error) {
        setAcceptanceRun({ workflowId, scenario, status: "error", error: data.error ?? "The acceptance test failed to run." });
        return;
      }
      const reports = "scenarios" in data ? data.scenarios : [data];
      setAcceptanceRun({ workflowId, scenario, status: "done", reports });
    } catch (error) {
      setAcceptanceRun({
        workflowId,
        scenario,
        status: "error",
        error: error instanceof Error ? error.message : "The acceptance test failed to run.",
      });
    }
  }

  useEffect(() => {
    if (leftPanelView !== "agents") return;
    let cancelled = false;
    async function refresh() {
      try {
        const response = await fetch("/api/studio/agents/runs");
        const data = (await response.json()) as { runs: RunState[]; availability: { claude: boolean; codex: boolean } };
        if (!cancelled) {
          setAgentRuns(data.runs);
          setAgentProviderAvailability(data.availability);
        }
      } catch {
        // Keep showing the last-known run list on a transient failure.
      }
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [leftPanelView]);

  useEffect(() => {
    if (!expandedAgentRunId) return;
    const source = new EventSource(`/api/studio/agents/stream?runId=${encodeURIComponent(expandedAgentRunId)}`);
    source.onmessage = (event) => {
      setAgentRunLog((current) => ({
        ...current,
        [expandedAgentRunId]: [...(current[expandedAgentRunId] ?? []), event.data],
      }));
    };
    return () => source.close();
  }, [expandedAgentRunId]);

  async function launchAgentRun() {
    setAgentLaunchError(null);
    if (!agentVerticalId || !agentWorkflowId || !agentInstructions.trim()) {
      setAgentLaunchError("Pick a vertical and workflow, and describe the task.");
      return;
    }
    setIsLaunchingAgentRun(true);
    try {
      const target = catalog.find((row) => row.verticalId === agentVerticalId && row.id === agentWorkflowId);
      const response = await fetch("/api/studio/agents/launch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          verticalId: agentVerticalId,
          workflowId: agentWorkflowId,
          instructions: agentInstructions.trim(),
          publicPath: target?.publicPath,
          builderProvider: agentBuilderProvider,
          reviewerProvider: agentReviewerProvider,
          builderModel: agentBuilderModel.trim() || undefined,
          reviewerModel: agentReviewerModel.trim() || undefined,
        }),
      });
      const data = (await response.json()) as { runId?: string; error?: string };
      if (!response.ok || data.error) {
        setAgentLaunchError(data.error ?? "The run could not be launched.");
        return;
      }
      setAgentInstructions("");
      setExpandedAgentRunId(data.runId ?? null);
    } catch (error) {
      setAgentLaunchError(error instanceof Error ? error.message : "The run could not be launched.");
    } finally {
      setIsLaunchingAgentRun(false);
    }
  }

  async function stopAgentRun(runId: string) {
    await fetch("/api/studio/agents/stop", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ runId }),
    });
  }

  function toggleCodePath(path: string) {
    const isExpanded = expandedCodePaths.has(path);
    setExpandedCodePaths((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
    if (!isExpanded) void loadCodeDirectory(path, false);
  }

  function toggleTreePath(path: string) {
    setExpandedTreePaths((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function openTreeRoute(node: StudioTreeNode) {
    if (!node.publicPath) return;
    setStudioView("preview");
    setSelectedVerticalId(null);
    setPreviewSource({ kind: "route", publicPath: node.publicPath, verticalId: node.verticalId, label: node.label });
    setIsInspectorOpen(false);
  }

  function openTreeWorkflow(node: StudioTreeNode) {
    const definition = catalog.find(
      (row) => row.verticalId === node.verticalId && row.publicPath === node.publicPath,
    );
    if (!definition) return;
    setPreviewSource(null);
    openCatalogWorkflow(definition);
  }

  async function syncWithGithub() {
    if (!activeProject) return;
    setSyncStatus("checking");
    try {
      const check = await syncProjectToGithub({ data: { projectId: activeProject.id } });
      if (!check.synced && check.files.length === 0) {
        setMessage(check.message);
        setStatus("ready");
        return;
      }
      const confirmed = window.confirm(
        `${check.message}\n\n${check.files.slice(0, 20).join("\n")}${check.files.length > 20 ? `\n…and ${check.files.length - 20} more` : ""}\n\nPush to GitHub now?`,
      );
      if (!confirmed) {
        setSyncStatus("idle");
        return;
      }
      setSyncStatus("syncing");
      const result = await syncProjectToGithub({ data: { projectId: activeProject.id, confirmed: true } });
      setMessage(result.message);
      setStatus(result.synced ? "ready" : "error");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "GitHub sync failed.");
      setStatus("error");
    } finally {
      setSyncStatus("idle");
    }
  }

  async function publishToCloudflare() {
    if (!activeProject) return;
    if (!workflowTarget) {
      setMessage("Choose a vertical workflow before publishing to Cloudflare.");
      return;
    }
    setPublishStatus("publishing");
    try {
      const check = await publishProjectToCloudflare({
        data: { projectId: activeProject.id, verticalId: workflowTarget.verticalId },
      });
      if (!check.deployed) {
        const shouldConfirm = check.message.includes("Confirm to proceed");
        if (!shouldConfirm || !window.confirm(check.message)) {
          setMessage(check.message);
          setStatus(shouldConfirm ? "ready" : "error");
          return;
        }
        const result = await publishProjectToCloudflare({
          data: { projectId: activeProject.id, verticalId: workflowTarget.verticalId, confirmed: true },
        });
        setMessage(result.message);
        setStatus(result.deployed ? "ready" : "error");
        return;
      }
      setMessage(check.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Cloudflare publish failed.");
      setStatus("error");
    } finally {
      setPublishStatus("idle");
    }
  }

  function addPhase() {
    const id = `phase-${crypto.randomUUID().slice(0, 8)}`;
    const previous = workflow.phases.at(-1);
    const phase: StudioPhase = {
      id,
      title: "New phase",
      objective: "Describe the work this phase must complete.",
      kind: "analysis",
      position: { x: 80, y: 80 + workflow.phases.length * 180 },
      dependencies: previous ? [previous.id] : [],
      capabilities: [],
      gates: [],
      riskLevel: "moderate",
      variables: defaultVariables("analysis"),
    };
    commit((current) => ({ ...current, phases: [...current.phases, phase], edges: previous ? [...current.edges, { from: previous.id, to: id }] : current.edges }));
    setSelectedId(id);
    setPreviewTarget(id);
    setTab("General");
  }

  function updateSelected(changes: Partial<StudioPhase>) {
    commit((current) => ({ ...current, phases: current.phases.map((phase) => phase.id === selected.id ? { ...phase, ...changes } : phase) }));
  }

  function updateLanding(
    changes: Partial<NonNullable<StudioWorkflow["landingPage"]>>,
  ) {
    commit((current) => ({
      ...current,
      landingPage: { ...landingPage, ...changes },
    }));
  }

  function addVariable() {
    const id = `variable-${crypto.randomUUID().slice(0, 8)}`;
    updateSelected({
      variables: [
        ...(selected.variables ?? []),
        { id, label: "New variable", value: "", description: "" },
      ],
    });
  }

  function updateVariable(index: number, changes: Partial<StudioVariable>) {
    updateSelected({
      variables: (selected.variables ?? []).map((variable, variableIndex) =>
        variableIndex === index ? { ...variable, ...changes } : variable,
      ),
    });
  }

  function removeVariable(index: number) {
    updateSelected({
      variables: (selected.variables ?? []).filter(
        (_, variableIndex) => variableIndex !== index,
      ),
    });
  }

  function removeSelected() {
    if (workflow.phases.length <= 1) return;
    const index = workflow.phases.findIndex((phase) => phase.id === selected.id);
    const prior = workflow.phases[index - 1];
    const next = workflow.phases[index + 1];
    commit((current) => {
      const withoutPhase = current.phases.filter((phase) => phase.id !== selected.id);
      const withoutEdges = current.edges.filter((edge) => edge.from !== selected.id && edge.to !== selected.id);
      const bridge = prior && next && !withoutEdges.some((edge) => edge.from === prior.id && edge.to === next.id) ? [{ from: prior.id, to: next.id }] : [];
      return {
        ...current,
        phases: withoutPhase.map((phase, position) => ({ ...phase, dependencies: phase.id === next?.id && prior ? [prior.id] : phase.dependencies, position: { ...phase.position, y: 80 + position * 180 } })),
        edges: [...withoutEdges, ...bridge],
      };
    });
    setSelectedId((next ?? prior).id);
    setTab("General");
  }

  function addCapability() {
    const entry = capabilityCatalog.find((candidate) => candidate.id === capabilityToAdd);
    if (!entry || selected.capabilities.some((item) => item.capabilityId === entry.id)) return;
    updateSelected({ capabilities: [...selected.capabilities, capability(entry.id, entry.mode)] });
  }

  function removeCapability(capabilityId: string) {
    updateSelected({ capabilities: selected.capabilities.filter((item) => item.capabilityId !== capabilityId) });
  }

  function addGate() {
    updateSelected({ gates: [...selected.gates, gate("human-review", "Owner approval")] });
  }

  function updateGate(index: number, changes: Partial<StudioGate>) {
    updateSelected({ gates: selected.gates.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item) });
  }

  function removeGate(index: number) {
    updateSelected({ gates: selected.gates.filter((_, itemIndex) => itemIndex !== index) });
  }

  function saveWorkflow() {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(workflow));
    setStatus("ready");
    setMessage("Saved this Studio workflow on this device.");
  }

  function previewWorkflow() {
    if (!workflowTarget) {
      setStatus("error");
      setMessage("Choose a vertical workflow before opening its preview.");
      return;
    }
    if (workflowTarget.verticalId !== "private-office") {
      setStatus("ready");
      setMessage(`The Studio preview is open here. ${workflowTarget.verticalTitle} will receive its full-page preview when its adapter is connected.`);
      return;
    }
    window.localStorage.setItem(`${PREVIEW_KEY}${workflowTarget.workflowId}`, JSON.stringify(workflow));
    window.open(`${workflowTarget.publicPath}?studioPreview=draft`, "_blank", "noopener,noreferrer");
    setStatus("ready");
    setMessage("Opened the unpublished workflow preview in a new tab.");
  }

  function publishWorkflow() {
    if (!workflowTarget) {
      setStatus("error");
      setMessage("Choose a vertical workflow before publishing.");
      return;
    }
    if (blockingFindings.length) {
      setStatus("error");
      setMessage("Resolve the critical validation items before publishing.");
      return;
    }
    window.localStorage.setItem(publicationKey(workflowTarget), JSON.stringify(workflow));
    setStatus("ready");
    setMessage(
      workflowTarget.connection === "connected"
        ? `Published to the ${workflowTarget.verticalTitle} workflow on this device.`
        : `Published a release for ${workflowTarget.verticalTitle}. Its app adapter will deliver this release to ${workflowTarget.publicPath}.`,
    );
  }

  function showValidation() {
    if (!findings.length) {
      setStatus("ready");
      setMessage("Validation passed. This workflow is ready to preview.");
      return;
    }
    setStatus("error");
    setMessage(`${findings.length} validation item${findings.length === 1 ? "" : "s"} found. Review the inspector.`);
    setTab("Gates");
  }

  function onConnect(connection: Connection) {
    if (!connection.source || !connection.target || connection.source === connection.target) return;
    commit((current) => {
      if (current.edges.some((edge) => edge.from === connection.source && edge.to === connection.target)) return current;
      return {
        ...current,
        phases: current.phases.map((phase) => phase.id === connection.target ? { ...phase, dependencies: [...new Set([...phase.dependencies, connection.source!])] } : phase),
        edges: [...current.edges, { from: connection.source, to: connection.target }],
      };
    });
  }

  function onNodesChange(changes: NodeChange<StudioFlowNode>[]) {
    const positions = new Map<string, { x: number; y: number }>();
    for (const change of changes) {
      if (change.type === "position" && change.position) {
        positions.set(change.id, change.position);
      }
    }
    if (!positions.size) return;
    commit((current) => ({
      ...current,
      phases: current.phases.map((phase) => {
        const position = positions.get(phase.id);
        return position ? { ...phase, position } : phase;
      }),
    }));
  }

  async function streamPhase(phase: StudioPhase, reset = false) {
    if (reset) setTraceEvents([]);
    const response = await fetch("/api/studio/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: phase.id,
        title: phase.title,
        objective: phase.objective,
        kind: phase.kind,
        capabilities: phase.capabilities.map((item) => ({ capabilityId: item.capabilityId, executionMode: item.executionMode })),
        gates: phase.gates,
      }),
    });
    if (!response.ok || !response.body) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? "Studio could not start this phase.");
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const messages = buffer.split("\n\n");
      buffer = messages.pop() ?? "";
      for (const message of messages) {
        const line = message.split("\n").find((candidate) => candidate.startsWith("data: "));
        if (!line) continue;
        try {
          setTraceEvents((current) => [...current, JSON.parse(line.slice(6)) as TraceEvent]);
        } catch {
          // Ignore a malformed trace event; a full error event follows from the server.
        }
      }
    }
  }

  async function runSelectedPhase() {
    if (isRunning) return;
    setTab("Run");
    setIsRunning(true);
    try {
      await streamPhase(selected, true);
    } catch (error) {
      setTraceEvents((current) => [...current, { id: crypto.randomUUID(), at: new Date().toISOString(), type: "phase.failed", label: "Phase execution stopped", detail: error instanceof Error ? error.message : "Studio execution failed." }]);
    } finally {
      setIsRunning(false);
    }
  }

  async function simulateWorkflow() {
    if (isRunning) return;
    setTab("Run");
    setIsRunning(true);
    setTraceEvents([]);
    try {
      for (const phase of workflow.phases) {
        setSelectedId(phase.id);
        await streamPhase(phase);
      }
    } catch (error) {
      setTraceEvents((current) => [...current, { id: crypto.randomUUID(), at: new Date().toISOString(), type: "workflow.failed", label: "Workflow simulation stopped", detail: error instanceof Error ? error.message : "Studio execution failed." }]);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main className="min-h-screen bg-ivory text-charcoal">
      <div className={`grid min-h-screen grid-cols-1 ${isInspectorOpen ? "sm:grid-cols-[64px_minmax(0,1fr)_360px]" : "sm:grid-cols-[64px_minmax(0,1fr)]"}`}>
        <aside className="flex min-h-[400px] flex-col border-b border-rule bg-[#202b39] text-paper sm:z-20 sm:min-h-0 sm:w-16 sm:min-w-0 sm:overflow-hidden sm:border-b-0 sm:border-r sm:transition-[width] sm:duration-200 sm:ease-out sm:hover:w-[300px] sm:focus-within:w-[300px]">
          <div className="border-b border-white/10 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="relative">
                <button
                  onClick={() => setIsProjectMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={isProjectMenuOpen}
                  className="flex items-center gap-2 rounded px-1 py-1 text-sm font-medium hover:bg-white/10"
                >
                  <img src="/studio-logo.png" alt="" className="h-7 w-7 object-contain" />
                  Studio <ChevronDown size={14} className={`transition-transform ${isProjectMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {isProjectMenuOpen && (
                  <div role="menu" className="absolute left-0 top-full z-30 mt-2 w-60 rounded-md border border-white/15 bg-[#18222f] p-1 shadow-xl">
                    <button role="menuitem" onClick={() => { setIsProjectMenuOpen(false); setIsNewProjectDialogOpen(true); }} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs text-white/85 hover:bg-white/10"><Plus size={14} /> New project…</button>
                    <div className="relative">
                      <button role="menuitem" onClick={() => setIsRecentProjectsOpen((open) => !open)} className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-xs text-white/85 hover:bg-white/10"><span>Recent projects</span><ChevronDown size={13} className="-rotate-90" /></button>
                      {isRecentProjectsOpen && (
                        <div role="menu" className="absolute left-full top-0 z-40 ml-1 w-52 rounded-md border border-white/15 bg-[#18222f] p-1 shadow-xl">
                          {studioProjects.map((project) => <button key={project.id} role="menuitem" onClick={() => { setActiveProjectId(project.id); setIsProjectMenuOpen(false); setIsRecentProjectsOpen(false); }} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-xs text-white/85 hover:bg-white/10"><Folder size={13} className="text-brass" />{project.name}</button>)}
                        </div>
                      )}
                    </div>
                    <div className="my-1 border-t border-white/10" />
                    <div className="flex items-center gap-2 rounded px-3 py-2 text-xs text-white"><Check size={14} className="text-brass" /> {activeProject?.name ?? "No project open"}</div>
                    {activeProject && <button role="menuitem" onClick={() => { setActiveProjectId(null); setIsProjectMenuOpen(false); }} className="w-full rounded px-3 py-2 text-left text-xs text-white/60 hover:bg-white/10 hover:text-paper">Close {activeProject.name}</button>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={syncWithGithub} disabled={syncStatus !== "idle"} className="rounded p-1.5 text-white/65 hover:bg-white/10 hover:text-paper disabled:opacity-40" aria-label="Sync with GitHub" title={syncStatus === "syncing" ? "Pushing to GitHub…" : "Sync with GitHub"}><Github size={15} /></button>
                <button onClick={publishToCloudflare} disabled={publishStatus !== "idle"} className="rounded p-1.5 text-white/65 hover:bg-white/10 hover:text-paper disabled:opacity-40" aria-label="Publish to Cloudflare" title={publishStatus === "publishing" ? "Publishing to Cloudflare…" : "Publish to Cloudflare"}><Rocket size={15} /></button>
                <button onClick={undo} disabled={!history.past.length} className="rounded p-1.5 text-white/65 hover:bg-white/10 hover:text-paper disabled:opacity-40" aria-label="Undo" title="Undo"><Undo2 size={15} /></button>
                <button onClick={redo} disabled={!history.future.length} className="rounded p-1.5 text-white/65 hover:bg-white/10 hover:text-paper disabled:opacity-40" aria-label="Redo" title="Redo"><Redo2 size={15} /></button>
                <button onClick={previewWorkflow} className="rounded p-1.5 text-white/65 hover:bg-white/10 hover:text-paper" aria-label="Preview workflow" title="Preview workflow"><Eye size={15} /></button>
                <button onClick={publishWorkflow} className="rounded p-1.5 text-white/65 hover:bg-white/10 hover:text-paper" aria-label="Publish workflow" title="Publish workflow"><Upload size={15} /></button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 rounded-md bg-black/15 p-1 text-xs font-medium">
              <button
                onClick={() => setLeftPanelView("library")}
                aria-pressed={leftPanelView === "library"}
                className={`flex items-center justify-center gap-1.5 rounded px-2 py-2 transition ${leftPanelView === "library" ? "bg-white/15 text-paper shadow-sm" : "text-white/55 hover:text-paper"}`}
              >
                <BookOpen size={14} /> Workflows
              </button>
              <button
                onClick={() => setLeftPanelView("claude")}
                aria-pressed={leftPanelView === "claude"}
                className={`flex items-center justify-center gap-1.5 rounded px-2 py-2 transition ${leftPanelView === "claude" ? "bg-white/15 text-paper shadow-sm" : "text-white/55 hover:text-paper"}`}
              >
                <MessageSquare size={14} /> Architect
              </button>
              <button
                onClick={() => setLeftPanelView("code")}
                aria-pressed={leftPanelView === "code"}
                className={`flex items-center justify-center gap-1.5 rounded px-2 py-2 transition ${leftPanelView === "code" ? "bg-white/15 text-paper shadow-sm" : "text-white/55 hover:text-paper"}`}
              >
                <FileCode2 size={14} /> Code
              </button>
              <button
                onClick={() => setLeftPanelView("agents")}
                aria-pressed={leftPanelView === "agents"}
                className={`flex items-center justify-center gap-1.5 rounded px-2 py-2 transition ${leftPanelView === "agents" ? "bg-white/15 text-paper shadow-sm" : "text-white/55 hover:text-paper"}`}
              >
                <Bot size={14} /> Command
              </button>
            </div>
          </div>
          {!activeProject ? (
            <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center">
              <div>
                <Folder size={24} className="mx-auto text-brass" />
                <div className="mt-3 text-sm font-medium">No project open</div>
                <p className="mt-1 text-xs leading-relaxed text-white/50">Open MailMyPDF from Recent projects, or start a new project when you are ready.</p>
              </div>
            </div>
          ) : leftPanelView === "library" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto p-4">
                <div className="flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-widest text-white/40"><span>Workflow library</span><span>{catalog.length} total</span></div>
                <div className="mt-2 flex items-center gap-1 text-[9px] uppercase tracking-wide text-white/45"><span className="rounded border border-success/40 bg-success/15 px-1 text-success">B</span> build <span className="ml-1 rounded border border-success/40 bg-success/15 px-1 text-success">P</span> page <span className="ml-1 rounded border border-success/40 bg-success/15 px-1 text-success">R</span> release</div>
                <div className="mt-2 space-y-1">
                  {studioVerticals.map((vertical) => {
                    const workflows = catalog.filter((row) => row.verticalId === vertical.id);
                    const isExpanded = Boolean(expandedVerticals[vertical.id]);
                    const isWorkflowFolderExpanded = Boolean(expandedWorkflowFolders[vertical.id]);
                    return (
                      <div key={vertical.id} className="rounded-md">
                        <div className={`flex items-center rounded-md ${isExpanded ? "bg-white/10" : "hover:bg-white/5"}`}>
                          <button
                            onClick={() => toggleVertical(vertical.id)}
                            className="shrink-0 rounded p-2 text-white/55 hover:bg-white/10 hover:text-paper"
                            aria-expanded={isExpanded}
                            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${vertical.title} workflows`}
                          >
                            <ChevronDown size={14} className={`shrink-0 transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                          </button>
                          <button
                            onClick={() => openVerticalLanding(vertical.id)}
                            className="flex min-w-0 flex-1 items-center gap-2 py-2 text-left text-sm font-medium text-white/85 hover:text-brass"
                          >
                            <span className="truncate">{vertical.title}</span>
                            <span className="ml-auto text-[10px] text-white/40">{workflows.length}</span>
                          </button>
                          <button
                            aria-label={`Add a workflow to ${vertical.title}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              startWorkflowInVertical(vertical);
                            }}
                            className="mr-1 rounded p-1.5 text-white/45 hover:bg-white/10 hover:text-paper"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="ml-3 border-l border-white/10 py-1 pl-2">
                            <div className="flex items-center rounded-md hover:bg-white/10">
                              <button onClick={() => toggleWorkflowFolder(vertical.id)} aria-expanded={isWorkflowFolderExpanded} aria-label={`${isWorkflowFolderExpanded ? "Collapse" : "Expand"} ${vertical.title} workflows`} className="rounded p-1.5 text-white/45 hover:text-paper"><ChevronDown size={13} className={`transition-transform ${isWorkflowFolderExpanded ? "" : "-rotate-90"}`} /></button>
                              <button onClick={() => openVerticalWorkflowIndex(vertical.id)} className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1.5 text-left text-xs font-medium text-white/85 hover:text-brass"><Folder size={13} className="text-brass" />Workflows <span className="ml-auto text-[10px] text-white/40">{workflows.length}</span></button>
                            </div>
                            {isWorkflowFolderExpanded && <div className="ml-3 border-l border-white/10 py-1 pl-2">
                            {workflows.length ? workflows.map((definition) => {
                              const isCurrent = workflowTarget?.verticalId === definition.verticalId && workflowTarget.workflowId === definition.id;
                              const workflowKey = catalogWorkflowKey(definition.verticalId, definition.id);
                              const phasesExpanded = Boolean(expandedWorkflowPhases[workflowKey]);
                              const signals = workflowSignals(definition, {
                                verticalId: definition.verticalId,
                                verticalTitle: vertical.title,
                                workflowId: definition.id,
                                publicPath: definition.publicPath,
                                connection: vertical.connection,
                              });
                              const needsBuild = signals.some((signal) => signal.tone === "red");
                              return (
                                <div key={`${definition.verticalId}-${definition.id}`} className={`flex items-center gap-1 rounded-md px-1 py-1 ${isCurrent ? "bg-white/15" : "hover:bg-white/10"}`}>
                                  <button
                                    onClick={() => {
                                      openCatalogWorkflow(definition);
                                      setIsInspectorOpen(false);
                                    }}
                                    className={`flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-0.5 text-left text-xs leading-snug ${isCurrent ? "text-paper" : definition.status === "planned" ? "text-error" : "text-white/65 hover:text-paper"} ${definition.onDisk === "missing" ? "italic opacity-60" : ""}`}
                                    title={definition.onDisk === "missing" ? "No route file found on disk yet" : undefined}
                                  >
                                    <GitBranch size={12} className="shrink-0" />
                                    <span className="min-w-0 flex-1 truncate">{definition.title}</span>
                                  </button>
                                  {definition.discovered && (
                                    <span className="shrink-0 rounded border border-brass/40 bg-brass/15 px-1 text-[8px] font-bold leading-none text-brass" title="Discovered on disk — no catalog metadata yet">NEW</span>
                                  )}
                                  {definition.hasAcceptanceTest && (
                                    <span className="shrink-0 rounded border border-success/40 bg-success/15 px-1 text-[8px] font-bold leading-none text-success" title="Has an acceptance test">TEST</span>
                                  )}
                                  {isCurrent && workflow.phases.length > 0 && (
                                    <button
                                      onClick={() => setExpandedWorkflowPhases((current) => ({ ...current, [workflowKey]: !current[workflowKey] }))}
                                      aria-label={`${phasesExpanded ? "Collapse" : "Expand"} ${definition.title} steps`}
                                      aria-expanded={phasesExpanded}
                                      className="rounded p-1 text-white/45 hover:bg-white/10 hover:text-paper"
                                    >
                                      <ChevronDown size={13} className={`transition-transform ${phasesExpanded ? "" : "-rotate-90"}`} />
                                    </button>
                                  )}
                                  <div className="flex shrink-0 gap-0.5" aria-label={`${definition.title} workflow status`}>
                                    {signals.map((signal) => (
                                      <button
                                        key={signal.label}
                                        type="button"
                                        title={signal.title}
                                        aria-label={`${signal.label}: ${signal.title}`}
                                        onClick={() => {
                                          openCatalogWorkflow(definition);
                                          setTab("Target");
                                        }}
                                        className={`rounded border px-1 py-0.5 text-[8px] font-bold leading-none ${signalClasses[signal.tone]}`}
                                      >
                                        {signal.label}
                                      </button>
                                    ))}
                                  </div>
                                  {needsBuild && (
                                    <button onClick={() => initiateClaudeBuild(definition)} disabled={status === "building"} aria-label={`Ask Claude to fully build ${definition.title}`} title="Build this workflow with Claude" className="rounded border border-brass/50 bg-brass/20 p-1 text-brass hover:bg-brass hover:text-paper disabled:opacity-50">
                                      <Sparkles size={11} />
                                    </button>
                                  )}
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      duplicateCatalogWorkflow(definition);
                                    }}
                                    aria-label={`Duplicate ${definition.title}`}
                                    title="Duplicate this workflow"
                                    className="rounded p-1 text-white/45 hover:bg-white/10 hover:text-paper"
                                  >
                                    <Copy size={11} />
                                  </button>
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      toggleWorkflowVisibility(catalogWorkflowKey(definition.verticalId, definition.id));
                                    }}
                                    aria-label={`${hiddenWorkflowIds.has(catalogWorkflowKey(definition.verticalId, definition.id)) ? "Show" : "Hide"} ${definition.title} on its workflow index`}
                                    title={hiddenWorkflowIds.has(catalogWorkflowKey(definition.verticalId, definition.id)) ? "Show on workflow index" : "Hide from workflow index"}
                                    className="rounded p-1 text-white/45 hover:bg-white/10 hover:text-paper"
                                  >
                                    {hiddenWorkflowIds.has(catalogWorkflowKey(definition.verticalId, definition.id)) ? <EyeOff size={11} /> : <Eye size={11} />}
                                  </button>
                                  {isCurrent && workflow.phases.length > 0 && (
                                    <>
                                    {phasesExpanded && <div className="ml-5 border-l border-white/10 py-1 pl-2">
                                      {workflow.phases.map((phase, index) => (
                                        <button
                                          key={phase.id}
                                          onClick={() => {
                                            setSelectedId(phase.id);
                                            setPreviewTarget(phase.id);
                                            setIsInspectorOpen(false);
                                          }}
                                          className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[11px] ${selectedId === phase.id ? "bg-white/15 text-paper" : "text-white/55 hover:bg-white/10 hover:text-paper"}`}
                                        >
                                          <span className="text-white/35">{index + 1}</span>
                                          <span className="truncate">{phase.title}</span>
                                        </button>
                                      ))}
                                    </div>}
                                    </>
                                  )}
                                </div>
                              );
                            }) : <div className="px-2 py-2 text-xs leading-relaxed text-white/40">No registered workflows yet. Use + to start one here.</div>}
                            </div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {message && <div className={`border-t border-white/10 px-4 py-3 text-xs leading-relaxed ${status === "error" ? "bg-error/20 text-white" : "bg-success/15 text-white"}`}>{message}</div>}
            </div>
          ) : leftPanelView === "code" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <div className="text-sm font-medium">Project files</div>
                  <p className="mt-1 text-xs text-white/50">Live local tree · refreshes every 5 seconds</p>
                </div>
                <button onClick={() => void refreshCodeTree()} disabled={isCodeTreeLoading} aria-label="Refresh project files" title="Refresh project files" className="rounded p-1.5 text-white/55 hover:bg-white/10 hover:text-paper disabled:opacity-40">
                  <RefreshCw size={14} className={isCodeTreeLoading ? "animate-spin" : ""} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {codeTree ? (
                  <CodeTreeNode node={codeTree} depth={0} expandedPaths={expandedCodePaths} onToggle={toggleCodePath} />
                ) : (
                  <div className="px-2 py-2 text-xs text-white/40">Reading the local project files…</div>
                )}
              </div>
            </div>
          ) : leftPanelView === "agents" ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
              <div className="text-sm font-medium">Agent Command Center</div>
              <p className="mt-1 text-xs leading-relaxed text-white/50">
                Choose the provider and exact model for Builder and Reviewer, then launch background work in an isolated
                git workspace. Tester validates the real suite, Reviewer checks the diff, and SEO audits public pages.
                Nothing lands outside the <code className="font-mono">agent/integration</code> branch without your say-so.
              </p>
              {agentProviderAvailability && (!agentProviderAvailability.claude || !agentProviderAvailability.codex) && (
                <div className="mt-3 rounded-md border border-warning/30 bg-warning/10 p-2 text-[11px] leading-relaxed text-white/70">
                  {!agentProviderAvailability.claude && <div>The `claude` CLI is not installed on this machine — Claude-provider roles will fail to launch.</div>}
                  {!agentProviderAvailability.codex && <div>The `codex` CLI is not installed on this machine — Codex-provider roles will fail to launch.</div>}
                </div>
              )}

              <div className="mt-4 space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    aria-label="Vertical"
                    value={agentVerticalId}
                    onChange={(event) => { setAgentVerticalId(event.target.value); setAgentWorkflowId(""); }}
                    className="rounded border border-white/15 bg-black/20 px-2 py-1.5 text-xs text-paper"
                  >
                    <option value="">Vertical…</option>
                    {studioVerticals.map((vertical) => <option key={vertical.id} value={vertical.id}>{vertical.title}</option>)}
                  </select>
                  <select
                    aria-label="Workflow"
                    value={agentWorkflowId}
                    onChange={(event) => setAgentWorkflowId(event.target.value)}
                    disabled={!agentVerticalId}
                    className="rounded border border-white/15 bg-black/20 px-2 py-1.5 text-xs text-paper disabled:opacity-40"
                  >
                    <option value="">Workflow…</option>
                    {catalog.filter((row) => row.verticalId === agentVerticalId).map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}
                  </select>
                </div>
                <textarea
                  aria-label="Task instructions"
                  value={agentInstructions}
                  onChange={(event) => setAgentInstructions(event.target.value)}
                  placeholder="Describe the outcome you want the team to achieve…"
                  className="min-h-16 w-full resize-none rounded border border-white/15 bg-black/20 p-2 text-xs text-paper outline-none placeholder:text-white/40"
                />
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] uppercase tracking-wide text-white/40">
                    Builder
                    <select value={agentBuilderProvider} onChange={(event) => setAgentBuilderProvider(event.target.value as AgentProviderName)} className="mt-1 w-full rounded border border-white/15 bg-black/20 px-2 py-1.5 text-xs text-paper">
                      <option value="codex">Codex</option>
                      <option value="claude">Claude</option>
                    </select>
                    <input aria-label="Builder model" value={agentBuilderModel} onChange={(event) => setAgentBuilderModel(event.target.value)} placeholder="Default model" className="mt-1 w-full rounded border border-white/15 bg-black/20 px-2 py-1.5 text-xs text-paper placeholder:text-white/35" />
                  </label>
                  <label className="text-[10px] uppercase tracking-wide text-white/40">
                    Reviewer
                    <select value={agentReviewerProvider} onChange={(event) => setAgentReviewerProvider(event.target.value as AgentProviderName)} className="mt-1 w-full rounded border border-white/15 bg-black/20 px-2 py-1.5 text-xs text-paper">
                      <option value="codex">Codex</option>
                      <option value="claude">Claude</option>
                    </select>
                    <input aria-label="Reviewer model" value={agentReviewerModel} onChange={(event) => setAgentReviewerModel(event.target.value)} placeholder="Default model" className="mt-1 w-full rounded border border-white/15 bg-black/20 px-2 py-1.5 text-xs text-paper placeholder:text-white/35" />
                  </label>
                </div>
                {agentLaunchError && <p className="text-xs text-error">{agentLaunchError}</p>}
                <button onClick={() => void launchAgentRun()} disabled={isLaunchingAgentRun} className="btn-primary w-full justify-center text-xs">
                  <Play size={13} /> {isLaunchingAgentRun ? "Launching…" : "Launch swarm"}
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {agentRuns.length === 0 && <p className="text-xs text-white/40">No runs yet.</p>}
                {agentRuns.map((run) => {
                  const isExpanded = expandedAgentRunId === run.runId;
                  return (
                    <div key={run.runId} className="rounded-lg border border-white/10 bg-white/5">
                      <button onClick={() => setExpandedAgentRunId(isExpanded ? null : run.runId)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs">
                        <div className="min-w-0 flex-1 truncate text-white/85">{run.workflowId} <span className="text-white/40">· {run.verticalId}</span></div>
                        <span className={`badge ${run.status === "merged" ? "badge-success" : run.status === "failed" || run.status === "needs_human" ? "badge-error" : run.status === "cancelled" ? "badge-stone" : "badge-gold"}`}>{run.status.toUpperCase()}</span>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-white/10 p-3">
                          <div className="flex flex-wrap gap-1.5">
                            {(Object.entries(run.roles) as Array<[RoleName, NonNullable<RunState["roles"][RoleName]>]>).map(([role, info]) => (
                              <span key={role} className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${info.status === "pass" || info.status === "approved" ? "border-success/40 bg-success/15 text-success" : info.status === "fail" || info.status === "changes_requested" ? "border-error/40 bg-error/15 text-error" : "border-white/20 bg-white/10 text-white/60"}`}>
                                {role} · {info.status}
                              </span>
                            ))}
                          </div>
                          {run.status === "running" && (
                            <button onClick={() => void stopAgentRun(run.runId)} className="btn-outline mt-2 text-[10px]">Stop run</button>
                          )}
                          <div className="mt-2 max-h-64 overflow-y-auto rounded border border-white/10 bg-black/20 p-2 font-mono text-[10px] leading-relaxed text-white/60">
                            {(agentRunLog[run.runId] ?? []).map((line, index) => <div key={index} className="whitespace-pre-wrap">{line}</div>)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-white/10 px-4 py-3">
                <div className="text-sm font-medium">Claude workflow architect</div>
                <p className="mt-1 text-xs leading-relaxed text-white/50">Designing {workflow.title} in {workflowTarget?.verticalTitle ?? "your Studio workspace"}.</p>
              </div>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                {chatMessages.map((chatMessage) => (
                  <div key={chatMessage.id} className={`flex ${chatMessage.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[92%] rounded-lg px-3 py-2.5 text-sm leading-relaxed ${chatMessage.role === "user" ? "bg-brass text-paper" : "bg-white/10 text-white/90"}`}>
                      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-60">{chatMessage.role === "user" ? "You" : "Claude"}</div>
                      <div className="whitespace-pre-wrap">{chatMessage.content}</div>
                      {chatMessage.attachments?.length ? <div className="mt-2 flex flex-wrap gap-1">{chatMessage.attachments.map((attachment) => <span key={attachment} className="inline-flex items-center gap-1 rounded border border-white/20 bg-black/10 px-1.5 py-0.5 text-[10px]"><Paperclip size={10} />{attachment}</span>)}</div> : null}
                    </div>
                  </div>
                ))}
                {status === "building" && <div className="flex justify-start"><div className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white/70"><Sparkles size={13} className="mr-1 inline animate-pulse" />Claude is building the workflow…</div></div>}
              </div>
              <form onSubmit={buildWorkflow} className="border-t border-white/10 p-4">
                {chatFiles.length ? <div className="mb-2 flex flex-wrap gap-1.5">{chatFiles.map((file) => <span key={`${file.name}-${file.lastModified}`} className="inline-flex max-w-full items-center gap-1 rounded border border-white/15 bg-white/10 px-2 py-1 text-[10px] text-white/75"><Paperclip size={10} /><span className="max-w-32 truncate">{file.name}</span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setChatFiles((current) => current.filter((item) => item !== file))} className="rounded text-white/55 hover:text-paper"><X size={11} /></button></span>)}</div> : null}
                <textarea aria-label="Ask Claude to build or edit a workflow" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe the workflow or the change you want…" className="min-h-24 w-full resize-none rounded-md border border-white/10 bg-white/5 p-2 text-sm text-paper outline-none placeholder:text-white/45 focus:border-brass" />
                <div className="mt-2 flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-paper"><Paperclip size={14} /> Attach file<input type="file" multiple className="sr-only" onChange={(event) => { const nextFiles = Array.from(event.target.files ?? []); setChatFiles((current) => [...current, ...nextFiles].filter((file, index, files) => files.findIndex((candidate) => candidate.name === file.name && candidate.lastModified === file.lastModified) === index).slice(0, 6)); event.currentTarget.value = ""; }} /></label>
                  <button disabled={status === "building" || !prompt.trim()} className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-brass px-3 py-2 text-xs font-semibold text-paper disabled:opacity-60"><Sparkles size={14} /> {status === "building" ? "Building…" : "Send to Claude"}</button>
                </div>
              </form>
            </div>
          )}
        </aside>

        <section className="relative min-h-[620px] overflow-hidden bg-[#f1eee8]">
          {selectedVerticalId && (() => {
            const selectedWorkflow = selectedVerticalPage !== "landing" && selectedVerticalPage !== "workflows-index" && workflowTarget?.verticalId === selectedVerticalId
              ? workflow
              : null;
            return <div className="sticky top-0 z-10 border-b border-rule bg-paper px-4 py-3 shadow-sm">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {selectedWorkflow ? <>
                  <button onClick={() => setPreviewTarget("landing")} className={`min-w-36 rounded-md border px-3 py-2 text-left text-xs font-medium transition ${previewTarget === "landing" ? "border-navy bg-navy text-paper" : "border-rule bg-ivory text-charcoal hover:border-navy"}`}>Landing page</button>
                  {selectedWorkflow.phases.map((step) => (
                    <button key={step.id} onClick={() => { setSelectedId(step.id); setPreviewTarget(step.id); setTab("Variables"); }} className={`min-w-36 rounded-md border px-3 py-2 text-left text-xs font-medium transition ${previewTarget === step.id ? "border-navy bg-navy text-paper" : "border-rule bg-ivory text-charcoal hover:border-navy"}`}>{step.title}</button>
                  ))}
                </> : <>
                  <button onClick={() => { openVerticalLanding(selectedVerticalId); setPreviewTarget("landing"); }} className={`min-w-36 rounded-md border px-3 py-2 text-left text-xs font-medium transition ${selectedVerticalPage === "landing" ? "border-navy bg-navy text-paper" : "border-rule bg-ivory text-charcoal hover:border-navy"}`}>Landing page</button>
                  <button onClick={() => openVerticalWorkflowIndex(selectedVerticalId)} className={`min-w-36 rounded-md border px-3 py-2 text-left text-xs font-medium transition ${selectedVerticalPage === "workflows-index" ? "border-navy bg-navy text-paper" : "border-rule bg-ivory text-charcoal hover:border-navy"}`}>Workflows</button>
                </>}
              </div>
            </div>;
          })()}
          {studioView === "preview" ? (
            <>
              <div className={`absolute inset-x-0 bottom-0 ${selectedVerticalId ? "top-[73px]" : "top-0"} bg-[#d7d0c4] p-4`}>
                {previewSource ? (() => {
                  const origin = devServerOriginForVertical(previewSource.verticalId);
                  if (origin === null) {
                    return (
                      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-rule bg-paper p-8 text-center">
                        <div>
                          <div className="section-kicker">{previewSource.label}</div>
                          <h2 className="mt-3 text-2xl text-charcoal">Dev server not connected</h2>
                          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-stone">
                            Run this vertical's own dev server (<code className="font-mono text-xs">pnpm --filter {previewSource.verticalId ?? "mailmypdf"} run dev</code>) to preview {previewSource.publicPath} live here.
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <iframe
                      key={previewSource.publicPath}
                      title={`${previewSource.label} live preview`}
                      src={`${origin}${previewSource.publicPath}`}
                      className="h-full w-full rounded-lg border border-rule bg-paper shadow-elevated"
                    />
                  );
                })() : selectedVerticalId && selectedVerticalPage === "workflows-index" ? (() => {
                  const vertical = findStudioVertical(selectedVerticalId);
                  return vertical ? <EcosystemVerticalLandingPreview vertical={vertical} workflows={catalog.filter((row) => row.verticalId === vertical.id)} hiddenWorkflowIds={hiddenWorkflowIds} onSelectWorkflow={openCatalogWorkflow} /> : null;
                })() : selectedVerticalId && selectedVerticalPage === "landing" ? (() => {
                  const vertical = findStudioVertical(selectedVerticalId);
                  return <div className="flex h-full items-center justify-center rounded-lg border border-rule bg-paper p-8 text-center"><div><div className="section-kicker">{vertical?.title}</div><h2 className="mt-3 text-3xl text-charcoal">{vertical?.title} workflows</h2><p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-stone">Choose a workflow from this folder to preview its complete matter-owner experience.</p></div></div>;
                })() : workflowTarget?.verticalId === "private-office" ? (
                  <iframe
                    key={previewTarget}
                    title={`${previewTarget === "landing" ? "Landing page" : selected.title} matter-owner preview`}
                    src={previewTarget === "landing"
                      ? `${workflowTarget.publicPath}?studioPreview=draft&studioEmbed=1`
                      : `${workflowTarget.publicPath}?studioPreview=draft&studioPhase=${encodeURIComponent(previewTarget)}&studioEmbed=1`}
                    className="h-full w-full rounded-lg border border-rule bg-paper shadow-elevated"
                  />
                ) : workflowTarget ? (
                  <div className="h-full overflow-hidden rounded-lg border border-rule bg-paper shadow-elevated">
                    <EcosystemWorkflowPreview workflow={workflow} target={workflowTarget} previewTarget={previewTarget} />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-rule bg-paper p-8 text-center">
                    <div>
                      <div className="section-kicker">Choose a vertical workflow</div>
                      <p className="mt-2 max-w-sm text-sm leading-relaxed text-stone">
                        Open a workflow from any vertical folder in the left sidebar to load its Studio preview here.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className={`absolute inset-x-0 bottom-0 ${selectedVerticalId ? "top-[73px]" : "top-0"}`}>
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                onNodeClick={(_, node) => {
                  setSelectedId(node.id);
                  setPreviewTarget(node.id);
                  setTab("Variables");
                }}
                onNodesChange={onNodesChange}
                onConnect={onConnect}
                fitView
                minZoom={0.25}
              >
                <Background gap={20} color="#d7d0c4" />
                <Controls />
                <MiniMap nodeColor="#1b365d" />
              </ReactFlow>
            </div>
          )}
        </section>

        {isInspectorOpen && <aside className="border-t border-rule bg-paper lg:border-l lg:border-t-0">
          {selected && <>
            <div className="border-b border-rule p-5"><div className="section-kicker">Inspector</div><h1 className="mt-2 text-2xl">{selected.title}</h1><p className="mt-2 text-sm leading-relaxed text-stone">{selected.objective}</p></div>
            <div className="flex overflow-x-auto border-b border-rule px-3">{["General", "Target", "Variables", "Landing", "Capabilities", "Gates", "Preview", "Run", ...(targetCatalogEntry?.hasAcceptanceTest ? ["Test"] : [])].map((item) => <button key={item} onClick={() => setTab(item)} className={`border-b-2 px-3 py-3 text-xs font-medium ${tab === item ? "border-navy text-navy" : "border-transparent text-stone"}`}>{item}</button>)}</div>
            {tab === "Test" && targetCatalogEntry?.hasAcceptanceTest ? (
              <div className="space-y-4 p-5">
                <div>
                  <div className="section-kicker">Acceptance test</div>
                  <p className="mt-2 text-sm leading-relaxed text-stone">
                    Runs {targetCatalogEntry.id}'s real acceptance test — the actual route handlers, domain logic, and PDF
                    generation, against a synthetic fixture — via <code className="font-mono text-xs">pnpm studio workflow test</code>.
                  </p>
                </div>
                {(targetCatalogEntry.acceptanceScenarios?.length ?? 0) > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {targetCatalogEntry.acceptanceScenarios!.map((scenario) => (
                      <button
                        key={scenario}
                        onClick={() => void runAcceptanceTest(targetCatalogEntry.id, scenario)}
                        disabled={acceptanceRun?.status === "running"}
                        className="btn-outline text-xs"
                      >
                        <Play size={13} /> Run "{scenario}"
                      </button>
                    ))}
                    {targetCatalogEntry.acceptanceScenarios!.length > 1 && (
                      <button
                        onClick={() => void runAcceptanceTest(targetCatalogEntry.id, "all")}
                        disabled={acceptanceRun?.status === "running"}
                        className="btn-primary text-xs"
                      >
                        <Play size={13} /> Run all scenarios
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="rounded-md border border-warning/30 bg-warning/10 p-3 text-xs leading-relaxed text-charcoal">
                    No scenario fixtures exist yet for this workflow.
                  </p>
                )}
                {acceptanceRun?.workflowId === targetCatalogEntry.id && (
                  <div className="rounded-lg border border-rule bg-ivory p-4">
                    {acceptanceRun.status === "running" ? (
                      <p className="text-xs text-stone">Running acceptance test…</p>
                    ) : acceptanceRun.status === "error" ? (
                      <p className="text-xs leading-relaxed text-error">{acceptanceRun.error}</p>
                    ) : (
                      <div className="space-y-4">
                        {acceptanceRun.reports?.map((report) => (
                          <div key={report.runId} className="space-y-2 border-b border-rule pb-4 last:border-0 last:pb-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-charcoal">Scenario: {report.scenario}</span>
                              <span className={`badge ${report.mailReady ? "badge-success" : "badge-error"}`}>
                                {report.mailReady ? "MAIL READY" : "NOT READY"}
                              </span>
                            </div>
                            <div className="grid gap-1 text-xs">
                              {Object.entries(report.checks).map(([name, status]) => (
                                <div key={name} className="flex items-center justify-between rounded border border-rule bg-paper px-2 py-1">
                                  <span className="text-charcoal-soft">{name}</span>
                                  <span className={status === "pass" ? "text-success" : status === "skipped" ? "text-stone" : "text-error"}>{status.toUpperCase()}</span>
                                </div>
                              ))}
                            </div>
                            {report.failures.length > 0 && (
                              <div className="space-y-1">
                                {report.failures.map((failure, index) => (
                                  <p key={`${failure.code}-${index}`} className="text-xs leading-relaxed text-error">{failure.code}: {failure.message}</p>
                                ))}
                              </div>
                            )}
                            <p className="font-mono text-[10px] text-stone">Artifacts: {report.artifacts.runDir}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : tab === "Target" ? (
              <div className="space-y-4 p-5">
                <div><div className="section-kicker">Publication target</div><p className="mt-2 text-sm leading-relaxed text-stone">This connects the Studio draft to the workflow’s user-facing product page.</p></div>
                {workflowTarget ? <>
                  <div className="rounded-lg border border-rule bg-ivory p-4"><div className="text-lg text-charcoal">{workflowTarget.verticalTitle}</div><div className="mt-1 font-mono text-xs text-stone">{workflowTarget.publicPath}</div><div className="mt-3 flex items-center gap-2"><span className={`badge ${workflowTarget.connection === "connected" ? "badge-success" : "badge-stone"}`}>{workflowTarget.connection === "connected" ? "CONNECTED" : "ADAPTER REQUIRED"}</span><span className="text-xs text-stone">{workflowTarget.workflowId}</span></div></div>
                  <div className="rounded-md border border-navy/15 bg-navy-bg p-3 text-xs leading-relaxed text-navy"><ShieldCheck size={14} className="mr-1 inline" /> {workflowTarget.connection === "connected" ? "Preview and Publish update this Private Office workflow on this device." : "Publish creates a target-specific Studio release. This vertical’s app adapter will read that release and render it on the public workflow route."}</div>
                </> : <div className="rounded-lg border border-dashed border-rule p-4 text-sm text-stone">Choose a workflow from a vertical folder to set its publication target.</div>}
                {workflowTarget && (
                  <p className="text-xs leading-relaxed text-stone">
                    {targetCatalogEntry?.hasAcceptanceTest
                      ? "This workflow has a registered acceptance test — see the Test tab."
                      : "No acceptance test registered for this workflow yet."}
                  </p>
                )}
              </div>
            ) : tab === "Variables" ? (
              <div className="space-y-4 p-5">
                <div>
                  <div className="section-kicker">Phase variables</div>
                  <p className="mt-2 text-sm leading-relaxed text-stone">
                    These values appear in the matter-owner screen at center. Claude can propose them, and you can adjust them here.
                  </p>
                </div>
                {(selected.variables ?? []).length ? (
                  (selected.variables ?? []).map((variable, index) => (
                    <div key={variable.id} className="rounded-lg border border-rule p-3">
                      <div className="flex items-center gap-2">
                        <input
                          aria-label={`Variable ${index + 1} label`}
                          className="input-field flex-1 text-sm"
                          value={variable.label}
                          onChange={(event) => updateVariable(index, { label: event.target.value })}
                        />
                        <button
                          aria-label={`Remove ${variable.label}`}
                          onClick={() => removeVariable(index)}
                          className="text-stone hover:text-error"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <label className="input-label mt-3" htmlFor={`variable-value-${index}`}>Default value</label>
                      <textarea
                        id={`variable-value-${index}`}
                        className="input-field min-h-20 resize-none text-sm"
                        value={variable.value}
                        onChange={(event) => updateVariable(index, { value: event.target.value })}
                      />
                      <label className="input-label mt-3" htmlFor={`variable-description-${index}`}>Owner guidance</label>
                      <input
                        id={`variable-description-${index}`}
                        className="input-field text-sm"
                        value={variable.description ?? ""}
                        onChange={(event) => updateVariable(index, { description: event.target.value })}
                        placeholder="What should the owner provide?"
                      />
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-rule p-4 text-sm text-stone">
                    This phase has no adjustable variables yet.
                  </div>
                )}
                <button onClick={addVariable} className="btn-outline w-full justify-center">
                  <Plus size={15} /> Add variable
                </button>
              </div>
            ) : tab === "Landing" ? (
              <div className="space-y-5 p-5">
                <div>
                  <div className="section-kicker">Workflow landing page</div>
                  <p className="mt-2 text-sm leading-relaxed text-stone">This is the copy a matter owner sees before beginning the workflow. Claude can revise it from the left chat as well.</p>
                </div>
                <div>
                  <label className="input-label" htmlFor="landing-headline">Headline</label>
                  <textarea id="landing-headline" className="input-field min-h-20 resize-none" value={landingPage.headline} onChange={(event) => updateLanding({ headline: event.target.value })} />
                </div>
                <div>
                  <label className="input-label" htmlFor="landing-description">Description</label>
                  <textarea id="landing-description" className="input-field min-h-32 resize-none" value={landingPage.description} onChange={(event) => updateLanding({ description: event.target.value })} />
                </div>
                <div>
                  <label className="input-label" htmlFor="landing-action">Primary action</label>
                  <input id="landing-action" className="input-field" value={landingPage.primaryAction} onChange={(event) => updateLanding({ primaryAction: event.target.value })} />
                </div>
                <div className="rounded-md border border-navy/15 bg-navy-bg p-3 text-xs leading-relaxed text-navy"><ShieldCheck size={14} className="mr-1 inline" /> Save retains this draft. Preview opens the unpublished page. Publish makes this landing page the version users see on this device.</div>
              </div>
            ) : tab === "Run" ? (
              <div className="space-y-4 p-5">
                <div className="flex items-center justify-between"><div><div className="section-kicker">Live execution trace</div><h2 className="mt-1 text-lg">{selected.title}</h2></div><span className={`badge ${isRunning ? "badge-gold" : traceEvents.length ? "badge-success" : "badge-stone"}`}>{isRunning ? "RUNNING" : traceEvents.length ? "COMPLETE" : "READY"}</span></div>
                <button onClick={runSelectedPhase} disabled={isRunning} className="btn-primary w-full justify-center"><Play size={15} /> {isRunning ? "Running phase…" : "Run phase"}</button>
                <div className="max-h-[520px] space-y-3 overflow-auto rounded-lg border border-rule bg-ivory p-4">
                  {traceEvents.length ? traceEvents.map((event) => (
                    <div key={event.id} className="border-b border-rule pb-3 text-xs last:border-0 last:pb-0">
                      <div className="flex gap-2 text-charcoal-soft"><span className={event.type.includes("failed") || event.type.includes("unavailable") ? "text-warning" : "text-success"}>{event.type.includes("failed") || event.type.includes("unavailable") ? "!" : "✓"}</span><div className="min-w-0 flex-1"><div className="font-medium">{event.label}</div><div className="mt-1 text-stone">{formatTime(event.at)} · {event.type}</div>{event.detail && <p className="mt-2 whitespace-pre-wrap leading-relaxed text-stone">{event.detail}</p>}{event.data && <details className="mt-2 rounded border border-rule bg-paper p-2"><summary className="cursor-pointer font-medium text-navy">Show request, response, and provenance</summary><pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-charcoal-soft">{JSON.stringify(event.data, null, 2)}</pre></details>}</div></div>
                    </div>
                  )) : <p className="text-xs leading-relaxed text-stone">Run this phase to inspect its prompt, provider response, provenance, gates, and connector decisions as they happen.</p>}
                </div>
                <div className="rounded-md border border-navy/15 bg-navy-bg p-3 text-xs leading-relaxed text-navy"><ShieldCheck size={14} className="mr-1 inline" /> Studio runs are simulations. Stripe, mailing, Supabase, n8n, and other connectors are described in the trace but never called here.</div>
              </div>
            ) : tab === "Capabilities" ? (
              <div className="space-y-4 p-5">
                <div><div className="section-kicker">Reusable engines</div><p className="mt-2 text-sm text-stone">Capabilities determine what this phase can do when it runs.</p></div>
                {selected.capabilities.length ? selected.capabilities.map((item) => <div key={item.capabilityId} className="rounded-lg border border-rule p-3"><div className="flex items-start justify-between gap-3"><div><div className="text-sm font-medium">{getCapabilityLabel(item.capabilityId)}</div><div className="mt-1 font-mono text-[11px] text-stone">{item.capabilityId}</div></div><button aria-label={`Remove ${item.capabilityId}`} onClick={() => removeCapability(item.capabilityId)} className="text-stone hover:text-error"><X size={15} /></button></div><span className="badge badge-stone mt-3">{item.executionMode.replaceAll("_", " ")}</span></div>) : <div className="rounded-lg border border-dashed border-rule p-4 text-sm text-stone">No capabilities are connected to this phase.</div>}
                <div className="flex gap-2"><select value={capabilityToAdd} onChange={(event) => setCapabilityToAdd(event.target.value)} className="input-field min-w-0 flex-1 text-sm">{capabilityCatalog.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><button onClick={addCapability} className="btn-outline shrink-0"><Plus size={15} /> Add</button></div>
              </div>
            ) : tab === "Gates" ? (
              <div className="space-y-4 p-5">
                <div><div className="section-kicker">Evidence and approval gates</div><p className="mt-2 text-sm text-stone">Required gates stop a consequential phase until the owner or reviewer resolves them.</p></div>
                {selected.gates.map((item, index) => <div key={`${item.type}-${index}`} className="rounded-lg border border-rule p-3"><div className="flex gap-2"><select value={item.type} onChange={(event) => updateGate(index, { type: event.target.value as StudioGate["type"] })} className="input-field flex-1 text-xs"><option value="evidence">Evidence</option><option value="authority">Authority</option><option value="human-review">Owner review</option><option value="professional-review">Professional review</option><option value="consequential-action">Consequential action</option><option value="custom">Custom</option></select><button aria-label="Remove gate" onClick={() => removeGate(index)} className="text-stone hover:text-error"><Trash2 size={15} /></button></div><input value={item.label} onChange={(event) => updateGate(index, { label: event.target.value })} className="input-field mt-2 text-sm" aria-label="Gate label" /><label className="mt-3 flex items-center gap-2 text-xs text-stone"><input type="checkbox" checked={item.required} onChange={(event) => updateGate(index, { required: event.target.checked })} /> Required to proceed</label></div>)}
                <button onClick={addGate} className="btn-outline w-full justify-center"><Plus size={15} /> Add approval gate</button>
                {findings.length > 0 && <div className="space-y-2 rounded-lg border border-warning/30 bg-warning/10 p-3"><div className="flex items-center gap-2 text-sm font-medium text-charcoal"><CircleAlert size={15} /> Validation</div>{findings.map((finding, index) => <button key={`${finding.code}-${index}`} onClick={() => finding.phaseId && setSelectedId(finding.phaseId)} className="block text-left text-xs leading-relaxed text-stone hover:text-navy">{finding.severity.toUpperCase()}: {finding.message}</button>)}</div>}
              </div>
            ) : tab === "Preview" ? (
              <div className="p-5"><div className="rounded-lg border border-rule bg-ivory p-4"><div className="eyebrow">Matter owner view</div><h2 className="mt-2 text-xl">{selected.title}</h2><p className="mt-2 text-sm leading-relaxed text-stone">{selected.objective}</p><label className="input-label mt-5" htmlFor="owner-note">Your information</label><textarea id="owner-note" className="input-field min-h-24 resize-none" placeholder="Add information or attach records…" /><button className="btn-primary mt-3 w-full justify-center"><Check size={15} /> Continue</button></div><p className="mt-4 text-xs leading-relaxed text-stone">Use Preview in the Studio header to open this draft inside its complete user-facing workflow landing page.</p></div>
            ) : (
              <div className="space-y-5 p-5">
                <div><label className="input-label" htmlFor="phase-title">Phase title</label><input id="phase-title" className="input-field" value={selected.title} onChange={(event) => updateSelected({ title: event.target.value })} /></div>
                <div><label className="input-label" htmlFor="phase-objective">Objective</label><textarea id="phase-objective" className="input-field min-h-24 resize-none" value={selected.objective} onChange={(event) => updateSelected({ objective: event.target.value })} /></div>
                <div><label className="input-label" htmlFor="phase-kind">Phase type</label><div className="relative"><select id="phase-kind" value={selected.kind} onChange={(event) => updateSelected({ kind: event.target.value as StudioNodeKind })} className="input-field appearance-none capitalize">{studioNodeKinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}</select><ChevronDown size={15} className="pointer-events-none absolute right-3 top-3 text-stone" /></div></div>
                <div className="rounded-md border border-rule bg-ivory p-3 text-sm"><div className="font-medium">Editable phase</div><p className="mt-1 text-xs leading-relaxed text-stone">Changes update the canvas immediately. Save retains the draft; Preview opens it for the matter owner; Publish makes it the local user-facing version.</p></div>
                <button onClick={removeSelected} disabled={workflow.phases.length <= 1} className="btn-outline w-full justify-center text-error"><Trash2 size={15} /> Remove phase</button>
              </div>
            )}
          </>}
        </aside>}
      </div>
      {isNewProjectDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/55 p-4" role="dialog" aria-modal="true" aria-labelledby="new-project-title">
          <div className="w-full max-w-md rounded-lg border border-rule bg-paper p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4"><div><div className="section-kicker">Studio project</div><h2 id="new-project-title" className="mt-1 text-xl">Create a project</h2></div><button onClick={() => setIsNewProjectDialogOpen(false)} aria-label="Close new project dialog" className="rounded p-1 text-stone hover:bg-ivory hover:text-charcoal"><X size={18} /></button></div>
            <p className="mt-3 text-sm leading-relaxed text-stone">When you are ready, this will register a new repository or local folder as an independent Studio project. Nothing is created until you supply that project’s folder and confirm it.</p>
            <div className="mt-5 flex justify-end"><button onClick={() => setIsNewProjectDialogOpen(false)} className="btn-outline">Not now</button></div>
          </div>
        </div>
      )}
    </main>
  );
}
