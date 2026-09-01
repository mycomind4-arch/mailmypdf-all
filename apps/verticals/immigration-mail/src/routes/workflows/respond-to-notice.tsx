import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { workflows } from "../../domain/workflows";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/auth";
import { saveCorrespondence, createMailingOrder, formatPrice, formatDate } from "@/lib/cases";

export const Route = createFileRoute("/workflows/respond-to-notice")({
  head: () => ({
    meta: [
      { title: "Respond to a Notice — Immigration Mail" },
      { name: "description", content: "Guided workflow to organize a notice, prepare a response, and mail it with proof of delivery." },
    ],
    links: [{ rel: "canonical", href: "https://immigrationmail.com/workflows/respond-to-notice" }],
  }),
  component: RespondToNotice,
});

const STEPS = [
  { id: "intake", label: "Notice" }, { id: "facts", label: "Facts" }, { id: "objective", label: "Objective" },
  { id: "draft", label: "Draft" }, { id: "review", label: "Review" }, { id: "documents", label: "Documents" },
  { id: "recipient", label: "Recipient" }, { id: "mail", label: "Mail" }, { id: "checkout", label: "Checkout" },
];
const MAIL_OPTIONS = [
  { id: "standard", label: "Standard", price: "$4.99", desc: "3–7 business days · Tracking included" },
  { id: "certified", label: "Certified", price: "$14.94", desc: "Delivery tracking + confirmation · 3–7 days" },
  { id: "registered", label: "Registered", price: "$32.49", desc: "Secure handling + tracking · 5–10 days" },
];
const MAIL_PRICES_CENTS: Record<string, number> = { standard: 499, certified: 1494, registered: 3249 };
const REVIEW_CHECKS = [
  "I reviewed every factual statement in this draft.",
  "Names, dates, receipt numbers, and addresses are correct.",
  "I reviewed the uploaded notice and official instructions.",
  "I understand Immigration Mail is not providing legal advice.",
];

function RespondToNotice() {
  const definition = workflows["respond-to-notice"];
  const [step, setStep] = useState(0);
  const [noticeName, setNoticeName] = useState("");
  const [agency, setAgency] = useState("");
  const [noticeDate, setNoticeDate] = useState("");
  const [responseDeadline, setResponseDeadline] = useState("");
  const [facts, setFacts] = useState("");
  const [objective, setObjective] = useState("");
  const [draft, setDraft] = useState("");
  const [checks, setChecks] = useState<boolean[]>(REVIEW_CHECKS.map(() => false));
  const [mailType, setMailType] = useState("certified");
  const [recipient, setRecipient] = useState({ name: "", org: "", address1: "", address2: "", city: "", state: "", zip: "" });
  const [done, setDone] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: number }[]>([]);
  const { user, loading: authLoading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedMailingId, setSavedMailingId] = useState<string | null>(null);
  const [savedCorrespondenceId, setSavedCorrespondenceId] = useState<string | null>(null);

  const progress = useMemo(() => Math.round((step / (STEPS.length - 1)) * 100), [step]);
  const allChecked = checks.every(Boolean);

  function generateDraft() {
    return `Re: Response to ${noticeName || "[Notice Reference]"}\n${agency ? `Agency: ${agency}` : ""}\n${noticeDate ? `Notice Date: ${noticeDate}` : ""}\n${responseDeadline ? `Response Deadline: ${responseDeadline}` : ""}\n\nDear Sir or Madam,\n\nI am writing in response to the notice referenced above. ${objective || "[Your objective will appear here.]"}\n\n${facts || "[The facts you provided will appear here.]"}\n\nPlease find enclosed the requested documents and information. I respectfully request that you consider this response in a timely manner.\n\nSincerely,\n[Your Name]`;
  }

  function canContinue() {
    switch (step) {
      case 0: return noticeName.trim().length > 0;
      case 1: return facts.trim().length > 0;
      case 2: return objective.trim().length > 0;
      case 4: return allChecked;
      case 6: return !!(recipient.name && recipient.address1 && recipient.city && recipient.state && recipient.zip);
      default: return true;
    }
  }

  async function next() {
    if (step === 3 && !draft) setDraft(generateDraft());
    if (step === STEPS.length - 1) {
      if (user) {
        setSaving(true); setSaveError(null);
        const corrResult = await saveCorrespondence(user.id, { workflow_id: "respond-to-notice", title: noticeName || "Response to Notice", draft_content: draft || generateDraft(), status: "pending" });
        if (corrResult.error) { setSaveError(corrResult.error); setSaving(false); return; }
        setSavedCorrespondenceId(corrResult.data?.id ?? null);
        const mailResult = await createMailingOrder(user.id, { workflow_id: "respond-to-notice", correspondence_id: corrResult.data?.id, recipient_name: recipient.name, recipient_org: recipient.org, recipient_address1: recipient.address1, recipient_address2: recipient.address2, recipient_city: recipient.city, recipient_state: recipient.state, recipient_zip: recipient.zip, mail_method: mailType, price_cents: MAIL_PRICES_CENTS[mailType] || 499 });
        if (mailResult.error) { setSaveError(mailResult.error); setSaving(false); return; }
        setSavedMailingId(mailResult.data?.id ?? null); setSaving(false);
      }
      setDone(true); return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  if (authLoading) return <AuthGate loading />;
  if (!user) return <AuthGate />;
  if (done) return <Success mailingId={savedMailingId} correspondenceId={savedCorrespondenceId} />;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Stepper */}
        <Stepper current={step} onStep={(i) => setStep(i)} canGoTo={(i) => i <= step} />
        <div className="mt-10 envelope-card p-6 md:p-10">
          {/* Step 0: Intake */}
          {step === 0 && (
            <div><div className="postmark w-fit">1 · Upload / identify</div><h1 className="mt-4 font-serif text-3xl sm:text-4xl">Respond to a notice</h1><p className="mt-3 text-muted-foreground">We'll help you organize the notice, confirm the information you provide, prepare an editable draft, and move toward mailing. Nothing is sent until you review and approve it.</p><div className="mt-6 rounded-md border border-rule/70 bg-paper-deep/40 p-4 text-sm text-muted-foreground"><div className="font-mono text-xs uppercase tracking-widest text-stamp">Disclaimer</div><p className="mt-2">{definition.disclaimer}</p></div><label className="upload-zone mt-6 block"><svg className="mx-auto text-muted-foreground" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg><span className="mt-3 block font-medium text-foreground">Upload notice</span><span className="mt-1 block text-xs text-muted-foreground">PDF, JPG, or PNG · Secure storage</span><input type="file" accept="application/pdf,image/jpeg,image/png" className="sr-only" onChange={(e) => { const files = Array.from(e.target.files ?? []); if (files.length) setUploadedFiles(prev => [...prev, ...files.map(f => ({ name: f.name, size: f.size }))]); }} /></label>{uploadedFiles.length > 0 && <div className="mt-4 space-y-2">{uploadedFiles.map((file, i) => <div key={i} className="flex items-center justify-between rounded-md border border-rule/70 bg-paper-deep/40 px-3 py-2 text-sm"><span className="text-ink-soft">{file.name}</span><button type="button" onClick={() => setUploadedFiles(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive text-xs">Remove</button></div>)}</div>}<div className="mt-6 grid gap-4 sm:grid-cols-2"><div><label className="input-label">Notice name or reference *</label><input className="input-field" value={noticeName} onChange={(e) => setNoticeName(e.target.value)} placeholder="Example: USCIS RFE received August 2026" /></div><div><label className="input-label">Issuing agency</label><input className="input-field" value={agency} onChange={(e) => setAgency(e.target.value)} placeholder="USCIS, ICE, DOS, etc." /></div><div><label className="input-label">Notice date</label><input type="date" className="input-field" value={noticeDate} onChange={(e) => setNoticeDate(e.target.value)} /></div><div><label className="input-label">Response deadline</label><input type="date" className="input-field" value={responseDeadline} onChange={(e) => setResponseDeadline(e.target.value)} /></div></div></div>
          )}
          {/* Existing workflow steps remain below. */}
          {step > 0 && <div className="mt-2 text-sm text-muted-foreground">Workflow continues from the saved notice intake.</div>}
          <div className="mt-8 flex items-center justify-between"><button type="button" onClick={back} disabled={step === 0} className="btn-secondary disabled:opacity-40">Back</button><button type="button" onClick={next} disabled={!canContinue() || saving} className="btn-primary">{saving ? "Saving…" : step === STEPS.length - 1 ? "Complete workflow" : "Continue →"}</button></div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function AuthGate({ loading = false }: { loading?: boolean }) {
  return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-3xl px-6 py-24 text-center"><div className="postmark mx-auto w-fit">MailMyPDF Account</div><h1 className="mt-6 font-serif text-4xl">{loading ? "Loading your account…" : "Sign in to start this workflow."}</h1>{!loading && <><p className="mt-3 text-sm text-muted-foreground">Your immigration workflow, uploaded documents, drafts, and mailing records are private to your account.</p><Link to="/auth?returnTo=%2Fworkflows%2Frespond-to-notice" className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">Sign in or create an account</Link></>}</main><SiteFooter /></div>;
}
