import { PRICES } from "@mailmypdf/pricing";
import { AppShell, StatusBadge, DeadlineCard, ReadinessScore, EmptyState, SourceReference, ConfidenceBadge, IssueCard, AIActionBar, ActivityFeed, NAV_ICONS, NAV_LABELS, type WorkspaceNav } from "@/components/workspace/app-shell";
import { AIDraftHelper } from "@/components/ai-draft-helper";
import { Link } from "@tanstack/react-router";
import { FileUp, ShieldAlert, CheckCircle2, Mail, PackageCheck, Stamp, CreditCard, Check, AlertTriangle, Clock, FileText, Link2, FileSearch, Gavel, Calendar, Paperclip, Send, Award, Download, Copy, LayoutDashboard, CalendarClock, TrendingUp, ArrowRight } from "lucide-react";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { workflows, type WorkflowId, type WorkflowDefinition, type WorkflowStep } from "@/domain/workflows";
import { createDecision, type Decision, daysUntilDeadline, deadlineStatus } from "@/domain/decision";
import { createGround, type AppealGround, type GroundType, GROUND_TYPE_LABELS, GROUND_TYPE_DESCRIPTIONS, groundToParagraph } from "@/domain/ground";
import { createEvidence, type Evidence, evidenceForGround, generateExhibitIndex } from "@/domain/evidence";
import { createArgument, type Argument, detectContradictions } from "@/domain/argument";
import { runReadinessReview, type ReadinessReview } from "@/domain/review";
import { assemblePacket, renderExhibitIndex, type AppealPacket } from "@/domain/packet";
import { createProofPacket, computeHash, renderProofCertificate, type ProofPacket } from "@/domain/proof";

import { extractTextFromFile, isExtractable, needsOCR } from "@/platform/text-extraction";
import { extractDecision } from "@/platform/extract-fn";
import { createCheckoutSession } from "@/platform/checkout-fn";
import { saveAppeal } from "@/platform/appeal-repository";
import type { Appeal } from "@/domain/appeal";
import { createAppeal, updateAppeal } from "@/domain/appeal";
import { XRayView } from "@/components/xray/xray-view";
import { analyzeDocuments } from "@/platform/xray-fn";
import { runXRayAnalysis, buildAppealFromXRay, type XRayResult, type AnalyzedDocument } from "@/domain/xray";
import { StressTestView } from "@/components/stress-test/stress-test-view";
import { runStressTest, type StressTestResult } from "@/domain/stress-test";
import { TimelineView } from "@/components/timeline/timeline-view";
import { buildTimeline, type TimelineResult, type TimelineConflict, type TimelineDocument } from "@/domain/timeline";
import { explainConflict as explainConflictFn } from "@/domain/timeline";

const mailOptions = [
  { id: "standard" as const, label: "Standard", price: `${(PRICES.standard / 100).toFixed(2)}`, desc: "3–7 business days · Tracking included", icon: Mail },
  { id: "certified" as const, label: "Certified", price: `${(PRICES.certified / 100).toFixed(2)}`, desc: "Delivery tracking + confirmation · 3–7 days", icon: PackageCheck },
  { id: "registered" as const, label: "Registered", price: `${(PRICES.registered / 100).toFixed(2)}`, desc: "Secure handling + tracking · 5–10 days", icon: Stamp },
];

interface WorkflowWizardProps {
  workflowId: WorkflowId;
  metaTitle: string;
  metaDescription: string;
  componentName: string;
}

export function WorkflowWizard({ workflowId, metaTitle, metaDescription, componentName }: WorkflowWizardProps) {
  const definition = workflows[workflowId];

  // Step navigation
  // User identity for ownership-aware persistence
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function getUser() {
      try {
        const { getSupabaseClient } = await import("@/platform/supabase");
        const supabase = await getSupabaseClient();
        if (!supabase) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) setUserId(session.user.id);
      } catch {
        // Not logged in — userId stays null
      }
    }
    getUser();
  }, []);
  const [step, setStep] = useState(0);
  const totalSteps = definition.stepLabels.length;
  const progress = useMemo(() => Math.round((step / (totalSteps - 1)) * 100), [step, totalSteps]);

  // Decision state
  const [decision, setDecision] = useState<Decision>(() => createDecision(
    workflowId === "court-ruling" ? "court_ruling"
    : workflowId === "denied-claim" ? "claim_denial"
    : workflowId === "reconsideration" ? "reconsideration"
    : "government_benefit"
  ));
  const [documentUploaded, setDocumentUploaded] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Grounds & evidence
  const [grounds, setGrounds] = useState<AppealGround[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [appealArguments, setArguments] = useState<Argument[]>([]);

  // Draft
  const [draft, setDraft] = useState("");

  // Review
  const [review, setReview] = useState<ReadinessReview | null>(null);

  // Packet & proof
  const [packet, setPacket] = useState<AppealPacket | null>(null);
  const [proof, setProof] = useState<ProofPacket | null>(null);

  // Recipient & mailing
  const [recipient, setRecipient] = useState({ name: "", org: "", address1: "", address2: "", city: "", state: "", zip: "" });
  const [mailType, setMailType] = useState<"standard" | "certified" | "registered">("certified");
  const [checkoutPlaceholder, setCheckoutPlaceholder] = useState(false);

  // Ground form state
  const [groundForm, setGroundForm] = useState<{ type: GroundType; claim: string; source: string }>({
    type: "factual_error", claim: "", source: "",
  });

  // Evidence form state
  const [evidenceForm, setEvidenceForm] = useState<{ label: string; excerpt: string; pageRef: string }>({
    label: "", excerpt: "", pageRef: "",
  });
  const evidenceFileRef = useRef<HTMLInputElement>(null);

  // ── Navigation ──
  function next() {
    // Trigger X-Ray when entering that step
    if (definition.steps[step + 1] === "xray" && !xrayResult && !xrayAnalyzing) {
      runXRay();
    }
    if (definition.steps[step] === "grounds" && xrayResult) {
      // If coming from X-Ray, grounds may already be populated
    }
    const nextStepIndex = step + 1;
    if (definition.steps[nextStepIndex] === "timeline" && !timelineResult) runTimelineBuild();
    if (definition.steps[nextStepIndex] === "stress-test" && !stressTestResult) runGroundStressTest();
    if (definition.steps[nextStepIndex] === "draft" && !draft) setDraft(generateDraft());
    if (definition.steps[nextStepIndex] === "final-stress-test" && !finalStressTestResult) runFinalStressTest();
    if (definition.steps[nextStepIndex] === "readiness") runReadiness();
    if (definition.steps[nextStepIndex] === "packet" && !packet) assembleFinalPacket();
    if (definition.steps[nextStepIndex] === "proof" && !proof) generateProof();
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  function canContinue(): boolean {
    switch (definition.steps[step]) {
      case "document": return documentUploaded || decision.agency !== undefined;
      case "xray": return xrayResult !== null;
      case "timeline": return timelineResult !== null;
      case "stress-test": return stressTestResult !== null;
      case "final-stress-test": return finalStressTestResult !== null;
      case "decision": return !!decision.agency;
      case "grounds": return grounds.length > 0;
      case "recipient": return !!(recipient.name && recipient.address1 && recipient.city && recipient.state && recipient.zip);
      default: return true;
    }
  }

  // Extraction state
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractedFields, setExtractedFields] = useState<string[]>([]);
  const [appealId] = useState(() => crypto.randomUUID());
  const [savedToDb, setSavedToDb] = useState(false);
  const [saving, setSaving] = useState(false);
  const [xrayResult, setXrayResult] = useState<XRayResult | null>(null);
  const [xrayAnalyzing, setXrayAnalyzing] = useState(false);
  const [analyzedDocTexts, setAnalyzedDocTexts] = useState<{id: string; name: string; text: string; isDecision: boolean}[]>([]);
  const [stressTestResult, setStressTestResult] = useState<StressTestResult | null>(null);
  const [stressTesting, setStressTesting] = useState(false);
  const [finalStressTestResult, setFinalStressTestResult] = useState<StressTestResult | null>(null);
  const [finalStressTesting, setFinalStressTesting] = useState(false);
  const [timelineResult, setTimelineResult] = useState<TimelineResult | null>(null);
  const [timelineBuilding, setTimelineBuilding] = useState(false);

  // ── Document upload with real extraction ──
  async function handleDocumentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocumentUploaded(true);
    setExtractionError(null);
    setExtractedFields([]);
    setDecision((d) => ({ ...d, documentFilename: file.name }));

    if (needsOCR(file)) {
      // Image files need OCR — not yet supported, user enters manually
      setExtracting(false);
      setExtractionError("Image files require OCR. Please enter the decision details manually below.");
      return;
    }

    setExtracting(true);
    try {
      const text = await extractTextFromFile(file);
      if (!text || text.trim().length < 10) {
        setExtracting(false);
        setExtractionError("Could not extract text from this file. Please enter details manually.");
        return;
      }

      // Call server-side extraction
      const result = await extractDecision({ data: { text, decision } });
      setDecision(result.decision);
      setExtractedFields(result.fieldsExtracted);
    } catch (err) {
      setExtractionError("Extraction failed. Please enter details manually.");
      console.error("Extraction error:", err);
    }
    setExtracting(false);
  }

  // ── X-Ray analysis ──
  async function runXRay() {
    setXrayAnalyzing(true);
    try {
      // Collect all analyzed document texts
      const docs = [
        { id: "decision", name: decision.documentFilename || "Decision Letter", text: decision.rawText || "", isDecision: true, pageCount: 1 },
        ...analyzedDocTexts,
      ].filter((d) => d.text.length > 10);

      if (docs.length === 0) {
        setXrayAnalyzing(false);
        return;
      }

      const result = await analyzeDocuments({ data: {
        documents: docs,
        decision,
        evidence,
      }});
      setXrayResult(result);
    } catch (err) {
      console.error("X-Ray analysis failed:", err);
      // Fallback: run analysis client-side
      const docs: AnalyzedDocument[] = [
        { id: "decision", name: decision.documentFilename || "Decision Letter", text: decision.rawText || "", pageCount: 1, isDecision: true },
        ...analyzedDocTexts.map((d) => ({ ...d, pageCount: 1 })),
      ].filter((d) => d.text.length > 10);

      if (docs.length > 0) {
        const result = runXRayAnalysis(docs, decision, evidence);
        setXrayResult(result);
      }
    }
    setXrayAnalyzing(false);
  }

  // ── Timeline build ──
  async function runTimelineBuild() {
    setTimelineBuilding(true);
    try {
      const timelineDocs: TimelineDocument[] = [
        { id: "decision", name: decision.documentFilename || "Decision Letter", text: decision.rawText || "", pageCount: 1, isDecision: true, role: "decision" },
        ...analyzedDocTexts.map((d) => ({
          id: d.id, name: d.name, text: d.text, pageCount: 1, isDecision: false,
          role: d.isDecision ? "decision" as const : "evidence" as const,
        })),
      ].filter((d) => d.text.length > 10);

      const userEvents = decision.chronology
        .filter((e) => e.date && e.description)
        .map((e) => ({ date: e.date, description: e.description }));

      const result = buildTimeline({
        documents: timelineDocs,
        decision,
        xrayFindings: xrayResult?.findings || [],
        userEvents,
      });
      setTimelineResult(result);
    } catch (err) {
      console.error("Timeline build failed:", err);
    }
    setTimelineBuilding(false);
  }

  // Add timeline conflict as appeal ground
  function addConflictToAppeal(conflict: TimelineConflict) {
    const ground = createGround(conflict.suggestedGroundType, {
      claim: conflict.suggestedClaim,
      source: `${conflict.claimA.source.documentName} (${conflict.claimA.date}) vs. ${conflict.claimB.source.documentName} (${conflict.claimB.date})`,
      draftLanguage: conflict.suggestedClaim,
    });
    setGrounds((g) => [...g, ground]);
  }

  // ── Build appeal from X-Ray findings ──
  function buildAppealFromFindings() {
    if (!xrayResult) return;
    const builtGrounds = buildAppealFromXRay(xrayResult.findings);
    for (const bg of builtGrounds) {
      const ground = createGround(bg.groundType, {
        claim: bg.claim,
        source: bg.source,
        draftLanguage: bg.claim,
      });
      setGrounds((g) => [...g, ground]);
      // Link evidence
      for (const evId of bg.evidenceIds) {
        setEvidence((e) => e.map((ev) => {
          if (ev.id !== evId) return ev;
          return { ...ev, groundIds: [...ev.groundIds, ground.id] };
        }));
      }
    }
    // Move to grounds step
    next();
  }

  // ── Stress Test ──
  function runGroundStressTest() {
    setStressTesting(true);
    try {
      const result = runStressTest(grounds, evidence, "", xrayResult);
      setStressTestResult(result);
    } catch (err) {
      console.error("Stress test failed:", err);
    }
    setStressTesting(false);
  }

  // ── Final Stress Test (on draft) ──
  function runFinalStressTest() {
    setFinalStressTesting(true);
    try {
      const result = runStressTest(grounds, evidence, draft, xrayResult);
      setFinalStressTestResult(result);
    } catch (err) {
      console.error("Final stress test failed:", err);
    }
    setFinalStressTesting(false);
  }

  // ── Supporting document upload (for X-Ray) ──
  const [supportingFiles, setSupportingFiles] = useState<{name: string; uploaded: boolean}[]>([]);

  async function handleSupportingUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const id = crypto.randomUUID();
      const name = file.name;
      setSupportingFiles((prev) => [...prev, { name, uploaded: true }]);
      try {
        const text = await extractTextFromFile(file);
        if (text && text.trim().length > 10) {
          setAnalyzedDocTexts((prev) => [...prev, { id, name, text, isDecision: false }]);
          // Also add as evidence
          const ev = createEvidence("document", name, {
            documentFilename: name,
            uploadedAt: new Date().toISOString(),
          });
          setEvidence((prev) => [...prev, ev]);
        }
      } catch (err) {
        console.error("Failed to extract from", name, err);
      }
    }
    // Re-run X-Ray if we already have a result
    if (xrayResult) {
      setTimeout(() => runXRay(), 500);
    }
  }

  // ── Grounds management ──
  function addGround() {
    if (!groundForm.claim.trim()) return;
    const ground = createGround(groundForm.type, {
      claim: groundForm.claim,
      source: groundForm.source,
      draftLanguage: groundToParagraph(createGround(groundForm.type, {
        claim: groundForm.claim,
        source: groundForm.source,
      })),
    });
    setGrounds((g) => [...g, ground]);
    setGroundForm({ type: "factual_error", claim: "", source: "" });
  }

  function removeGround(id: string) {
    setGrounds((g) => g.filter((x) => x.id !== id));
    setEvidence((e) => e.map((ev) => ({ ...ev, groundIds: ev.groundIds.filter((gid) => gid !== id) })));
  }

  function toggleGroundConfirm(id: string) {
    setGrounds((g) => g.map((x) => x.id === id ? { ...x, userConfirmed: !x.userConfirmed } : x));
  }

  // ── Evidence management ──
  function addEvidence() {
    if (!evidenceForm.label.trim()) return;
    const ev = createEvidence("document", evidenceForm.label, {
      excerpt: evidenceForm.excerpt || undefined,
      pageRef: evidenceForm.pageRef || undefined,
    });
    setEvidence((e) => [...e, ev]);
    setEvidenceForm({ label: "", excerpt: "", pageRef: "" });
  }

  function removeEvidence(id: string) {
    setEvidence((e) => e.filter((x) => x.id !== id));
  }

  function linkEvidenceToGround(evidenceId: string, groundId: string) {
    setEvidence((e) => e.map((ev) => {
      if (ev.id !== evidenceId) return ev;
      const has = ev.groundIds.includes(groundId);
      return { ...ev, groundIds: has ? ev.groundIds.filter((g) => g !== groundId) : [...ev.groundIds, groundId] };
    }));
  }

  function handleEvidenceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const ev = createEvidence("document", file.name, {
        documentFilename: file.name,
        uploadedAt: new Date().toISOString(),
      });
      setEvidence((prev) => [...prev, ev]);
    }
  }

  // ── Draft generation ──
  function generateDraft(): string {
    const parts: string[] = [];
    const headerType = workflowId === "court-ruling" ? "Court" : workflowId === "denied-claim" ? "Claim" : "Government";
    parts.push(`Re: Appeal of ${headerType} Decision`);
    if (decision.agency) parts.push(`Agency: ${decision.agency}`);
    if (decision.referenceNumber) parts.push(`Reference No.: ${decision.referenceNumber}`);
    if (decision.decisionTypeLabel) parts.push(`Decision Type: ${decision.decisionTypeLabel}`);
    if (decision.decisionDate) parts.push(`Decision Date: ${decision.decisionDate}`);
    if (decision.deadline?.date) parts.push(`Appeal Deadline: ${decision.deadline.date}`);
    parts.push("");
    parts.push("Dear Sir or Madam,");
    parts.push("");

    // Opening
    const opening = workflowId === "court-ruling"
      ? "I am writing to appeal the court ruling referenced above."
      : workflowId === "denied-claim"
      ? "I am writing to appeal the denial of the claim referenced above."
      : workflowId === "reconsideration"
      ? "I am writing to request reconsideration of the decision referenced above."
      : "I am writing to appeal the decision referenced above.";
    parts.push(opening);
    parts.push("");

    // Grounds
    if (grounds.length > 0) {
      parts.push("I appeal this decision on the following grounds:");
      parts.push("");
      grounds.forEach((g, i) => {
        parts.push(`${i + 1}. ${GROUND_TYPE_LABELS[g.type]}`);
        if (g.claim) parts.push(`   ${g.claim}`);
        if (g.source) parts.push(`   The decision states: "${g.source}".`);
        if (g.counterargument) parts.push(`   ${g.counterargument}`);
        const linkedEvidence = evidenceForGround(evidence, g.id);
        if (linkedEvidence.length > 0) {
          parts.push(`   Supported by: ${linkedEvidence.map((e) => e.label).join(", ")}`);
        }
        parts.push("");
      });
    }

    // Timeline
    if (decision.chronology.length > 0) {
      parts.push("Relevant Timeline:");
      decision.chronology.forEach((t) => parts.push(`  ${t.date}: ${t.description}`));
      parts.push("");
    }

    // Evidence reference
    if (evidence.length > 0) {
      const exhibits = generateExhibitIndex(evidence);
      if (exhibits.length > 0) {
        parts.push("Supporting Documentation:");
        exhibits.forEach((ex) => parts.push(`  ${ex.number}: ${ex.label}${ex.pageRef ? ` (p. ${ex.pageRef})` : ""}`));
        parts.push("");
      }
    }

    // Closing
    parts.push("I respectfully request that this appeal be considered and that a thorough review of the decision be conducted.");
    parts.push("");
    parts.push("Sincerely,");
    parts.push("[Your Name]");

    return parts.join("\n");
  }

  // ── Readiness engine ──
  function runReadiness() {
    const result = runReadinessReview({
      decision,
      grounds,
      evidence,
      draft,
      recipient: recipient.name ? recipient : undefined,
      exhibitCount: packet?.exhibitIndex.length ?? 0,
      hasSignature: draft.includes("Sincerely,") || draft.includes("[Your Name]"),
    });
    setReview(result);
  }

  // ── Packet assembly ──
  function assembleFinalPacket() {
    if (!recipient.name) return;
    const pkt = assemblePacket({
      appealId: "draft",
      finalLetter: draft,
      evidence,
      recipient,
      mailingMethod: mailType,
    });
    setPacket(pkt);
  }

  // ── Proof generation ──
  async function generateProof() {
    if (!packet) return;
    const finalAppealHash = await computeHash(draft);
    const attachmentHashes = await Promise.all(evidence.map((e) => computeHash(e.label + (e.excerpt ?? ""))));
    const indexHash = await computeHash(renderExhibitIndex(packet.exhibitIndex));
    const p = createProofPacket({
      appealId: "draft",
      packetId: packet.id,
      finalAppealHash,
      attachmentHashes,
      exhibitIndexHash: indexHash,
      recipient,
      mailingMethod: mailType,
    });
    setProof(p);

    // Save the complete appeal to the database
    try {
      setSaving(true);
      const appeal = createAppeal(workflowId, decision);
      const updated = updateAppeal(appeal, {
        id: appealId,
        grounds,
        evidence,
        arguments: appealArguments,
        draft,
        review: review || undefined,
        packet: packet || undefined,
        proof: p,
        status: "mailed",
      });
      await saveAppeal({ data: { appeal: updated, userId: userId || "anonymous" } });
      setSavedToDb(true);
    } catch (err) {
      console.error("Failed to save appeal:", err);
    }
    setSaving(false);
  }

  // ── Contradiction detection ──
  const contradictions = useMemo(() => {
    if (!draft) return [];
    return detectContradictions(
      decision.reasons.map((r) => r.text),
      decision.facts.map((f) => f.value),
      draft,
    );
  }, [draft, decision]);

  // ── Deadline info ──
  const dStatus = deadlineStatus(decision.deadline);
  const daysLeft = daysUntilDeadline(decision.deadline);

  const deadlineColor = dStatus === "expired" ? "alert-danger"
    : dStatus === "urgent" ? "alert-danger"
    : dStatus === "soon" ? "alert-warning"
    : dStatus === "unknown" ? "alert-info"
    : "alert-info";

  // ── Workspace navigation ──
  const navItems: WorkspaceNav[] = definition.steps.map((s, i) => ({
    step: s,
    label: NAV_LABELS[s] || s,
    icon: NAV_ICONS[s] || FileText,
    completed: i < step,
    attention: s === "grounds" && grounds.some((g) => !g.userConfirmed),
  }));

  function navigateToStep(targetStep: WorkflowStep) {
    const idx = definition.steps.indexOf(targetStep);
    if (idx === -1) return;
    // Trigger computations when entering certain steps
    if (targetStep === "xray" && !xrayResult && !xrayAnalyzing) runXRay();
    if (targetStep === "timeline" && !timelineResult) runTimelineBuild();
    if (targetStep === "stress-test" && !stressTestResult) runGroundStressTest();
    if (targetStep === "draft" && !draft) setDraft(generateDraft());
    if (targetStep === "final-stress-test" && !finalStressTestResult) runFinalStressTest();
    if (targetStep === "readiness") runReadiness();
    if (targetStep === "packet" && !packet) assembleFinalPacket();
    if (targetStep === "proof" && !proof) generateProof();
    setStep(idx);
  }

  // ── Compute attention items ──
  const attentionItems: { title: string; description: string; action?: string; step?: WorkflowStep }[] = [];
  if (grounds.length === 0 && step > 2) attentionItems.push({ title: "No appeal grounds defined", description: "Define at least one ground for your appeal.", action: "Define grounds", step: "grounds" });
  if (grounds.some((g) => !g.userConfirmed)) attentionItems.push({ title: "Unconfirmed appeal grounds", description: "Some grounds have not been reviewed and confirmed.", action: "Review grounds", step: "grounds" });
  if (evidence.length === 0 && step > 4) attentionItems.push({ title: "No evidence added", description: "Add supporting documents to strengthen your appeal.", action: "Add evidence", step: "evidence" });
  if (grounds.some((g) => !evidence.some((e) => e.groundIds.includes(g.id)))) attentionItems.push({ title: "Grounds without evidence", description: "At least one appeal ground has no supporting evidence linked.", action: "Link evidence", step: "evidence" });
  if (!recipient.name && step > 10) attentionItems.push({ title: "Recipient address not entered", description: "Enter the mailing address for the agency or court.", action: "Add recipient", step: "recipient" });

  // ── Recent activity ──
  const activityItems = [
    ...(documentUploaded ? [{ description: "Decision uploaded", timestamp: "Recently", icon: FileText }] : []),
    ...(xrayResult ? [{ description: `${xrayResult.findings.length} findings from X-Ray`, timestamp: "Recently", icon: FileSearch }] : []),
    ...(timelineResult ? [{ description: `Timeline reconstructed (${timelineResult.summary.totalEvents} events)`, timestamp: "Recently", icon: Calendar }] : []),
    ...(grounds.length > 0 ? [{ description: `${grounds.length} ground${grounds.length > 1 ? "s" : ""} defined`, timestamp: "Recently", icon: ShieldAlert }] : []),
    ...(evidence.length > 0 ? [{ description: `${evidence.length} evidence item${evidence.length > 1 ? "s" : ""} added`, timestamp: "Recently", icon: FileText }] : []),
    ...(draft ? [{ description: "Draft generated", timestamp: "Recently", icon: FileText }] : []),
  ].slice(0, 5);

  return (
    <AppShell
      navItems={navItems}
      currentStep={definition.steps[step]}
      onNavigate={navigateToStep}
      appealNumber={`Appeal #${appealId.slice(0, 6).toUpperCase()}`}
      appealTitle={definition.title}
      statusLabel={step === 0 ? "Getting started" : step < 5 ? "Building appeal" : step < 10 ? "Preparing" : step < 14 ? "Finalizing" : "Complete"}
      deadlineInfo={decision.deadline?.date ? {
        date: decision.deadline.date,
        daysRemaining: daysLeft,
        source: decision.deadline.source === "extracted" ? "Extracted from document" : "User-provided",
      } : undefined}
    >
            {/* ── OVERVIEW ── */}
            {definition.steps[step] === "intro" && (
              <>
                <div className="eyebrow">Overview</div>
                <h1 className="heading-xl mt-2">{definition.title}</h1>
                <p className="text-body mt-3 max-w-xl">{definition.description}</p>

                {/* Disclaimer */}
                <div className="alert alert-warning mt-5">
                  <ShieldAlert size={16} className="shrink-0 inline mr-1" /> {definition.disclaimer}
                </div>

                {/* Deadline card */}
                {decision.deadline?.date && (
                  <div className="mt-5">
                    <DeadlineCard
                      date={decision.deadline.date}
                      daysRemaining={daysLeft}
                      source={decision.deadline.source === "extracted" ? "Decision letter" : "User-provided"}
                      verified={decision.deadline.source === "extracted"}
                      warning={dStatus === "urgent" ? definition.deadlineWarning : undefined}
                    />
                  </div>
                )}

                {/* Progress visualization */}
                <div className="mt-6">
                  <p className="section-label">Progress</p>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mt-2">
                    {definition.steps.slice(1, -1).map((s, i) => {
                      const isDone = i < step - 1;
                      const isCurrent = i === step - 1;
                      const label = NAV_LABELS[s] || s;
                      const Icon = NAV_ICONS[s] || FileText;
                      return (
                        <div key={s} className={`rounded-md p-2.5 text-center border ${isDone ? "border-emerald-200 bg-emerald-50/50" : isCurrent ? "border-indigo-200 bg-indigo-50" : "border-warm-border bg-cream"}`}>
                          <Icon size={16} className={`mx-auto ${isDone ? "text-emerald-500" : isCurrent ? "text-indigo-600" : "text-slate-300"}`} />
                          <p className={`text-[10px] mt-1 font-medium ${isDone ? "text-emerald-700" : isCurrent ? "text-indigo-700" : "text-slate-400"}`}>{label}</p>
                          {isDone && <CheckCircle2 size={12} className="mx-auto mt-0.5 text-emerald-500" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Attention required */}
                {attentionItems.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="status-dot status-dot-amber" />
                      <p className="section-label" style={{ marginBottom: 0 }}>Attention required — {attentionItems.length} {attentionItems.length === 1 ? "item" : "items"}</p>
                    </div>
                    <div className="space-y-2">
                      {attentionItems.map((item, i) => (
                        <IssueCard
                          key={i}
                          title={item.title}
                          description={item.description}
                          actionLabel={item.action}
                          onAction={item.step ? () => navigateToStep(item.step!) : undefined}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent activity */}
                {activityItems.length > 0 && (
                  <div className="mt-6">
                    <p className="section-label">Recent activity</p>
                    <ActivityFeed items={activityItems} />
                  </div>
                )}

                {/* Next best action */}
                {step < totalSteps - 1 && (
                  <div className="mt-6 card-flat p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="section-label" style={{ marginBottom: "0.25rem" }}>Next best action</p>
                        <p className="text-sm font-medium text-indigo-700">{documentUploaded ? "Review extracted decision details" : "Upload your decision document"}</p>
                      </div>
                      <button onClick={() => navigateToStep("document")} className="btn-primary btn-sm">
                        Continue <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── DOCUMENT UPLOAD ── */}
            {definition.steps[step] === "document" && (
              <>
                <div className="eyebrow">Upload decision</div>
                <h1 className="heading-lg mt-2">Start with the decision document</h1>
                <p className="text-body mt-2">Upload the decision letter, ruling, or denial notice. We'll extract the key details automatically.</p>

                <label className="upload-zone mt-7 block cursor-pointer">
                  <FileUp className="mx-auto text-slate-400" size={28} />
                  <span className="mt-3 block font-semibold text-indigo-500">
                    {documentUploaded ? `✓ ${decision.documentFilename || "Document uploaded"}` : "Upload decision letter"}
                  </span>
                  <span className="mt-1 block text-sm text-slate-300">PDF, JPG, or PNG</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    className="sr-only"
                    onChange={handleDocumentUpload}
                  />
                </label>

                {extracting && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-indigo-600">
                    <div className="animate-pulse">Extracting key information from document…</div>
                  </div>
                )}

                {extractionError && (
                  <div className="alert alert-warning mt-4">
                    <AlertTriangle size={16} className="inline mr-1" /> {extractionError}
                  </div>
                )}

                {documentUploaded && !extracting && extractedFields.length > 0 && (
                  <div className="alert alert-success mt-4">
                    <Check size={16} className="inline mr-1" />
                    <strong>Extracted {extractedFields.length} field(s):</strong> {extractedFields.join(", ")}
                  </div>
                )}

                {documentUploaded && !extracting && extractedFields.length === 0 && !extractionError && (
                  <div className="alert alert-info mt-4">
                    <strong>Document uploaded.</strong> Review the details and fill in anything we missed.
                  </div>
                )}

                {/* Manual entry fallback */}
                <div className="mt-6 border-t border-slate-100 pt-4">
                  <div className="text-sm font-semibold text-slate-500 mb-3">Or enter details manually:</div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {definition.decisionFields.map((field) => (
                      <div key={field.key}>
                        <label className="input-label">{field.label}{field.required ? " *" : ""}</label>
                        <input
                          type={field.type === "date" ? "date" : "text"}
                          className="input-field"
                          placeholder={field.placeholder}
                          value={
                            field.key === "agency" ? decision.agency ?? ""
                            : field.key === "referenceNumber" ? decision.referenceNumber ?? ""
                            : field.key === "decisionTypeLabel" ? decision.decisionTypeLabel ?? ""
                            : field.key === "decisionDate" ? decision.decisionDate ?? ""
                            : field.key === "deadline" ? decision.deadline?.date ?? ""
                            : ""
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (field.key === "agency") setDecision((d) => ({ ...d, agency: val }));
                            else if (field.key === "referenceNumber") setDecision((d) => ({ ...d, referenceNumber: val }));
                            else if (field.key === "decisionTypeLabel") setDecision((d) => ({ ...d, decisionTypeLabel: val }));
                            else if (field.key === "decisionDate") setDecision((d) => ({ ...d, decisionDate: val }));
                            else if (field.key === "deadline") setDecision((d) => ({ ...d, deadline: { ...d.deadline, date: val, type: "appeal", source: "user_provided" } }));
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── DECISION REVIEW ── */}
            {definition.steps[step] === "decision" && (
              <>
                <div className="eyebrow">Decision review</div>
                <h1 className="heading-lg mt-2">Review the decision details</h1>
                <p className="text-body mt-2">Confirm the key facts about the decision. These will anchor your appeal.</p>

                {/* Deadline banner */}
                {decision.deadline?.date && (
                  <div className={`alert ${deadlineColor} mt-6`}>
                    <Clock size={18} className="inline mr-2" />
                    {dStatus === "expired" && `Deadline passed ${Math.abs(daysLeft ?? 0)} days ago.`}
                    {dStatus === "urgent" && `URGENT: Only ${daysLeft} days until the deadline.`}
                    {dStatus === "soon" && `${daysLeft} days until the deadline.`}
                    {dStatus === "ok" && `${daysLeft} days until the deadline — you have time.`}
                    {dStatus === "unknown" && "Deadline date set but status unknown."}
                  </div>
                )}

                {/* Decision summary */}
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 p-4">
                    <div className="text-xs font-semibold text-slate-400">AGENCY / BODY</div>
                    <div className="mt-1 text-sm text-slate-700">{decision.agency || "—"}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4">
                    <div className="text-xs font-semibold text-slate-400">REFERENCE NO.</div>
                    <div className="mt-1 text-sm text-slate-700">{decision.referenceNumber || "—"}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4">
                    <div className="text-xs font-semibold text-slate-400">DECISION DATE</div>
                    <div className="mt-1 text-sm text-slate-700">{decision.decisionDate || "—"}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-4">
                    <div className="text-xs font-semibold text-slate-400">DEADLINE</div>
                    <div className="mt-1 text-sm text-slate-700">{decision.deadline?.date || "—"}</div>
                  </div>
                </div>

                {/* Appeal instructions */}
                <div className="mt-6">
                  <label className="input-label">Appeal instructions from the decision (if any)</label>
                  <textarea
                    className="input-field mt-2 min-h-24"
                    placeholder="e.g., 'You may appeal this decision within 30 days by writing to…'"
                    value={decision.appealInstructions ?? ""}
                    onChange={(e) => setDecision((d) => ({ ...d, appealInstructions: e.target.value }))}
                  />
                </div>

                {/* Decision reasons */}
                <div className="mt-6">
                  <div className="text-sm font-semibold text-slate-500 mb-2">Decision reasons (add what the decision-maker said)</div>
                  {decision.reasons.map((r, i) => (
                    <div key={r.id} className="flex items-start gap-2 mt-2">
                      <span className="mt-2 text-xs font-bold text-slate-400">{i + 1}</span>
                      <textarea
                        className="input-field flex-1 min-h-16"
                        value={r.text}
                        onChange={(e) => setDecision((d) => ({
                          ...d,
                          reasons: d.reasons.map((x) => x.id === r.id ? { ...x, text: e.target.value } : x),
                        }))}
                      />
                      <button className="text-slate-300 hover:text-red-400" onClick={() => setDecision((d) => ({ ...d, reasons: d.reasons.filter((x) => x.id !== r.id) }))}>×</button>
                    </div>
                  ))}
                  <button
                    className="mt-2 text-sm font-semibold text-indigo-500 hover:text-indigo-600"
                    onClick={() => setDecision((d) => ({
                      ...d,
                      reasons: [...d.reasons, { id: crypto.randomUUID(), text: "", confidence: 0.5 }],
                    }))}
                  >+ Add reason</button>
                </div>
              </>
            )}

            {/* ── TIMELINE ── */}
            {definition.steps[step] === "timeline" && (
              <>
                <div className="eyebrow">Appeal Timeline™</div>
                <h1 className="heading-lg mt-2">Reconstruct the record</h1>
                <p className="text-body mt-2">Every event has evidence attached and an integrity status. Conflicts between your documents are flagged automatically — add them to your appeal with one click.</p>

                <div className="mt-6">
                  {timelineBuilding ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                        <p className="mt-3 text-sm text-slate-500">Reconstructing timeline from your documents...</p>
                      </div>
                    </div>
                  ) : timelineResult ? (
                    <TimelineView
                      timeline={timelineResult}
                      onAddConflictToAppeal={addConflictToAppeal}
                      onExplainConflict={(conflict) => {
                        const explanations = explainConflictFn(conflict);
                        // Update the conflict in place
                        if (timelineResult) {
                          setTimelineResult({
                            ...timelineResult,
                            conflicts: timelineResult.conflicts.map((c) =>
                              c.id === conflict.id ? { ...c, alternativeExplanations: explanations } : c
                            ),
                          });
                        }
                      }}
                      onAddEvent={(evt) => {
                        setDecision((d) => ({
                          ...d,
                          chronology: [...d.chronology, { id: crypto.randomUUID(), date: evt.date, description: evt.description, source: "user_provided" as const }],
                        }));
                        // Rebuild timeline
                        if (timelineResult) {
                          const userEvents = [
                            ...decision.chronology.map((e) => ({ date: e.date, description: e.description })),
                            { date: evt.date, description: evt.description },
                          ];
                          const timelineDocs: TimelineDocument[] = [
                            { id: "decision", name: decision.documentFilename || "Decision Letter", text: decision.rawText || "", pageCount: 1, isDecision: true, role: "decision" },
                          ].filter((d) => d.text.length > 10);
                          setTimelineResult(buildTimeline({
                            documents: timelineDocs,
                            decision: { ...decision, chronology: [...decision.chronology, { id: crypto.randomUUID(), date: evt.date, description: evt.description, source: "user_provided" as const }] },
                            xrayFindings: xrayResult?.findings || [],
                            userEvents,
                          }));
                        }
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Calendar className="h-12 w-12 text-slate-300" />
                      <p className="mt-4 text-sm text-slate-500">Upload documents and run the X-Ray first.</p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── GROUNDS ── */}
            {definition.steps[step] === "grounds" && (
              <>
                <div className="eyebrow">Appeal grounds</div>
                <h1 className="heading-lg mt-2">Define your appeal grounds</h1>
                <p className="text-body mt-2">Each ground is a specific reason the decision should be reversed or modified. Be specific.</p>

                {/* Add ground form */}
                <div className="mt-6 rounded-lg border border-slate-200 p-4">
                  <div className="grid gap-4">
                    <div>
                      <label className="input-label">Ground type</label>
                      <select
                        className="input-field mt-2"
                        value={groundForm.type}
                        onChange={(e) => setGroundForm((f) => ({ ...f, type: e.target.value as GroundType }))}
                      >
                        {Object.entries(GROUND_TYPE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-slate-400">{GROUND_TYPE_DESCRIPTIONS[groundForm.type]}</p>
                    </div>
                    <div>
                      <label className="input-label">Your claim</label>
                      <textarea
                        className="input-field mt-2 min-h-20"
                        placeholder="State what is wrong with the decision…"
                        value={groundForm.claim}
                        onChange={(e) => setGroundForm((f) => ({ ...f, claim: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="input-label">What the decision says (quote or paraphrase)</label>
                      <textarea
                        className="input-field mt-2 min-h-16"
                        placeholder="The decision states that…"
                        value={groundForm.source}
                        onChange={(e) => setGroundForm((f) => ({ ...f, source: e.target.value }))}
                      />
                    </div>
                    <button className="btn-primary" onClick={addGround}>+ Add ground</button>
                  </div>
                </div>

                {/* Grounds list */}
                {grounds.length > 0 && (
                  <div className="mt-6 space-y-3">
                    {grounds.map((g, i) => (
                      <div key={g.id} className="rounded-lg border border-slate-200 p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-400">{i + 1}</span>
                            <span className="text-sm font-semibold text-indigo-700">{GROUND_TYPE_LABELS[g.type]}</span>
                          </div>
                          <button className="text-slate-300 hover:text-red-400" onClick={() => removeGround(g.id)}>Remove</button>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{g.claim}</p>
                        {g.source && <p className="mt-1 text-xs text-slate-400 italic">"{g.source}"</p>}
                        <div className="mt-3 flex items-center gap-4">
                          <label className="flex items-center gap-1.5 text-xs text-slate-400">
                            <input type="checkbox" checked={g.userConfirmed} onChange={() => toggleGroundConfirm(g.id)} />
                            I confirm this ground
                          </label>
                          <span className="text-xs text-slate-400">
                            Evidence: {evidenceForGround(evidence, g.id).length} item(s)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── EVIDENCE ── */}
            {definition.steps[step] === "evidence" && (
              <>
                <div className="eyebrow">Evidence</div>
                <h1 className="heading-lg mt-2">Manage supporting evidence</h1>
                <p className="text-body mt-2">Add documents, excerpts, and records. Link them to specific grounds.</p>

                {/* Upload / add evidence */}
                <div className="mt-6 rounded-lg border border-slate-200 p-4">
                  <label className="upload-zone block cursor-pointer">
                    <Paperclip className="mx-auto text-slate-400" size={24} />
                    <span className="mt-2 block font-semibold text-indigo-500">Upload evidence files</span>
                    <span className="mt-1 block text-sm text-slate-300">PDF, JPG, PNG, DOCX</span>
                    <input ref={evidenceFileRef} type="file" multiple accept="application/pdf,image/jpeg,image/png" className="sr-only" onChange={handleEvidenceUpload} />
                  </label>

                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <div className="text-sm font-semibold text-slate-500 mb-2">Or add an excerpt manually:</div>
                    <div className="grid gap-3">
                      <input className="input-field" placeholder="Label (e.g., Medical records p.7)" value={evidenceForm.label} onChange={(e) => setEvidenceForm((f) => ({ ...f, label: e.target.value }))} />
                      <textarea className="input-field min-h-16" placeholder="Excerpt or description" value={evidenceForm.excerpt} onChange={(e) => setEvidenceForm((f) => ({ ...f, excerpt: e.target.value }))} />
                      <div className="flex gap-3">
                        <input className="input-field w-40" placeholder="Page ref (e.g., p.7)" value={evidenceForm.pageRef} onChange={(e) => setEvidenceForm((f) => ({ ...f, pageRef: e.target.value }))} />
                        <button className="btn-primary" onClick={addEvidence}>+ Add</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Evidence list with ground linking */}
                {evidence.length > 0 && (
                  <div className="mt-6 space-y-3">
                    {evidence.map((ev, i) => (
                      <div key={ev.id} className="rounded-lg border border-slate-200 p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-400">{String.fromCharCode(65 + i)}</span>
                            <span className="text-sm font-semibold text-slate-700">{ev.label}</span>
                          </div>
                          <button className="text-slate-300 hover:text-red-400" onClick={() => removeEvidence(ev.id)}>Remove</button>
                        </div>
                        {ev.excerpt && <p className="mt-2 text-xs text-slate-500 italic">"{ev.excerpt}"</p>}
                        {ev.pageRef && <p className="mt-1 text-xs text-slate-400">Page: {ev.pageRef}</p>}

                        {/* Link to grounds */}
                        {grounds.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="text-xs text-slate-400">Links to:</span>
                            {grounds.map((g) => (
                              <button
                                key={g.id}
                                className={`rounded-full border px-2 py-0.5 text-xs transition ${
                                  ev.groundIds.includes(g.id)
                                    ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                                    : "border-slate-200 text-slate-400 hover:border-indigo-200"
                                }`}
                                onClick={() => linkEvidenceToGround(ev.id, g.id)}
                              >
                                {GROUND_TYPE_LABELS[g.type].replace(/\s+/g, " ")}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── ARGUMENTS ── */}
            {definition.steps[step] === "appealArguments" && (
              <>
                <div className="eyebrow">Arguments</div>
                <h1 className="heading-lg mt-2">Construct your appealArguments</h1>
                <p className="text-body mt-2">Arguments combine your grounds and evidence into persuasive reasoning.</p>

                {/* Contradiction detection */}
                {contradictions.length > 0 && (
                  <div className="alert alert-warning mt-6">
                    <AlertTriangle size={18} className="inline mr-2" />
                    <strong>Potential issues detected:</strong>
                    <ul className="mt-2 space-y-1">
                      {contradictions.map((c) => (
                        <li key={c.id} className="text-sm text-slate-500">{c.description}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Auto-generate appealArguments from grounds */}
                <div className="mt-6">
                  <button
                    className="btn-primary"
                    onClick={() => {
                      const args = grounds.map((g) => {
                        const linkedEv = evidenceForGround(evidence, g.id);
                        const heading = `Ground ${grounds.indexOf(g) + 1}: ${GROUND_TYPE_LABELS[g.type]}`;
                        const body = groundToParagraph(g) +
                          (linkedEv.length > 0 ? `\n\nSupported by: ${linkedEv.map((e) => e.label).join(", ")}.` : "");
                        return createArgument(g.id, heading, body, {
                          evidenceIds: linkedEv.map((e) => e.id),
                        });
                      });
                      setArguments(args);
                    }}
                  >Generate appealArguments from grounds</button>
                </div>

                {appealArguments.length > 0 && (
                  <div className="mt-6 space-y-3">
                    {appealArguments.map((arg, i) => (
                      <div key={arg.id} className="rounded-lg border border-slate-200 p-4">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-400">{i + 1}</span>
                          <span className="text-sm font-semibold text-indigo-700">{arg.heading}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{arg.body}</p>
                        {arg.evidenceIds.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {arg.evidenceIds.map((eid) => {
                              const ev = evidence.find((e) => e.id === eid);
                              return ev ? (
                                <span key={eid} className="rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-xs text-slate-500">
                                  <Link2 size={10} className="inline mr-1" />{ev.label}
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── STRESS TEST ── */}
            {definition.steps[step] === "stress-test" && (
              <>
                <div className="eyebrow">Appeal Stress Test</div>
                <h1 className="heading-lg mt-2">
                  If the other side tried to defeat your appeal — where would they attack?
                </h1>
                <p className="text-body mt-2">
                  We attack every ground, score each argument, and find the weakest link in your appeal. This makes your appeal stronger before it's ever sent.
                </p>
                {stressTestResult ? (
                  <div className="mt-6">
                    <StressTestView
                      result={stressTestResult}
                      onResultChange={setStressTestResult}
                      draft=""
                      onDraftChange={() => {}}
                      onFix={(target) => {
                        if (target === "evidence") {
                          const idx = definition.steps.indexOf("evidence");
                          if (idx >= 0) setStep(idx);
                        } else if (target === "grounds") {
                          const idx = definition.steps.indexOf("grounds");
                          if (idx >= 0) setStep(idx);
                        }
                      }}
                      testing={stressTesting}
                    />
                  </div>
                ) : (
                  <div className="mt-6 flex flex-col items-center justify-center py-12">
                    <button onClick={runGroundStressTest} className="btn-primary">
                      <ShieldAlert size={16} className="inline mr-1" /> Stress Test My Appeal
                    </button>
                    <p className="mt-2 text-xs text-slate-400">We'll attack every ground and find your weakest point.</p>
                  </div>
                )}
              </>
            )}

            {/* ── DRAFT ── */}
            {definition.steps[step] === "draft" && (
              <>
                <div className="eyebrow">Draft</div>
                <h1 className="heading-lg mt-2">Prepare your appeal letter</h1>
                <p className="text-body mt-2">Review every fact, name, date, and statement before sending.</p>

                <div className="mt-4 flex gap-2">
                  <button className="btn-secondary text-sm" onClick={() => setDraft(generateDraft())}>
                    <Copy size={14} className="inline mr-1" /> Regenerate from grounds
                  </button>
                </div>

                <AIDraftHelper
                  workflowId={workflowId}
                  workflowTitle={definition.title || workflowId}
                  documentText={decision.agency || ""}
                  analysis={{
                    agency: decision.agency || null,
                    noticeType: decision.decisionTypeLabel || null,
                    referenceNumber: decision.referenceNumber || null,
                    noticeDate: decision.decisionDate || null,
                    responseDeadline: decision.deadline?.date || null,
                    amountOwed: null,
                    keyFacts: grounds.map(g => g.claim || g.type),
                    summary: "",
                  }}
                  userFacts={grounds.map(g => g.claim || "").join("\n")}
                  userObjective={grounds.map(g => GROUND_TYPE_LABELS[g.type] + (g.claim ? ": " + g.claim : "")).join("; ")}
                  onDraft={setDraft}
                />

                <textarea
                  className="input-field mt-6 min-h-96 font-mono text-sm leading-6"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <div className="alert alert-warning mt-4">
                  <ShieldAlert size={16} className="shrink-0" /> This draft was generated from your grounds and evidence. It is not legal advice. Review and edit carefully.
                </div>
              </>
            )}

            {/* ── FINAL STRESS TEST ── */}
            {definition.steps[step] === "final-stress-test" && (
              <>
                <div className="eyebrow">Final Appeal Stress Test</div>
                <h1 className="heading-lg mt-2">
                  We checked your draft so the other side can't use it against you
                </h1>
                <p className="text-body mt-2">
                  Before you mail this, we scan the draft for exaggerated claims, unsupported assertions, and factual errors — then suggest precise revisions.
                </p>
                {finalStressTestResult ? (
                  <div className="mt-6">
                    <StressTestView
                      result={finalStressTestResult}
                      onResultChange={setFinalStressTestResult}
                      draft={draft}
                      onDraftChange={setDraft}
                      onFix={() => {}}
                      testing={finalStressTesting}
                    />
                  </div>
                ) : (
                  <div className="mt-6 flex flex-col items-center justify-center py-12">
                    <button onClick={runFinalStressTest} className="btn-primary">
                      <ShieldAlert size={16} className="inline mr-1" /> Check My Draft
                    </button>
                    <p className="mt-2 text-xs text-slate-400">We'll scan for vulnerabilities that could undermine your credibility.</p>
                  </div>
                )}
              </>
            )}

            {/* ── READINESS ── */}
            {definition.steps[step] === "readiness" && (
              <>
                <div className="eyebrow">Readiness review</div>
                <h1 className="heading-lg mt-2">Appeal readiness check</h1>
                <p className="text-body mt-2">We've analyzed your appeal for completeness and consistency.</p>

                {!review ? (
                  <button className="btn-primary mt-6" onClick={runReadiness}>Run readiness check</button>
                ) : (
                  <>
                    {/* Score */}
                    <div className="mt-6 text-center">
                      <div className={`text-5xl font-bold ${review.score >= 80 ? "text-emerald-600" : review.score >= 60 ? "text-amber-600" : "text-red-600"}`}>
                        {review.score}
                      </div>
                      <div className="text-sm text-slate-400">Appeal Readiness Score</div>
                      <div className="text-sm font-semibold text-slate-500 mt-1">
                        {review.issuesRequiringAttention} issue(s) require attention
                      </div>
                    </div>

                    {/* Checks */}
                    <div className="mt-6 space-y-2">
                      {review.checks.map((check) => (
                        <div
                          key={check.id}
                          className={`flex items-start gap-3 rounded-lg border p-3 ${
                            check.status === "pass" ? "border-emerald-200 bg-emerald-50"
                            : check.status === "warning" ? "border-amber-200 bg-amber-50"
                            : "border-red-200 bg-red-50"
                          }`}
                        >
                          {check.status === "pass" && <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />}
                          {check.status === "warning" && <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />}
                          {check.status === "fail" && <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />}
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-slate-700">{check.label}</div>
                            <div className="text-xs text-slate-400">{check.description}</div>
                            {check.detail && <div className="text-xs text-slate-500 mt-1">{check.detail}</div>}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button className="btn-secondary mt-4 text-sm" onClick={runReadiness}>Re-run check</button>
                  </>
                )}
              </>
            )}

            {/* ── PACKET ── */}
            {definition.steps[step] === "packet" && (
              <>
                <div className="eyebrow">Packet assembly</div>
                <h1 className="heading-lg mt-2">Assemble the appeal packet</h1>
                <p className="text-body mt-2">Your appeal letter and supporting evidence are combined into a single packet.</p>

                {!packet ? (
                  <button className="btn-primary mt-6" onClick={assembleFinalPacket}>Assemble packet</button>
                ) : (
                  <>
                    <div className="mt-6 rounded-lg border border-slate-200 p-4">
                      <div className="flex items-center gap-3">
                        <FileText size={24} className="text-indigo-500" />
                        <div>
                          <div className="text-sm font-semibold text-slate-700">Appeal packet assembled</div>
                          <div className="text-xs text-slate-400">{packet.pageCount} page(s) · {packet.exhibitIndex.length} exhibit(s)</div>
                        </div>
                      </div>
                    </div>

                    {/* Exhibit index */}
                    {packet.exhibitIndex.length > 0 && (
                      <div className="mt-4">
                        <div className="text-sm font-semibold text-slate-500 mb-2">Exhibit index:</div>
                        <pre className="rounded-lg bg-slate-50 p-4 text-xs text-slate-600 whitespace-pre-wrap">
                          {renderExhibitIndex(packet.exhibitIndex)}
                        </pre>
                      </div>
                    )}

                    {/* Letter preview */}
                    <div className="mt-4">
                      <div className="text-sm font-semibold text-slate-500 mb-2">Appeal letter:</div>
                      <pre className="rounded-lg bg-slate-50 p-4 text-xs text-slate-600 whitespace-pre-wrap max-h-64 overflow-y-auto">{draft}</pre>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── RECIPIENT ── */}
            {definition.steps[step] === "recipient" && (
              <>
                <div className="eyebrow">Recipient</div>
                <h1 className="heading-lg mt-2">Who should receive this?</h1>
                <p className="text-body mt-2">Enter the address of the agency, court, or decision-maker.</p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div><label className="input-label">Recipient name *</label><input className="input-field" value={recipient.name} onChange={(e) => setRecipient((r) => ({ ...r, name: e.target.value }))} placeholder="e.g., Appeals Office" /></div>
                  <div><label className="input-label">Organization</label><input className="input-field" value={recipient.org} onChange={(e) => setRecipient((r) => ({ ...r, org: e.target.value }))} /></div>
                  <div className="sm:col-span-2"><label className="input-label">Address line 1 *</label><input className="input-field" value={recipient.address1} onChange={(e) => setRecipient((r) => ({ ...r, address1: e.target.value }))} /></div>
                  <div className="sm:col-span-2"><label className="input-label">Address line 2</label><input className="input-field" value={recipient.address2} onChange={(e) => setRecipient((r) => ({ ...r, address2: e.target.value }))} /></div>
                  <div><label className="input-label">City *</label><input className="input-field" value={recipient.city} onChange={(e) => setRecipient((r) => ({ ...r, city: e.target.value }))} /></div>
                  <div><label className="input-label">State *</label><input className="input-field" value={recipient.state} onChange={(e) => setRecipient((r) => ({ ...r, state: e.target.value }))} /></div>
                  <div><label className="input-label">ZIP *</label><input className="input-field" value={recipient.zip} onChange={(e) => setRecipient((r) => ({ ...r, zip: e.target.value }))} /></div>
                </div>
              </>
            )}

            {/* ── MAILING ── */}
            {definition.steps[step] === "mailing" && (
              <>
                <div className="eyebrow">11 · Mailing method</div>
                <h2 className="mt-3 text-2xl font-bold text-indigo-700" style={{ fontFamily: "var(--font-serif)" }}>Choose your mailing method</h2>
                <div className="mt-6 space-y-3">
                  {mailOptions.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition ${
                        mailType === opt.id ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:border-indigo-200"
                      }`}
                    >
                      <input type="radio" name="mailType" value={opt.id} checked={mailType === opt.id} onChange={() => setMailType(opt.id)} className="sr-only" />
                      <opt.icon size={24} className="text-indigo-500" />
                      <div className="flex-1">
                        <div className="font-semibold text-slate-700">{opt.label}</div>
                        <div className="text-xs text-slate-400">{opt.desc}</div>
                      </div>
                      <div className="text-lg font-bold text-indigo-700">{opt.price}</div>
                    </label>
                  ))}
                </div>
              </>
            )}

            {/* ── CHECKOUT ── */}
            {definition.steps[step] === "checkout" && (
              <>
                <div className="eyebrow">12 · Checkout</div>
                <h2 className="mt-3 text-2xl font-bold text-indigo-700" style={{ fontFamily: "var(--font-serif)" }}>Complete your order</h2>
                <div className="mt-6 rounded-lg border border-slate-200 p-6">
                  <div className="flex justify-between text-sm text-slate-500"><span>Appeal letter mailing</span><span>{mailOptions.find((m) => m.id === mailType)?.price}</span></div>
                  <div className="flex justify-between text-sm text-slate-400 mt-2"><span>Method</span><span>{mailOptions.find((m) => m.id === mailType)?.label}</span></div>
                  <div className="mt-4 border-t border-slate-100 pt-4 flex justify-between text-lg font-bold text-slate-700">
                    <span>Total</span><span>{mailOptions.find((m) => m.id === mailType)?.price}</span>
                  </div>
                </div>
                <div className="alert alert-info mt-4">
                  <CreditCard size={18} className="inline mr-2" />
                  Secure checkout via Stripe. You will be redirected to Stripe to complete payment.
                </div>
                <button
                  className="btn-primary mt-4"
                  onClick={async () => {
                    try {
                      const session = await createCheckoutSession({ data: {
                        mailingMethod: mailType,
                        appealId,
                        recipientName: recipient.name,
                        workflowId,
                      }});
                      if (session.url) {
                        window.location.href = session.url;
                      }
                    } catch (err) {
                      console.error("Checkout error:", err);
                      alert("Could not start checkout. Stripe may not be configured yet.");
                    }
                  }}
                >
                  <CreditCard size={16} className="inline mr-1" /> Pay {mailOptions.find((m) => m.id === mailType)?.price} via Stripe
                </button>
              </>
            )}

            {/* ── PROOF ── */}
            {definition.steps[step] === "proof" && (
              <>
                <div className="eyebrow">Proof of filing</div>
                <h1 className="heading-lg mt-2">Permanent proof packet</h1>
                <p className="text-body mt-2">A tamper-evident record that your appeal was prepared and sent.</p>

                {!proof ? (
                  <button className="btn-primary mt-6" onClick={generateProof}>
                    {saving ? "Saving appeal…" : "Generate proof packet"}
                  </button>
                ) : (
                  <>
                    <div className="mt-6 rounded-lg border-2 border-indigo-200 bg-indigo-50/50 p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Award size={20} className="text-indigo-600" />
                        <span className="font-semibold text-indigo-700">Proof Certificate</span>
                      </div>
                      <pre className="text-xs text-slate-600 whitespace-pre-wrap">{renderProofCertificate(proof)}</pre>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button className="btn-secondary text-sm">
                        <Download size={14} className="inline mr-1" /> Download proof
                      </button>
                      <button className="btn-secondary text-sm">
                        <Copy size={14} className="inline mr-1" /> Copy hash
                      </button>
                    </div>

                    <div className="alert alert-info mt-4">
                      <Check size={16} className="inline mr-1" />
                      The appeal document hash ({proof.finalAppealHash.slice(0, 16)}…) serves as a fingerprint. If the document is ever altered, the hash will change.
                    </div>
                  </>
                )}
              </>
            )}

            {/* ── SUBMITTED ── */}
            {definition.steps[step] === "submitted" && (
              <>
                <div className="text-center py-8">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 size={32} className="text-emerald-600" />
                  </div>
                  <h2 className="mt-4 text-2xl font-bold text-indigo-700" style={{ fontFamily: "var(--font-serif)" }}>Appeal submitted</h2>
                  <p className="mt-2 text-slate-400">Your appeal packet has been prepared and is ready for mailing.</p>

                  {proof && (
                    <div className="mt-6 mx-auto max-w-md rounded-lg border border-slate-200 p-4 text-left">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Status</span><span className="font-semibold text-emerald-600">{proof.status}</span>
                      </div>
                      {proof.trackingNumber && (
                        <div className="flex items-center justify-between text-sm mt-2">
                          <span className="text-slate-400">Tracking</span><span className="font-semibold text-slate-700">{proof.trackingNumber}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-slate-400">Proof ID</span><span className="font-mono text-xs text-slate-500">{proof.id.slice(0, 12)}</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex justify-center gap-3">
                    <Link to="/dashboard" className="btn-secondary text-sm">Back to dashboard</Link>
                    <Link to="/workflows/$workflowId" params={{ workflowId }} className="btn-primary text-sm">Start new appeal</Link>
                  </div>
                </div>
              </>
            )}

            {/* ── WORKSPACE NAVIGATION ── */}
            {definition.steps[step] !== "submitted" && (
              <div className="mt-8 flex items-center justify-between border-t border-warm-border pt-5">
                <button
                  onClick={back}
                  disabled={step === 0}
                  className="btn-ghost disabled:opacity-30"
                >
                  ← Back
                </button>
                <button
                  onClick={next}
                  disabled={!canContinue()}
                  className="btn-primary disabled:opacity-30"
                >
                  {step === totalSteps - 2 ? "Complete" : "Continue"} <ArrowRight size={16} />
                </button>
              </div>
            )}
    </AppShell>
  );
}
