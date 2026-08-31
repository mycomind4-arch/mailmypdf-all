import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { FolderOpen, Mail, Settings, Plus, ChevronRight, Stamp, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/auth";
import { workflows } from "@/domain/workflows";
import { isAuthConfigured } from "@/lib/auth-guard";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "My Cases — Appeal Mail" },
      { name: "description", content: "View your active cases, documents, mailing history, and account." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: DashboardPage,
});

type Tab = "cases" | "mailings" | "account";

function DashboardPage() {
  const { user, loading: authLoading, isConfigured } = useAuth();
  const [tab, setTab] = useState<Tab>("cases");

  if (!authLoading && !user) {
    return (
      <main className="min-h-screen bg-cream">
        <SiteHeader />
        <section className="py-20 md:py-32">
          <div className="container max-w-md text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "color-mix(in oklab, var(--stamp) 10%, transparent)" }}>
              <Stamp size={28} className="text-stamp" />
            </div>
            <h1 className="mt-6 text-2xl font-bold text-ink" style={{ fontFamily: "var(--font-serif)" }}>
              Sign in to your MailMyPDF Account
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Create an account or sign in to save your appeals, track mailings, and keep proof of delivery.
            </p>
            {!isConfigured && (
              <p className="mt-3 rounded-lg border border-info/30 bg-info-bg px-4 py-2 text-xs text-info">
                MailMyPDF Account authentication is being configured. Check back soon.
              </p>
            )}
            <Link to="/auth" className="btn-amber mt-6">Sign in <ArrowRight size={16} /></Link>
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
        <div className="flex items-center justify-center py-32"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
        <SiteFooter />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream">
      <SiteHeader />
      <section className="border-b border-rule/60 bg-card">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">MailMyPDF Account</div>
              <h1 className="mt-1 text-3xl font-bold text-ink" style={{ fontFamily: "var(--font-serif)" }}>
                {user!.fullName || user!.email?.split("@")[0] || "My Dashboard"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{user!.email}</p>
            </div>
            <Link to="/workflows" className="btn-amber"><Plus size={16} /> Start a new appeal</Link>
          </div>
          <div className="mt-6 flex gap-1 border-b border-rule">
            {[
              { key: "cases" as const, label: "Cases", icon: FolderOpen },
              { key: "mailings" as const, label: "Mailings", icon: Mail },
              { key: "account" as const, label: "Account", icon: Settings },
            ].map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key ? "border-stamp text-ink" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                <t.icon size={15} /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {tab === "cases" && <CasesTab />}
        {tab === "mailings" && <MailingsTab />}
        {tab === "account" && <AccountTab />}
      </div>
      <SiteFooter />
    </main>
  );
}

function CasesTab() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Active Cases</h2>
        <span className="font-mono text-xs text-muted-foreground">0 active</span>
      </div>
      <div className="rounded-xl border border-rule bg-card p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted/30"><FolderOpen size={24} className="text-muted-foreground" /></div>
        <h3 className="mt-4 text-base font-semibold text-ink">No cases yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">Start an appeal to create your first case. Upload your decision document and we'll analyze it.</p>
        <Link to="/workflows" className="btn-amber mt-6"><Plus size={16} /> Start your first appeal</Link>
      </div>
      <div className="mt-8">
        <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">Start Something New</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link to="/workflows" className="group flex items-center gap-3 rounded-lg border border-rule bg-card p-4 transition-all hover:border-ink/30 hover:shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "color-mix(in oklab, var(--stamp) 8%, transparent)" }}><Stamp size={18} className="text-stamp" /></div>
            <div className="flex-1"><div className="text-sm font-medium text-ink">Appeal a decision</div><div className="text-xs text-muted-foreground">Insurance, government, court, benefits</div></div>
            <ChevronRight size={16} className="text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-rule bg-muted/20 p-4 opacity-60">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/40"><Mail size={18} className="text-muted-foreground" /></div>
            <div className="flex-1"><div className="text-sm font-medium text-muted-foreground">Respond to a notice</div><div className="text-xs text-muted-foreground/60">Coming soon — Notice Respond</div></div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-rule bg-muted/20 p-4 opacity-60">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/40"><ShieldCheck size={18} className="text-muted-foreground" /></div>
            <div className="flex-1"><div className="text-sm font-medium text-muted-foreground">Other MailMyPDF products</div><div className="text-xs text-muted-foreground/60">Coming soon</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MailingsTab() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">Mailing History</h2>
        <span className="font-mono text-xs text-muted-foreground">0 mailings</span>
      </div>
      <div className="rounded-xl border border-rule bg-card p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted/30"><Mail size={24} className="text-muted-foreground" /></div>
        <h3 className="mt-4 text-base font-semibold text-ink">No mailings yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">When you complete an appeal and send it, your mailing history and tracking will appear here.</p>
      </div>
    </div>
  );
}

function AccountTab() {
  const { user, signOut, updateProfile, isConfigured } = useAuth();
  const [name, setName] = useState(user?.fullName || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    const { error } = await updateProfile({ fullName: name });
    setSaving(false);
    setMessage(error || "Profile updated.");
    if (!error) setTimeout(() => setMessage(null), 3000);
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-ink">Account Settings</h2>
      <p className="mt-1 text-sm text-muted-foreground">Manage your MailMyPDF account.</p>
      <div className="mt-6 space-y-6">
        <div className="rounded-xl border border-rule bg-card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Profile</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="input-label">Full name</label>
              <input className="input-field mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" disabled={!isConfigured} />
            </div>
            <div>
              <label className="input-label">Email</label>
              <input className="input-field mt-1" value={user?.email || ""} disabled style={{ opacity: 0.6 }} />
            </div>
          </div>
          <button onClick={handleSave} disabled={saving || !isConfigured} className="btn-primary mt-4">{saving ? "Saving…" : "Save profile"}</button>
          {message && <p className="mt-3 text-sm text-muted-foreground">{message}</p>}
          {!isConfigured && <p className="mt-2 text-xs text-muted-foreground">Account features require MailMyPDF authentication to be configured.</p>}
        </div>
        <div className="rounded-xl border border-rule bg-card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Role</h3>
          <div className="mt-3 flex items-center gap-3">
            <span className="badge badge-info">{user?.role}</span>
            <span className="text-sm text-muted-foreground">{user?.role === "admin" || user?.role === "super_admin" ? "You have administrative access." : "Standard customer account."}</span>
          </div>
        </div>
        <div className="rounded-xl border border-rule bg-card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Security</h3>
          <p className="mt-3 text-sm text-muted-foreground">Your MailMyPDF Account is managed by Supabase Auth. You can reset your password from the sign-in page.</p>
          <Link to="/auth" className="btn-outline mt-4">Reset password</Link>
        </div>
        <div className="rounded-xl border border-rule bg-card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Session</h3>
          <button onClick={() => signOut()} className="btn-outline mt-4">Sign out of MailMyPDF Account</button>
        </div>
      </div>
    </div>
  );
}
