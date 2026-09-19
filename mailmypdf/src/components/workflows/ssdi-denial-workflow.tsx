import { Link } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  FileCheck2,
  FileText,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ensureSupabase, supabase } from "@/integrations/supabase/client";
import {
  approveCasePacket,
  attachCaseDocument,
  createSsdiCase,
  detachCaseDocument,
  EVIDENCE_KINDS,
  evidenceLabel,
  formatServerMoney,
  includedDocuments,
  loadSsdiCase,
  packetBlockers,
  patchCaseDocument,
  previewCasePacket,
  saveCaseDraft,
  uploadSecureDocument,
  WorkflowApiError,
  type ApprovalResult,
  type CaseDocument,
  type EvidenceKind,
  type MailClass,
  type PacketPreview,
  type Recipient,
  type WorkflowCase,
} from "@/lib/ssdi-workflow-client";

const WINDOWS = [
  "Secure start",
  "Denial notice",
  "Supporting records",
  "Decision details",
  "Your limitations",
  "Evidence review",
  "Appeal direction",
  "Appeal draft",
  "Packet order",
  "Mailing and price",
  "Final approval",
  "Approval record",
] as const;

const CASE_KEY = "mailmypdf:ssdi-denial:case";
const STEP_KEY = "mailmypdf:ssdi-denial:step";

type StagedFile = { id: string; file: File; kind: EvidenceKind };

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-[.16em] text-muted-foreground">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-rule bg-paper px-4 py-3 text-sm outline-none transition focus:border-cobalt focus:ring-2 focus:ring-cobalt/10"
      />
    </label>
  );
}

function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "warning" | "success";
  children: React.ReactNode;
}) {
  const style =
    tone === "warning"
      ? "border-amber-300 bg-amber-50 text-amber-950"
      : tone === "success"
        ? "border-emerald-300 bg-emerald-50 text-emerald-950"
        : "border-cobalt/25 bg-cobalt-soft/45 text-ink";
  return <div className={`rounded-2xl border p-4 text-sm leading-6 ${style}`}>{children}</div>;
}

function ScanBadge({ document }: { document: CaseDocument }) {
  if (document.usable)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-800">
        <Check className="h-3 w-3" /> Security scan passed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-900">
      <ShieldCheck className="h-3 w-3" />{" "}
      {document.security_status === "quarantined"
        ? "Pending security scan"
        : document.security_status.replaceAll("_", " ")}
    </span>
  );
}

export function SsdiDenialWorkflow() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [workflowCase, setWorkflowCase] = useState<WorkflowCase | null>(null);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [step, setStepState] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [draft, setDraft] = useState("");
  const [draftVersion, setDraftVersion] = useState<number | null>(null);
  const [packet, setPacket] = useState<PacketPreview | null>(null);
  const [approval, setApproval] = useState<ApprovalResult | null>(null);
  const [mailClass, setMailClass] = useState<MailClass>("certified");
  const [recipient, setRecipient] = useState<Recipient>({
    name: "Social Security Administration",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal: "",
  });
  const [decision, setDecision] = useState({
    noticeDate: "",
    deadline: "",
    claimNumber: "",
    statedReasons: "",
  });
  const [claimant, setClaimant] = useState({
    name: "",
    conditions: "",
    limitations: "",
    treatment: "",
  });
  const [strategy, setStrategy] = useState({
    reviewLevel: "reconsideration",
    correction: "",
    requestedOutcome: "",
  });

  const setStep = useCallback((next: number) => {
    const safe = Math.max(0, Math.min(WINDOWS.length - 1, next));
    setStepState(safe);
    if (typeof window !== "undefined") localStorage.setItem(STEP_KEY, String(safe));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const refreshCase = useCallback(async (caseId: string) => {
    const result = await loadSsdiCase(caseId);
    setWorkflowCase(result.case);
    setDocuments(result.documents);
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void (async () => {
      try {
        await ensureSupabase();
        const auth = supabase.auth;
        if (!auth) return;
        const { data } = await auth.getSession();
        if (!active) return;
        setSession(data.session);
        const subscription = auth.onAuthStateChange((_event, next) => setSession(next));
        unsubscribe = () => subscription.data.subscription.unsubscribe();
      } finally {
        if (active) setAuthReady(true);
      }
    })();
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!session || typeof window === "undefined") return;
    const caseId = localStorage.getItem(CASE_KEY);
    const savedStep = Number(localStorage.getItem(STEP_KEY) ?? "0");
    if (Number.isInteger(savedStep)) setStepState(Math.max(1, Math.min(9, savedStep)));
    if (!caseId) return;
    setBusy(true);
    refreshCase(caseId)
      .catch((cause) => {
        if (cause instanceof WorkflowApiError && cause.status === 404) {
          localStorage.removeItem(CASE_KEY);
          localStorage.removeItem(STEP_KEY);
        } else setError(messageFrom(cause));
      })
      .finally(() => setBusy(false));
  }, [refreshCase, session]);

  const notice = documents.find((document) => document.role === "subject_notice");
  const evidence = documents
    .filter((document) => document.role === "evidence")
    .sort((a, b) => a.position - b.position);
  const blockers = useMemo(() => packetBlockers(documents), [documents]);

  async function startCase() {
    if (!consent) return setError("Confirm document-processing consent before opening the case.");
    setBusy(true);
    setError(null);
    try {
      const created = await createSsdiCase();
      setWorkflowCase(created);
      localStorage.setItem(CASE_KEY, created.id);
      setStep(1);
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setBusy(false);
    }
  }

  async function uploadNotice(file: File) {
    if (!workflowCase) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded = await uploadSecureDocument(file, "ssdi-denial-notice");
      setDocuments(
        await attachCaseDocument(workflowCase.id, {
          document_id: uploaded.id,
          role: "subject_notice",
          position: 0,
        }),
      );
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setBusy(false);
    }
  }

  function stageFiles(files: FileList | File[]) {
    const additions = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      kind: "medical_records" as EvidenceKind,
    }));
    setStaged((current) => [...current, ...additions]);
  }

  async function uploadEvidence() {
    if (!workflowCase || !staged.length) return;
    setBusy(true);
    setError(null);
    // Track what actually reached the case. If the run fails partway, the
    // staged list must keep only what did not attach — otherwise a retry
    // uploads a second copy of every earlier file, and because the server
    // prices supporting pages from the pages actually enclosed, the duplicates
    // are both mailed and charged for.
    const attached = new Set<string>();
    try {
      let latest = documents;
      for (const item of staged) {
        const uploaded = await uploadSecureDocument(item.file, `ssdi-evidence-${item.kind}`);
        latest = await attachCaseDocument(workflowCase.id, {
          document_id: uploaded.id,
          role: "evidence",
          evidence_kind: item.kind,
          position: latest.filter((document) => document.role === "evidence").length + 1,
        });
        attached.add(item.id);
        setDocuments(latest);
      }
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setStaged((current) => current.filter((item) => !attached.has(item.id)));
      setBusy(false);
    }
  }

  async function updateDocument(
    documentId: string,
    patch: { included?: boolean; position?: number },
  ) {
    if (!workflowCase) return;
    setBusy(true);
    setError(null);
    try {
      setDocuments(await patchCaseDocument(workflowCase.id, documentId, patch));
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setBusy(false);
    }
  }

  async function removeDocument(documentId: string) {
    if (!workflowCase) return;
    setBusy(true);
    setError(null);
    try {
      setDocuments(await detachCaseDocument(workflowCase.id, documentId));
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setBusy(false);
    }
  }

  async function moveDocument(document: CaseDocument, direction: -1 | 1) {
    const ordered = includedDocuments(documents);
    const index = ordered.findIndex((item) => item.document_id === document.document_id);
    const other = ordered[index + direction];
    if (!workflowCase || !other) return;
    setBusy(true);
    setError(null);
    try {
      await patchCaseDocument(workflowCase.id, document.document_id, { position: other.position });
      setDocuments(
        await patchCaseDocument(workflowCase.id, other.document_id, {
          position: document.position,
        }),
      );
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!workflowCase || !draft.trim())
      return setError("Write or paste the appeal text before saving a version.");
    setBusy(true);
    setError(null);
    try {
      setDraftVersion(await saveCaseDraft(workflowCase.id, draft));
      setPacket(null);
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setBusy(false);
    }
  }

  async function previewPacket() {
    if (!workflowCase || blockers.length) return setError(blockers.join(" "));
    setBusy(true);
    setError(null);
    try {
      setPacket(await previewCasePacket(workflowCase.id, mailClass));
      setStep(10);
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!workflowCase || !packet) return;
    setBusy(true);
    setError(null);
    try {
      setApproval(await approveCasePacket(workflowCase.id, recipient, mailClass, packet));
      setStep(11);
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setBusy(false);
    }
  }

  if (!authReady || (busy && !workflowCase && session))
    return (
      <PageFrame>
        <div className="py-32 text-center text-sm text-muted-foreground">
          Opening your secure workspace…
        </div>
      </PageFrame>
    );
  if (!session)
    return (
      <PageFrame>
        <section className="mx-auto max-w-xl py-20 text-center">
          <LockKeyhole className="mx-auto h-10 w-10 text-cobalt" />
          <p className="mt-5 text-xs font-semibold uppercase tracking-[.2em] text-cobalt">
            Secure account required
          </p>
          <h1 className="mt-3 font-serif text-4xl">Sign in before starting your SSDI appeal.</h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            Your denial notice and medical records belong in an authenticated, owner-scoped case—not
            an anonymous browser session.
          </p>
          <Link
            to="/auth"
            search={{ redirect: "/benefits/ssdi-denial" }}
            className="mt-7 inline-flex rounded-full bg-cobalt px-6 py-3 text-sm font-medium text-white"
          >
            Sign in or create an account
          </Link>
        </section>
      </PageFrame>
    );

  const content = [
    <StartWindow
      key="start"
      consent={consent}
      setConsent={setConsent}
      onStart={startCase}
      busy={busy}
    />,
    <NoticeWindow
      key="notice"
      notice={notice}
      onUpload={uploadNotice}
      onRemove={removeDocument}
      busy={busy}
    />,
    <EvidenceUploadWindow
      key="evidence"
      staged={staged}
      setStaged={setStaged}
      stageFiles={stageFiles}
      upload={uploadEvidence}
      evidence={evidence}
      busy={busy}
    />,
    <DecisionWindow key="decision" value={decision} setValue={setDecision} />,
    <ClaimantWindow key="claimant" value={claimant} setValue={setClaimant} />,
    <EvidenceReviewWindow
      key="review"
      documents={documents}
      update={updateDocument}
      remove={removeDocument}
      move={moveDocument}
      busy={busy}
    />,
    <StrategyWindow key="strategy" value={strategy} setValue={setStrategy} />,
    <DraftWindow
      key="draft"
      draft={draft}
      setDraft={setDraft}
      version={draftVersion}
      save={saveDraft}
      busy={busy}
    />,
    <PacketWindow key="packet" documents={documents} blockers={blockers} />,
    <MailingWindow
      key="mail"
      recipient={recipient}
      setRecipient={setRecipient}
      mailClass={mailClass}
      setMailClass={(value) => {
        setMailClass(value);
        setPacket(null);
      }}
      blockers={blockers}
      preview={previewPacket}
      busy={busy}
    />,
    <ApprovalWindow
      key="approval"
      packet={packet}
      recipient={recipient}
      mailClass={mailClass}
      approve={approve}
      busy={busy}
    />,
    <RecordWindow key="record" approval={approval} />,
  ][step];

  const canContinue =
    step === 0
      ? !!workflowCase
      : step === 1
        ? !!notice
        : step === 7
          ? !!draftVersion
          : step === 9 || step === 10 || step === 11
            ? false
            : true;

  return (
    <PageFrame>
      <div className="grid gap-8 py-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:py-12">
        <aside>
          <div className="sticky top-5 rounded-2xl border border-rule bg-paper-deep/35 p-4">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-[.2em] text-muted-foreground">
              SSDI denial appeal
            </p>
            <ol className="mt-4 space-y-1">
              {WINDOWS.map((label, index) => (
                <li key={label}>
                  <button
                    disabled={index > step || (index > 9 && !packet)}
                    onClick={() => setStep(index)}
                    className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-xs transition ${index === step ? "bg-ink text-paper" : index < step ? "text-foreground hover:bg-paper" : "cursor-not-allowed text-muted-foreground/55"}`}
                  >
                    <span className="w-5 font-mono text-[10px]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>{label}</span>
                    {index < step && <Check className="ml-auto h-3 w-3" />}
                  </button>
                </li>
              ))}
            </ol>
            {workflowCase && (
              <p className="mt-4 border-t border-rule px-2 pt-4 font-mono text-[10px] text-muted-foreground">
                Case {workflowCase.id.slice(0, 8)}
              </p>
            )}
          </div>
        </aside>
        <main>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-cobalt">
                Window {step + 1} of 12
              </p>
              <h1 className="mt-1 font-serif text-3xl sm:text-4xl">{WINDOWS[step]}</h1>
            </div>
            <span className="rounded-full border border-rule px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Private workspace
            </span>
          </div>
          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-auto">
                ×
              </button>
            </div>
          )}
          <section className="rounded-3xl border border-rule bg-card p-5 shadow-card sm:p-8">
            {content}
          </section>
          {step > 0 && step < 9 && (
            <div className="mt-5 flex justify-between">
              <button
                onClick={() => setStep(step - 1)}
                className="inline-flex items-center gap-2 rounded-full border border-rule px-5 py-2.5 text-sm"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                disabled={!canContinue || busy}
                onClick={() => setStep(step + 1)}
                className="inline-flex items-center gap-2 rounded-full bg-cobalt px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </main>
      </div>
    </PageFrame>
  );
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">{children}</div>
      <SiteFooter />
    </div>
  );
}

function StartWindow({
  consent,
  setConsent,
  onStart,
  busy,
}: {
  consent: boolean;
  setConsent: (value: boolean) => void;
  onStart: () => void;
  busy: boolean;
}) {
  return (
    <div>
      <ShieldCheck className="h-9 w-9 text-cobalt" />
      <h2 className="mt-5 font-serif text-3xl">A private case for your denial and evidence.</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
        This workspace organizes an SSDI denial response. It is not the Social Security
        Administration and does not provide legal representation or guarantee an outcome.
      </p>
      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        {[
          ["Owner scoped", "Only your authenticated account may open the case."],
          [
            "Quarantine first",
            "Every uploaded document is blocked until malware scanning clears it.",
          ],
          ["Exact approval", "The server rebuilds and hashes the packet you approve."],
        ].map(([title, text]) => (
          <div key={title} className="rounded-2xl border border-rule bg-paper-deep/25 p-4">
            <p className="text-sm font-medium">{title}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>
      <label className="mt-7 flex cursor-pointer items-start gap-3 rounded-2xl border border-rule p-4">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-1 h-4 w-4 accent-cobalt"
        />
        <span className="text-sm leading-6">
          I consent to MailMyPDF processing the documents I choose to upload for this SSDI appeal
          workflow. I understand uploaded files enter quarantine and cannot be used until security
          scanning clears them.
        </span>
      </label>
      <button
        disabled={!consent || busy}
        onClick={onStart}
        className="mt-6 rounded-full bg-cobalt px-6 py-3 text-sm font-medium text-white disabled:opacity-40"
      >
        {busy ? "Opening case…" : "Open secure case"}
      </button>
    </div>
  );
}

function DropArea({
  multiple,
  onFiles,
  label,
}: {
  multiple?: boolean;
  onFiles: (files: FileList | File[]) => void;
  label: string;
}) {
  return (
    <label
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onFiles(event.dataTransfer.files);
      }}
      className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-rule bg-paper-deep/20 px-6 py-10 text-center transition hover:border-cobalt/50"
    >
      <UploadCloud className="h-8 w-8 text-cobalt" />
      <span className="mt-3 text-sm font-medium">{label}</span>
      <span className="mt-1 text-xs text-muted-foreground">
        Drag and drop or choose {multiple ? "files" : "a file"}
      </span>
      <input
        type="file"
        multiple={multiple}
        accept="application/pdf,image/png,image/jpeg"
        className="sr-only"
        onChange={(event) => event.target.files && onFiles(event.target.files)}
      />
    </label>
  );
}

function NoticeWindow({
  notice,
  onUpload,
  onRemove,
  busy,
}: {
  notice?: CaseDocument;
  onUpload: (file: File) => void;
  onRemove: (id: string) => void;
  busy: boolean;
}) {
  return (
    <div>
      <h2 className="font-serif text-3xl">Add the SSDI denial notice.</h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        Upload the complete decision, including pages that look like instructions or mailing
        addresses. The file is recorded as the case’s single subject notice.
      </p>
      <div className="mt-6">
        {notice ? (
          <DocumentRow
            document={notice}
            actions={
              <button
                disabled={busy}
                onClick={() => onRemove(notice.document_id)}
                className="rounded-full border border-rule p-2"
                aria-label="Detach denial notice"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            }
          />
        ) : (
          <DropArea
            label="Upload your SSDI denial notice"
            onFiles={(files) => {
              const file = Array.from(files)[0];
              if (file) void onUpload(file);
            }}
          />
        )}
      </div>
      <Notice tone="warning">
        <strong>Security status:</strong> uploads remain quarantined until an external malware
        scanner clears them. That scanner is not connected yet, so packet creation will remain
        blocked in a real environment.
      </Notice>
    </div>
  );
}

function EvidenceUploadWindow({
  staged,
  setStaged,
  stageFiles,
  upload,
  evidence,
  busy,
}: {
  staged: StagedFile[];
  setStaged: React.Dispatch<React.SetStateAction<StagedFile[]>>;
  stageFiles: (files: FileList | File[]) => void;
  upload: () => void;
  evidence: CaseDocument[];
  busy: boolean;
}) {
  return (
    <div>
      <h2 className="font-serif text-3xl">Add medical records and other evidence.</h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        You can add several files at once, identify what each one contains, and decide later whether
        it belongs in the mailed packet.
      </p>
      <div className="mt-6">
        <DropArea
          multiple
          label="Add medical records or supporting documents"
          onFiles={stageFiles}
        />
      </div>
      {staged.length > 0 && (
        <div className="mt-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[.18em] text-muted-foreground">
            Ready to upload
          </h3>
          {staged.map((item) => (
            <div
              key={item.id}
              className="grid items-center gap-3 rounded-2xl border border-rule p-4 sm:grid-cols-[1fr_14rem_auto]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {Math.max(1, Math.round(item.file.size / 1024))} KB
                </p>
              </div>
              <select
                aria-label={`Evidence kind for ${item.file.name}`}
                value={item.kind}
                onChange={(event) =>
                  setStaged((current) =>
                    current.map((row) =>
                      row.id === item.id
                        ? { ...row, kind: event.target.value as EvidenceKind }
                        : row,
                    ),
                  )
                }
                className="rounded-xl border border-rule bg-paper px-3 py-2 text-sm"
              >
                {EVIDENCE_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {evidenceLabel(kind)}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setStaged((current) => current.filter((row) => row.id !== item.id))}
                className="rounded-full border border-rule p-2"
                aria-label={`Remove ${item.file.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            disabled={busy}
            onClick={upload}
            className="rounded-full bg-cobalt px-5 py-2.5 text-sm font-medium text-white"
          >
            {busy
              ? "Uploading securely…"
              : `Upload ${staged.length} file${staged.length === 1 ? "" : "s"}`}
          </button>
        </div>
      )}
      {evidence.length > 0 && (
        <div className="mt-7 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-[.18em] text-muted-foreground">
            Attached evidence
          </h3>
          {evidence.map((document) => (
            <DocumentRow key={document.id} document={document} />
          ))}
        </div>
      )}
    </div>
  );
}

function DecisionWindow({
  value,
  setValue,
}: {
  value: { noticeDate: string; deadline: string; claimNumber: string; statedReasons: string };
  setValue: React.Dispatch<React.SetStateAction<typeof value>>;
}) {
  return (
    <div>
      <h2 className="font-serif text-3xl">Review the decision details yourself.</h2>
      <Notice tone="warning">
        Automatic extraction is not connected yet. Enter these details from the notice and verify
        them against the original. These fields remain only in this open browser session until the
        case-data API is added.
      </Notice>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field
          label="Notice date"
          value={value.noticeDate}
          onChange={(noticeDate) => setValue((current) => ({ ...current, noticeDate }))}
          placeholder="MM/DD/YYYY"
        />
        <Field
          label="Deadline shown"
          value={value.deadline}
          onChange={(deadline) => setValue((current) => ({ ...current, deadline }))}
          placeholder="MM/DD/YYYY or wording from notice"
        />
        <Field
          label="Claim or reference number"
          value={value.claimNumber}
          onChange={(claimNumber) => setValue((current) => ({ ...current, claimNumber }))}
        />
      </div>
      <label className="mt-5 block">
        <span className="text-xs font-medium uppercase tracking-[.16em] text-muted-foreground">
          Reasons stated in the denial
        </span>
        <textarea
          value={value.statedReasons}
          onChange={(event) =>
            setValue((current) => ({ ...current, statedReasons: event.target.value }))
          }
          rows={6}
          className="mt-2 w-full rounded-2xl border border-rule bg-paper p-4 text-sm"
        />
      </label>
    </div>
  );
}

function ClaimantWindow({
  value,
  setValue,
}: {
  value: { name: string; conditions: string; limitations: string; treatment: string };
  setValue: React.Dispatch<React.SetStateAction<typeof value>>;
}) {
  return (
    <div>
      <h2 className="font-serif text-3xl">Describe the facts the appeal should address.</h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        Use plain, accurate language. Do not guess at diagnoses, dates, or limitations.
      </p>
      <div className="mt-6">
        <Field
          label="Claimant name"
          value={value.name}
          onChange={(name) => setValue((current) => ({ ...current, name }))}
        />
      </div>
      {[
        ["Medical conditions", "conditions"],
        ["How the conditions limit work and daily activity", "limitations"],
        ["Treatment, providers, medications, and testing", "treatment"],
      ].map(([label, key]) => (
        <label key={key} className="mt-5 block">
          <span className="text-xs font-medium uppercase tracking-[.16em] text-muted-foreground">
            {label}
          </span>
          <textarea
            value={value[key as keyof typeof value]}
            onChange={(event) => setValue((current) => ({ ...current, [key]: event.target.value }))}
            rows={5}
            className="mt-2 w-full rounded-2xl border border-rule bg-paper p-4 text-sm"
          />
        </label>
      ))}
    </div>
  );
}

function DocumentRow({ document, actions }: { document: CaseDocument; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-rule bg-paper p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-paper-deep">
        <FileText className="h-5 w-5 text-cobalt" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{document.filename || "Document"}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {document.role === "subject_notice"
              ? "Denial notice"
              : evidenceLabel(document.evidence_kind)}
          </span>
          <ScanBadge document={document} />
        </div>
      </div>
      {actions}
    </div>
  );
}

function EvidenceReviewWindow({
  documents,
  update,
  remove,
  move,
  busy,
}: {
  documents: CaseDocument[];
  update: (id: string, patch: { included?: boolean; position?: number }) => void;
  remove: (id: string) => void;
  move: (document: CaseDocument, direction: -1 | 1) => void;
  busy: boolean;
}) {
  const ordered = [...documents].sort((a, b) =>
    a.role !== b.role ? (a.role === "subject_notice" ? -1 : 1) : a.position - b.position,
  );
  return (
    <div>
      <h2 className="font-serif text-3xl">Choose what belongs in the appeal packet.</h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        Excluding a document keeps it in the case vault but removes it from the packet. Detaching
        removes it from this case while leaving the vault file under its retention clock.
      </p>
      <div className="mt-6 space-y-3">
        {ordered.map((document, index) => {
          const canMoveUp =
            document.role === "evidence" && index > 0 && ordered[index - 1]?.role === "evidence";
          const canMoveDown =
            document.role === "evidence" &&
            index < ordered.length - 1 &&
            ordered[index + 1]?.role === "evidence";
          return (
            <DocumentRow
              key={document.id}
              document={document}
              actions={
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={document.included}
                      onChange={(event) =>
                        void update(document.document_id, { included: event.target.checked })
                      }
                      className="accent-cobalt"
                    />{" "}
                    Include
                  </label>
                  <button
                    disabled={busy || !canMoveUp}
                    onClick={() => void move(document, -1)}
                    className="rounded-full border border-rule p-2"
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    disabled={busy || !canMoveDown}
                    onClick={() => void move(document, 1)}
                    className="rounded-full border border-rule p-2"
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => void remove(document.document_id)}
                    className="rounded-full border border-rule p-2"
                    aria-label="Detach document"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              }
            />
          );
        })}
        {!ordered.length && (
          <p className="rounded-2xl border border-dashed border-rule p-8 text-center text-sm text-muted-foreground">
            No documents are attached yet.
          </p>
        )}
      </div>
    </div>
  );
}

function StrategyWindow({
  value,
  setValue,
}: {
  value: { reviewLevel: string; correction: string; requestedOutcome: string };
  setValue: React.Dispatch<React.SetStateAction<typeof value>>;
}) {
  return (
    <div>
      <h2 className="font-serif text-3xl">Set the direction for the appeal.</h2>
      <Notice>
        Choose only the review path stated in the denial notice or confirmed with SSA. MailMyPDF
        does not determine which administrative remedy is available.
      </Notice>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {[
          ["reconsideration", "Reconsideration"],
          ["hearing", "Administrative hearing"],
        ].map(([id, label]) => (
          <label
            key={id}
            className={`cursor-pointer rounded-2xl border p-4 ${value.reviewLevel === id ? "border-cobalt bg-cobalt-soft/40" : "border-rule"}`}
          >
            <input
              type="radio"
              name="review-level"
              value={id}
              checked={value.reviewLevel === id}
              onChange={() => setValue((current) => ({ ...current, reviewLevel: id }))}
              className="mr-2 accent-cobalt"
            />{" "}
            <span className="text-sm font-medium">{label}</span>
          </label>
        ))}
      </div>
      <label className="mt-5 block">
        <span className="text-xs font-medium uppercase tracking-[.16em] text-muted-foreground">
          What should be corrected or reconsidered?
        </span>
        <textarea
          rows={5}
          value={value.correction}
          onChange={(event) =>
            setValue((current) => ({ ...current, correction: event.target.value }))
          }
          className="mt-2 w-full rounded-2xl border border-rule bg-paper p-4 text-sm"
        />
      </label>
      <label className="mt-5 block">
        <span className="text-xs font-medium uppercase tracking-[.16em] text-muted-foreground">
          Requested outcome
        </span>
        <textarea
          rows={3}
          value={value.requestedOutcome}
          onChange={(event) =>
            setValue((current) => ({ ...current, requestedOutcome: event.target.value }))
          }
          className="mt-2 w-full rounded-2xl border border-rule bg-paper p-4 text-sm"
        />
      </label>
    </div>
  );
}

function DraftWindow({
  draft,
  setDraft,
  version,
  save,
  busy,
}: {
  draft: string;
  setDraft: (value: string) => void;
  version: number | null;
  save: () => void;
  busy: boolean;
}) {
  return (
    <div>
      <h2 className="font-serif text-3xl">Write or paste the appeal text.</h2>
      <Notice tone="warning">
        Automatic drafting is not connected. Nothing has been generated for you. Review all text
        yourself before saving.
      </Notice>
      <textarea
        aria-label="Appeal draft"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={18}
        placeholder="Paste or write the appeal text here…"
        className="mt-6 w-full rounded-2xl border border-rule bg-paper p-5 font-serif text-base leading-7"
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          disabled={busy || !draft.trim()}
          onClick={save}
          className="rounded-full bg-cobalt px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? "Saving…" : version ? "Save a new version" : "Save immutable draft"}
        </button>
        {version && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
            <FileCheck2 className="h-4 w-4" /> Version {version} saved
          </span>
        )}
      </div>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        The server preserves each saved version. The current API cannot retrieve the latest draft
        after a reload yet, so keep this window open while reviewing.
      </p>
    </div>
  );
}

function PacketWindow({ documents, blockers }: { documents: CaseDocument[]; blockers: string[] }) {
  const ordered = includedDocuments(documents);
  return (
    <div>
      <h2 className="font-serif text-3xl">Confirm the attachment order.</h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        The response letter will lead the packet. Included documents follow in this order. Page
        totals are intentionally omitted until the server assembles and measures the actual PDF.
      </p>
      <ol className="mt-6 space-y-3">
        <li className="flex items-center gap-4 rounded-2xl border border-cobalt/30 bg-cobalt-soft/35 p-4">
          <span className="font-mono text-xs">01</span>
          <FileText className="h-5 w-5 text-cobalt" />
          <span className="text-sm font-medium">Saved appeal draft</span>
        </li>
        {ordered.map((document, index) => (
          <li
            key={document.id}
            className="flex items-center gap-4 rounded-2xl border border-rule p-4"
          >
            <span className="font-mono text-xs">{String(index + 2).padStart(2, "0")}</span>
            <FileText className="h-5 w-5 text-cobalt" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{document.filename}</p>
              <p className="text-xs text-muted-foreground">
                {document.role === "subject_notice"
                  ? "Denial notice"
                  : evidenceLabel(document.evidence_kind)}
              </p>
            </div>
            <ScanBadge document={document} />
          </li>
        ))}
      </ol>
      {blockers.length > 0 && (
        <div className="mt-6">
          <Notice tone="warning">
            <strong>Packet blocked:</strong>
            <ul className="mt-2 list-disc pl-5">
              {blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          </Notice>
        </div>
      )}
    </div>
  );
}

function MailingWindow({
  recipient,
  setRecipient,
  mailClass,
  setMailClass,
  blockers,
  preview,
  busy,
}: {
  recipient: Recipient;
  setRecipient: React.Dispatch<React.SetStateAction<Recipient>>;
  mailClass: MailClass;
  setMailClass: (value: MailClass) => void;
  blockers: string[];
  preview: () => void;
  busy: boolean;
}) {
  const valid =
    recipient.name && recipient.line1 && recipient.city && recipient.state && recipient.postal;
  return (
    <div>
      <h2 className="font-serif text-3xl">Enter the destination and request a server quote.</h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        Use the mailing destination shown in the notice or otherwise confirmed for this appeal. The
        browser does not calculate pages or price.
      </p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <Field
          required
          label="Recipient"
          value={recipient.name}
          onChange={(name) => setRecipient((current) => ({ ...current, name }))}
        />
        <Field
          required
          label="Address line 1"
          value={recipient.line1}
          onChange={(line1) => setRecipient((current) => ({ ...current, line1 }))}
        />
        <Field
          label="Address line 2"
          value={recipient.line2 ?? ""}
          onChange={(line2) => setRecipient((current) => ({ ...current, line2 }))}
        />
        <Field
          required
          label="City"
          value={recipient.city}
          onChange={(city) => setRecipient((current) => ({ ...current, city }))}
        />
        <Field
          required
          label="State"
          value={recipient.state}
          onChange={(state) => setRecipient((current) => ({ ...current, state }))}
        />
        <Field
          required
          label="ZIP code"
          value={recipient.postal}
          onChange={(postal) => setRecipient((current) => ({ ...current, postal }))}
        />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {(["standard", "certified", "registered"] as MailClass[]).map((method) => (
          <button
            key={method}
            onClick={() => setMailClass(method)}
            className={`rounded-2xl border p-4 text-left capitalize ${mailClass === method ? "border-cobalt bg-cobalt-soft/40" : "border-rule"}`}
          >
            {method} mail
          </button>
        ))}
      </div>
      {blockers.length > 0 && (
        <div className="mt-6">
          <Notice tone="warning">
            A server quote cannot be created yet: {blockers.join(" ")} The missing malware-scanner
            service means quarantined files cannot yet clear this gate.
          </Notice>
        </div>
      )}
      <button
        disabled={busy || !valid || blockers.length > 0}
        onClick={preview}
        className="mt-6 rounded-full bg-cobalt px-6 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Assembling securely…" : "Assemble packet and get exact quote"}
      </button>
    </div>
  );
}

function ApprovalWindow({
  packet,
  recipient,
  mailClass,
  approve,
  busy,
}: {
  packet: PacketPreview | null;
  recipient: Recipient;
  mailClass: MailClass;
  approve: () => void;
  busy: boolean;
}) {
  if (!packet)
    return (
      <Notice tone="warning">
        No server packet preview exists. Return to the mailing window and request one.
      </Notice>
    );
  return (
    <div>
      <h2 className="font-serif text-3xl">Approve this exact packet.</h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Summary label="Response pages" value={String(packet.responsePages)} />
        <Summary label="Supporting pages" value={String(packet.supportingPages)} />
        <Summary label="Server total" value={formatServerMoney(packet.quote)} />
      </div>
      <div className="mt-5 rounded-2xl border border-rule bg-paper p-5 text-sm">
        <p>
          <strong>To:</strong> {recipient.name}, {recipient.line1}, {recipient.city},{" "}
          {recipient.state} {recipient.postal}
        </p>
        <p className="mt-2">
          <strong>Service:</strong> {mailClass} mail
        </p>
        <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
          <strong>Packet SHA-256:</strong> {packet.packetSha256}
        </p>
      </div>
      <Notice tone="warning">
        Approval is immutable and the server will rebuild, remeasure, reprice, and rehash the
        packet. If anything changed after preview, this approval will not silently bind the old
        packet.
      </Notice>
      <button
        disabled={busy}
        onClick={approve}
        className="mt-6 rounded-full bg-cobalt px-6 py-3 text-sm font-medium text-white"
      >
        {busy ? "Rebuilding packet…" : "Approve exact packet"}
      </button>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-rule bg-paper-deep/25 p-4">
      <p className="text-[10px] uppercase tracking-[.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-2xl">{value}</p>
    </div>
  );
}

function RecordWindow({ approval }: { approval: ApprovalResult | null }) {
  if (!approval) return <Notice tone="warning">No approval has been recorded.</Notice>;
  return (
    <div>
      <Check className="h-10 w-10 text-emerald-700" />
      <h2 className="mt-5 font-serif text-3xl">Packet approval recorded.</h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        This is an approval record only. No payment, mailing submission, tracking number, or proof
        of delivery has been created because those v2 fulfillment endpoints do not exist yet.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Summary label="Response pages" value={String(approval.response_pages)} />
        <Summary label="Supporting pages" value={String(approval.supporting_pages)} />
        <Summary label="Approved total" value={formatServerMoney(approval.quote)} />
      </div>
      <div className="mt-5 rounded-2xl border border-rule bg-paper p-5 font-mono text-xs leading-6">
        <p>Approval: {approval.approval_id}</p>
        <p className="break-all">Packet: {approval.packet_sha256}</p>
      </div>
      <Notice tone="warning">
        Remaining server gap: checkout/payment, mailing submission, tracking, proof, and
        packet-download endpoints must be added before this window can become a fulfillment receipt.
      </Notice>
    </div>
  );
}
