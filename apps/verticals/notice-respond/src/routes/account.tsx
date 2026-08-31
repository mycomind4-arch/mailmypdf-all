import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "MailMyPDF Account — Notice Respond" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading, isConfigured, updateProfile, signOut } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-3xl px-6 py-24 text-center"><p className="text-sm text-muted-foreground">Loading MailMyPDF Account…</p></main><SiteFooter /></div>;
  if (!isConfigured || !user) return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-3xl px-6 py-24 text-center"><div className="postmark mx-auto w-fit">MailMyPDF Account</div><h1 className="mt-6 font-serif text-4xl">Sign in to manage your account.</h1><p className="mt-3 text-sm text-muted-foreground">Your Notice Respond cases and documents are tied to your MailMyPDF Account.</p><Link to="/auth" className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground">Sign in</Link></main><SiteFooter /></div>;

  const save = async () => {
    setMessage(null); setError(null);
    const result = await updateProfile({ fullName: fullName.trim() || undefined });
    if (result.error) setError(result.error); else setMessage("Account profile updated.");
  };

  return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-3xl px-6 py-12"><div className="postmark w-fit">MailMyPDF Account</div><h1 className="mt-4 font-serif text-4xl">Account settings</h1><p className="mt-2 text-sm text-muted-foreground">One account across the MailMyPDF ecosystem.</p><section className="mt-8 rounded-2xl border border-rule bg-card p-6"><h2 className="font-serif text-xl">Profile</h2><label className="input-label mt-5">Email</label><input className="input-field" value={user.email} disabled /><label className="input-label mt-4">Name</label><input className="input-field" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />{error && <p className="mt-4 text-sm text-red-700">{error}</p>}{message && <p className="mt-4 text-sm text-emerald-700">{message}</p>}<button type="button" onClick={save} className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">Save profile</button></section><section className="mt-6 rounded-2xl border border-rule bg-card p-6"><h2 className="font-serif text-xl">Product access</h2><p className="mt-2 text-sm text-muted-foreground">Notice Respond is a MailMyPDF product. The same account can be used across the ecosystem.</p><Link to="/dashboard" className="mt-4 inline-flex rounded-full border border-input px-5 py-2.5 text-sm font-medium">View my cases</Link></section><section className="mt-6 rounded-2xl border border-rule bg-card p-6"><h2 className="font-serif text-xl">Security</h2><p className="mt-2 text-sm text-muted-foreground">Use sign out to invalidate the current authenticated session on this device.</p><button type="button" onClick={() => void signOut()} className="mt-4 rounded-full border border-red-200 px-5 py-2.5 text-sm font-medium text-red-700">Sign out</button></section></main><SiteFooter /></div>;
}
