import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, CircleAlert, Loader2, Newspaper, Play, ShieldCheck } from "lucide-react";
import { useState } from "react";
import {
  listPublicationsForAdmin,
  runPublicationPreviewForAdmin,
} from "@/lib/publication-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/publications")({
  head: () => ({
    meta: [
      { title: "Publications — MailMyPDF Studio" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PublicationsPage,
});

function StatusDot({ ready }: { ready: boolean }) {
  return ready ? (
    <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Configured" />
  ) : (
    <CircleAlert className="h-4 w-4 text-amber-600" aria-label="Not configured" />
  );
}

function PublicationsPage() {
  const listPublications = useServerFn(listPublicationsForAdmin);
  const runPreview = useServerFn(runPublicationPreviewForAdmin);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const { data, refetch } = useSuspenseQuery({
    queryKey: ["studio-publications"],
    queryFn: () => listPublications(),
    retry: false,
  });

  async function startPreview(publicationId: string) {
    setRunningId(publicationId);
    setRunError(null);
    try {
      const result = await runPreview({ data: { publicationId } });
      await refetch();
      window.location.href = `/admin/publications/${publicationId}/${result.runId}`;
    } catch (error) {
      setRunError(error instanceof Error ? error.message : String(error));
      setRunningId(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="postmark w-fit">Studio / Publications</div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl">Autonomous Publications</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Research, evidence, drafting, verification, approval, delivery, and learning from one controlled publishing pipeline.
          </p>
        </div>
        <div className="rounded-full border border-rule bg-card px-4 py-2 text-xs text-muted-foreground">
          {data.publications.length} publication{data.publications.length === 1 ? "" : "s"}
        </div>
      </div>

      {!data.persistenceReady && (
        <div className="mt-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Publication persistence is not deployed yet. Apply the autonomous-publications Supabase migration before running previews.
        </div>
      )}

      {runError && (
        <div className="mt-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          {runError}
        </div>
      )}

      <div className="mt-8 space-y-6">
        {data.publications.map((publication) => {
          const deliveryReady =
            (publication.integrations.resend.enabled && publication.integrations.resend.configured) ||
            (publication.integrations.listmonk.enabled && publication.integrations.listmonk.configured);
          const productionReady =
            publication.ai.configured &&
            (!publication.integrations.horizon.enabled || publication.integrations.horizon.configured) &&
            (!publication.integrations.crawl4ai.enabled || publication.integrations.crawl4ai.configured) &&
            deliveryReady;
          const recentRuns = data.runs
            .filter((run: any) => run.publication_id === publication.id)
            .slice(0, 5);

          return (
            <section key={publication.id} className="envelope-card overflow-hidden">
              <div className="border-b border-rule px-6 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md border border-rule bg-paper-deep">
                      <Newspaper className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-serif text-2xl">{publication.name}</h2>
                      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{publication.audience}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-rule px-3 py-1 uppercase tracking-wider">
                      {publication.status}
                    </span>
                    <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${productionReady ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
                      {productionReady ? <ShieldCheck className="h-3.5 w-3.5" /> : <CircleAlert className="h-3.5 w-3.5" />}
                      {productionReady ? "Production wired" : "Setup incomplete"}
                    </span>
                    <button
                      type="button"
                      disabled={!data.persistenceReady || !publication.ai.configured || runningId !== null}
                      onClick={() => void startPreview(publication.id)}
                      className="flex items-center gap-2 rounded-full bg-cobalt px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {runningId === publication.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                      {runningId === publication.id ? "Running…" : "Run Preview"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-px bg-rule md:grid-cols-4">
                <Metric label="Schedule" value={`${publication.schedule.frequency} · ${publication.schedule.time ?? "manual"}`} />
                <Metric label="Stories" value={String(publication.editorial.storyCount)} />
                <Metric label="Minimum score" value={String(publication.editorial.minimumStoryScore)} />
                <Metric label="Repeat window" value={`${publication.editorial.avoidRepeatDays} days`} />
              </div>

              <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_.8fr]">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Editorial system</h3>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">Claude</dt>
                      <dd className="mt-1 flex items-center gap-2 font-mono text-xs">
                        <StatusDot ready={publication.ai.configured} />
                        {publication.ai.model}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Publishing</dt>
                      <dd className="mt-1 text-xs">{publication.autonomy.publish === "approval_required" ? "Human approval required" : "Automatic"}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-muted-foreground">Sections</dt>
                      <dd className="mt-2 flex flex-wrap gap-1.5">
                        {publication.editorial.sections.map((section) => (
                          <span key={section} className="rounded border border-rule bg-paper-deep px-2 py-1 text-[11px]">{section}</span>
                        ))}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-muted-foreground">Sources</dt>
                      <dd className="mt-2 space-y-1.5">
                        {publication.sources.map((source) => (
                          <div key={source.id} className="flex items-center justify-between rounded border border-rule/70 px-3 py-2 text-xs">
                            <span>{source.publisher}</span>
                            <span className="font-mono text-[10px] uppercase text-muted-foreground">{source.type}</span>
                          </div>
                        ))}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-6">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Recent runs</h3>
                    <div className="mt-3 space-y-2">
                      {recentRuns.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No persisted runs yet.</p>
                      ) : recentRuns.map((run: any) => (
                        <Link
                          key={run.run_id}
                          to="/admin/publications/$publicationId/$runId"
                          params={{ publicationId: publication.id, runId: run.run_id }}
                          className="flex items-center justify-between rounded border border-rule px-3 py-2 text-xs hover:bg-paper-deep"
                        >
                          <span className="min-w-0 truncate">{run.subject || run.edition_id || run.run_id}</span>
                          <span className="ml-3 shrink-0 font-mono text-[10px] uppercase text-muted-foreground">{run.status}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Production services</h3>
                  <div className="mt-4 space-y-2">
                    <ServiceRow name="Horizon" enabled={publication.integrations.horizon.enabled} ready={publication.integrations.horizon.configured} />
                    <ServiceRow name="Crawl4AI" enabled={publication.integrations.crawl4ai.enabled} ready={publication.integrations.crawl4ai.configured} />
                    <ServiceRow name="Semantic memory" enabled={publication.integrations.embeddings.enabled} ready={publication.integrations.embeddings.configured} />
                    <ServiceRow name="Resend" enabled={publication.integrations.resend.enabled} ready={publication.integrations.resend.configured} />
                    <ServiceRow name="listmonk" enabled={publication.integrations.listmonk.enabled} ready={publication.integrations.listmonk.configured} />
                    <ServiceRow name="Umami" enabled={publication.integrations.umami.enabled} ready={publication.integrations.umami.configured} />
                  </div>

                  <div className="mt-5 rounded-md border border-rule bg-paper-deep p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Project</div>
                    <div className="mt-2 break-all font-mono text-[11px]">{publication.projectPath}</div>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card px-5 py-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-serif text-lg">{value}</div>
    </div>
  );
}

function ServiceRow({ name, enabled, ready }: { name: string; enabled: boolean; ready: boolean }) {
  return (
    <div className="flex items-center justify-between rounded border border-rule px-3 py-2.5 text-sm">
      <span className={enabled ? "" : "text-muted-foreground"}>{name}</span>
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        {enabled ? <StatusDot ready={ready} /> : null}
        {enabled ? (ready ? "configured" : "not configured") : "disabled"}
      </span>
    </div>
  );
}
