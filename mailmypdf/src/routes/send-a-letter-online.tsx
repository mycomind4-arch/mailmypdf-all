import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { faqJsonLd } from "@/components/seo-landing";

const FAQ = [
  { q: "Can I send a letter online without a printer?", a: "Yes. Upload your PDF, enter the recipient address, review the mailing options, and place the order online." },
  { q: "Can I send certified mail online?", a: "MailMyPDF supports certified mail as an add-on option at checkout when available for the order." },
  { q: "What does MailMyPDF actually do?", a: "MailMyPDF turns your digital document into a physical mailed letter so you do not have to print, fold, envelope, stamp, and visit the post office yourself." },
  { q: "Can I keep a record of what I sent?", a: "MailMyPDF is designed around documented mailing workflows. Keep your original document and mailing information with your account records." },
];

export const Route = createFileRoute("/send-a-letter-online")({
  head: () => ({
    meta: [
      { title: "Send a Letter Online | Print & Mail Your Document | MailMyPDF" },
      { name: "description", content: "Send a physical letter online without a printer or post office trip. Upload your PDF, enter an address, choose mailing options, and let MailMyPDF print and mail it." },
      { property: "og:title", content: "Send a Letter Online | MailMyPDF" },
      { property: "og:description", content: "Upload a document and send a physical letter online." },
    ],
    links: [{ rel: "canonical", href: "/send-a-letter-online" }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(faqJsonLd(FAQ)) }],
  }),
  component: Page,
});

function Page() {
  return <div className="min-h-screen"><SiteHeader />
    <main>
      <section className="border-b border-rule/60"><div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="postmark w-fit">Send a letter online</div>
        <h1 className="mt-6 max-w-4xl text-5xl leading-[1.02] md:text-7xl">Send a Letter Online Without Printing or Going to the Post Office</h1>
        <p className="mt-7 max-w-2xl text-xl text-ink-soft">Upload your document, enter the mailing address, choose how you want it sent, and let MailMyPDF handle the physical mailing.</p>
        <div className="mt-8 flex flex-wrap items-center gap-4"><Link to="/send" className="rounded-full bg-cobalt px-7 py-3.5 font-medium text-white">Upload Your Document →</Link><span className="text-sm text-muted-foreground">No printer or envelope required</span></div>
      </div></section>
      <section className="border-b border-rule/60 bg-paper-deep/40"><div className="mx-auto max-w-6xl px-6 py-20"><h2 className="text-3xl md:text-4xl">Everything you need to get an important letter into the mail</h2><div className="mt-10 grid gap-5 md:grid-cols-4">{[
        ["01","Upload","Start with the PDF or document you already have."],["02","Address","Tell us where the physical letter should go."],["03","Choose","Select the mailing option that fits your situation."],["04","Document","Keep the order and mailing record for your records."],
      ].map(([n,t,d])=><div key={n} className="envelope-card p-6"><div className="font-mono text-xs text-cobalt">{n}</div><h3 className="mt-3 font-serif text-2xl">{t}</h3><p className="mt-2 text-sm text-muted-foreground">{d}</p></div>)}</div></div></section>
      <section><div className="mx-auto max-w-5xl px-6 py-20"><div className="postmark w-fit">Use cases</div><h2 className="mt-4 text-3xl md:text-4xl">What can you send?</h2><div className="mt-8 grid gap-3 md:grid-cols-2">{["Important personal correspondence","Business letters","Formal notices","Tax or agency correspondence","Dispute letters","Appeal letters","Records requests","Landlord or tenant correspondence"].map(x=><div key={x} className="border-b border-rule/70 py-4 text-lg">{x}</div>)}</div><p className="mt-8 text-sm text-muted-foreground">If your situation requires a particular delivery method, confirm the applicable requirement before choosing a mailing option.</p></div></section>
      <section className="border-y border-rule/60 bg-paper-deep/40"><div className="mx-auto max-w-4xl px-6 py-20"><h2 className="text-3xl md:text-4xl">Need proof, not just postage?</h2><p className="mt-5 text-lg text-ink-soft">For important documents, the question is often not simply “Did I mail it?” but “Can I show what I sent and how it was handled?” Explore certified mailing and proof-focused workflows before you send.</p><div className="mt-7 flex flex-wrap gap-3"><Link to="/certified-mail-guide" className="rounded-full border border-rule px-5 py-3">Certified Mail Guide</Link><Link to="/send" className="rounded-full bg-primary px-5 py-3 text-primary-foreground">Start a Mailing →</Link></div></div></section>
      <section><div className="mx-auto max-w-4xl px-6 py-20"><div className="postmark mx-auto w-fit">FAQ</div><div className="mt-8 divide-y divide-rule/70 border-y border-rule/70">{FAQ.map(f=><details key={f.q} className="py-5"><summary className="cursor-pointer font-serif text-xl">{f.q}</summary><p className="mt-3 text-muted-foreground">{f.a}</p></details>)}</div></div></section>
    </main><SiteFooter /></div>;
}
