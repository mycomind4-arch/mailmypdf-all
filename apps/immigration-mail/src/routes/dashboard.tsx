import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/auth";
import {
  fetchMailingOrders,
  fetchCorrespondence,
  formatPrice,
  formatMailMethod,
  formatDate,
  type MailingOrder,
  type Correspondence,
} from "@/lib/cases";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "My Mailings — Immigration Mail" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DashboardPage,
});


function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [mailings, setMailings] = useState<MailingOrder[]>([]);
  const [correspondence, setCorrespondence] = useState<Correspondence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/auth" });
    }
  }, [user, authLoading, navigate]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const [mailingsResult, correspondenceResult] = await Promise.all([
      fetchMailingOrders(user.id),
      fetchCorrespondence(user.id),
    ]);

    if (mailingsResult.error || correspondenceResult.error) {
      setError(mailingsResult.error || correspondenceResult.error);
    } else {
      setMailings(mailingsResult.data ?? []);
      setCorrespondence(correspondenceResult.data ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-rule border-t-brass" />
            <p className="mt-4 text-sm text-muted-foreground">Loading your dashboard…</p>
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="eyebrow">My Mailings</div>
            <h1 className="mt-2 font-serif text-2xl sm:text-3xl md:text-4xl">Your correspondence record</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track your immigration mailings and delivery records.
            </p>
          </div>
          <Link to="/workflows/respond-to-notice" className="btn-primary">+ Start a New Case</Link>
        </div>

        {error && <div className="alert alert-error mt-6">{error}</div>}

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total mailings", value: mailings.length },
            { label: "In transit", value: mailings.filter((m) => m.status === "in_transit" || m.status === "pending").length },
            { label: "Delivered", value: mailings.filter((m) => m.status === "delivered").length },
            { label: "Drafts saved", value: correspondence.length },
          ].map((stat) => (
            <div key={stat.label} className="envelope-card p-4 sm:p-5">
              <p className="text-2xl font-serif text-foreground">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Mailings table */}
        <div className="mt-10">
          <h2 className="font-serif text-xl">Mailing History</h2>

          {loading ? (
            <div className="mt-4 flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-rule border-t-brass" />
            </div>
          ) : mailings.length === 0 ? (
            <div className="envelope-card mt-4 empty-state">
              <h3 className="font-serif text-lg text-foreground">No mailings yet</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">Start a workflow to prepare and mail your first correspondence.</p>
              <Link to="/workflows/respond-to-notice" className="btn-primary mt-5">Start a Case</Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {mailings.map((m) => (
                <div key={m.id} className="envelope-card p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground">{m.recipient_name || "Recipient"}</h3>
                        <span className={`badge-base ${
                          m.status === "delivered" || m.status === "completed" ? "badge-success" :
                          m.status === "in_transit" || m.status === "pending" ? "badge-brass" :
                          m.status === "cancelled" ? "badge-amber" : "badge-muted"
                        }`}>{m.status.replace(/_/g, " ")}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatMailMethod(m.mail_method)} · {formatPrice(m.price_cents)} · {formatDate(m.created_date)}
                      </p>
                      {m.tracking_number && (
                        <p className="mt-1 font-mono text-xs text-brass">{m.tracking_number}</p>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground sm:text-right">
                      <p className="text-xs">{m.workflow_id.replace(/-/g, " ")}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Saved drafts */}
        {correspondence.length > 0 && (
          <div className="mt-10">
            <h2 className="font-serif text-xl">Saved Drafts</h2>
            <div className="mt-4 space-y-3">
              {correspondence.map((c) => (
                <div key={c.id} className="envelope-card p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-foreground">{c.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{c.workflow_id.replace(/-/g, " ")} · {formatDate(c.created_date)}</p>
                    </div>
                    <span className={`badge-base ${
                      c.status === "approved" ? "badge-success" :
                      c.status === "pending" ? "badge-brass" : "badge-muted"
                    }`}>{c.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
