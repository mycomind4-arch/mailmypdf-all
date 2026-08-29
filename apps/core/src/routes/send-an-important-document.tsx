import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const Route = createFileRoute("/send-an-important-document")({
  head: () => ({
    meta: [
      { title: "Send an Important Document | MailMyPDF" },
      { name: "description", content: "Need to send an important document? Prepare it online, choose an appropriate mailing method, and keep a record of the mailing." },
      { property: "og:title", content: "Send an Important Document | MailMyPDF" },
      { property: "og:description", content: "Prepare, send, track, and preserve the record for an important mailed document." },
    ],
    links: [{ rel: "canonical", href: "/send-an-important-document" }],
  }),
  component: Page,
});

function Page() {
  const steps = [
    ["Prepare", "Upload the exact document you need to send and review it before ordering."],
    ["Address", "Enter the recipient and verify the destination before the document enters the mailing workflow."],
    ["Choose", "Select the mailing method that fits your situation, including certified options when appropriate."],
    ["Preserve", "Keep the document and mailing information together so you can reconstruct what you sent later."],
  ];
  return <div className="min-h-screen"><SiteHeader /><main>
    <section className="border-b border-rule/60"><div className="mx-auto max-w-5xl px-6 py-20 md:py-28"><div className="postmark w-fit">Important documents</div><h1 className="mt-6 max-w-4xl text-5xl leading-[1.02] md:text-7xl">Send an Important Document Without Losing the Paper Trail</h1><p className="mt-7 max-w-2xl text-xl text-ink-soft">When a document matters, mailing it is only part of the job. Prepare the document, send it through the appropriate service, and keep the information you may need later.</p><div className="mt-8 flex flex-wrap gap-3"><Link to="/send" className="rounded-full bg-cobalt px-7 py-3.5 font-medium text-white">Upload Your Document →</Link><Link to="/proof-of-mailing" className="rounded-full border border-rule px-6 py-3.5">Understand Proof</Link></div></div></section>
    <section className="bg-paper-deep/40 border-b border-rule/60"><div className="mx-auto max-w-6xl px-6 py-20"><h2 className="text-3xl md:text-4xl">A simple workflow for consequential mail</h2><div className="mt-10 grid gap-5 md:grid-cols-4">{steps.map(([t,d],i)=><div className="envelope-card p-6" key={t}><div className="font-mono text-xs text-cobalt">0{i+1}</div><h3 className="mt-3 font-serif text-2xl">{t}</h3><p className="mt-2 text-sm text-muted-foreground">{d}</p></div>)}</div></div></section>
    <section><div className="mx-auto max-w-5xl px-6 py-20"><h2 className="text-3xl md:text-4xl">Common reasons to send an important document</h2><div className="mt-8 grid gap-x-10 md:grid-cols-2">{["Government correspondence","Dispute or complaint letters","Appeals and formal responses","Business notices","Records requests","Insurance correspondence","Landlord or tenant notices","Contracts and signed documents"].map(x=><div key={x} className="border-b border-rule/70 py-4 text-lg">{x}</div>)}</div><p className="mt-8 text-sm text-muted-foreground">Mailing requirements vary by situation. If a particular agency, court, contract, or process specifies a service method, follow that requirement.</p></div></section>
    <section className="border-y border-rule/60 bg-paper-deep/40"><div className="mx-auto max-w-4xl px-6 py-20"><h2 className="text-3xl md:text-4xl">Need more than mailing?</h2><p className="mt-5 text-lg text-ink-soft">MailMyPDF is becoming the delivery and proof layer for workflows where the document itself matters: responding to notices, disputes, appeals, and records requests.</p><div className="mt-7 flex flex-wrap gap-3"><Link to="/ecosystem" className="rounded-full border border-rule px-5 py-3">Explore the ecosystem</Link><Link to="/send" className="rounded-full bg-primary px-5 py-3 text-primary-foreground">Start a Mailing →</Link></div></div></section>
  </main><SiteFooter /></div>;
}
