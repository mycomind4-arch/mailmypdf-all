import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | MailMyPDF" },
      { name: "description", content: "How MailMyPDF handles your data, documents, and mailing records." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="postmark w-fit">MailMyPDF / Privacy</div>
        <h1 className="mt-6 font-serif text-4xl sm:text-5xl">Privacy Policy</h1>
        <p className="mt-4 text-sm text-muted-foreground">Last updated: August 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-muted-foreground">
          <section>
            <h2 className="font-serif text-xl text-foreground">What we collect</h2>
            <p className="mt-3">When you use MailMyPDF, we collect the minimum information needed to operate the service: your email address (for account access and order notifications), mailing addresses (sender and recipient), and the documents you upload for printing and mailing. Payment processing is handled by Stripe; we never store your card details.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground">How we use your data</h2>
            <p className="mt-3">Your documents and address data are used to fulfill your mailing orders through our print-and-mail provider. We use your email to send order confirmations, tracking updates, and account-related notifications. With your opt-in, we may collect analytics to improve the product. We never sell your data.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground">Document retention</h2>
            <p className="mt-3">Uploaded documents are retained for a limited period after your order is fulfilled to support reprints, proof of mailing, and dispute resolution. After the retention period, documents are permanently deleted. You can request earlier deletion at any time. See our <a href="/retention" className="text-cobalt hover:underline">Data Retention Policy</a> for details.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground">Third-party services</h2>
            <p className="mt-3">We use the following services to operate: Stripe (payments), Lob or equivalent (print and mail fulfillment), Cloudflare (hosting and CDN), and Supabase (database and authentication). Each service has its own privacy policy. We share only the data necessary to fulfill your orders.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground">Your rights</h2>
            <p className="mt-3">You can request access to, correction of, or deletion of your personal data at any time by contacting <a href="mailto:hello@mailmypdf.com" className="text-cobalt hover:underline">hello@mailmypdf.com</a>. If you are in the EU or California, you have additional rights under GDPR and CCPA respectively.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground">Analytics opt-in</h2>
            <p className="mt-3">MailMyPDF asks for your consent before collecting analytics. Essential storage is required for the service to function. Analytics and personalization are optional — you can use the service fully without opting in.</p>
          </section>

          <section>
            <h2 className="font-serif text-xl text-foreground">Contact</h2>
            <p className="mt-3">Questions about privacy? Email <a href="mailto:hello@mailmypdf.com" className="text-cobalt hover:underline">hello@mailmypdf.com</a>.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
