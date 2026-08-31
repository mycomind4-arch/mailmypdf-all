import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import {
  getAdminOrder,
  getAdminPdfUrl,
  updateOrderStatus,
  addAdminNote,
  submitOrderToLobFn,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/orders/$id")({
  head: () => ({ meta: [{ title: "Order — Admin" }, { name: "robots", content: "noindex" }] }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Link to="/admin" className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground">← Back to queue</Link>
        <Suspense fallback={<div className="mt-6 text-sm text-muted-foreground">Loading order…</div>}>
          <Body id={id} />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

function Body({ id }: { id: string }) {
  const fetchOrder = useServerFn(getAdminOrder);
  const signPdf = useServerFn(getAdminPdfUrl);
  const updateStatus = useServerFn(updateOrderStatus);
  const saveNote = useServerFn(addAdminNote);
  const submitLob = useServerFn(submitOrderToLobFn);
  const router = useRouter();
  const qc = useQueryClient();

  const { data } = useSuspenseQuery({
    queryKey: ["admin-order", id],
    queryFn: () => fetchOrder({ data: { id } }),
  });
  const { order, events } = data;
  const [notes, setNotes] = useState(order.admin_notes ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function act(action: "mark_in_progress" | "mark_mailed" | "mark_failed") {
    setBusy(true); setErr(null);
    try {
      let note: string | undefined;
      if (action === "mark_failed") {
        const n = window.prompt("Reason for failure (required, visible internally):") ?? "";
        if (!n.trim()) {
          setBusy(false);
          setErr("A reason is required to mark an order as failed.");
          return;
        }
        note = n.trim();
      }
      if (action === "mark_mailed" && !window.confirm("Confirm: this order has been printed and dropped in the mail?")) {
        setBusy(false);
        return;
      }
      await updateStatus({ data: { id, action, note } });
      await qc.invalidateQueries({ queryKey: ["admin-order", id] });
      await qc.invalidateQueries({ queryKey: ["admin-queue"] });
      router.invalidate();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }

  async function download() {
    const r = await signPdf({ data: { id } });
    window.open(r.url, "_blank");
  }

  async function sendToLob() {
    if (!window.confirm("Submit this order to Lob for automated printing & mailing?")) return;
    setBusy(true); setErr(null);
    try {
      const r = await submitLob({ data: { id } });
      if (!r.ok) { setErr(r.error); return; }
      await qc.invalidateQueries({ queryKey: ["admin-order", id] });
      await qc.invalidateQueries({ queryKey: ["admin-queue"] });
      router.invalidate();
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }

  async function persistNotes() {
    setBusy(true); setErr(null);
    try { await saveNote({ data: { id, notes } }); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }

  const lobLetterId = (order as { lob_letter_id?: string | null }).lob_letter_id ?? null;
  const canSubmitToLob = !lobLetterId && ["paid_pending_manual_fulfillment", "failed_fulfillment", "failed_provider_submission"].includes(order.status);

  return (
    <>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <div className="postmark w-fit">Order #{order.id.slice(0, 8).toUpperCase()}</div>
          <h1 className="mt-3 font-serif text-3xl">{order.recipient_name}</h1>
          <div className="mt-1 font-mono text-xs text-muted-foreground">Status: {order.status}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={download} className="rounded-full border border-ink px-3 py-1.5 text-xs hover:bg-ink hover:text-paper">Download PDF</button>
          {canSubmitToLob && (
            <button disabled={busy} onClick={sendToLob} className="rounded-full bg-ink px-3 py-1.5 text-xs text-paper hover:opacity-90 disabled:opacity-50">
              Submit to Lob
            </button>
          )}
          <button disabled={busy} onClick={() => act("mark_in_progress")} className="rounded-full border border-ink px-3 py-1.5 text-xs hover:bg-ink hover:text-paper disabled:opacity-50">Mark In Progress</button>
          <button disabled={busy} onClick={() => act("mark_mailed")} className="rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50">Mark as Mailed</button>
          <button disabled={busy} onClick={() => act("mark_failed")} className="rounded-full border border-red-700 px-3 py-1.5 text-xs text-red-700 hover:bg-red-700 hover:text-white disabled:opacity-50">Mark Failed</button>
        </div>
      </div>
      {lobLetterId && (
        <div className="mt-3 font-mono text-xs text-muted-foreground">Lob letter: {lobLetterId}</div>
      )}
      {err && <div className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</div>}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="envelope-card p-6">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Customer</div>
          <div className="mt-1 text-sm">{order.email}</div>
          <div className="mt-4 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Document</div>
          <div className="mt-1 text-sm">{order.file_name} · {order.page_count} pages · {(order.file_size_bytes / 1024).toFixed(0)} KB</div>
          <div className="mt-4 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Payment</div>
          <div className="mt-1 text-sm">${(order.price_cents / 100).toFixed(2)} · paid {order.paid_at ? new Date(order.paid_at).toLocaleString() : "—"}</div>
        </div>
        <div className="envelope-card p-6">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">From</div>
          <address className="mt-1 not-italic text-sm">
            {order.sender_name}<br />
            {order.sender_line1}{order.sender_line2 ? <>, {order.sender_line2}</> : null}<br />
            {order.sender_city}, {order.sender_state} {order.sender_postal}
          </address>
          <div className="mt-4 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">To</div>
          <address className="mt-1 not-italic text-sm">
            {order.recipient_name}<br />
            {order.recipient_line1}{order.recipient_line2 ? <>, {order.recipient_line2}</> : null}<br />
            {order.recipient_city}, {order.recipient_state} {order.recipient_postal}
          </address>
        </div>
      </div>

      <div className="mt-6 envelope-card p-6">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Admin notes</div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
          className="mt-2 w-full rounded-md border border-rule bg-paper px-3 py-2 text-sm" />
        <button onClick={persistNotes} disabled={busy}
          className="mt-2 rounded-full border border-ink px-3 py-1.5 text-xs hover:bg-ink hover:text-paper disabled:opacity-50">
          Save note
        </button>
      </div>

      <div className="mt-6 envelope-card p-6">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Timeline</div>
        <ol className="mt-3 space-y-3">
          {events.map((e, i) => (
            <li key={i} className="relative pl-5">
              <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-stamp" />
              <div className="text-sm">{e.label} <span className="text-muted-foreground">· {e.type}</span></div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground" suppressHydrationWarning>
                {new Date(e.created_at).toLocaleString()}
              </div>
              {e.metadata && typeof (e.metadata as Record<string, unknown>).note === "string" && (
                <div className="mt-1 text-xs text-muted-foreground">Note: {(e.metadata as { note: string }).note}</div>
              )}
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
