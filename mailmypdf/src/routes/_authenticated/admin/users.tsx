import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listAdminProfiles } from "@/lib/admin-users.functions";

export const Route = createFileRoute("/_authenticated/admin/users")({
  head: () => ({ meta: [{ title: "Users — MailMyPDF Studio" }, { name: "robots", content: "noindex" }] }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const load = useServerFn(listAdminProfiles);
  const { data } = useSuspenseQuery({ queryKey: ["admin-users"], queryFn: () => load() });
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const normalized = query.trim().toLowerCase();
  const profiles = useMemo(() => data.profiles.filter((profile) => {
    const matchesRole = role === "all" || profile.role === role;
    const matchesText = !normalized || [profile.id, profile.full_name, profile.company, profile.phone].some((value) => String(value ?? "").toLowerCase().includes(normalized));
    return matchesRole && matchesText;
  }), [data.profiles, normalized, role]);

  return <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-10 lg:py-10">
    <div><div className="postmark w-fit">Studio / Admin</div><h1 className="mt-3 font-serif text-4xl">Users</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Review the latest 100 MailMyPDF profiles and their verified database role. This surface is intentionally read-only: role changes, deletion, and impersonation are not exposed here.</p></div>
    <section className="mt-8 rounded-xl border border-rule bg-card p-5"><div className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end"><label><span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Search loaded profiles</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, company, phone, or UUID" className="mt-2 h-10 w-full rounded-md border border-rule bg-background px-3 text-sm" /></label><label><span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Role</span><select value={role} onChange={(event) => setRole(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-rule bg-background px-3 text-sm"><option value="all">All roles</option><option value="admin">Admin</option><option value="user">User</option></select></label><div className="h-10 rounded-md bg-paper-deep px-4 py-2.5 text-sm text-muted-foreground">{data.total} total profiles</div></div></section>
    <section className="mt-5 overflow-hidden rounded-xl border border-rule bg-card"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-paper-deep text-left text-[10px] uppercase tracking-widest text-muted-foreground"><tr><th className="px-5 py-3">Profile</th><th className="px-5 py-3">Company</th><th className="px-5 py-3">Phone</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Marketing</th><th className="px-5 py-3">Updated</th></tr></thead><tbody className="divide-y divide-rule">{profiles.length === 0 ? <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">No matching profiles.</td></tr> : profiles.map((profile) => <tr key={profile.id} className="hover:bg-paper-deep/40"><td className="px-5 py-4"><div className="font-medium">{profile.full_name || "Unnamed profile"}</div><div className="mt-1 font-mono text-[10px] text-muted-foreground">{profile.id}</div></td><td className="px-5 py-4">{profile.company || "—"}</td><td className="px-5 py-4">{profile.phone || "—"}</td><td className="px-5 py-4"><span className={"rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider " + (profile.role === "admin" ? "bg-cobalt/10 text-cobalt" : "bg-paper-deep text-muted-foreground")}>{profile.role}</span></td><td className="px-5 py-4">{profile.marketing_opt_in ? "Opted in" : "No"}</td><td className="px-5 py-4 font-mono text-xs text-muted-foreground" suppressHydrationWarning>{new Date(profile.updated_at).toLocaleString()}</td></tr>)}</tbody></table></div></section>
    {data.total > data.limit ? <p className="mt-4 text-xs text-muted-foreground">Showing the 100 most recently updated profiles. A future pagination pass can extend this without broadening account privileges.</p> : null}
  </main>;
}