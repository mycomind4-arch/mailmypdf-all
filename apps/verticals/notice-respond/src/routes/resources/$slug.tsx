import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/resources/$slug")({
  head: () => ({ meta: [
    { title: "Guides — Notice Respond" },
    { name: "description", content: "Guides for responding to government notices." },
  ] }),
  component: GuidePage,
});

function GuidePage() {
  const slug = Route.useParams().slug;
  const guides: Record<string, { title: string; category: string; readTime: string; content: React.ReactNode }> = {
    "understanding-irs-notices": { title: "Understanding IRS Notices: CP Letters Explained", category: "IRS Notices", readTime: "6 min", content: <IRSContent /> },
    "responding-to-court-summons": { title: "How to Respond to a Court Summons", category: "Court Responses", readTime: "5 min", content: <CourtContent /> },
    "certified-mail-for-deadlines": { title: "Why Certified Mail Matters for Deadline-Sensitive Responses", category: "Mailing", readTime: "4 min", content: <CertifiedMailContent /> },
  };

  const guide = guides[slug];
  if (!guide) return (
    <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-lg px-6 py-32 text-center">
      <div className="postmark mx-auto w-fit">404</div>
      <h1 className="mt-6 font-serif text-3xl">Guide not found</h1>
      <Link to="/resources" className="mt-6 inline-flex items-center rounded-full border border-input px-5 py-2.5 text-sm font-medium transition-colors hover:bg-muted">Back to resources</Link>
    </main><SiteFooter /></div>
  );

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        <article>
          <section className="border-b border-rule/60"><div className="mx-auto max-w-2xl px-6 py-12">
            <Link to="/resources" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-stamp transition-colors">← All guides</Link>
            <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground"><span className="font-medium text-stamp">{guide.category}</span><span>·</span><span>{guide.readTime} read</span></div>
            <h1 className="mt-3 font-serif text-3xl md:text-4xl">{guide.title}</h1>
          </div></section>
          <section className="border-b border-rule/60"><div className="mx-auto max-w-2xl px-6 py-10 prose-content">{guide.content}</div></section>
          <section className="border-b border-rule/60"><div className="mx-auto max-w-6xl px-6 py-20 text-center">
            <div className="postmark mx-auto w-fit">Ready to respond</div>
            <h2 className="mt-4 font-serif text-4xl">Start your response today.</h2>
            <Link to="/workflows/irs-notice" className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-medium text-primary-foreground shadow-stamp transition-transform hover:-translate-y-0.5">Respond to a notice <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg></Link>
          </div></section>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) { return <h2 className="mt-10 text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-serif)" }}>{children}</h2>; }
function P({ children, className }: { children: React.ReactNode; className?: string }) { return <p className={"mt-4 text-sm leading-7 text-muted-foreground" + (className ? " " + className : "")}>{children}</p>; }
function UL({ children }: { children: React.ReactNode }) { return <ul className="mt-4 space-y-2 pl-5 text-sm text-muted-foreground" style={{ listStyle: "disc" }}>{children}</ul>; }
function Callout({ children, type = "info" }: { children: React.ReactNode; type?: "info" | "warning" | "success" }) {
  const cls = type === "warning" ? "border border-rule/70 bg-stamp/5 text-ink-soft" : type === "success" ? "border border-rule/70 bg-paper-deep/40 text-ink-soft" : "border border-rule/70 bg-paper-deep/40 text-ink-soft";
  return <div className={`mt-6 rounded-md p-4 text-sm ${cls}`}>{children}</div>;
}

function IRSContent() {
  return (
    <>
      <P>The IRS sends millions of notices each year. Understanding which one you received and what it means is the first step toward responding effectively.</P>
      <H2>Common IRS notice types</H2>
      <UL>
        <li><strong>CP14:</strong> Balance due — you owe taxes and need to pay or set up a payment plan</li>
        <li><strong>CP2000:</strong> Proposed adjustment — the IRS found a discrepancy between your return and reported income</li>
        <li><strong>CP501/CP503/CP504:</strong> Reminder/Intent to levy — escalating collection notices</li>
        <li><strong>LT11/LT1058:</strong> Final notice of intent to levy — serious collection action is imminent</li>
        <li><strong>CP90/CP244:</strong> Final notice of intent to levy and notice of your right to a hearing</li>
      </UL>
      <Callout type="warning"><strong>Important:</strong> IRS notices have response deadlines — typically 30–90 days. Ignoring a notice can lead to escalating collection actions, liens, or levies.</Callout>
      <H2>How to read an IRS notice</H2>
      <P>Every IRS notice includes: a notice number (top right), your tax year, a response deadline, and instructions. The notice number tells you what type of action the IRS is taking.</P>
      <H2>Steps to respond</H2>
      <UL>
        <li>Read the entire notice carefully</li>
        <li>Note the response deadline immediately</li>
        <li>Gather supporting documentation</li>
        <li>Write a clear response letter addressing each item</li>
        <li>Mail certified with return receipt for proof of timely delivery</li>
      </UL>
      <Callout type="success"><strong>Tip:</strong> Certified mail with return receipt gives you a signed card back — physical proof that the IRS received your response.</Callout>
      <P className="text-xs mt-8">This guide is for informational purposes only and does not constitute legal or tax advice.</P>
    </>
  );
}

function CourtContent() {
  return (
    <>
      <P>Receiving a court summons can be stressful, but understanding the process helps you respond effectively and on time.</P>
      <H2>What is a court summons?</H2>
      <P>A summons is a formal court document that requires you to respond to a complaint within a specific timeframe. The deadline varies by jurisdiction but is often 20–30 days.</P>
      <Callout type="warning"><strong>Important:</strong> Missing the response deadline can result in a default judgment against you. If you're unsure about your situation, consult a qualified attorney.</Callout>
      <H2>What to do when you receive a summons</H2>
      <UL>
        <li>Read the entire document carefully</li>
        <li>Note the court name, case number, and response deadline</li>
        <li>Identify what the complaint alleges</li>
        <li>Prepare a written response addressing each allegation</li>
        <li>File your response with the court by the deadline</li>
        <li>Keep proof of filing — certified mail provides a USPS record</li>
      </UL>
      <H2>What your response should include</H2>
      <P>A proper response typically includes: the court name, case number, your name, a response to each numbered allegation (admit, deny, or lack knowledge), and any affirmative defenses.</P>
      <Callout type="success"><strong>Tip:</strong> Filing by certified mail gives you proof of timely submission — critical for court deadlines.</Callout>
      <P className="text-xs mt-8">This guide is for informational purposes only and does not constitute legal advice.</P>
    </>
  );
}

function CertifiedMailContent() {
  return (
    <>
      <P>When responding to a government notice, how you mail your response can be just as important as what it says. Certified mail provides proof that your response was sent and received — which can be critical for deadlines.</P>
      <H2>What is Certified Mail?</H2>
      <P>Certified Mail is a USPS service that provides a mailing receipt and electronic verification that an item was delivered. For an additional fee, you can add a Return Receipt that provides a signed card confirming delivery.</P>
      <H2>Why it matters for notices</H2>
      <UL>
        <li><strong>Proof of timely mailing:</strong> The USPS postmark and receipt confirm when you mailed your response</li>
        <li><strong>Proof of delivery:</strong> Electronic delivery confirmation shows the item was received</li>
        <li><strong>Signature verification:</strong> Return Receipt provides a physical signature card</li>
        <li><strong>Mailing record:</strong> The USPS retains records that can be retrieved if needed</li>
      </UL>
      <Callout type="info"><strong>Note:</strong> Certified mail adds a surcharge but can be essential for deadline-sensitive correspondence. The peace of mind is often worth the cost.</Callout>
      <H2>Standard vs. Certified vs. Registered</H2>
      <P><strong>Standard mail:</strong> Cheapest option, includes tracking, but no proof of delivery or signature.</P>
      <P><strong>Certified mail:</strong> Adds delivery confirmation and signature tracking. Recommended for most government responses.</P>
      <P><strong>Registered mail:</strong> Highest security, insured, signature required. Used for sensitive or high-value documents.</P>
      <P className="text-xs mt-8">This guide is for informational purposes only and does not constitute legal advice.</P>
    </>
  );
}
