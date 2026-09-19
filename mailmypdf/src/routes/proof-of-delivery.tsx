import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";

export const Route = createFileRoute("/proof-of-delivery")({
  head: () => ({
    meta: [
      { title: "Proof of Delivery | Document Delivery Records | MailMyPDF" },
      { name: "description", content: "Understand proof of delivery, delivery attempts, tracking records, and what they can and cannot establish for an important mailed document." },
      { property: "og:title", content: "Proof of Delivery | MailMyPDF" },
      { property: "og:description", content: "Learn how to preserve delivery information for important documents." },
    ],
    links: [{ rel: "canonical", href: "/proof-of-delivery" }],
  }),
  component: Page,
});

function Page() {
  return <div className="min-h-screen"><SiteHeader /><main>
    <section className="border-b border-rule/60"><div className="mx-auto max-w-5xl px-6 py-20 md:py-28"><div className="postmark w-fit">Proof of delivery</div><h1 className="mt-6 max-w-4xl text-5xl leading-[1.02] md:text-7xl">When Delivery Matters, Keep the Delivery Record</h1><p className="mt-7 max-w-2xl text-xl text-ink-soft">For important correspondence, delivery information can be as important as the document itself. Learn what a delivery record can show and how to preserve it.</p><Link to="/certified-mail-guide" className="mt-8 inline-flex rounded-full bg-cobalt px-7 py-3.5 font-medium text-white">Review Certified Mail →</Link></div></section>
    <section className="bg-paper-deep/40 border-b border-rule/60"><div className="mx-auto max-w-6xl px-6 py-20"><h2 className="text-3xl md:text-4xl">What a delivery record can help establish</h2><div className="mt-10 grid gap-5 md:grid-cols-3">{[["Destination","The address associated with the mailing."],["Status","Whether the item was delivered, is in transit, or had a delivery attempt recorded."],["History","Tracking or service information available from the selected mailing method."]].map(([t,d])=><div className="envelope-card p-6" key={t}><h3 className="font-serif text-2xl">{t}</h3><p className="mt-2 text-muted-foreground">{d}</p></div>)}</div></div></section>
    <section><div className="mx-auto max-w-4xl px-6 py-20"><h2 className="text-3xl md:text-4xl">Delivery is not the same as agreement</h2><p className="mt-5 text-lg text-ink-soft">A delivery record can document a delivery event or attempt. It does not automatically establish that the recipient read, accepted, agreed with, or acted on the contents of your document.</p><p className="mt-5 text-sm text-muted-foreground">If a specific legal or administrative process requires a particular form of service, confirm the applicable requirement rather than relying on a generic mailing method.</p></div></section>
    <section className="border-y border-rule/60 bg-paper-deep/40"><div className="mx-auto max-w-4xl px-6 py-20"><h2 className="text-3xl md:text-4xl">Send an important document</h2><p className="mt-5 text-lg text-ink-soft">Upload the document, address it, select the appropriate mailing method, and preserve the resulting mailing information.</p><Link to="/send" className="mt-7 inline-flex rounded-full bg-cobalt px-7 py-3.5 font-medium text-white">Upload Your Document →</Link></div></section>
  </main><SiteFooter /></div>;
}
