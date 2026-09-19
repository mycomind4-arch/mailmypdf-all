import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUserProfile, updateUserProfile } from "@/lib/user.functions";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: () => (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <SettingsPage />
    </Suspense>
  ),
});

function SettingsPage() {
  const getProfile = useServerFn(getUserProfile);
  const saveProfile = useServerFn(updateUserProfile);
  const { data: profile } = useSuspenseQuery({
    queryKey: ["user-profile"],
    queryFn: () => getProfile(),
  });

  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone);
  const [company, setCompany] = useState(profile.company);
  const [marketingOptIn, setMarketingOptIn] = useState(profile.marketingOptIn);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveProfile({ data: { fullName, phone, company, marketingOptIn } });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);
    if (newPassword.length < 8) {
      setPasswordMsg("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg("Passwords don't match.");
      return;
    }
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);
    if (error) {
      setPasswordMsg(error.message);
    } else {
      setPasswordMsg("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  return (
    <div className="space-y-8">
      {/* Profile settings */}
      <div className="envelope-card p-6">
        <h3 className="font-serif text-lg">Profile</h3>
        <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Email</label>
            <input
              type="email"
              value={profile.email}
              disabled
              className="mt-1 w-full rounded-md border border-rule bg-paper-deep px-3 py-2 text-sm text-muted-foreground"
            />
            <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed. Contact support if needed.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Company / Organization</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="mt-1 w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
              className="h-4 w-4 rounded border-rule"
            />
            <span className="text-sm">Send me product updates and tips</span>
          </label>
          {error && <div className="text-sm text-red-700">{error}</div>}
          {saved && <div className="text-sm text-emerald-700">Profile saved.</div>}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-cobalt px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>

      {/* Password change */}
      <div className="envelope-card p-6">
        <h3 className="font-serif text-lg">Change Password</h3>
        <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">New password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground">Confirm password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm"
              />
            </div>
          </div>
          {passwordMsg && (
            <div className={`text-sm ${passwordMsg.includes("success") ? "text-emerald-700" : "text-red-700"}`}>
              {passwordMsg}
            </div>
          )}
          <button
            type="submit"
            disabled={passwordSaving}
            className="inline-flex items-center gap-2 rounded-full bg-cobalt px-5 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {passwordSaving ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <h3 className="font-serif text-lg text-red-900">Account</h3>
        <p className="mt-2 text-sm text-red-800">
          Your account is linked to all orders placed with this email address.
          Signing out won't affect your orders — you can always sign back in.
        </p>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/";
          }}
          className="mt-4 rounded-full border border-red-300 px-5 py-2 text-sm text-red-700 hover:bg-red-100"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
