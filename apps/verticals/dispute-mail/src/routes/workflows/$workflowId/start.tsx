import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, FileSearch, Loader2, ShieldCheck, UploadCloud } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getWorkflowProfile } from "@/domain/workflow-profiles";
import type { EvidenceItem } from "@/domain/gold-standard";
import { workflows, type WorkflowId } from "@/domain/workflows";
import { analyzeUploadedWorkflowDocument } from "@/services/claude-document.functions";
import { DisputeMailFunnel } from "@/components/dispute-mail-funnel";

export const Route = createFileRoute("/workflows/$workflowId/start")({ component: WorkflowIntakePage });
function isWorkflowId(value: string): value is WorkflowId { return value in workflows; }

type AIResult = Awaited<ReturnType<typeof analyzeUploadedWorkflowDocument>>;

function WorkflowIntakePage() {
  const { workflowId } = Route.useParams();
  if (!isWorkflowId(workflowId)) throw notFound();
  const profile = getWorkflowProfile(workflowId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [objective, setObjective] = useState("");
  const [facts, setFacts] = useState<Record<string, string>>({});
  const [evidenceStatuses, setEvidenceStatuses] = useState<Record<string, EvidenceItem["status"]>>({});
  const [result, setResult] = useState<AIResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const factFields = useMemo(() => profile.requiredFacts.map((label) => ({ label, key: label.toLowerCase().replace(/[^a-z0-9]+(.)/g, (_, c) => c.toUpperCase()).replace(/[^a-zA-Z0-9]/g, "") })), [profile.requiredFacts]);
  const evidenceItems = useMemo(() => profile.evidenceRequirements.map((description) => ({ id: `evidence-${description.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`, description })), [profile.evidenceRequirements]);

  const submit = async () => {
    if (!selectedFile) { setError("Choose the document you want Claude to analyze."); return; }
    setRunning(true); setError(null);
    try {
      const formData = new FormData();
      formData.set("file", selectedFile);
      formData.set("workflowId", workflowId);
      formData.set("facts", JSON.stringify(facts));
      formData.set("objective", objective);
      formData.set("evidenceStatuses", JSON.stringify(evidenceStatuses));
      const execution = await analyzeUploadedWorkflowDocument({ data: formData });
      setResult(execution);
    } catch (cause) { setResult(null); setError(cause instanceof Error ? cause.message : "The workflow could not be analyzed."); }
    finally { setRunning(false); }
  };

  return (
    <main className="min-h-screen bg-cream">
      <SiteHeader />
      <section className="border-b border-warm-border bg-teal-50 py-12"><div className="container max-w-4xl"><Link to="/workflows/$workflowId" params={{ workflowId }} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"><ArrowLeft size={16} /> Back to workflow</Link><div className="eyebrow mt-7">START WORKFLOW</div><h1 className="mt-2 text-4xl font-bold text-teal-700 md:text-5xl" style={{ fontFamily: "var(--font-serif)" }}>{profile.primaryKeyword}</h1><p className="mt-4 max-w-3xl text-lg leading-8 text-slate-500">{profile.problem}</p></div></section>

      <section className="container grid gap-8 py-12 lg:grid-cols-[1fr_340px]">
        <div className="space-y-7">
          <div className="card p-7"><div className="flex items-start gap-3"><FileSearch className="mt-1 text-teal-700" size={22} /><div><h2 className="text-xl font-semibold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>Upload the document</h2><p className="mt-1 text-sm leading-6 text-slate-500">Upload the actual PDF. The server stores it in MailMyPDF, then sends the document itself to Claude for extraction and analysis.</p></div></div><input ref={fileInputRef} type="file" accept="application/pdf" className="sr-only" onChange={(event) => { const file = event.target.files?.[0] ?? null; setSelectedFile(file); setResult(null); setError(null); }} /><button type="button" onClick={() => fileInputRef.current?.click()} className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-warm-border bg-white px-5 py-10 text-sm font-semibold text-teal-700 transition hover:border-teal-500"><UploadCloud size={24} /> {selectedFile ? selectedFile.name : "Choose a PDF document"}</button>{selectedFile && <p className="mt-3 text-xs text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB · PDF · ready for server-side analysis</p>}</div>

          <div className="card p-7"><h2 className="text-xl font-semibold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>Problem-specific facts</h2><div className="mt-5 space-y-5">{factFields.map(({ label, key }) => <label key={key} className="block"><span className="text-sm font-semibold text-teal-700">{label}</span><input value={facts[key] ?? ""} onChange={(e) => setFacts((current) => ({ ...current, [key]: e.target.value }))} className="mt-2 w-full rounded-xl border border-warm-border bg-white p-3 text-sm text-slate-700 outline-none focus:border-teal-500" /></label>)}</div></div>

          <div className="card p-7"><h2 className="text-xl font-semibold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>Evidence review</h2><p className="mt-1 text-sm leading-6 text-slate-500">These statuses are recorded separately from the AI analysis. Human verification remains a required gate.</p><div className="mt-5 space-y-4">{evidenceItems.map((item) => <div key={item.id} className="rounded-xl border border-warm-border bg-white p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-1 text-teal-700" size={19} /><div className="min-w-0 flex-1"><div className="text-sm font-semibold text-teal-700">{item.description}</div><select value={evidenceStatuses[item.id] ?? "requested"} onChange={(e) => setEvidenceStatuses((current) => ({ ...current, [item.id]: e.target.value as EvidenceItem["status"] }))} className="mt-3 w-full rounded-lg border border-warm-border bg-white p-2 text-sm text-slate-600"><option value="requested">Requested — not yet supplied</option><option value="provided">Provided — needs verification</option><option value="verified">Verified — reviewed by a human</option><option value="not_applicable">Not applicable — explicitly reviewed</option></select></div></div></div>)}</div></div>

          <div className="card p-7"><h2 className="text-xl font-semibold text-teal-700" style={{ fontFamily: "var(--font-serif)" }}>Requested outcome</h2><p className="mt-1 text-sm leading-6 text-slate-500">{profile.objectivePrompt}</p><textarea value={objective} onChange={(e) => setObjective(e.target.value)} rows={5} className="mt-4 w-full rounded-xl border border-warm-border bg-white p-4 text-sm leading-6 text-slate-700 outline-none focus:border-teal-500" placeholder="Describe what you want the recipient to investigate, correct, stop, or otherwise address." /></div>
          {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700">{error}</div>}
          <button type="button" onClick={submit} disabled={running || !selectedFile} className="btn-rose w-full justify-center disabled:opacity-60">{running ? <><Loader2 size={18} className="animate-spin" /> Claude is analyzing the document and preparing the response</> : <>Upload &amp; analyze with Claude</>}</button>
          {result?.draft && <DisputeMailFunnel workflowId={workflowId} workflowTitle={profile.primaryKeyword} draft={result.draft} documentId={result.document.id} draftValidated={result.validation.passed} humanApproved={false} />}
        </div>

        <aside className="space-y-6"><div className="card p-6"><div className="eyebrow">AI WORKFLOW</div><ol className="mt-4 space-y-3 text-sm leading-6 text-slate-500"><li><b className="text-teal-700">1.</b> Store and attest the uploaded document</li><li><b className="text-teal-700">2.</b> Claude extracts facts and issues from the PDF</li><li><b className="text-teal-700">3.</b> Claude builds the response strategy</li><li><b className="text-teal-700">4.</b> Claude drafts the correspondence</li><li><b className="text-teal-700">5.</b> Claude validates the draft before human review</li></ol></div><div className="card p-6"><div className="eyebrow">EVIDENCE REQUIRED</div><ul className="mt-4 space-y-3">{profile.evidenceRequirements.map((item) => <li key={item} className="flex gap-2 text-sm leading-6 text-slate-500"><CheckCircle2 size={17} className="mt-1 shrink-0 text-rose-500" />{item}</li>)}</ul></div><div className="card p-6"><div className="eyebrow">DEADLINE</div><p className="mt-3 text-sm leading-6 text-slate-500">{profile.deadlinePolicy}</p></div>{result && <ResultPanel result={result} />}</aside>
      </section>
      <SiteFooter />
    </main>
  );
}

function ResultPanel({ result }: { result: AIResult }) {
  return <div className="card p-6"><div className="eyebrow">CLAUDE WORKFLOW RESULT</div><div className={`mt-3 text-lg font-bold ${result.blocked ? "text-rose-600" : "text-emerald-700"}`}>{result.blocked ? "Blocked pending review or required information" : "AI draft passed initial validation and is ready for human review"}</div><div className="mt-4 space-y-2 text-sm text-slate-500"><div>Stored document: <span className="font-semibold text-teal-700">{result.document.id}</span></div><div>Claude analysis: <span className="font-semibold text-teal-700">{result.analysis.findings.length} findings</span></div><div>Evidence items: <span className="font-semibold text-teal-700">{result.analysis.evidence.length}</span></div></div><ul className="mt-4 space-y-2">{result.validation.issues.slice(0, 8).map((issue) => <li key={issue} className="text-sm leading-6 text-slate-500">{issue}</li>)}</ul>{result.draft && <details className="mt-5"><summary className="cursor-pointer text-sm font-semibold text-teal-700">View Claude-generated response</summary><pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">{result.draft}</pre></details>}</div>;
}
