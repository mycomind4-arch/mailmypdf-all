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
  ChevronDown,
  CircleAlert,
  GitBranch,
  MessageSquare,
  Paperclip,
  Play,
  Plus,
  Redo2,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Undo2,
  WandSparkles,
  X,
} from "lucide-react";
import { createStudioPhases, type StudioProposal } from "@/domain/studio-proposal";
import {
  findStudioVertical,
  studioCatalog,
  studioVerticals,
  workflowsForVertical,
  type StudioCatalogWorkflow,
  type StudioVertical,
} from "@/domain/studio-ecosystem";
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

function catalogDraftKey(target: StudioWorkflowTarget): string {
  return `${ECOSYSTEM_DRAFT_KEY}${target.verticalId}:${target.workflowId}`;
}

function catalogWorkflowKey(verticalId: string, workflowId: string): string {
  return `${verticalId}:${workflowId}`;
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
  }> = [
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

function StudioPage() {
  const [history, setHistory] = useState({ past: [] as StudioWorkflow[], current: createInitialWorkflow(), future: [] as StudioWorkflow[] });
  const [selectedId, setSelectedId] = useState("intake");
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<"idle" | "building" | "ready" | "error">("idle");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("General");
  const [leftPanelView, setLeftPanelView] = useState<"library" | "claude">("library");
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
  const [previewTarget, setPreviewTarget] = useState<"landing" | string>("landing");
  const [expandedVerticals, setExpandedVerticals] = useState<Record<string, boolean>>({
    "private-office": true,
  });
  const [traceEvents, setTraceEvents] = useState<TraceEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [capabilityToAdd, setCapabilityToAdd] = useState(capabilityCatalog[0].id);
  const workflow = history.current;
  const workflowTarget = getWorkflowTarget(workflow);
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
    if (!workflowTarget) return;
    window.localStorage.setItem(catalogDraftKey(workflowTarget), JSON.stringify(workflow));
  }, [workflow, workflowTarget]);

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
      description: "A new workflow being designed in MailMyPDF Build Studio.",
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
    setStatus("ready");
    setMessage(`Opened ${definition.title} in ${next.target?.verticalTitle ?? "Build Studio"}.`);
  }

  function toggleVertical(verticalId: string) {
    setExpandedVerticals((current) => ({ ...current, [verticalId]: !current[verticalId] }));
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
      <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-rule bg-paper px-4 py-3 md:px-6">
        <div className="flex items-center gap-3 text-sm font-medium">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-navy text-paper"><WandSparkles size={15} /></span>
          MailMyPDF <span className="text-stone-light">/</span> Build Studio
          <span className="status-badge status-badge--draft">Experimental</span>
          {workflowTarget && <span className="badge badge-stone">{workflowTarget.verticalTitle}</span>}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button onClick={undo} disabled={!history.past.length} className="btn-ghost"><Undo2 size={15} /> Undo</button>
          <button onClick={redo} disabled={!history.future.length} className="btn-ghost"><Redo2 size={15} /> Redo</button>
          <button onClick={showValidation} className="btn-outline"><ShieldCheck size={15} /> Validate <span className={`badge ${blockingFindings.length ? "badge-warning" : "badge-success"}`}>{findings.length}</span></button>
          <button onClick={saveWorkflow} className="btn-primary"><Save size={15} /> Save</button>
          <button onClick={previewWorkflow} className="btn-outline">Preview</button>
          <button onClick={publishWorkflow} className="btn-outline">Publish</button>
          <button onClick={simulateWorkflow} disabled={isRunning} className="btn-brass"><Play size={15} /> Simulate</button>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_360px]">
        <aside className="flex min-h-[400px] flex-col border-b border-rule bg-[#202b39] text-paper lg:min-h-0 lg:border-b-0 lg:border-r">
          <div className="border-b border-white/10 p-4">
            <div className="flex items-center gap-2 text-sm font-medium"><span className="flex h-7 w-7 items-center justify-center rounded-md bg-brass"><WandSparkles size={15} /></span>MailMyPDF Studio</div>
            <button onClick={newWorkflow} className="mt-4 flex w-full items-center gap-2 rounded-md bg-white/10 px-3 py-2.5 text-sm font-medium hover:bg-white/15"><Plus size={16} /> New workflow</button>
            <div className="mt-3 grid grid-cols-2 rounded-md bg-black/15 p-1 text-xs font-medium">
              <button
                onClick={() => setLeftPanelView("library")}
                aria-pressed={leftPanelView === "library"}
                className={`flex items-center justify-center gap-1.5 rounded px-2 py-2 transition ${leftPanelView === "library" ? "bg-white/15 text-paper shadow-sm" : "text-white/55 hover:text-paper"}`}
              >
                <BookOpen size={14} /> Library
              </button>
              <button
                onClick={() => setLeftPanelView("claude")}
                aria-pressed={leftPanelView === "claude"}
                className={`flex items-center justify-center gap-1.5 rounded px-2 py-2 transition ${leftPanelView === "claude" ? "bg-white/15 text-paper shadow-sm" : "text-white/55 hover:text-paper"}`}
              >
                <MessageSquare size={14} /> Claude
              </button>
            </div>
          </div>
          {leftPanelView === "library" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 overflow-y-auto p-4">
                <div className="text-[11px] font-semibold uppercase tracking-widest text-white/40">Current workflow</div>
                <div className="mt-2 rounded-md bg-white/10 px-3 py-2.5 text-sm">{workflow.title}</div>
                <div className="mt-1 px-1 text-xs text-white/45">{workflowTarget?.verticalTitle ?? "Unassigned workspace"}</div>
                <div className="mt-5 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-widest text-white/40"><span>Workflow library</span><span>{studioCatalog.length} total</span></div>
                <div className="mt-2 flex items-center gap-1 text-[9px] uppercase tracking-wide text-white/45"><span className="rounded border border-success/40 bg-success/15 px-1 text-success">B</span> build <span className="ml-1 rounded border border-success/40 bg-success/15 px-1 text-success">P</span> page <span className="ml-1 rounded border border-success/40 bg-success/15 px-1 text-success">R</span> release</div>
                <div className="mt-2 space-y-1">
                  {studioVerticals.map((vertical) => {
                    const workflows = workflowsForVertical(vertical.id);
                    const isExpanded = Boolean(expandedVerticals[vertical.id]);
                    return (
                      <div key={vertical.id} className="rounded-md">
                        <div className={`flex items-center rounded-md ${isExpanded ? "bg-white/10" : "hover:bg-white/5"}`}>
                          <button
                            onClick={() => toggleVertical(vertical.id)}
                            className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-sm font-medium text-white/85"
                            aria-expanded={isExpanded}
                          >
                            <ChevronDown size={14} className={`shrink-0 transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
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
                            {workflows.length ? workflows.map((definition) => {
                              const isCurrent = workflowTarget?.verticalId === definition.verticalId && workflowTarget.workflowId === definition.id;
                              const signals = workflowSignals(definition, {
                                verticalId: definition.verticalId,
                                verticalTitle: vertical.title,
                                workflowId: definition.id,
                                publicPath: definition.publicPath,
                                connection: vertical.connection,
                              });
                              return (
                                <div key={`${definition.verticalId}-${definition.id}`} className={`flex items-center gap-1 rounded-md px-1 py-1 ${isCurrent ? "bg-white/15" : "hover:bg-white/10"}`}>
                                  <button
                                    onClick={() => openCatalogWorkflow(definition)}
                                    className={`flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-0.5 text-left text-xs leading-snug ${isCurrent ? "text-paper" : definition.status === "planned" ? "text-error" : "text-white/65 hover:text-paper"}`}
                                  >
                                    <GitBranch size={12} className="shrink-0" />
                                    <span className="min-w-0 flex-1 truncate">{definition.title}</span>
                                  </button>
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
                                </div>
                              );
                            }) : <div className="px-2 py-2 text-xs leading-relaxed text-white/40">No registered workflows yet. Use + to start one here.</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {message && <div className={`border-t border-white/10 px-4 py-3 text-xs leading-relaxed ${status === "error" ? "bg-error/20 text-white" : "bg-success/15 text-white"}`}>{message}</div>}
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
          <div className="flex items-center justify-between border-b border-rule bg-paper/80 px-6 py-4">
            <div>
              <div className="section-kicker">
                {studioView === "preview"
                  ? "Matter-owner phase preview"
                  : "Phase connections"}
              </div>
              <div className="mt-1 text-sm text-stone">
                {studioView === "preview"
                  ? "Select a phase to preview the workflow screen and adjust its variables at right."
                  : "Drag from a phase handle to connect it to the next phase. Drag a card to arrange the map."}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border border-rule bg-ivory p-0.5 text-xs">
                <button
                  onClick={() => setStudioView("preview")}
                  className={`rounded px-2.5 py-1.5 font-medium ${studioView === "preview" ? "bg-navy text-paper" : "text-stone hover:text-navy"}`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setStudioView("graph")}
                  className={`rounded px-2.5 py-1.5 font-medium ${studioView === "graph" ? "bg-navy text-paper" : "text-stone hover:text-navy"}`}
                >
                  Connect phases
                </button>
              </div>
              <button onClick={addPhase} className="btn-outline">
                <Plus size={15} /> Add phase
              </button>
            </div>
          </div>
          {studioView === "preview" ? (
            <>
              <div className="sticky top-0 z-10 border-b border-rule bg-paper px-4 py-3 shadow-sm">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {workflowTarget && (
                    <button
                      onClick={() => {
                        setPreviewTarget("landing");
                        setTab("Landing");
                      }}
                      className={`min-w-36 rounded-md border px-3 py-2 text-left text-xs transition ${previewTarget === "landing" ? "border-navy bg-navy text-paper" : "border-rule bg-ivory text-charcoal hover:border-navy"}`}
                    >
                      <span className="block text-[10px] font-semibold uppercase tracking-wide opacity-70">
                        Phase 0
                      </span>
                      <span className="mt-1 block truncate font-medium">Landing page</span>
                    </button>
                  )}
                  {workflow.phases.map((phase, index) => (
                    <button
                      key={phase.id}
                      onClick={() => {
                        setSelectedId(phase.id);
                        setPreviewTarget(phase.id);
                        setTab("Variables");
                      }}
                      className={`min-w-36 rounded-md border px-3 py-2 text-left text-xs transition ${previewTarget === phase.id ? "border-navy bg-navy text-paper" : "border-rule bg-ivory text-charcoal hover:border-navy"}`}
                    >
                      <span className="block text-[10px] font-semibold uppercase tracking-wide opacity-70">
                        Phase {index + 1}
                      </span>
                      <span className="mt-1 block truncate font-medium">
                        {phase.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 top-[143px] bg-[#d7d0c4] p-4">
                {workflowTarget?.verticalId === "private-office" ? (
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
            <div className="absolute inset-x-0 bottom-0 top-[73px]">
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

        <aside className="border-t border-rule bg-paper lg:border-l lg:border-t-0">
          {selected && <>
            <div className="border-b border-rule p-5"><div className="section-kicker">Inspector</div><h1 className="mt-2 text-2xl">{selected.title}</h1><p className="mt-2 text-sm leading-relaxed text-stone">{selected.objective}</p></div>
            <div className="flex overflow-x-auto border-b border-rule px-3">{["General", "Target", "Variables", "Landing", "Capabilities", "Gates", "Preview", "Run"].map((item) => <button key={item} onClick={() => setTab(item)} className={`border-b-2 px-3 py-3 text-xs font-medium ${tab === item ? "border-navy text-navy" : "border-transparent text-stone"}`}>{item}</button>)}</div>
            {tab === "Target" ? (
              <div className="space-y-4 p-5">
                <div><div className="section-kicker">Publication target</div><p className="mt-2 text-sm leading-relaxed text-stone">This connects the Studio draft to the workflow’s user-facing product page.</p></div>
                {workflowTarget ? <>
                  <div className="rounded-lg border border-rule bg-ivory p-4"><div className="text-lg text-charcoal">{workflowTarget.verticalTitle}</div><div className="mt-1 font-mono text-xs text-stone">{workflowTarget.publicPath}</div><div className="mt-3 flex items-center gap-2"><span className={`badge ${workflowTarget.connection === "connected" ? "badge-success" : "badge-stone"}`}>{workflowTarget.connection === "connected" ? "CONNECTED" : "ADAPTER REQUIRED"}</span><span className="text-xs text-stone">{workflowTarget.workflowId}</span></div></div>
                  <div className="rounded-md border border-navy/15 bg-navy-bg p-3 text-xs leading-relaxed text-navy"><ShieldCheck size={14} className="mr-1 inline" /> {workflowTarget.connection === "connected" ? "Preview and Publish update this Private Office workflow on this device." : "Publish creates a target-specific Studio release. This vertical’s app adapter will read that release and render it on the public workflow route."}</div>
                </> : <div className="rounded-lg border border-dashed border-rule p-4 text-sm text-stone">Choose a workflow from a vertical folder to set its publication target.</div>}
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
        </aside>
      </div>
    </main>
  );
}
