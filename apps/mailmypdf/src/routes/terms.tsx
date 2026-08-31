import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service | MailMyPDF" },
      { name: "description", content: "Terms and conditions for using MailMyPDF." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="postmark w-fit">MailMyPDF / Terms</div>
        <h1 className="mt-6 font-serif text-4xl sm:text-5xl">Terms of Service</h1>
        <p className="mt-4 text-sm text-muted-foreground">Last updated: August 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="font-serif text-xl text-foreground">What MailMyPDF is</h2>
            <p className="mt-3">MailMyPDF is a document preparation and mailing service. We print, stamp, and mail your documents via USPS and provide tracking and proof of mailing. We are not a law firm and do not provide legal, tax, financial, or professional advice.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground">Your responsibilities</h2>
            <p className="mt-3">You are responsible for the content of anything you mail through MailMyPDF — including verifying recipient addresses, deadlines, filing requirements, and the accuracy of your documents. MailMyPDF does not review your documents for legal sufficiency or compliance.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground">Pricing and payment</h2>
            <p className="mt-3">Pricing is displayed at checkout before you pay. Prices vary by mail class (standard, certified, registered), page count, and color options. Payments are processed by Stripe. Refunds are available for orders that have not yet been sent to print.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground">Mailing and delivery</h2>
            <p className="mt-3">MailMyPDF uses USPS for delivery. Delivery timelines are estimates based on USPS service standards and are not guaranteed. Certified and registered mail include tracking and proof of delivery. We are not responsible for mail lost or delayed by USPS after handoff.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground">AI-assisted tools</h2>
            <p className="mt-3">Some MailMyPDF workflows use AI to analyze documents and draft correspondence. AI-generated content is a starting point — you must review and approve it before mailing. We do not guarantee the accuracy, completeness, or legal sufficiency of AI-generated content.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground">Data retention</h2>
            <p className="mt-3">Documents are retained according to our <a href="/retention" className="text-cobalt hover:underline">Data Retention Policy</a>. You may request deletion of your data at any time, subject to legal recordkeeping requirements.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground">Limitation of liability</h2>
            <p className="mt-3">MailMyPDF provides document preparation and mailing tools. We are not liable for outcomes resulting from the content of your documents, missed deadlines, or delivery failures by USPS. Our liability is limited to the cost of the mailing order.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground">Contact</h2>
            <p className="mt-3">Questions about these terms? Email <a href="mailto:hello@mailmypdf.com" className="text-cobalt hover:underline">hello@mailmypdf.com</a>.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
