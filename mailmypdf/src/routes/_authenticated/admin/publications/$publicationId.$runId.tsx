import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Send, ShieldCheck, TriangleAlert, XCircle } from "lucide-react";
import { useState } from "react";
import {
  approvePublicationRunForAdmin,
  getPublicationRunForAdmin,
  rejectPublicationRunForAdmin,
} from "@/lib/publication-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/publications/$publicationId/$runId")({
  head: () => ({
    meta: [
      { title: "Review Publication — MailMyPDF Studio" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PublicationRunReviewPage,
});

function PublicationRunReviewPage() {
  const { publicationId, runId } = Route.useParams();
  const loadRun = useServerFn(getPublicationRunForAdmin);
  const approveRun = useServerFn(approvePublicationRunForAdmin);
  const rejectRun = useServerFn(rejectPublicationRunForAdmin);
  const [publishing, setPublishing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, refetch } = useSuspenseQuery({
    queryKey: ["publication-run", runId],
    queryFn: () => loadRun({ data: { runId } }),
    retry: false,
  });

  const rendered = data.rendered_json as any;
  const edition = rendered?.edition;
  const verification = edition?.verification;
  const awaitingApproval = data.status === "awaiting_approval";

  async function approve() {
    setPublishing(true);
    setActionError(null);
    try {
      await approveRun({ data: { publicationId, runId, note: note || undefined } });
      await refetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setPublishing(false);
    }
  }

  async function reject() {
    setRejecting(true);
    setActionError(null);
    try {
      await rejectRun({ data: { publicationId, runId, note: note || undefined } });
      await refetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : String(error));
    } finally {
      setRejecting(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <Link to="/admin/publications" className="text-xs text-muted-foreground hover:text-foreground">
        ← Publications
      </Link>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="postmark w-fit">Studio / Publication Review</div>
          <h1 className="mt-3 font-serif text-4xl">{data.subject || edition?.subject || "Untitled edition"}</h1>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="font-mono">{data.edition_id || runId}</span>
            <span>•</span>
            <span className="uppercase">{data.status}</span>
            <span>•</span>
            <span className="uppercase">{data.stage}</span>
          </div>
        </div>

        {verification?.passed ? (
          <span className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800">
            <ShieldCheck className="h-4 w-4" />
            Verification passed
          </span>
        ) : (
          <span className="flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-xs font-semibold text-red-800">
            <TriangleAlert className="h-4 w-4" />
            Verification not passed
          </span>
        )}
      </div>

      {actionError && (
        <div className="mt-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          {actionError}
        </div>
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="envelope-card overflow-hidden">
          <div className="border-b border-rule px-5 py-4">
            <h2 className="font-serif text-xl">Rendered edition</h2>
            <p className="mt-1 text-xs text-muted-foreground">Sandboxed preview of the exact stored HTML artifact.</p>
          </div>
          <iframe
            title="Stored newsletter preview"
            sandbox=""
            srcDoc={rendered?.html || "<p>No rendered HTML available.</p>"}
            className="h-[760px] w-full bg-white"
          />
        </section>

        <aside className="space-y-5">
          <section className="envelope-card p-5">
            <h2 className="font-serif text-xl">Verification</h2>
            <div className="mt-4 space-y-3">
              {verification?.passed ? (
                <div className="flex gap-2 text-sm text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  Draft passed evidence verification.
                </div>
              ) : (
                <p className="text-sm text-red-800">This edition cannot be safely approved.</p>
              )}
              {(verification?.issues ?? []).map((issue: any, index: number) => (
                <div key={index} className="rounded border border-rule p-3 text-xs">
                  <div className="font-semibold uppercase">{issue.severity}</div>
                  <div className="mt-1 text-muted-foreground">{issue.message}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="envelope-card p-5">
            <h2 className="font-serif text-xl">Stories</h2>
            <div className="mt-4 space-y-3">
              {(edition?.plannedStories ?? []).map((planned: any) => (
                <div key={planned.story.id} className="rounded border border-rule p-3">
                  <div className="text-sm font-medium">{planned.story.title}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{planned.section}</div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {planned.evidence?.claims?.length ?? 0} evidence claim{planned.evidence?.claims?.length === 1 ? "" : "s"}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {(data.run_json?.warnings?.length ?? 0) > 0 && (
            <section className="envelope-card p-5">
              <h2 className="font-serif text-xl">Run warnings</h2>
              <div className="mt-3 space-y-2">
                {data.run_json.warnings.map((warning: string, index: number) => (
                  <div key={index} className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                    {warning}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="envelope-card p-5">
            <h2 className="font-serif text-xl">Approval</h2>
            {data.provider_id && (
              <div className="mb-4 rounded-md border border-rule bg-paper-deep p-3 text-xs">
                <div className="font-semibold uppercase tracking-[0.16em] text-muted-foreground">Delivery receipt</div>
                <div className="mt-2 font-mono">{data.provider_id}</div>
                {data.publication_url ? (
                  <a
                    href={data.publication_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block break-all text-cobalt underline-offset-2 hover:underline"
                  >
                    {data.publication_url}
                  </a>
                ) : null}
              </div>
            )}
            {awaitingApproval ? (
              <>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Approval publishes this exact persisted artifact. Discovery and Claude are not rerun.
                </p>
                <label className="mt-4 block text-xs font-medium">
                  Reviewer note
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={1000}
                    rows={3}
                    className="mt-2 w-full rounded-md border border-rule bg-card p-3 text-sm outline-none"
                    placeholder="Optional approval note"
                  />
                </label>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => void reject()}
                    disabled={publishing || rejecting}
                    className="flex items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {rejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    {rejecting ? "Rejecting…" : "Reject"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void approve()}
                    disabled={publishing || rejecting || !verification?.passed}
                    className="flex items-center justify-center gap-2 rounded-md bg-cobalt px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {publishing ? "Publishing…" : "Approve & Publish"}
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-3 rounded-md border border-rule bg-paper-deep p-3 text-sm">
                This run is <strong>{data.status}</strong>
                {data.approved_at ? ` · approved ${new Date(data.approved_at).toLocaleString()}` : ""}.
              </div>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
