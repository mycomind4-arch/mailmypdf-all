import { useEffect, useMemo, useState } from "react";
import {
  Bot,
  CheckCircle2,
  FileText,
  FolderOpen,
  Loader2,
  Package,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { AppShell, ProgressRail, StatusBadge } from "@/components/workspace/app-shell";
import type { WorkflowStep } from "@/domain/workflows";
import type { Appeal } from "@/domain/appeal";
import { useAuth } from "@/lib/auth";
import { appealAuthFetch } from "@/lib/auth-fetch";
import { normalizeExtractedText } from "@/lib/case-document-pipeline";

export type CaseWorkspaceProps = { caseId: string };
type Tab = "overview" | "documents" | "analysis" | "response" | "packet" | "mail";
type AppealWithVersion = Appeal & { version?: number };

const steps: Array<{ step: WorkflowStep; label: string; icon: typeof FileText }> = [
  { step: "intro", label: "Overview", icon: FolderOpen },
  { step: "document", label: "Documents", icon: FileText },
  { step: "xray", label: "AI Analysis", icon: Bot },
  { step: "draft", label: "Response", icon: FileText },
  { step: "packet", label: "Packet", icon: Package },
  { step: "mailing", label: "Mail", icon: Send },
  { step: "proof", label: "Proof", icon: ShieldCheck },
];

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body;
}

export function CaseWorkspace({ caseId }: CaseWorkspaceProps) {
  const { user, loading: authLoading } = useAuth();
  const [appeal, setAppeal] = useState<AppealWithVersion | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [step, setStep] = useState<WorkflowStep>("intro");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [analysisBusy, setAnalysisBusy] = useState(false);
  const [draftBusy, setDraftBusy] = useState(false);
  const [revisionBusy, setRevisionBusy] = useState(false);
  const [userFacts, setUserFacts] = useState("");
  const [objective, setObjective] = useState(
    "Request review of the decision using the supported facts and evidence in the record.",
  );
  const [revision, setRevision] = useState("");

  async function refresh() {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await appealAuthFetch(`/api/cases/${encodeURIComponent(caseId)}`);
      const result = await readJson<{ appeal: AppealWithVersion }>(response);
      setAppeal(result.appeal);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load case.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [caseId, user?.id]);

  const go = (next: Tab) => {
    setTab(next);
    setStep(
      ({
        overview: "intro",
        documents: "document",
        analysis: "xray",
        response: "draft",
        packet: "packet",
        mail: "mailing",
      } as Record<Tab, WorkflowStep>)[next],
    );
  };

  const documentText = normalizeExtractedText(
    sourceText ||
      appeal?.decision.rawText ||
      appeal?.decision.facts.map((fact) => `${fact.label}: ${fact.value}`).join("\n") ||
      "",
  );
  const facts = useMemo(() => appeal?.decision.facts ?? [], [appeal]);

  async function analyze() {
    if (documentText.length < 20) {
      go("documents");
      setError("Add source document text before analysis.");
      return;
    }
    setAnalysisBusy(true);
    setError(null);
    try {
      const response = await appealAuthFetch(
        `/api/cases/${encodeURIComponent(caseId)}/analyze`,
        { method: "POST", body: JSON.stringify({ documentText }) },
      );
      const result = await readJson<{ appeal: AppealWithVersion }>(response);
      setAppeal(result.appeal);
      setSourceText(result.appeal.decision.rawText || documentText);
      go("analysis");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "AI analysis failed.");
    } finally {
      setAnalysisBusy(false);
    }
  }

  async function draft() {
    setDraftBusy(true);
    setError(null);
    try {
      const response = await appealAuthFetch(
        `/api/cases/${encodeURIComponent(caseId)}/draft`,
        {
          method: "POST",
          body: JSON.stringify({ userFacts, userObjective: objective }),
        },
      );
      const result = await readJson<{ appeal: AppealWithVersion }>(response);
      setAppeal(result.appeal);
      go("response");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Draft generation failed.");
    } finally {
      setDraftBusy(false);
    }
  }

  async function revise() {
    if (!revision.trim()) return;
    setRevisionBusy(true);
    setError(null);
    try {
      const response = await appealAuthFetch(
        `/api/cases/${encodeURIComponent(caseId)}/revise`,
        { method: "POST", body: JSON.stringify({ instruction: revision }) },
      );
      const result = await readJson<{ appeal: AppealWithVersion }>(response);
      setAppeal(result.appeal);
      setRevision("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Revision failed.");
    } finally {
      setRevisionBusy(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <Loader2 className="animate-spin text-stamp" size={22} />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="text-center">
          <h1 className="heading-lg">Sign in required</h1>
          <Link to="/auth" className="btn-amber mt-5 inline-flex">Sign in</Link>
        </div>
      </div>
    );
  }
  if (!appeal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="max-w-md text-center">
          <h1 className="heading-lg">Case unavailable</h1>
          <p className="mt-3 text-sm text-muted-foreground">{error || "We could not load this case."}</p>
          <Link to="/dashboard" className="btn-outline mt-5 inline-flex">Back to cases</Link>
        </div>
      </div>
    );
  }

  const navItems = steps.map((item, index) => ({
    ...item,
    completed:
      index === 0 ||
      (index === 1 && Boolean(documentText)) ||
      (index === 2 && Boolean(appeal.decision.extractedAt)) ||
      (index === 3 && appeal.draft.length > 50) ||
      (index === 4 && Boolean(appeal.packet)),
    attention: item.step === "document" && !documentText,
  }));

  return (
    <AppShell
      navItems={navItems}
      currentStep={step}
      onNavigate={(next) =>
        go(
          ({
            intro: "overview",
            document: "documents",
            xray: "analysis",
            draft: "response",
            packet: "packet",
            mailing: "mail",
            proof: "mail",
          } as Partial<Record<WorkflowStep, Tab>>)[next] ?? "overview",
        )
      }
      appealNumber={
        appeal.decision.referenceNumber || `CASE-${caseId.slice(0, 8).toUpperCase()}`
      }
      appealTitle={appeal.decision.decisionTypeLabel || appeal.workflowId}
      statusLabel={appeal.status}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="section-label">{appeal.workflowId}</div>
          <h1 className="heading-xl truncate">
            {appeal.decision.decisionTypeLabel || appeal.workflowId}
          </h1>
        </div>
        <Link to="/dashboard" className="btn-outline hidden sm:inline-flex">All cases</Link>
      </div>

      <ProgressRail
        steps={steps.map((item, index) => ({
          label: item.label,
          step: item.step,
          status:
            item.step === step
              ? "current"
              : navItems[index]?.completed
                ? "done"
                : "todo",
        }))}
        currentStep={step}
      />

      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-warm-border">
        {(["overview", "documents", "analysis", "response", "packet", "mail"] as Tab[]).map(
          (key) => (
            <button
              key={key}
              onClick={() => go(key)}
              className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium ${
                tab === key
                  ? "border-stamp text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {key === "analysis" ? "AI Analysis" : key[0].toUpperCase() + key.slice(1)}
            </button>
          ),
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {tab === "overview" && (
        <div className="mt-6 space-y-5">
          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50">
                <Sparkles size={20} className="text-indigo-700" />
              </div>
              <div>
                <p className="section-label">Case workspace</p>
                <h2 className="heading-lg mt-1">Build the appeal from the record.</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Source text, extracted facts, AI analysis, response revisions, packet integrity,
                  and mailing stay together in one owner-scoped case.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <StageButton label="Review documents" icon={FileText} onClick={() => go("documents")} />
              <StageButton label="Run AI analysis" icon={Bot} onClick={() => go("analysis")} />
              <StageButton label="Prepare response" icon={Send} onClick={() => go("response")} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Fact label="Agency" value={appeal.decision.agency || "Not identified"} />
            <Fact label="Reference" value={appeal.decision.referenceNumber || "Not provided"} />
            <Fact label="Deadline" value={appeal.decision.deadline?.date || "Not established"} />
            <Fact label="Status" value={appeal.status} />
          </div>
        </div>
      )}

      {tab === "documents" && (
        <div className="mt-6 space-y-5">
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-label">Document room</p>
                <h2 className="heading-lg mt-1">Give the analyst the source record.</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Paste extracted source text or stage a text file here. Binary source/evidence files
                  remain governed by the existing document and packet pipeline.
                </p>
              </div>
              <label className="btn-outline cursor-pointer">
                <Upload size={16} /> Stage text
                <input
                  type="file"
                  accept=".txt,.md,text/plain,text/markdown"
                  className="sr-only"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (file) setSourceText(normalizeExtractedText(await file.text()));
                  }}
                />
              </label>
            </div>
            <textarea
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              placeholder="Paste the text of the decision, denial, notice, or ruling…"
              className="mt-6 min-h-[300px] w-full rounded-xl border border-warm-border bg-white p-5 text-sm leading-7 outline-none focus:border-indigo-500"
            />
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 size={14} /> {documentText.length.toLocaleString()} characters available.
            </div>
          </div>
        </div>
      )}

      {tab === "analysis" && (
        <div className="mt-6 space-y-5">
          <div className="card p-6">
            <p className="section-label">AI analyst</p>
            <h2 className="heading-lg mt-1">Understand before writing.</h2>
            <p className="mt-2 text-sm text-slate-600">
              Analysis extracts structured facts and dates into the persisted case. AI output stays
              advisory and does not silently replace user-confirmed facts.
            </p>
            <button className="btn-amber mt-6 inline-flex" disabled={analysisBusy} onClick={analyze}>
              {analysisBusy ? <><Loader2 className="animate-spin" size={16} /> Analyzing…</> : <><RefreshCw size={16} /> {appeal.decision.extractedAt ? "Run analysis again" : "Run AI analysis"}</>}
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {facts.map((fact) => (
              <div key={fact.id} className="card p-4">
                <p className="section-label">{fact.label}</p>
                <p className="mt-1 text-sm text-slate-700">{fact.value}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {fact.source} · {Math.round(fact.confidence * 100)}% confidence
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "response" && (
        <div className="mt-6 space-y-5">
          <div className="card p-6">
            <p className="section-label">Response writer</p>
            <h2 className="heading-lg mt-1">Generate from the analyzed record.</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium">
                Your additional facts
                <textarea value={userFacts} onChange={(event) => setUserFacts(event.target.value)} className="mt-2 min-h-32 w-full rounded-xl border border-warm-border p-4" />
              </label>
              <label className="text-sm font-medium">
                Requested outcome
                <textarea value={objective} onChange={(event) => setObjective(event.target.value)} className="mt-2 min-h-32 w-full rounded-xl border border-warm-border p-4" />
              </label>
            </div>
            <button className="btn-amber mt-4 inline-flex" disabled={draftBusy} onClick={draft}>
              {draftBusy ? <><Loader2 className="animate-spin" size={16} /> Writing…</> : <><Sparkles size={16} /> Generate response</>}
            </button>
          </div>

          {appeal.draft && (
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="section-label">Current draft</p>
                  <p className="mt-1 text-xs text-muted-foreground">Persisted case draft · {appeal.draft.length.toLocaleString()} characters</p>
                </div>
                <StatusBadge status="in-progress">Editable</StatusBadge>
              </div>
              <textarea value={appeal.draft} readOnly className="mt-5 min-h-[420px] w-full rounded-xl border border-warm-border bg-white p-5 text-sm leading-7" />
              <div className="mt-4 border-t border-warm-border pt-4">
                <label className="text-sm font-medium">
                  Ask AI to revise the persisted draft
                  <textarea value={revision} onChange={(event) => setRevision(event.target.value)} placeholder="Clarify a point while preserving all confirmed facts…" className="mt-2 min-h-24 w-full rounded-xl border border-warm-border p-4" />
                </label>
                <button className="btn-outline mt-3 inline-flex" disabled={revisionBusy || !revision.trim()} onClick={revise}>
                  {revisionBusy ? <><Loader2 className="animate-spin" size={16} /> Revising…</> : "Revise with AI"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "packet" && (
        <div className="mt-6 card p-6">
          <p className="section-label">Packet</p>
          <h2 className="heading-lg mt-1">Use the canonical locked packet pipeline.</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {appeal.packet
              ? "This case already has packet state. Continue through the existing packet review and approval flow; this workspace does not create a competing packet implementation."
              : "Generate and review the response first. Packet assembly remains handled by Appeal Mail's existing authenticated packet builder, hashing, approval, and fulfillment path."}
          </p>
        </div>
      )}

      {tab === "mail" && (
        <div className="mt-6 card p-6">
          <p className="section-label">Mail</p>
          <h2 className="heading-lg mt-1">Mail only the approved locked packet.</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Payment and browser return do not bypass packet integrity or approval. Fulfillment stays
            on the hardened canonical Stripe → locked packet → MailMyPDF path.
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <ShieldCheck size={17} className="text-emerald-600" /> Packet and fulfillment remain server-authoritative.
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StageButton({ label, icon: Icon, onClick }: { label: string; icon: typeof FileText; onClick: () => void }) {
  return <button onClick={onClick} className="btn-outline justify-start"><Icon size={16} /> {label}</button>;
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="card p-4"><p className="section-label">{label}</p><p className="mt-1 text-sm text-slate-700">{value}</p></div>;
}
