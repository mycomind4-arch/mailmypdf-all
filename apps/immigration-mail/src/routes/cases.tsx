import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/auth";
import {
  fetchCases,
  createCase,
  updateCase,
  formatDate,
  type Case,
} from "@/lib/cases";

export const Route = createFileRoute("/cases")({
  head: () => ({
    meta: [
      { title: "My Cases — Immigration Mail" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: CasesPage,
});

const AGENCY_OPTIONS = ["USCIS", "DOS", "CBP", "ICE", "NVC", "EOIR", "SSA", "DOL", "Other"];

const statusColors: Record<string, string> = {
  active: "text-emerald-700",
  pending: "text-stamp",
  closed: "text-muted-foreground",
  archived: "text-muted-foreground",
};

function CasesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  // New case form
  const [name, setName] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [petitionerName, setPetitionerName] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [agency, setAgency] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/auth" });
    }
  }, [user, authLoading, navigate]);

  const loadCases = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await fetchCases(user.id);
    if (error) setError(error);
    else setCases(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setSaving(true);
    const { data, error } = await createCase(user.id, {
      name,
      applicant_name: applicantName,
      petitioner_name: petitionerName,
      receipt_number: receiptNumber,
      agency,
      category,
      notes,
    });
    setSaving(false);
    if (error) {
      setError(error);
      return;
    }
    if (data) {
      setCases((prev) => [data, ...prev]);
      // Reset form
      setName("");
      setApplicantName("");
      setPetitionerName("");
      setReceiptNumber("");
      setAgency("");
      setCategory("");
      setNotes("");
      setShowNew(false);
    }
  };

  const handleStatusChange = async (caseId: string, status: string) => {
    const { error } = await updateCase(caseId, { status });
    if (error) {
      setError(error);
      return;
    }
    setCases((prev) => prev.map((c) => (c.id === caseId ? { ...c, status } : c)));
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen page-fade">
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-rule border-t-stamp" />
            <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen page-fade">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="postmark w-fit">My Cases</div>
            <h1 className="mt-3 font-serif text-3xl sm:text-4xl">Your immigration cases</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Organize documents, correspondence, and mailings by case.
            </p>
          </div>
          <button
            onClick={() => setShowNew(!showNew)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-stamp transition-transform hover:-translate-y-0.5"
          >
            {showNew ? "Cancel" : "New case"}
            {!showNew && (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* New case form */}
        {showNew && (
          <form onSubmit={handleCreate} className="mt-6 envelope-card p-6">
            <h2 className="font-serif text-xl">Create a new case</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Give your case a name you'll recognize. You can fill in the details later.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="input-label">Case name *</label>
                <input
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Example: I-485 Adjustment — Family-based"
                  required
                />
              </div>
              <div>
                <label className="input-label">Applicant name</label>
                <input
                  className="input-field"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="input-label">Petitioner name</label>
                <input
                  className="input-field"
                  value={petitionerName}
                  onChange={(e) => setPetitionerName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="input-label">Receipt number</label>
                <input
                  className="input-field font-mono"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  placeholder="MSC1234567890"
                />
              </div>
              <div>
                <label className="input-label">Agency</label>
                <select
                  className="input-field"
                  value={agency}
                  onChange={(e) => setAgency(e.target.value)}
                >
                  <option value="">Select agency…</option>
                  {AGENCY_OPTIONS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="input-label">Category</label>
                <input
                  className="input-field"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Example: I-485, N-400, I-130, Asylum, etc."
                />
              </div>
              <div className="sm:col-span-2">
                <label className="input-label">Notes (optional)</label>
                <textarea
                  className="input-field min-h-20"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any notes about this case…"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-stamp transition-transform hover:-translate-y-0.5 disabled:opacity-30 disabled:transform-none"
              >
                {saving ? "Creating…" : "Create case"}
              </button>
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="inline-flex items-center rounded-full border border-input px-5 py-3 text-sm font-medium transition-colors hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Cases list */}
        <div className="mt-8">
          {loading ? (
            <div className="envelope-card p-12 text-center">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-rule border-t-stamp" />
              <p className="mt-3 text-sm text-muted-foreground">Loading cases…</p>
            </div>
          ) : cases.length === 0 ? (
            <div className="envelope-card p-12 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-rule bg-paper-deep/40">
                <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12l3-3m0 0l3 3m-3-3v6m-6.75 0h6.75" />
                </svg>
              </span>
              <p className="mt-4 font-medium text-foreground">No cases yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a case to organize your documents, correspondence, and mailings.
              </p>
              <button
                onClick={() => setShowNew(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-input px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                Create your first case
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {cases.map((c) => (
                <div key={c.id} className="envelope-card envelope-card-hover p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Link to="/workflows/respond-to-notice" className="block">
                        <h3 className="font-serif text-xl hover:text-stamp transition-colors">{c.name}</h3>
                      </Link>
                      {c.category && (
                        <p className="mt-0.5 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                          {c.category}
                        </p>
                      )}
                    </div>
                    <span className={`shrink-0 font-mono text-xs ${statusColors[c.status] || "text-muted-foreground"}`}>
                      {c.status}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm">
                    {c.applicant_name && (
                      <div className="flex items-center gap-2 text-ink-soft">
                        <span className="text-xs text-muted-foreground">Applicant:</span>
                        <span>{c.applicant_name}</span>
                      </div>
                    )}
                    {c.receipt_number && (
                      <div className="flex items-center gap-2 text-ink-soft">
                        <span className="text-xs text-muted-foreground">Receipt:</span>
                        <span className="font-mono text-xs">{c.receipt_number}</span>
                      </div>
                    )}
                    {c.agency && (
                      <div className="flex items-center gap-2 text-ink-soft">
                        <span className="text-xs text-muted-foreground">Agency:</span>
                        <span>{c.agency}</span>
                      </div>
                    )}
                  </div>

                  {c.notes && (
                    <p className="mt-3 rounded-md border border-rule/60 bg-paper-deep/30 px-3 py-2 text-xs text-muted-foreground">
                      {c.notes}
                    </p>
                  )}

                  <div className="mt-5 flex items-center justify-between border-t border-rule/40 pt-4">
                    <span className="text-xs text-muted-foreground">Updated {formatDate(c.updated_at)}</span>
                    <div className="flex items-center gap-2">
                      {c.status === "active" && (
                        <button
                          onClick={() => handleStatusChange(c.id, "closed")}
                          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          Mark closed
                        </button>
                      )}
                      {c.status === "closed" && (
                        <button
                          onClick={() => handleStatusChange(c.id, "active")}
                          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          Reopen
                        </button>
                      )}
                      <Link
                        to="/workflows/respond-to-notice"
                        className="inline-flex items-center gap-1.5 rounded-full border border-input px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                      >
                        Start a letter
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link to="/analyze" className="envelope-card envelope-card-hover block p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-rule bg-paper-deep">
                <svg className="h-5 w-5 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </span>
              <div>
                <h3 className="font-serif text-lg">Analyze a document</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">Upload and understand an immigration letter.</p>
              </div>
            </div>
          </Link>
          <Link to="/workflows/respond-to-notice" className="envelope-card envelope-card-hover block p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-rule bg-paper-deep">
                <svg className="h-5 w-5 text-stamp" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
              </span>
              <div>
                <h3 className="font-serif text-lg">Start a letter</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">Prepare and mail a response.</p>
              </div>
            </div>
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
