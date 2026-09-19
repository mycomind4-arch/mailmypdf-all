import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const Route = createFileRoute("/respond-to-a-notice")({
  head: () => ({
    meta: [
      { title: "Respond to a Notice | Analyze, Prepare, and Mail Your Response | MailMyPDF" },
      { name: "description", content: "Received an important notice? Organize the document, identify what it asks for, prepare a response, and mail the final document with an appropriate mailing method." },
      { property: "og:title", content: "Respond to a Notice | MailMyPDF" },
      { property: "og:description", content: "Turn an important notice into a clear response and documented mailing workflow." },
    ],
    links: [{ rel: "canonical", href: "/respond-to-a-notice" }],
  }),
  component: Page,
});

function Page() {
  return <div className="min-h-screen"><SiteHeader /><main>
    <section className="border-b border-rule/60"><div className="mx-auto max-w-5xl px-6 py-20 md:py-28"><div className="postmark w-fit">Received a notice?</div><h1 className="mt-6 max-w-4xl text-5xl leading-[1.02] md:text-7xl">Don't Just Mail a Response. Understand What You're Responding To.</h1><p className="mt-7 max-w-2xl text-xl text-ink-soft">Important notices can contain deadlines, requested actions, reference numbers, and documents you need to address. Organize the notice first, then prepare and send your response.</p><Link to="/send" className="mt-8 inline-flex rounded-full bg-cobalt px-7 py-3.5 font-medium text-white">Start With Your Document →</Link></div></section>
    <section className="bg-paper-deep/40 border-b border-rule/60"><div className="mx-auto max-w-6xl px-6 py-20"><h2 className="text-3xl md:text-4xl">A better response workflow</h2><div className="mt-10 grid gap-5 md:grid-cols-4">{[["1","Read","Identify the sender, reference number, dates, requested action, and stated deadline."],["2","Organize","Keep the notice and supporting documents together."],["3","Prepare","Draft a focused response that addresses the actual request."],["4","Send","Choose an appropriate mailing method and preserve the mailing record."]].map(([n,t,d])=><div className="envelope-card p-6" key={n}><div className="font-mono text-xs text-cobalt">{n}</div><h3 className="mt-3 font-serif text-2xl">{t}</h3><p className="mt-2 text-sm text-muted-foreground">{d}</p></div>)}</div></div></section>
    <section><div className="mx-auto max-w-5xl px-6 py-20"><h2 className="text-3xl md:text-4xl">Examples</h2><div className="mt-8 grid gap-x-10 md:grid-cols-2">{["Government or agency notices","Code enforcement correspondence","Tax notices","Insurance notices","Compliance notices","Collection or dispute correspondence","Administrative decisions","Business or contractual notices"].map(x=><div key={x} className="border-b border-rule/70 py-4 text-lg">{x}</div>)}</div><p className="mt-8 text-sm text-muted-foreground">MailMyPDF can help organize and deliver a response, but it does not determine the legal meaning of a notice or guarantee that a particular mailing method satisfies a legal service requirement.</p></div></section>
    <section className="border-y border-rule/60 bg-paper-deep/40"><div className="mx-auto max-w-4xl px-6 py-20"><h2 className="text-3xl md:text-4xl">Already have the response ready?</h2><p className="mt-5 text-lg text-ink-soft">Skip the analysis and upload the final document to begin the mailing workflow.</p><Link to="/send" className="mt-7 inline-flex rounded-full bg-cobalt px-7 py-3.5 font-medium text-white">Upload Response →</Link></div></section>
  </main><SiteFooter /></div>;
}
