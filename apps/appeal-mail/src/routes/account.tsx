import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { User, Shield, Lock, LogOut, Mail, ArrowRight, Loader2, CircleCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account Settings — Appeal Mail" },
      { name: "description", content: "Manage your MailMyPDF account profile, security, and session." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading, isConfigured, signOut, updateProfile } = useAuth();
  const [name, setName] = useState(user?.fullName || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (loading) {
    return (
      <main className="min-h-screen bg-cream">
        <SiteHeader />
        <div className="flex items-center justify-center py-32"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
        <SiteFooter />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-cream">
        <SiteHeader />
        <section className="py-20 md:py-32">
          <div className="container max-w-md text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "color-mix(in oklab, var(--stamp) 10%, transparent)" }}>
              <User size={28} className="text-stamp" />
            </div>
            <h1 className="mt-6 text-2xl font-bold text-ink" style={{ fontFamily: "var(--font-serif)" }}>Sign in to manage your account</h1>
            <p className="mt-3 text-sm text-muted-foreground">You need a MailMyPDF Account to access account settings.</p>
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

  async function handleSave() {
    setSaving(true);
    const { error } = await updateProfile({ fullName: name });
    setSaving(false);
    setMessage(error || "Profile updated.");
    if (!error) setTimeout(() => setMessage(null), 3000);
  }

  return (
    <main className="min-h-screen bg-cream">
      <SiteHeader />
      <section className="border-b border-rule/60 bg-card">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "color-mix(in oklab, var(--stamp) 8%, transparent)" }}>
              <User size={20} className="text-stamp" />
            </div>
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">MailMyPDF Account</div>
              <h1 className="mt-0.5 text-2xl font-bold text-ink" style={{ fontFamily: "var(--font-serif)" }}>Account Settings</h1>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="space-y-6">
          {/* Profile */}
          <div className="rounded-xl border border-rule bg-card p-6">
            <div className="flex items-center gap-2">
              <User size={16} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Profile</h2>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="input-label">Full name</label>
                <input className="input-field mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" disabled={!isConfigured} />
              </div>
              <div>
                <label className="input-label">Email</label>
                <input className="input-field mt-1" value={user!.email || ""} disabled style={{ opacity: 0.6 }} />
              </div>
            </div>
            <button onClick={handleSave} disabled={saving || !isConfigured} className="btn-primary mt-4">
              {saving ? "Saving…" : "Save profile"}
            </button>
            {message && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                <CircleCheck size={14} className="text-stamp" /> {message}
              </p>
            )}
            {!isConfigured && <p className="mt-2 text-xs text-muted-foreground">Account features require MailMyPDF authentication to be configured.</p>}
          </div>

          {/* Account Identity */}
          <div className="rounded-xl border border-rule bg-card p-6">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Account Identity</h2>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "color-mix(in oklab, var(--ink) 8%, transparent)" }}>
                <span className="text-lg font-bold text-ink">{(user!.fullName || user!.email || "?").charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-ink">{user!.fullName || user!.email?.split("@")[0] || "Account holder"}</p>
                <p className="text-xs text-muted-foreground">{user!.email}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Your MailMyPDF Account works across all MailMyPDF products. One login, one identity.
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Shield size={12} className="text-stamp" />
              <span>Appeal Mail is a MailMyPDF product.</span>
            </div>
          </div>

          {/* Role */}
          <div className="rounded-xl border border-rule bg-card p-6">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Role</h2>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="badge badge-info">{user!.role}</span>
              <span className="text-sm text-muted-foreground">
                {user!.role === "admin" || user!.role === "super_admin"
                  ? "You have administrative access."
                  : "Standard customer account."}
              </span>
            </div>
          </div>

          {/* Security */}
          <div className="rounded-xl border border-rule bg-card p-6">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Security</h2>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Your MailMyPDF Account is managed by Supabase Auth. You can reset your password from the sign-in page.
            </p>
            <Link to="/auth" className="btn-outline mt-4">Reset password</Link>
          </div>

          {/* Session */}
          <div className="rounded-xl border border-rule bg-card p-6">
            <div className="flex items-center gap-2">
              <LogOut size={16} className="text-muted-foreground" />
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Session</h2>
            </div>
            <button onClick={() => signOut()} className="btn-outline mt-4">Sign out of MailMyPDF Account</button>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
