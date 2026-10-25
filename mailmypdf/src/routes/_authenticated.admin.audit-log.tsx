import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, Search } from "lucide-react";

import { authenticatedHeaders } from "@/lib/authenticated-client";
import { listAuditLog } from "@/lib/entitlements-management.functions";

export const Route = createFileRoute("/_authenticated/admin/audit-log")({
  head: () => ({
    meta: [
      { title: "Audit Log — MailMyPDF Studio" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminAuditLogPage,
});

const PAGE_SIZE = 50;

const ACTION_OPTIONS = [
  ["policy_created", "Policy Created"],
  ["policy_updated", "Policy Updated"],
  ["assignment_created", "Assignment Created"],
  ["assignment_updated", "Assignment Updated"],
  ["assignment_expired", "Assignment Expired"],
  ["quote_created", "Quote Created"],
  ["quote_accepted", "Quote Accepted"],
  ["quote_expired", "Quote Expired"],
  ["quote_reversed", "Quote Reversed"],
  ["org_created", "Organization Created"],
  ["member_added", "Member Added"],
  ["member_removed", "Member Removed"],
] as const;

const RESOURCE_OPTIONS = [
  ["policy", "Policy"],
  ["assignment", "Assignment"],
  ["quote", "Quote"],
  ["organization", "Organization"],
  ["member", "Member"],
] as const;

type AuditRow = {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  reason: string | null;
  created_at: string;
  actor_user_id: string | null;
};

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function AdminAuditLogPage() {
  const loadAudit = useServerFn(listAuditLog);
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await loadAudit({
        headers: await authenticatedHeaders(),
        data: {
          ...(action ? { action: action as (typeof ACTION_OPTIONS)[number][0] } : {}),
          ...(resourceType
            ? { resourceType: resourceType as (typeof RESOURCE_OPTIONS)[number][0] }
            : {}),
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        },
      });
      if (!result.success) throw new Error(result.error || "Unable to load audit entries.");
      setLogs((result.logs ?? []) as AuditRow[]);
    } catch (cause) {
      setLogs([]);
      setError(cause instanceof Error ? cause.message : "Unable to load audit entries.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [action, resourceType, page]);

  const filteredLogs = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) return logs;
    return logs.filter((row) =>
      [row.action, row.resource_type, row.resource_id, row.reason, row.actor_user_id]
        .some((value) => String(value ?? "").toLowerCase().includes(needle)),
    );
  }, [logs, searchTerm]);

  function resetFilters() {
    setAction("");
    setResourceType("");
    setSearchTerm("");
    setPage(0);
  }

  function exportCurrentPage() {
    if (filteredLogs.length === 0) return;
    const rows = [
      ["timestamp", "action", "resource_type", "resource_id", "actor_user_id", "reason"],
      ...filteredLogs.map((row) => [
        row.created_at,
        row.action,
        row.resource_type,
        row.resource_id ?? "",
        row.actor_user_id ?? "",
        row.reason ?? "",
      ]),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `mailmypdf-admin-audit-page-${page + 1}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="postmark w-fit">Studio / Admin</div>
          <h1 className="mt-3 font-serif text-4xl">Audit Log</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Review your administrator activity for entitlement, quote, organization, and membership changes.
            Authorization is verified server-side against the canonical admin role.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-rule bg-card px-4 py-2 text-xs font-semibold disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <section className="mt-8 envelope-card p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.4fr_auto] lg:items-end">
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Action
            </span>
            <select
              value={action}
              onChange={(event) => {
                setAction(event.target.value);
                setPage(0);
              }}
              className="mt-2 h-10 w-full rounded-md border border-rule bg-background px-3 text-sm"
            >
              <option value="">All actions</option>
              {ACTION_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Resource
            </span>
            <select
              value={resourceType}
              onChange={(event) => {
                setResourceType(event.target.value);
                setPage(0);
              }}
              className="mt-2 h-10 w-full rounded-md border border-rule bg-background px-3 text-sm"
            >
              <option value="">All resources</option>
              {RESOURCE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Filter loaded page
            </span>
            <span className="relative mt-2 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Reason, resource, action…"
                className="h-10 w-full rounded-md border border-rule bg-background pl-9 pr-3 text-sm"
              />
            </span>
          </label>

          <button
            type="button"
            onClick={resetFilters}
            disabled={!action && !resourceType && !searchTerm && page === 0}
            className="h-10 rounded-md border border-rule px-4 text-sm disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </section>

      {error ? (
        <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <section className="mt-5 envelope-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-4">
          <div>
            <h2 className="font-serif text-xl">Administrator activity</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Page {page + 1} · up to {PAGE_SIZE} server-authorized records per page
            </p>
          </div>
          <button
            type="button"
            onClick={exportCurrentPage}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-2 rounded-full border border-rule px-4 py-2 text-xs font-semibold disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            Export shown rows
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-paper-deep text-[10px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Resource</th>
                <th className="px-5 py-3">Resource ID</th>
                <th className="px-5 py-3">Actor</th>
                <th className="px-5 py-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule/70">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">Loading audit activity…</td></tr>
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">No matching audit activity on this page.</td></tr>
              ) : filteredLogs.map((row) => (
                <tr key={row.id} className="align-top hover:bg-paper-deep/40">
                  <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-muted-foreground" suppressHydrationWarning>
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="px-5 py-4"><span className="rounded-full border border-rule px-2 py-1 font-mono text-[10px]">{row.action}</span></td>
                  <td className="px-5 py-4">{row.resource_type}</td>
                  <td className="max-w-[190px] truncate px-5 py-4 font-mono text-xs text-muted-foreground" title={row.resource_id ?? ""}>{row.resource_id ?? "—"}</td>
                  <td className="max-w-[190px] truncate px-5 py-4 font-mono text-xs text-muted-foreground" title={row.actor_user_id ?? ""}>{row.actor_user_id ?? "—"}</td>
                  <td className="max-w-md px-5 py-4 text-muted-foreground">{row.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setPage((value) => Math.max(0, value - 1))}
          disabled={page === 0 || loading}
          className="rounded-full border border-rule px-4 py-2 text-xs font-semibold disabled:opacity-40"
        >
          ← Previous
        </button>
        <span className="text-xs text-muted-foreground">
          {logs.length} record{logs.length === 1 ? "" : "s"} loaded
        </span>
        <button
          type="button"
          onClick={() => setPage((value) => value + 1)}
          disabled={loading || logs.length < PAGE_SIZE}
          className="rounded-full border border-rule px-4 py-2 text-xs font-semibold disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </main>
  );
}
