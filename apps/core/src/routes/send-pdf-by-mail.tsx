import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const Route = createFileRoute("/send-pdf-by-mail")({
  head: () => ({
    meta: [
      { title: "Send a PDF by Mail | Turn Your PDF Into a Physical Letter | MailMyPDF" },
      { name: "description", content: "Need to send a PDF by mail? Upload your document, enter the recipient, choose a mailing option, and MailMyPDF turns it into a physical letter." },
      { property: "og:title", content: "Send a PDF by Mail | MailMyPDF" },
      { property: "og:description", content: "Turn your PDF into a physical mailed letter without printing it yourself." },
    ],
    links: [{ rel: "canonical", href: "/send-pdf-by-mail" }],
  }),
  component: Page,
});

function Page() {
  return <div className="min-h-screen"><SiteHeader /><main>
    <section className="border-b border-rule/60"><div className="mx-auto max-w-5xl px-6 py-20 md:py-28"><div className="postmark w-fit">Mail a PDF</div><h1 className="mt-6 max-w-4xl text-5xl leading-[1.02] md:text-7xl">Send a PDF by Mail Without Printing It Yourself</h1><p className="mt-7 max-w-2xl text-xl text-ink-soft">Have the document as a PDF but need it to arrive as physical mail? Upload it to MailMyPDF and we handle the print-and-mail step.</p><Link to="/send" className="mt-8 inline-flex rounded-full bg-cobalt px-7 py-3.5 font-medium text-white">Upload PDF →</Link></div></section>
    <section className="bg-paper-deep/40 border-b border-rule/60"><div className="mx-auto max-w-6xl px-6 py-20"><h2 className="text-3xl md:text-4xl">From digital file to physical letter</h2><div className="mt-10 grid gap-6 md:grid-cols-3">{[["Your PDF","Keep the document you already prepared."],["A physical letter","We turn the digital document into a mailed piece."],["A documented order","Keep the information associated with the mailing in your records."]].map(([t,d])=><div className="envelope-card p-6" key={t}><h3 className="font-serif text-2xl">{t}</h3><p className="mt-3 text-sm text-muted-foreground">{d}</p></div>)}</div></div></section>
    <section><div className="mx-auto max-w-4xl px-6 py-20"><h2 className="text-3xl md:text-4xl">Why people mail PDFs</h2><div className="mt-8 space-y-0">{["You do not have a printer","You need a physical document delivered","You want to send a formal letter without handling the physical mailing yourself","You need a mailing option beyond ordinary digital communication"].map(x=><div className="border-b border-rule/70 py-5 text-lg" key={x}>{x}</div>)}</div></div></section>
    <section className="border-y border-rule/60 bg-paper-deep/40"><div className="mx-auto max-w-4xl px-6 py-20"><h2 className="text-3xl md:text-4xl">Need certified mail?</h2><p className="mt-5 text-lg text-ink-soft">If the reason you are mailing the PDF is that you need a documented delivery workflow, review the certified-mail information before ordering.</p><div className="mt-7 flex gap-3"><Link to="/certified-mail-guide" className="rounded-full border border-rule px-5 py-3">Read the Certified Mail Guide</Link><Link to="/send" className="rounded-full bg-primary px-5 py-3 text-primary-foreground">Send Your PDF →</Link></div></div></section>
  </main><SiteFooter /></div>;
}
