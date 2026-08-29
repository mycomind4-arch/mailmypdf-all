import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Shield, ShieldCheck, AlertCircle, Loader2, Stamp, Mail, FileText, PackageCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/auth";
import { workflows } from "@/domain/workflows";
import { isAuthConfigured } from "@/lib/auth-guard";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Appeal Mail" },
      { name: "description", content: "Administrative dashboard for Appeal Mail." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [adminData, setAdminData] = useState<null | { ok: boolean; system?: Record<string, unknown> }>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  useEffect(() => {
    if (!user || !isAdmin) return;
    setAdminLoading(true);
    setAdminError(null);

    // Fetch admin health data — this requires a valid session token
    // The server-side check is the real security boundary
    fetch("/api/admin/health", {
      headers: {
        // The browser Supabase client sends the session token via cookies
        // The server reads it from the Authorization header
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Access denied (${res.status})`);
        }
        return res.json();
      })
      .then((data) => setAdminData(data))
      .catch((err) => setAdminError(err.message))
      .finally(() => setAdminLoading(false));
  }, [user, isAdmin]);

  // Not authenticated
  if (!authLoading && !user) {
    return (
      <main className="min-h-screen bg-cream">
        <SiteHeader />
        <section className="py-20 md:py-32">
          <div className="container max-w-md text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "color-mix(in oklab, var(--ink) 8%, transparent)" }}>
              <Shield size={28} className="text-ink" />
            </div>
            <h1 className="mt-6 text-2xl font-bold text-ink" style={{ fontFamily: "var(--font-serif)" }}>Admin access required</h1>
            <p className="mt-3 text-sm text-muted-foreground">Sign in with an admin MailMyPDF Account to access this page.</p>
            <Link to="/auth" className="btn-primary mt-6">Sign in</Link>
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  // Not admin
  if (!authLoading && user && !isAdmin) {
    return (
      <main className="min-h-screen bg-cream">
        <SiteHeader />
        <section className="py-20 md:py-32">
          <div className="container max-w-md text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "color-mix(in oklab, var(--destructive) 8%, transparent)" }}>
              <AlertCircle size={28} className="text-destructive" />
            </div>
            <h1 className="mt-6 text-2xl font-bold text-ink" style={{ fontFamily: "var(--font-serif)" }}>Access denied</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Your MailMyPDF Account does not have administrative access.
              This incident is logged.
            </p>
            <Link to="/dashboard" className="btn-outline mt-6">Back to dashboard</Link>
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  if (authLoading) {
    return (
      <main className="min-h-screen bg-cream">
        <SiteHeader />
        <div className="flex items-center justify-center py-32"><div className="text-sm text-muted-foreground">Loading…</div></div>
        <SiteFooter />
      </main>
    );
  }

  const workflowCount = Object.keys(workflows).length;
  const authConfigured = isAuthConfigured();

  return (
    <main className="min-h-screen bg-cream">
      <SiteHeader />
      <section className="border-b border-rule/60 bg-card">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex items-center gap-3">
            <ShieldCheck size={24} className="text-stamp" />
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">MailMyPDF Admin</div>
              <h1 className="text-2xl font-bold text-ink" style={{ fontFamily: "var(--font-serif)" }}>Appeal Mail — System Health</h1>
            </div>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-ink">{user?.email}</span> ({user?.role})
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {adminLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Loading system status…</div>
        )}

        {adminError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertCircle size={16} className="inline mr-2" /> {adminError}
          </div>
        )}

        {adminData?.system && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard icon={Stamp} label="Workflows" value={String(workflowCount)} status="ok" />
            <StatCard icon={Shield} label="Auth Configured" value={authConfigured ? "Yes" : "No"} status={authConfigured ? "ok" : "warning"} />
            <StatCard icon={FileText} label="Supabase URL" value={adminData.system.supabase_url_set ? "Set" : "Missing"} status={adminData.system.supabase_url_set ? "ok" : "error"} />
            <StatCard icon={ShieldCheck} label="Service Role Key" value={adminData.system.service_role_set ? "Set" : "Missing"} status={adminData.system.service_role_set ? "ok" : "error"} />
            <StatCard icon={PackageCheck} label="Stripe" value={adminData.system.stripe_configured ? "Configured" : "Not configured"} status={adminData.system.stripe_configured ? "ok" : "warning"} />
            <StatCard icon={Mail} label="Control Plane" value={adminData.system.control_plane_configured ? "Connected" : "Not connected"} status={adminData.system.control_plane_configured ? "ok" : "warning"} />
          </div>
        )}

        {!authConfigured && (
          <div className="mt-6 rounded-lg border border-warning/30 bg-warning-bg p-4">
            <h3 className="text-sm font-semibold text-warning">Authentication Not Configured</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              MailMyPDF Account authentication requires Supabase environment variables.
              Set <code className="font-mono text-xs">VITE_SUPABASE_URL</code>,{" "}
              <code className="font-mono text-xs">VITE_SUPABASE_ANON_KEY</code>, and{" "}
              <code className="font-mono text-xs">SUPABASE_SERVICE_ROLE_KEY</code> in the Cloudflare Pages project settings.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Until these are configured, account features (signup, login, case saving) will show a configuration notice.
            </p>
          </div>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}

function StatCard({ icon: Icon, label, value, status }: {
  icon: typeof Stamp;
  label: string;
  value: string;
  status: "ok" | "warning" | "error";
}) {
  const colors = {
    ok: "text-success",
    warning: "text-warning",
    error: "text-destructive",
  };
  return (
    <div className="rounded-xl border border-rule bg-card p-5">
      <div className="flex items-center justify-between">
        <Icon size={18} className="text-muted-foreground" />
        <span className={`h-2 w-2 rounded-full ${status === "ok" ? "bg-success" : status === "warning" ? "bg-warning" : "bg-destructive"}`} />
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${colors[status]}`}>{value}</p>
    </div>
  );
}
