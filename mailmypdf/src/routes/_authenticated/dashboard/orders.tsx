import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, useState } from "react";
import { getUserOrders } from "@/lib/user.functions";

export const Route = createFileRoute("/_authenticated/dashboard/orders")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: () => (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <OrdersPage />
    </Suspense>
  ),
});

const STATUSES = [
  "all",
  "paid",
  "submitted_to_provider",
  "provider_processing",
  "mailed",
  "in_transit",
  "delivered",
  "failed",
  "returned",
];

function OrdersPage() {
  const getOrders = useServerFn(getUserOrders);
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const { data } = useSuspenseQuery({
    queryKey: ["user-orders", status, page],
    queryFn: () => getOrders({ data: { status, page, limit: 10 } }),
  });

  const statusColors: Record<string, string> = {
    mailed: "text-emerald-700",
    in_transit: "text-emerald-700",
    delivered: "text-emerald-800",
    paid: "text-blue-700",
    failed: "text-red-700",
    returned: "text-red-700",
  };

  return (
    <div className="space-y-4">
      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              status === s
                ? "border-cobalt bg-cobalt text-white"
                : "border-rule text-muted-foreground hover:border-cobalt hover:text-foreground"
            }`}
          >
            {s === "all" ? "All" : s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Orders table */}
      <div className="envelope-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-paper-deep text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-left">Recipient</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {data.orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No orders found. {status !== "all" && "Try a different filter."}
                </td>
              </tr>
            )}
            {data.orders.map((o: any) => (
              <tr key={o.id} className="border-t border-rule/60">
                <td className="px-4 py-3 font-mono text-xs">
                  {new Date(o.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="truncate max-w-[200px]">
                    {o.letter_text ? `Letter: ${o.letter_text.slice(0, 40)}…` : o.file_name}
                  </div>
                  {o.vertical_slug && (
                    <span className="text-[10px] text-muted-foreground">{o.vertical_slug}</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {o.recipient_city}, {o.recipient_state}
                </td>
                <td className="px-4 py-3 text-right">${(o.price_cents / 100).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-mono ${statusColors[o.status] ?? "text-muted-foreground"}`}
                  >
                    {o.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to="/orders/$id"
                    params={{ id: o.id }}
                    search={{ token: o.lookup_token, paid: o.status !== "draft" }}
                    className="rounded-full border border-cobalt px-3 py-1 text-xs hover:bg-cobalt hover:text-white"
                  >
                    Track
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Page {data.page} of {data.totalPages} · {data.total} orders
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded border border-rule px-3 py-1 text-xs disabled:opacity-40"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page >= data.totalPages}
              className="rounded border border-rule px-3 py-1 text-xs disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
