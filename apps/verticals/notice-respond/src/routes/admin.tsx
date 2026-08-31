import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Notice Respond" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { user, accessToken, loading, isConfigured } = useAuth();
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !user || (user.role !== "admin" && user.role !== "super_admin")) return;
    void fetch("/api/admin/health", { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || `Admin request failed (${response.status})`);
        setHealth(payload);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load admin health."));
  }, [accessToken, user]);

  if (loading) return <Page><p className="text-sm text-muted-foreground">Loading MailMyPDF Account…</p></Page>;
  if (!isConfigured || !user) return <Page><h1 className="font-serif text-4xl">Sign in to continue.</h1><p className="mt-3 text-sm text-muted-foreground">Admin access requires a MailMyPDF Account.</p><Link to="/auth" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">Sign in</Link></Page>;
  if (user.role !== "admin" && user.role !== "super_admin") return <Page><h1 className="font-serif text-4xl">Administrative access required.</h1><p className="mt-3 text-sm text-muted-foreground">Your MailMyPDF Account does not have an administrative role.</p><Link to="/dashboard" className="mt-6 inline-flex rounded-full border border-input px-6 py-3 text-sm font-medium">Back to my cases</Link></Page>;

  return <Page><div className="postmark w-fit">MailMyPDF Admin</div><h1 className="mt-4 font-serif text-4xl">Notice Respond operations</h1><p className="mt-2 text-sm text-muted-foreground">Server-authorized platform health for the Notice Respond vertical.</p>{error && <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}<div className="mt-8 grid gap-4 md:grid-cols-2"><Metric label="Workflows registered" value={String(health?.workflowsRegistered ?? "—")} /><Metric label="MailMyPDF configured" value={health?.mailmypdf_configured ? "Yes" : "No"} /><Metric label="Control plane configured" value={health?.control_plane_configured ? "Yes" : "No"} /><Metric label="Stripe configured" value={health?.stripe_configured ? "Yes" : "No"} /></div></Page>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-rule bg-card p-6"><div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div><div className="mt-2 text-2xl font-serif">{value}</div></div>; }
function Page({ children }: { children: ReactNode }) { return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-5xl px-6 py-12">{children}</main><SiteFooter /></div>; }
