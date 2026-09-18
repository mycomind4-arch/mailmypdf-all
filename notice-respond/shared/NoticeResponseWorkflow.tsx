import { useEffect, useMemo, useState } from "react";
import {
  ApprovalChecklist,
  CheckboxField,
  DocumentUpload,
  Field,
  FulfillmentPanel,
  ReadinessChecklist,
  SectionCard,
  StatusCard,
  StepShell,
  TextArea,
  TextField,
} from "@mailmypdf/workflow-ui";
import "@mailmypdf/workflow-ui/workflow-ui.css";
import {
  NOTICE_RESPONSE_STEPS,
  completedNoticeResponseSteps,
  createHttpWorkflowMatterClient,
  getNoticeResponseWorkflowProfile,
  type NoticeResponseStepId,
  type NoticeResponseWorkflowProfile,
  type WorkflowMailingAddress,
  type WorkflowMatterAnalysis,
  type WorkflowMatterDocument,
  type WorkflowPacketPreview,
} from "@mailmypdf/workflows";

export interface NoticeResponseWorkflowUiConfig {
  workflowId: string;
  backHref?: string;
  subtitle?: string;
}

type NoticeFacts = {
  taxpayerName: string;
  taxpayerAddress: string;
  phone: string;
  noticeNumber: string;
  taxPeriod: string;
  responseMode: string;
  responseExplanation: string;
  requestedAction: string;
  additionalFacts: string;
  evidenceReviewComplete: boolean;
};

const EMPTY_ADDRESS: WorkflowMailingAddress = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postal: "",
};

const client = createHttpWorkflowMatterClient({ basePath: "/api/workflow-runtime" });

function addressReady(value: WorkflowMailingAddress): boolean {
  return Boolean(
    value.name.trim() &&
      value.line1.trim() &&
      value.city.trim() &&
      /^[A-Za-z]{2}$/.test(value.state.trim()) &&
      /^\d{5}(?:-\d{4})?$/.test(value.postal.trim()),
  );
}

function responseAddressFromAnalysis(
  analysis: WorkflowMatterAnalysis | null,
): WorkflowMailingAddress | null {
  const raw = analysis?.result.workflowDetails?.responseAddress;
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const line1 = typeof value.line1 === "string" ? value.line1 : "";
  const city = typeof value.city === "string" ? value.city : "";
  const state = typeof value.state === "string" ? value.state : "";
  const postal = typeof value.postal === "string" ? value.postal : "";
  if (!line1 || !city || !state || !postal) return null;
  return {
    name:
      typeof value.name === "string" && value.name.trim()
        ? value.name
        : "Internal Revenue Service",
    line1,
    line2: typeof value.line2 === "string" ? value.line2 : "",
    city,
    state,
    postal,
  };
}

function includedEvidenceReady(documents: readonly WorkflowMatterDocument[]): boolean {
  return documents
    .filter((document) => document.role === "evidence" && document.included)
    .every(
      (document) =>
        document.usable && document.securityStatus === "clean",
    );
}

function storageKey(workflowId: string): string {
  return `mailmypdf:${workflowId}:matter`;
}

function requireNoticeResponseWorkflowProfile(
  workflowId: string,
): NoticeResponseWorkflowProfile {
  const profile = getNoticeResponseWorkflowProfile(workflowId);
  if (!profile) {
    throw new Error(`Unknown Notice Respond workflow: ${workflowId}`);
  }
  return profile;
}

export default function NoticeResponseWorkflow({
  config,
}: {
  config: NoticeResponseWorkflowUiConfig;
}) {
  const profile = requireNoticeResponseWorkflowProfile(config.workflowId);

  const emptyFacts = useMemo<NoticeFacts>(
    () => ({
      taxpayerName: "",
      taxpayerAddress: "",
      phone: "",
      noticeNumber: profile.noticeLabel,
      taxPeriod: "",
      responseMode: profile.responseModes[0]?.value ?? "",
      responseExplanation: "",
      requestedAction: profile.requestedActionDefault,
      additionalFacts: "",
      evidenceReviewComplete: false,
    }),
    [profile],
  );

  const [matterId, setMatterId] = useState("");
  const [documents, setDocuments] = useState<WorkflowMatterDocument[]>([]);
  const [analysis, setAnalysis] = useState<WorkflowMatterAnalysis | null>(null);
  const [facts, setFacts] = useState<NoticeFacts>(emptyFacts);
  const [factsSaved, setFactsSaved] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [evidenceKind, setEvidenceKind] = useState(
    profile.evidenceKinds[0]?.value ?? "other",
  );
  const [packet, setPacket] = useState<WorkflowPacketPreview | null>(null);
  const [approvalId, setApprovalId] = useState("");
  const [recipient, setRecipient] =
    useState<WorkflowMailingAddress>(EMPTY_ADDRESS);
  const [sender, setSender] =
    useState<WorkflowMailingAddress>(EMPTY_ADDRESS);
  const [mailClass, setMailClass] =
    useState<"standard" | "certified" | "registered">("certified");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const sourceNotice =
    documents.find((document) => document.role === "subject_notice") ?? null;
  const evidence = documents.filter((document) => document.role === "evidence");
  const sourceReady = Boolean(
    sourceNotice?.usable && sourceNotice.securityStatus === "clean",
  );
  const evidenceReady = includedEvidenceReady(documents);
  const analysisReady = Boolean(analysis?.result.summary);

  const completedStepIds = useMemo(
    () =>
      completedNoticeResponseSteps({
        hasCleanNotice: sourceReady,
        hasAnalysis: analysisReady,
        hasResponseFacts: factsSaved,
        hasEvidenceReview: factsSaved && facts.evidenceReviewComplete && evidenceReady,
        hasDraft: draftSaved,
        hasApproval: Boolean(approvalId),
      }),
    [
      sourceReady,
      analysisReady,
      factsSaved,
      facts.evidenceReviewComplete,
      evidenceReady,
      draftSaved,
      approvalId,
    ],
  );

  const currentStep = NOTICE_RESPONSE_STEPS[stepIndex]!;

  function invalidateAfterFactsChange(): void {
    setFactsSaved(false);
    setDraftSaved(false);
    setPacket(null);
    setApprovalId("");
  }

  function updateFact<Key extends keyof NoticeFacts>(
    key: Key,
    value: NoticeFacts[Key],
  ): void {
    setFacts((current) => ({ ...current, [key]: value }));
    invalidateAfterFactsChange();
  }

  async function ensureMatter(): Promise<string> {
    if (matterId) return matterId;
    const matter = await client.createMatter({
      workflowId: profile.workflowId,
      verticalId: "notice-respond",
    });
    setMatterId(matter.id);
    sessionStorage.setItem(storageKey(profile.workflowId), matter.id);
    return matter.id;
  }

  async function refreshDocuments(id = matterId): Promise<void> {
    if (!id) return;
    const snapshot = await client.loadMatter(id);
    setDocuments(snapshot.documents);
  }

  async function restore(id: string): Promise<void> {
    setBusy("restore");
    setError("");
    try {
      const [snapshot, storedAnalysis, storedInput, storedDraft, storedApproval] =
        await Promise.all([
          client.loadMatter(id),
          client.loadAnalysis(id),
          client.loadInput(id),
          client.loadDraft(id),
          client.loadApproval(id),
        ]);
      setDocuments(snapshot.documents);
      setAnalysis(storedAnalysis);
      if (storedInput?.input) {
        setFacts({
          ...emptyFacts,
          ...(storedInput.input as Partial<NoticeFacts>),
        });
        setFactsSaved(true);
      }
      if (storedDraft?.bodyText) {
        setDraft(storedDraft.bodyText);
        setDraftSaved(true);
      }
      if (storedApproval?.approvalId) setApprovalId(storedApproval.approvalId);
      const detectedAddress = responseAddressFromAnalysis(storedAnalysis);
      if (detectedAddress) setRecipient(detectedAddress);
    } catch (cause) {
      sessionStorage.removeItem(storageKey(profile.workflowId));
      setMatterId("");
      setError(
        cause instanceof Error
          ? cause.message
          : `Unable to restore this ${profile.noticeLabel} matter.`,
      );
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("matter");
    const stored =
      fromUrl || sessionStorage.getItem(storageKey(profile.workflowId));
    if (!stored) return;
    setMatterId(stored);
    sessionStorage.setItem(storageKey(profile.workflowId), stored);
    void restore(stored);
  }, [profile.workflowId]);

  useEffect(() => {
    if (
      !matterId ||
      !documents.some(
        (document) =>
          !document.usable && document.securityStatus !== "rejected",
      )
    ) {
      return;
    }
    const timer = window.setInterval(
      () => void refreshDocuments(matterId).catch(() => undefined),
      3000,
    );
    return () => window.clearInterval(timer);
  }, [matterId, documents]);

  async function resetEvidenceReview(nextFacts = facts): Promise<NoticeFacts> {
    const next = { ...nextFacts, evidenceReviewComplete: false };
    setFacts(next);
    if (matterId && factsSaved) {
      await client.saveInput(matterId, next).catch(() => undefined);
    }
    return next;
  }

  async function uploadSource(files: File[]): Promise<void> {
    const file = files[0];
    if (!file) return;
    const id = await ensureMatter();
    setBusy("source-upload");
    setError("");
    try {
      if (sourceNotice) {
        await client.detachDocument(id, sourceNotice.documentId);
      }
      const uploaded = await client.uploadDocument({
        file,
        workflowId: profile.workflowId,
        purpose: profile.sourcePurpose,
      });
      setDocuments(
        await client.attachDocument({
          matterId: id,
          documentId: uploaded.id,
          role: "subject_notice",
          position: 0,
        }),
      );
      setAnalysis(null);
      setFacts({ ...emptyFacts });
      setFactsSaved(false);
      setDraft("");
      setDraftSaved(false);
      setPacket(null);
      setApprovalId("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : `Unable to upload the ${profile.noticeLabel} notice.`,
      );
    } finally {
      setBusy("");
    }
  }

  async function analyzeSource(): Promise<void> {
    if (!matterId) return;
    setBusy("analyze");
    setError("");
    try {
      const next = await client.analyze(matterId);
      setAnalysis(next);
      const detectedAddress = responseAddressFromAnalysis(next);
      if (detectedAddress) setRecipient(detectedAddress);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : `Unable to analyze the ${profile.noticeLabel} notice.`,
      );
    } finally {
      setBusy("");
    }
  }

  async function saveFacts(): Promise<void> {
    const id = await ensureMatter();
    setBusy("facts");
    setError("");
    try {
      await client.saveInput(id, facts);
      setFactsSaved(true);
      setDraftSaved(false);
      setPacket(null);
      setApprovalId("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save response facts.",
      );
    } finally {
      setBusy("");
    }
  }

  async function uploadEvidence(files: File[]): Promise<void> {
    const id = await ensureMatter();
    setBusy("evidence-upload");
    setError("");
    try {
      let nextDocuments = documents;
      for (const file of files) {
        const uploaded = await client.uploadDocument({
          file,
          workflowId: profile.workflowId,
          purpose: `notice-response-evidence:${evidenceKind}`,
        });
        nextDocuments = await client.attachDocument({
          matterId: id,
          documentId: uploaded.id,
          role: "evidence",
          evidenceKind,
          position: nextDocuments.length,
        });
      }
      setDocuments(nextDocuments);
      await resetEvidenceReview();
      setDraftSaved(false);
      setPacket(null);
      setApprovalId("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to upload supporting documents.",
      );
    } finally {
      setBusy("");
    }
  }

  async function removeDocument(documentId: string): Promise<void> {
    if (!matterId) return;
    setDocuments(await client.detachDocument(matterId, documentId));
    await resetEvidenceReview();
    setDraftSaved(false);
    setPacket(null);
    setApprovalId("");
  }

  async function toggleEvidence(document: WorkflowMatterDocument): Promise<void> {
    if (!matterId || document.role !== "evidence") return;
    setDocuments(
      await client.updateDocument({
        matterId,
        documentId: document.documentId,
        included: !document.included,
      }),
    );
    await resetEvidenceReview();
    setDraftSaved(false);
    setPacket(null);
    setApprovalId("");
  }

  async function completeEvidenceReview(): Promise<void> {
    if (!matterId || !factsSaved || !evidenceReady) return;
    setBusy("evidence-review");
    setError("");
    try {
      const next = { ...facts, evidenceReviewComplete: true };
      await client.saveInput(matterId, next);
      setFacts(next);
      setFactsSaved(true);
      setDraftSaved(false);
      setPacket(null);
      setApprovalId("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save the supporting-document review.",
      );
    } finally {
      setBusy("");
    }
  }

  async function generateDraft(): Promise<void> {
    if (!matterId) return;
    setBusy("draft-generate");
    setError("");
    try {
      const generated = await client.generateDraft(matterId);
      setDraft(generated.bodyText);
      setDraftSaved(false);
      setPacket(null);
      setApprovalId("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to generate the response draft.",
      );
    } finally {
      setBusy("");
    }
  }

  async function saveDraft(): Promise<void> {
    if (!matterId || !draft.trim()) return;
    setBusy("draft-save");
    setError("");
    try {
      await client.saveDraft(matterId, draft);
      setDraftSaved(true);
      setPacket(null);
      setApprovalId("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to save the draft.",
      );
    } finally {
      setBusy("");
    }
  }

  async function buildPreview(): Promise<void> {
    if (!matterId) return;
    setBusy("preview");
    setError("");
    try {
      setPacket(await client.previewPacket(matterId, mailClass));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to build the exact response packet.",
      );
    } finally {
      setBusy("");
    }
  }

  async function approve(): Promise<void> {
    if (!matterId || !packet) return;
    setBusy("approve");
    setError("");
    try {
      const result = await client.approvePacket({
        matterId,
        preview: packet,
        recipient,
        mailClass,
      });
      setApprovalId(result.approvalId);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to approve the exact packet.",
      );
    } finally {
      setBusy("");
    }
  }

  async function checkout(): Promise<void> {
    if (!matterId || !approvalId) return;
    setBusy("checkout");
    setError("");
    try {
      const result = await client.checkout({
        matterId,
        approvalId,
        sender,
      });
      sessionStorage.setItem(
        `mailmypdf:${profile.workflowId}:order`,
        result.orderId,
      );
      window.location.assign(result.checkoutUrl);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to open secure checkout.",
      );
      setBusy("");
    }
  }

  function stepReady(step: NoticeResponseStepId): boolean {
    if (step === "notice") return sourceReady;
    if (step === "analysis") return analysisReady;
    if (step === "response") return factsSaved;
    if (step === "evidence")
      return factsSaved && facts.evidenceReviewComplete && evidenceReady;
    if (step === "draft") return draftSaved;
    if (step === "review") return Boolean(approvalId);
    return false;
  }

  const rail = (
    <>
      <StatusCard
        current={stepIndex + 1}
        total={NOTICE_RESPONSE_STEPS.length}
        stepLabel={currentStep.label}
        state={approvalId ? "ready" : "in_progress"}
        summary={
          matterId
            ? "Secure notice-response matter active."
            : `Upload the ${profile.noticeLabel} notice to open the matter.`
        }
      />
      <ReadinessChecklist
        title="Response readiness"
        items={[
          {
            id: "source",
            label: `${profile.noticeLabel} notice cleared security scanning`,
            done: sourceReady,
          },
          { id: "analysis", label: "Notice analyzed", done: analysisReady },
          { id: "facts", label: "Response facts confirmed", done: factsSaved },
          {
            id: "evidence",
            label: "Supporting-document set reviewed",
            done: facts.evidenceReviewComplete && evidenceReady,
          },
          { id: "draft", label: "Response draft reviewed and saved", done: draftSaved },
          { id: "approval", label: "Exact packet approved", done: Boolean(approvalId) },
        ]}
      />
    </>
  );

  return (
    <StepShell
      breadcrumb={[
        { label: "Notice Respond", href: "/notice-respond" },
        {
          label: profile.title,
          href:
            config.backHref ??
            `/notice-respond/workflows/${profile.workflowId}`,
        },
        { label: currentStep.label },
      ]}
      title={profile.title}
      subtitle={
        config.subtitle ??
        `Build a source-grounded response from the actual ${profile.noticeLabel} notice, your confirmed facts, supporting records, exact packet review, mailing, and proof.`
      }
      lastSavedLabel={matterId ? "Matter saved" : undefined}
      steps={[...NOTICE_RESPONSE_STEPS]}
      currentStepId={currentStep.id}
      completedStepIds={completedStepIds}
      onStepClick={(id) => {
        const target = NOTICE_RESPONSE_STEPS.findIndex((step) => step.id === id);
        if (
          target >= 0 &&
          (target <= stepIndex ||
            completedStepIds.includes(id as NoticeResponseStepId))
        ) {
          setStepIndex(target);
        }
      }}
      rail={rail}
    >
      {error && <div className="wf-callout wf-callout--danger">{error}</div>}

      {currentStep.id === "notice" && (
        <DocumentUpload
          title={`1. Upload the ${profile.primaryDocumentLabel}`}
          description="The actual notice is the controlling source record. It is quarantined and scanned before analysis."
          multiple={false}
          items={
            sourceNotice
              ? [
                  {
                    id: sourceNotice.documentId,
                    name: sourceNotice.filename,
                    sizeBytes: sourceNotice.sizeBytes ?? undefined,
                    status: sourceNotice.usable
                      ? "Clean and ready"
                      : sourceNotice.securityStatus,
                    category: profile.primaryDocumentLabel,
                  },
                ]
              : []
          }
          onUpload={uploadSource}
          onRemove={
            sourceNotice
              ? () => void removeDocument(sourceNotice.documentId)
              : undefined
          }
        />
      )}

      {currentStep.id === "analysis" && (
        <SectionCard
          title={`2. Analyze the ${profile.noticeLabel}`}
          description="Extract only notice-supported facts and keep unverified items unresolved."
          footer={
            <button
              className="wf-btn wf-btn--primary"
              type="button"
              onClick={() => void analyzeSource()}
              disabled={!sourceReady || Boolean(busy)}
            >
              {busy === "analyze"
                ? "Analyzing…"
                : analysis
                  ? "Analyze again"
                  : "Analyze notice"}
            </button>
          }
        >
          {analysis ? (
            <div className="wf-review-list">
              {[
                ["Notice/decision", analysis.result.decision ?? "Not confirmed"],
                ["Issuer", analysis.result.issuer ?? "Internal Revenue Service"],
                ["Notice date", analysis.result.decisionDate ?? "Not confirmed"],
                ["Printed response/action date", analysis.result.deadline ?? "Not confirmed"],
              ].map(([label, value]) => (
                <div className="wf-review-row" key={label}>
                  <div className="wf-review-copy">
                    <strong>{label}</strong>
                    <div className="wf-review-detail">{value}</div>
                  </div>
                </div>
              ))}
              <div className="wf-callout wf-callout--info">
                {analysis.result.summary}
              </div>
            </div>
          ) : (
            <p>Run analysis after the notice clears security scanning.</p>
          )}
        </SectionCard>
      )}

      {currentStep.id === "response" && (
        <SectionCard
          title={`3. Confirm your ${profile.noticeLabel} response facts`}
          description="Your statements are stored separately from information extracted from the notice."
          footer={
            <button
              className="wf-btn wf-btn--primary"
              type="button"
              onClick={() => void saveFacts()}
              disabled={Boolean(busy)}
            >
              Save response facts
            </button>
          }
        >
          <div className="wf-form-grid">
            <Field label="Taxpayer name" required>
              <TextField
                value={facts.taxpayerName}
                onChange={(event) =>
                  updateFact("taxpayerName", event.target.value)
                }
              />
            </Field>
            <Field label="Phone">
              <TextField
                value={facts.phone}
                onChange={(event) => updateFact("phone", event.target.value)}
              />
            </Field>
            <Field label="Notice/reference number">
              <TextField
                value={facts.noticeNumber}
                onChange={(event) =>
                  updateFact("noticeNumber", event.target.value)
                }
              />
            </Field>
            <Field label="Tax year or period">
              <TextField
                value={facts.taxPeriod}
                onChange={(event) =>
                  updateFact("taxPeriod", event.target.value)
                }
              />
            </Field>
            <Field label={profile.responseModeLabel} required>
              <select
                className="wf-input"
                value={facts.responseMode}
                onChange={(event) =>
                  updateFact("responseMode", event.target.value)
                }
              >
                {profile.responseModes.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Mailing address" required>
            <TextArea
              rows={3}
              value={facts.taxpayerAddress}
              onChange={(event) =>
                updateFact("taxpayerAddress", event.target.value)
              }
            />
          </Field>
          <Field
            label={profile.explanationLabel}
            required={profile.explanationRequiredModes.includes(
              facts.responseMode,
            )}
            hint={profile.explanationHint}
          >
            <TextArea
              rows={7}
              value={facts.responseExplanation}
              onChange={(event) =>
                updateFact("responseExplanation", event.target.value)
              }
            />
          </Field>
          <Field label="Requested action" required>
            <TextArea
              rows={3}
              value={facts.requestedAction}
              onChange={(event) =>
                updateFact("requestedAction", event.target.value)
              }
            />
          </Field>
          <Field label="Additional confirmed facts">
            <TextArea
              rows={4}
              value={facts.additionalFacts}
              onChange={(event) =>
                updateFact("additionalFacts", event.target.value)
              }
            />
          </Field>
        </SectionCard>
      )}

      {currentStep.id === "evidence" && (
        <>
          <SectionCard
            title="4. Supporting documents"
            description="Choose a category before upload. Only explicitly included, clean documents enter the outgoing packet."
          >
            <Field label="Document type">
              <select
                className="wf-input"
                value={evidenceKind}
                onChange={(event) => setEvidenceKind(event.target.value)}
              >
                {profile.evidenceKinds.map((kind) => (
                  <option key={kind.value} value={kind.value}>
                    {kind.label}
                  </option>
                ))}
              </select>
            </Field>
          </SectionCard>
          <DocumentUpload
            title="Upload supporting documents"
            items={evidence.map((document) => ({
              id: document.documentId,
              name: document.filename,
              sizeBytes: document.sizeBytes ?? undefined,
              status: document.usable
                ? document.included
                  ? "Included"
                  : "Excluded"
                : document.securityStatus,
              category:
                profile.evidenceKinds.find(
                  (kind) => kind.value === document.evidenceKind,
                )?.label ??
                document.evidenceKind ??
                "Supporting document",
            }))}
            onUpload={uploadEvidence}
            onRemove={removeDocument}
          />
          {evidence.map((document) => (
            <CheckboxField
              key={document.documentId}
              checked={document.included}
              onChange={() => void toggleEvidence(document)}
              label={`Include ${document.filename} in the outgoing packet`}
            />
          ))}
          <SectionCard
            title="Confirm the current supporting-document set"
            description="This review is fingerprinted to the exact current source and evidence selection. Any later document change requires review again."
            footer={
              <button
                className="wf-btn wf-btn--primary"
                type="button"
                onClick={() => void completeEvidenceReview()}
                disabled={!factsSaved || !evidenceReady || Boolean(busy)}
              >
                {busy === "evidence-review"
                  ? "Saving review…"
                  : facts.evidenceReviewComplete
                    ? "Evidence reviewed"
                    : "Confirm evidence review"}
              </button>
            }
          >
            {!evidenceReady && (
              <div className="wf-callout wf-callout--warning">
                Every included supporting document must clear security scanning
                before this review can be completed.
              </div>
            )}
          </SectionCard>
        </>
      )}

      {currentStep.id === "draft" && (
        <SectionCard
          title={`5. Draft the ${profile.noticeLabel} response`}
          description="Generate a source-grounded response using the notice, confirmed facts, selected response path, and reviewed supporting documents."
          footer={
            <div className="wf-draft-actions">
              <button
                className="wf-btn wf-btn--outline"
                type="button"
                onClick={() => void generateDraft()}
                disabled={
                  !factsSaved ||
                  !facts.evidenceReviewComplete ||
                  !evidenceReady ||
                  Boolean(busy)
                }
              >
                Generate draft
              </button>
              <button
                className="wf-btn wf-btn--primary"
                type="button"
                onClick={() => void saveDraft()}
                disabled={!draft.trim() || Boolean(busy)}
              >
                Save reviewed draft
              </button>
            </div>
          }
        >
          <TextArea
            rows={20}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setDraftSaved(false);
            }}
            placeholder="Generate the response draft or enter your own correspondence."
          />
        </SectionCard>
      )}

      {currentStep.id === "review" && (
        <>
          <SectionCard
            title="6. Build the exact packet"
            description="Confirm the response destination against the controlling notice or current official instructions before approval."
          >
            <AddressFields value={recipient} onChange={setRecipient} />
            <Field label="Mailing method">
              <select
                className="wf-input"
                value={mailClass}
                onChange={(event) => {
                  setMailClass(event.target.value as typeof mailClass);
                  setPacket(null);
                  setApprovalId("");
                }}
              >
                <option value="standard">Standard mail</option>
                <option value="certified">Certified mail</option>
                <option value="registered">Registered mail</option>
              </select>
            </Field>
            <button
              className="wf-btn wf-btn--primary"
              type="button"
              onClick={() => void buildPreview()}
              disabled={
                !draftSaved || !addressReady(recipient) || Boolean(busy)
              }
            >
              {busy === "preview" ? "Building…" : "Build exact packet preview"}
            </button>
          </SectionCard>
          {packet && (
            <ApprovalChecklist
              reviewItems={[
                {
                  id: "hash",
                  label: "Exact packet SHA-256",
                  detail: packet.packetSha256,
                  status: "Built",
                  tone: "success",
                },
                {
                  id: "pages",
                  label: "Packet pages",
                  detail: String(packet.responsePages + packet.supportingPages),
                  status: "Measured",
                  tone: "info",
                },
                {
                  id: "price",
                  label: "Server-authoritative total",
                  detail: `$${(packet.quote.totalCents / 100).toFixed(2)}`,
                  status: "Quoted",
                  tone: "info",
                },
                {
                  id: "recipient",
                  label: "Recipient",
                  detail: `${recipient.name}, ${recipient.line1}, ${recipient.city}, ${recipient.state} ${recipient.postal}`,
                  status: "Review",
                  tone: "warning",
                },
              ]}
              confirmations={[
                {
                  id: "content",
                  label:
                    "I reviewed the response and every included supporting document.",
                },
                {
                  id: "recipient",
                  label:
                    "I confirmed the mailing destination against the controlling notice or current official instructions.",
                },
              ]}
              approveLabel={
                busy === "approve"
                  ? "Approving…"
                  : "Approve this exact packet"
              }
              onApprove={approve}
            />
          )}
        </>
      )}

      {currentStep.id === "mail" && (
        <FulfillmentPanel
          phase={approvalId ? "payment" : "review"}
          title="7. Pay, mail, track, and retain proof"
          description="Payment and mailing are tied to the immutable approval so retries cannot silently mail a different packet."
          details={[
            { label: "Approval", value: approvalId || "Not approved" },
            { label: "Mail class", value: mailClass },
            {
              label: "Packet hash",
              value: packet?.packetSha256 ?? "Stored with approval",
            },
          ]}
          actions={
            <button
              className="wf-btn wf-btn--primary"
              type="button"
              onClick={() => void checkout()}
              disabled={
                !approvalId || !addressReady(sender) || Boolean(busy)
              }
            >
              Continue to secure payment
            </button>
          }
        >
          <SectionCard
            title="Return address"
            description="Used as the sender/return address for the approved mailing."
          >
            <AddressFields value={sender} onChange={setSender} />
          </SectionCard>
        </FulfillmentPanel>
      )}

      <div className="wf-draft-actions">
        <button
          className="wf-btn wf-btn--outline"
          type="button"
          disabled={stepIndex === 0}
          onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
        >
          Back
        </button>
        {currentStep.id !== "mail" && (
          <button
            className="wf-btn wf-btn--primary"
            type="button"
            disabled={!stepReady(currentStep.id)}
            onClick={() =>
              setStepIndex((value) =>
                Math.min(NOTICE_RESPONSE_STEPS.length - 1, value + 1),
              )
            }
          >
            Continue
          </button>
        )}
      </div>
    </StepShell>
  );
}

function AddressFields({
  value,
  onChange,
}: {
  value: WorkflowMailingAddress;
  onChange: (next: WorkflowMailingAddress) => void;
}) {
  return (
    <div className="wf-form-grid">
      <Field label="Name" required>
        <TextField
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
        />
      </Field>
      <Field label="Address line 1" required>
        <TextField
          value={value.line1}
          onChange={(event) => onChange({ ...value, line1: event.target.value })}
        />
      </Field>
      <Field label="Address line 2">
        <TextField
          value={value.line2 ?? ""}
          onChange={(event) => onChange({ ...value, line2: event.target.value })}
        />
      </Field>
      <Field label="City" required>
        <TextField
          value={value.city}
          onChange={(event) => onChange({ ...value, city: event.target.value })}
        />
      </Field>
      <Field label="State" required>
        <TextField
          maxLength={2}
          value={value.state}
          onChange={(event) =>
            onChange({ ...value, state: event.target.value.toUpperCase() })
          }
        />
      </Field>
      <Field label="ZIP" required>
        <TextField
          value={value.postal}
          onChange={(event) =>
            onChange({ ...value, postal: event.target.value })
          }
        />
      </Field>
    </div>
  );
}
