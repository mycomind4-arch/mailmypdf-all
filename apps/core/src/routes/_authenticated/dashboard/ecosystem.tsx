import { createFileRoute } from "@tanstack/react-router";
import { ECOSYSTEM_VERTICALS } from "@/lib/ecosystem";

export const Route = createFileRoute("/_authenticated/dashboard/ecosystem")({
  head: () => ({
    meta: [
      { title: "MailMyPDF — Ecosystem" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EcosystemPage,
});

function EcosystemPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-rule/60 bg-card p-7 sm:p-10">
        <div className="postmark w-fit">The MailMyPDF ecosystem</div>
        <h1 className="mt-5 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">
          One account. Specialized tools. One place to get correspondence done.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          Your MailMyPDF identity follows you across the ecosystem. Each vertical can specialize in a different problem while sharing the same account, documents, AI foundation, usage rules, and physical mailing infrastructure.
        </p>
      </section>

      <section>
        <div className="font-mono text-xs uppercase tracking-widest text-cobalt">Available tools</div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {ECOSYSTEM_VERTICALS.map((vertical) => (
            <a
              key={vertical.slug}
              href={vertical.href}
              className="envelope-card group p-6 transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="rounded-full border border-rule bg-paper px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {vertical.label}
                </span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </div>
              <h2 className="mt-5 font-serif text-2xl">{vertical.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{vertical.description}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {vertical.capabilities.map((capability) => (
                  <span key={capability} className="rounded-full bg-paper-deep px-2.5 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {capability}
                  </span>
                ))}
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-rule/60 bg-paper-deep/30 p-6 sm:p-8">
        <h2 className="font-serif text-2xl">How the ecosystem works</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Step number="01" title="Choose a workflow" text="Start with the problem you are actually trying to solve." />
          <Step number="02" title="Use the intelligence" text="Analyze documents, research, draft, and refine with the tools the workflow needs." />
          <Step number="03" title="Send when ready" text="Physical mailing remains a separate transaction through MailMyPDF." />
        </div>
      </section>
    </div>
  );
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-rule/50 bg-paper/50 p-5">
      <div className="font-mono text-xs text-cobalt">{number}</div>
      <h3 className="mt-3 font-serif text-xl">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
