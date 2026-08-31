import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness, Plus, ShieldCheck, FileText, Mail } from "lucide-react";
import { PrivateOfficeChrome } from "@/components/private-office-chrome";
import { useAuth } from "@/lib/use-auth";
import { workflows } from "@/domain/workflows";
import { workflowProfiles } from "@/domain/workflow-profiles";

export const Route = createFileRoute("/dashboard")({ component: DashboardPage });

interface MatterSummary {
  id: string;
  title: string;
  workflowId: string;
  status: string;
  updatedAt: string;
  trackingNumber?: string | null;
}

const stageLabels = ["Intake", "Understanding", "Evidence", "Strategy", "Draft", "Review", "Approval", "Payment", "Mailing", "Proof"];

function DashboardPage() {
  const { user, loading, isConfigured } = useAuth();
  const [matters] = useState<MatterSummary[]>([]);
  const [mattersLoading, setMattersLoading] = useState(true);

  useEffect(() => {
    if (!user || !isConfigured) {
      setMattersLoading(false);
      return;
    }
    setMattersLoading(false);
  }, [user, isConfigured]);

  if (loading) {
    return (
      <main className="min-h-screen bg-ivory">
        <PrivateOfficeChrome />
        <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
          <span className="font-mono text-sm text-stone">Loading Private Office…</span>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-ivory">
        <PrivateOfficeChrome />
        <section className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4 py-20">
          <div className="w-full max-w-md text-center">
            <div className="section-kicker">Private Access</div>
            <h1 className="mt-4 text-4xl text-charcoal">Sign in to your Private Office.</h1>
            <p className="mt-3 text-sm leading-relaxed text-stone">
              Your matters, evidence, correspondence, and delivery records are isolated to your account.
            </p>
            <Link to="/auth" className="btn-primary mt-7">
              Sign in <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ivory">
      <PrivateOfficeChrome />

      {/* Dashboard header */}
      <section className="border-b border-rule bg-paper">
        <div className="mx-auto flex max-w-7xl items-end justify-between gap-6 px-4 py-12 sm:px-6 md:py-16">
          <div>
            <div className="section-kicker">Private Office / Matters</div>
            <h1 className="mt-3 text-4xl leading-tight text-charcoal md:text-5xl">
              Your matters.
            </h1>
            <p className="mt-2 text-sm text-stone">
              One controlled record from first fact to final proof.
            </p>
          </div>
          <Link to="/workflows" className="btn-primary shrink-0">
            <Plus size={16} /> Start New Matter
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-rule bg-paper p-5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-stone">Active Matters</span>
            <p className="mt-3 font-display text-3xl text-charcoal">{matters.length}</p>
            <span className="mt-1 block text-xs text-stone-light">Owner-scoped records</span>
          </div>
          <div className="rounded-lg border border-rule bg-paper p-5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-stone">Control Model</span>
            <p className="mt-3 font-display text-3xl text-charcoal">10 gates</p>
            <span className="mt-1 block text-xs text-stone-light">Review before consequence</span>
          </div>
          <div className="rounded-lg border border-rule bg-paper p-5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-stone">Delivery</span>
            <p className="mt-3 font-display text-3xl text-charcoal">Verified</p>
            <span className="mt-1 block text-xs text-stone-light">Mail + proof boundary</span>
          </div>
        </div>

        {/* Matters */}
        {mattersLoading ? (
          <div className="mt-6 flex min-h-32 items-center justify-center rounded-lg border border-rule bg-paper">
            <span className="font-mono text-sm text-stone">Loading matters…</span>
          </div>
        ) : matters.length === 0 ? (
          <div className="mt-6 flex items-start gap-5 rounded-lg border border-rule bg-paper p-10">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-rule bg-ivory">
              <BriefcaseBusiness size={22} className="text-navy" strokeWidth={1.5} />
            </div>
            <div>
              <div className="section-kicker">No Active Matters</div>
              <h2 className="mt-2 text-2xl text-charcoal">Your office is ready.</h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-stone">
                Start with a workflow. Private Office will turn the matter into a controlled record with facts, evidence, analysis, review, delivery, and proof.
              </p>
              <Link to="/workflows" className="btn-outline mt-5">
                Browse workflows <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-3">
            {matters.map((matter) => (
              <article key={matter.id} className="overflow-hidden rounded-lg border border-rule bg-paper">
                <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-3">
                  <span className={`status-badge status-badge--${matter.status}`}>{matter.status.replace(/_/g, " ")}</span>
                  <span className="font-mono text-xs text-stone-light">Updated {new Date(matter.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between gap-4 px-5 py-5">
                  <div>
                    <h2 className="text-xl text-charcoal">{matter.title}</h2>
                    <p className="mt-1 font-mono text-xs text-stone">{matter.workflowId}</p>
                  </div>
                  {matter.trackingNumber && (
                    <div className="flex items-center gap-2 font-mono text-xs text-stone">
                      <Mail size={14} /> {matter.trackingNumber}
                    </div>
                  )}
                </div>
                {/* Progress indicator */}
                <div className="grid grid-cols-10 border-t border-rule bg-ivory-deep/50">
                  {stageLabels.map((stage, i) => (
                    <div
                      key={stage}
                      className={`border-r border-rule px-1 py-2.5 text-center font-mono text-[9px] tracking-wide ${
                        i === 0 ? "text-navy" : "text-stone-light"
                      } ${i === stageLabels.length - 1 ? "border-r-0" : ""}`}
                    >
                      {stage}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Workflow Library */}
        <div className="mt-12">
          <div className="flex items-end justify-between gap-4 border-b border-rule pb-4">
            <div>
              <div className="section-kicker">Workflow Library</div>
              <h2 className="mt-2 text-2xl text-charcoal">Open a new matter</h2>
            </div>
            <span className="hidden items-center gap-1.5 text-xs text-stone sm:inline-flex">
              <ShieldCheck size={14} className="text-brass" /> Same control model
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Object.values(workflows).map((wf) => {
              const profile = workflowProfiles[wf.id];
              return (
                <Link
                  key={wf.id}
                  to={`/workflows/${wf.id}`}
                  className="group flex items-center gap-4 rounded-lg border border-rule bg-paper p-5 transition-all duration-200 hover:border-navy/30 hover:shadow-premium"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rule bg-ivory">
                    <FileText size={16} className="text-navy" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-brass">{profile?.family ?? "Private Matter"}</div>
                    <h3 className="mt-1 text-lg text-charcoal">{wf.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-stone">{wf.description}</p>
                  </div>
                  <ArrowRight size={16} className="shrink-0 text-stone-light transition-all group-hover:translate-x-1 group-hover:text-navy" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
