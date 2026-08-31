import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useCallback, useRef } from "react";
  const llmAnalysis = useCombinedAnalysis("experian-dispute");
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Stepper, MailOptions, RecipientForm, ReviewChecks, MAIL_OPTIONS } from "@/components/workflow-shell";
import { MailingFunnel, type MailingFunnelState } from "@/components/mailing-funnel";
import { getWorkflowById } from "@/domain/workflow-catalog";
import {
  createWorkflowState, advanceStep, retreatStep, goToStep, canAdvance,
  setUpload, setExtraction, setProcessing, setUserFacts, setUserObjective,
  setDraft, setDraftValidation, setReviewChecks, setMailing,
  type WorkflowState, type DocumentUpload,
} from "@/domain/workflow-runtime";
import { extractCreditDispute, generateCreditDisputeDraft, BUREAU_CONFIGS, type CreditDisputeExtraction } from "@/domain/credit-dispute";
import { validateDraft } from "@/domain/draft-validator";
import { recommendStrategies } from "@/domain/strategy";
import { classifyContent, validateTextInput, validateFilename, validateFileSize, validateMimeType } from "@/domain/security";

import { createWorkflowHead } from "@/domain/enhanced-head";
import { useCombinedAnalysis } from "@/domain/use-combined-analysis";
import { LLMAnalysisPanel } from "@/components/llm-analysis-panel";
import { FAQSection } from "@/components/faq-section";
import { getWorkflowSEO } from "@/domain/workflow-seo";
import { handleDocumentUpload } from "@/platform/upload-handler";
export const Route = createFileRoute("/workflows/experian-dispute")({
  head: () => createWorkflowHead("experian-dispute"),
  component: ExperianDispute,
});

function ExperianDispute() {
  const definition = getWorkflowById("experian-dispute")!;
  const steps = definition.ux?.steps ?? [];
  const [state, setState] = useState<WorkflowState>(() => createWorkflowState(definition));
  const [extraction, setExtraction] = useState<CreditDisputeExtraction | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bureauCfg = BUREAU_CONFIGS.experian;

  const update = (fn: (s: WorkflowState) => WorkflowState) => setState(fn);

  const handleFileUpload = useCallback(async (file: File) => {
    update((s) => setProcessing(s, true));
    setExtractionError(null);
    try {
      const fv = validateFilename(file.name);
      if (!fv.valid) { setExtractionError("File validation failed: " + fv.errors.join(", ")); return; }
      const sv = validateFileSize(file.size);
      if (!sv.valid) { setExtractionError(sv.error ?? "File size validation failed"); return; }
      const mv = validateMimeType(file.type);
      if (!mv.valid) { setExtractionError(mv.error ?? "File type not allowed"); return; }

      let text = "";
      const uploadResult = await handleDocumentUpload(file);
      if (uploadResult.error) {
        setExtractionError(uploadResult.error);
        return;
      }
      if (uploadResult.ocrRequired) {
        setExtractionError("We could not reliably extract text from this document. It appears to be a scanned image. Please provide a text-based PDF.");
        return;
      }
      text = uploadResult.text;
      if (uploadResult.securityWarning) {
        setSecurityWarning(uploadResult.securityWarning);
      } else {
        setSecurityWarning(null);
      }

      const upload: DocumentUpload = { fileName: file.name, fileSize: file.size, fileType: file.type, rawText: text, uploadedAt: new Date().toISOString() };
      update((s) => setUpload(s, upload));

      if (text && text.length > 20) {
        const cc = classifyContent(text);
        setSecurityWarning(cc.detectedInjectionPatterns.length > 0 ? "Security notice: " + cc.detectedInjectionPatterns.length + " potential prompt injection pattern(s) detected. Content treated as DATA, not instructions." : null);
        const tv = validateTextInput(text); text = tv.sanitized;
        const ext = extractCreditDispute(text, "experian");
        setExtraction(ext);
        update((s) => setExtraction(s, {
          noticeType: "irs_cp14" as any, classificationConfidence: ext.classificationConfidence,
          facts: ext.facts, deadlines: [], agency: "Experian",
          referenceNumber: ext.reportNumber ?? undefined, noticeDate: ext.reportDate ?? undefined,
          rawText: text, extractionConfidence: ext.classificationConfidence,
        }));
      }
    } catch (err) { setExtractionError("Failed to process document: " + (err instanceof Error ? err.message : "Unknown error")); }
    finally { update((s) => setProcessing(s, false)); }
  }, [update]);

  const handlePasteText = useCallback((text: string) => {
    const cc = classifyContent(text);
    setSecurityWarning(cc.detectedInjectionPatterns.length > 0 ? "Security notice: " + cc.detectedInjectionPatterns.length + " potential prompt injection pattern(s) detected." : null);
    const tv = validateTextInput(text); const sanitized = tv.sanitized;
    const upload: DocumentUpload = { fileName: "Pasted text", fileSize: sanitized.length, fileType: "text/plain", rawText: sanitized, uploadedAt: new Date().toISOString() };
    update((s) => setUpload(s, upload));
    const ext = extractCreditDispute(sanitized, "experian");
    setExtraction(ext);
    update((s) => setExtraction(s, {
      noticeType: "irs_cp14" as any, classificationConfidence: ext.classificationConfidence,
      facts: ext.facts, deadlines: [], agency: "Experian",
      referenceNumber: ext.reportNumber ?? undefined, noticeDate: ext.reportDate ?? undefined,
      rawText: sanitized, extractionConfidence: ext.classificationConfidence,
    }));

    // LLM-powered analysis (alongside deterministic)
    llmAnalysis.analyzeWithLLM(file, text);
    }, [update, llmAnalysis]);

  const handleGenerateDraft = useCallback(() => {
    const draft = generateCreditDisputeDraft({
      bureauId: "experian", consumerName: extraction?.consumerName ?? "",
      consumerAddress: extraction?.consumerAddress ?? null, reportDate: extraction?.reportDate ?? null,
      reportNumber: extraction?.reportNumber ?? null, disputedItems: extraction?.disputedItems ?? [],
      userFacts: state.userFacts, userObjective: state.userObjective,
    });
    update((s) => setDraft(s, draft));
    const validation = validateDraft(draft, state.extractedFacts, definition, { expectedNoticeNumber: extraction?.reportNumber ?? undefined });
    update((s) => setDraftValidation(s, validation));
  }, [extraction, state.userFacts, state.userObjective, state.extractedFacts, definition, update]);

  const canContinue = canAdvance(state, definition);
  const next = () => { if (state.phase === "draft" && !state.draft) handleGenerateDraft(); if (state.phase === "checkout" || state.phase === "submitted") return; update((s) => advanceStep(s, definition)); };
  const back = () => update((s) => retreatStep(s, definition));
  const strategies = state.extraction ? recommendStrategies(state.extraction.noticeType) : [];
  const defaultRecipient = { name: "", org: bureauCfg.mailingAddress.org, address1: bureauCfg.mailingAddress.line1, address2: bureauCfg.mailingAddress.line2, city: bureauCfg.mailingAddress.city, state: bureauCfg.mailingAddress.state, zip: bureauCfg.mailingAddress.zip };

  return (
    <div className="min-h-screen command-center">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-2"><Link to="/" className="text-sm text-muted-foreground hover:text-stamp transition-colors">← Notice Respond</Link></div>
        <h1 className="mb-6 font-serif text-3xl">{definition.title}</h1>
        <Stepper steps={steps} current={state.step} onStep={(i) => update((s) => goToStep(s, definition, i))} />
        <div className="mt-10 envelope-card p-6 md:p-10">
          {state.phase === "intro" && (
            <div>
              <div className="postmark w-fit">1 · Start</div>
              <h2 className="mt-4 font-serif text-4xl">Dispute your Experian credit report</h2>
              <p className="mt-3 text-muted-foreground">Under the Fair Credit Reporting Act (FCRA), you have the right to dispute inaccurate information on your credit report. Experian must investigate your dispute within 30 days and correct or delete inaccurate information.</p>
              <div className="mt-6 rounded-md border border-rule/70 bg-paper-deep/40 p-4 text-sm text-muted-foreground"><div className="font-mono text-xs uppercase tracking-widest text-stamp">FCRA Rights</div><p className="mt-2">Under FCRA Section 611 (15 U.S.C. 1681i), you can dispute incomplete or inaccurate information. The bureau must investigate within 30 days. Under Section 605, most negative information must be removed after 7 years (10 years for bankruptcies).</p></div>
              <div className="mt-6 rounded-md border border-rule/70 bg-paper-deep/40 p-4 text-sm text-muted-foreground"><div className="font-mono text-xs uppercase tracking-widest text-stamp">Disclaimer</div><p className="mt-2">{definition.ux?.disclaimerText ?? definition.disclaimer}</p></div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">{["Upload your Experian credit report", "Review extracted consumer info and disputed items", "Add your facts and supporting evidence", "Prepare the FCRA-based dispute letter", "Mail with tracking and proof of delivery"].map((item, i) => (<div key={i} className="rounded-lg border border-rule/60 p-3 text-sm text-muted-foreground"><span className="font-mono text-xs text-stamp">{i + 1}</span> {item}</div>))}</div>
            </div>
          )}
          {state.phase === "document" && (
            <div>
              <div className="postmark w-fit">2 · Upload</div>
              <h2 className="mt-4 font-serif text-3xl">Upload your Experian credit report</h2>
              <p className="mt-3 text-muted-foreground">Upload a PDF or image of your Experian credit report, or paste the text content directly.</p>
              <label className="upload-zone mt-6 block cursor-pointer" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFileUpload(f); }}>
                <svg className="mx-auto text-muted-foreground" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                <span className="mt-3 block font-medium text-foreground">Upload credit report</span>
                <span className="mt-1 block text-xs text-muted-foreground">PDF, JPG, or PNG · Text is extracted for your review</span>
                <input ref={fileInputRef} type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file); }} />
              </label>
              {state.isProcessing && <div className="mt-4 rounded-md border border-rule/70 bg-paper-deep/40 p-4 text-sm"><div className="flex items-center gap-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-stamp border-t-transparent" /><span className="text-muted-foreground">Processing document…</span></div></div>}
              {extractionError && <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{extractionError}</div>}
              {securityWarning && <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800"><span className="font-medium">⚠ Security:</span> {securityWarning}</div>}
              <div className="mt-6 border-t border-rule/60 pt-4"><label className="input-label">Or paste report text</label><textarea className="input-field mt-2 min-h-32 font-mono text-sm" placeholder="Paste the text content of your Experian credit report here…" onChange={(e) => { if (e.target.value.length > 50) handlePasteText(e.target.value); }} /></div>
            </div>
          )}
          {state.phase === "extraction" && (
            <div>

              {llmAnalysis.llmAnalysis && (
                <LLMAnalysisPanel analysis={llmAnalysis.llmAnalysis} provider={llmAnalysis.llmProvider} />
              )}
              {llmAnalysis.llmLoading && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-primary animate-pulse">✦ AI is analyzing your document…</div>
              )}
              <div className="postmark w-fit">3 · Review</div>
              <h2 className="mt-4 font-serif text-3xl">Review extracted information</h2>
              <p className="mt-3 text-muted-foreground">We extracted the following from your credit report. Verify each item — this information will be used to prepare your dispute.</p>
              {extraction && (<div className="mt-6 space-y-4">
                <div className="rounded-lg border border-rule/60 p-4"><div className="flex items-center justify-between"><span className="text-sm font-medium">Bureau Classification</span><span className={"rounded-full px-3 py-1 text-xs font-medium " + (extraction.isBureauReport ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{extraction.isBureauReport ? "Experian Confirmed" : "Not confirmed"}</span></div><p className="mt-1 text-xs text-muted-foreground">Confidence: {(extraction.classificationConfidence * 100).toFixed(0)}%</p></div>
                {extraction.warnings.length > 0 && (<div className="rounded-lg border border-amber-200 bg-amber-50 p-4"><div className="font-mono text-xs uppercase tracking-widest text-amber-700">Warnings</div><ul className="mt-2 space-y-1">{extraction.warnings.map((w, i) => (<li key={i} className="text-sm text-amber-800">⚠ {w}</li>))}</ul></div>)}
                {extraction.facts.length > 0 ? (<div className="rounded-lg border border-rule/60 p-4"><div className="font-mono text-xs uppercase tracking-widest text-stamp">Extracted Information</div><dl className="mt-3 space-y-2">{extraction.facts.map((fact) => (<div key={fact.id} className="border-b border-rule/30 pb-2 last:border-0"><div className="flex items-start justify-between gap-4"><dt className="text-sm font-medium text-foreground">{fact.label}</dt><dd className="text-sm text-muted-foreground">{fact.value || "—"}</dd></div></div>))}</dl></div>) : <div className="rounded-lg border border-rule/60 p-4 text-sm text-muted-foreground">No structured information was extracted. You can enter your dispute details manually in the next step.</div>}
                {extraction.disputedItems.length > 0 && (<div className="rounded-lg border border-rule/60 p-4"><div className="font-mono text-xs uppercase tracking-widest text-stamp">Detected Disputed Items ({extraction.disputedItems.length})</div><ul className="mt-3 space-y-3">{extraction.disputedItems.map((item, i) => (<li key={i} className="rounded-md border border-rule/40 p-3"><div className="flex items-center justify-between"><span className="text-sm font-medium">{item.accountName ?? "Account " + (i + 1)}</span><span className="text-xs rounded-full bg-muted px-2 py-0.5">{item.errorType}</span></div><div className="mt-1 text-xs text-muted-foreground">{item.errorDescription}</div>{item.accountNumber && <div className="mt-1 text-xs text-muted-foreground">Acct: {item.accountNumber}</div>}</li>))}</ul></div>)}
              </div>)}
              {!extraction && !state.isProcessing && <div className="mt-6 rounded-md border border-rule/60 p-4 text-sm text-muted-foreground">No document has been processed yet. Go back to upload your credit report.</div>}
            </div>
          )}
          {state.phase === "facts" && (<div><div className="postmark w-fit">4 · Facts</div><h2 className="mt-4 font-serif text-3xl">Add your dispute facts</h2><p className="mt-3 text-muted-foreground">Explain why each item is inaccurate and what the correct information should be. Include specific account names, numbers, and dates.</p><textarea className="input-field mt-6 min-h-48" value={state.userFacts} onChange={(e) => update((s) => setUserFacts(s, e.target.value))} placeholder="Example: The Capital One account (acct ending 4521) shows a balance of $3,200 but was paid in full on March 15, 2025. I have the payment confirmation. The Discover card account is not mine — I have never opened an account with Discover and believe this is identity theft or a mixed file…" /><div className="mt-4 rounded-md border border-rule/70 bg-paper-deep/40 p-3 text-sm text-muted-foreground"><strong>Tip:</strong> For each disputed item, state: (1) what's wrong, (2) what the correct information should be, and (3) what evidence you have. If identity theft, mention the FTC report or police report.</div></div>)}
          {state.phase === "objective" && (<div><div className="postmark w-fit">5 · Objective</div><h2 className="mt-4 font-serif text-3xl">What do you want the dispute to accomplish?</h2><p className="mt-3 text-muted-foreground">State your objective clearly. The FCRA gives you the right to have inaccurate, incomplete, or unverifiable information corrected or removed.</p>{strategies.length > 0 && (<div className="mt-4 space-y-2"><div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Suggested approaches</div>{strategies.slice(0, 4).map((strat, i) => (<button key={i} onClick={() => update((s) => setUserObjective(s, strat.type + (strat.reason ? ": " + strat.reason : "")))} className="block w-full rounded-lg border border-rule/60 bg-card p-3 text-left text-sm hover:border-stamp/40 transition-colors"><span className="font-medium text-foreground">{strat.type}</span>{strat.reason && <span className="mt-1 block text-xs text-muted-foreground">{strat.reason}</span>}</button>))}</div>)}<textarea className="input-field mt-6 min-h-40" value={state.userObjective} onChange={(e) => update((s) => setUserObjective(s, e.target.value))} placeholder="Example: I want Experian to investigate the disputed items, remove the inaccurate Capital One balance, remove the Discover account as it is not mine, and send me an updated credit report reflecting the corrections." /></div>)}
          {state.phase === "draft" && (<div><div className="postmark w-fit">6 · Draft</div><h2 className="mt-4 font-serif text-3xl">Your dispute letter</h2><p className="mt-3 text-muted-foreground">Review every fact, name, account number, and statement. This is editable — change anything. We've validated the draft against the extracted information.</p>{state.draftValidation && !state.draftValidation.passed && (<div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4"><div className="font-mono text-xs uppercase tracking-widest text-amber-700">Validation findings ({state.draftValidation.errors} errors, {state.draftValidation.warnings} warnings)</div><ul className="mt-2 space-y-1">{state.draftValidation.findings.filter((f) => !f.passed).map((f, i) => (<li key={i} className={"text-sm " + (f.severity === "error" ? "text-destructive" : "text-amber-800")}>{f.severity === "error" ? "✗" : "⚠"} {f.detail}</li>))}</ul></div>)}{state.draftValidation?.passed && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">✓ Draft passed all validation checks.</div>}<textarea className="input-field mt-6 min-h-72 font-mono text-sm leading-6" value={state.draft} onChange={(e) => update((s) => setDraft(s, e.target.value))} /><button
                onClick={async () => {
                  if (llmAnalysis.llmAnalysis) {
                    const res = await fetch('/api/workflows/draft', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ workflowId: 'experian-dispute', analysis: llmAnalysis.llmAnalysis, userFacts: state.userFacts, userObjective: state.userObjective, documentText: state.upload?.rawText }),
                    });
                    if (res.ok) { const data = await res.json(); update((s) => setDraft(s, data.draft)); if (data.validation) update((s) => setDraftValidation(s, data.validation)); }
                  }
                }}
                disabled={!llmAnalysis.llmAnalysis}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-stamp transition-transform hover:-translate-y-0.5 disabled:opacity-30"
              >✦ Generate with AI</button>
              <button onClick={handleGenerateDraft} className="mt-4 rounded-full border border-rule px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Regenerate draft</button></div>)}
          {state.phase === "review" && (<div><div className="postmark w-fit">7 · Review</div><h2 className="mt-4 font-serif text-3xl">Review before anything is mailed</h2><p className="mt-3 text-muted-foreground">Please confirm each item below.</p><ReviewChecks items={definition.ux?.reviewChecks ?? []} checks={state.reviewChecks} setChecks={(fn) => update((s) => setReviewChecks(s, fn(state.reviewChecks)))} />{state.reviewChecks.every(Boolean) && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">✓ All checks confirmed. You can proceed to the next step.</div>}</div>)}
          {state.phase === "attachments" && (<div><div className="postmark w-fit">8 · Documents</div><h2 className="mt-4 font-serif text-3xl">Add supporting documents</h2><p className="mt-3 text-muted-foreground">Attach supporting documents — proof of identity, account statements, payment records, prior correspondence, police report if identity theft.</p><label className="upload-zone mt-6 block cursor-pointer"><svg className="mx-auto text-muted-foreground" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg><span className="mt-3 block font-medium text-foreground">Add attachments</span><span className="mt-1 block text-xs text-muted-foreground">ID, account statements, payment records, police report</span><input type="file" accept="application/pdf,image/jpeg,image/png" multiple className="sr-only" /></label><div className="mt-4 text-sm text-muted-foreground">Required: {definition.evidence.filter((e) => e.required).map((e) => e.label).join(", ")}</div></div>)}
          {state.phase === "recipient" && (<div><div className="postmark w-fit">9 · Recipient</div><h2 className="mt-4 font-serif text-3xl">Where should we send it?</h2><p className="mt-3 text-muted-foreground">The Experian dispute address is pre-filled. Certified mail is recommended for proof of timely submission.</p><RecipientForm recipient={state.mailing?.recipient ?? defaultRecipient} setRecipient={(fn) => update((s) => setMailing(s, { ...s.mailing ?? { method: "certified", recipient: defaultRecipient, status: "not_started" }, recipient: fn(s.mailing?.recipient ?? defaultRecipient) }))} orgPlaceholder={bureauCfg.mailingAddress.org} /></div>)}
          {state.phase === "mailing" && (<div><div className="postmark w-fit">10 · Mail</div><h2 className="mt-4 font-serif text-3xl">Choose your mail type</h2><p className="mt-3 text-muted-foreground">For FCRA disputes, Certified mail is strongly recommended for proof of timely submission.</p><MailOptions selected={state.mailing?.method ?? "certified"} onSelect={(id) => update((s) => setMailing(s, { ...s.mailing ?? { recipient: defaultRecipient, status: "not_started" }, method: id }))} /></div>)}
          {(state.phase === "checkout" || state.phase === "submitted") && (<MailingFunnel draft={state.draft} workflowId={definition.id} workflowTitle={definition.title} recipient={state.mailing?.recipient ?? null} extractionRef={extraction?.reportNumber ?? null} taxYear={null} mailOptions={definition.ux?.mailOptions ?? MAIL_OPTIONS} disclaimer={definition.ux?.disclaimerText ?? definition.disclaimer} onMailingStateChange={(s) => { if (s.phase === "submitted") update((st) => setMailing(st, { method: s.method, recipient: s.recipient, status: "submitted", providerOrderId: s.providerOrderId ?? undefined, trackingNumber: s.trackingNumber ?? undefined })); }} />)}
          {state.phase !== "checkout" && state.phase !== "submitted" && (<div className="mt-8 flex items-center justify-between"><button onClick={back} disabled={state.step === 0} className="text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30">← Back</button><button onClick={next} disabled={!canContinue} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-stamp transition-transform hover:-translate-y-0.5 disabled:opacity-30 disabled:transform-none disabled:shadow-none">{state.phase === "checkout" ? "Pay and send" : "Continue"} →</button></div>)}

        {(() => { const seo = getWorkflowSEO("experian-dispute"); return seo ? <FAQSection faq={seo.faq} /> : null; })()}

        </div>
        {state.phase === "intro" && definition.seo?.faq && (<div className="mt-16"><h2 className="font-serif text-2xl">Frequently asked questions</h2><div className="mt-6 space-y-4">{definition.seo.faq.map((item, i) => (<div key={i} className="rounded-xl border border-rule bg-card p-5"><h3 className="font-medium text-foreground">{item.question}</h3><p className="mt-2 text-sm text-muted-foreground">{item.answer}</p></div>))}</div><div className="mt-8 text-sm text-muted-foreground"><Link to="/" className="hover:text-foreground transition-colors">← All Notice Respond workflows</Link></div></div>)}
      </main>
      <SiteFooter />
    </div>
  );
}
