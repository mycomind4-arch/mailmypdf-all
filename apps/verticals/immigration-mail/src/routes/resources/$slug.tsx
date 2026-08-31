import { PRICES } from "@mailmypdf/pricing";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Clock, FileText, Mail, PackageCheck, ShieldCheck, Stamp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const GUIDES_META: Record<string, { title: string; description: string }> = {
  "how-to-respond-to-rfe": {
    title: "How to Respond to a Request for Evidence (RFE) — Immigration Mail",
    description: "A practical guide to organizing and responding to an RFE, including what to include and how to mail it with proof of delivery.",
  },
  "writing-an-explanation-letter": {
    title: "Writing an Effective Explanation Letter — Immigration Mail",
    description: "Tips for writing a clear, professional explanation letter for immigration correspondence.",
  },
  "certified-mail-guide": {
    title: "Why Certified Mail Matters for Immigration Correspondence — Immigration Mail",
    description: "How certified mail provides proof of delivery for important immigration documents.",
  },
};

export const Route = createFileRoute("/resources/$slug")({
  head: ({ params }) => {
    const meta = GUIDES_META[params.slug] ?? {
      title: "Guide — Immigration Mail",
      description: "Immigration correspondence guides and resources.",
    };
    return {
      meta: [
        { title: meta.title },
        { name: "description", content: meta.description },
      ],
      links: [{ rel: "canonical", href: `https://immigrationmail.com/resources/${params.slug}` }],
    };
  },
  component: GuidePage,
});

function GuidePage() {
  const slug = Route.useParams().slug;

  const guides: Record<string, { title: string; category: string; readTime: string; content: React.ReactNode }> = {
    "how-to-respond-to-rfe": {
      title: "How to Respond to a Request for Evidence (RFE)",
      category: "Responding to Notices",
      readTime: "6 min",
      content: <RFEContent />,
    },
    "writing-an-explanation-letter": {
      title: "Writing an Effective Explanation Letter",
      category: "Correspondence Tips",
      readTime: "5 min",
      content: <ExplanationContent />,
    },
    "certified-mail-guide": {
      title: "Why Certified Mail Matters for Immigration Correspondence",
      category: "Mailing",
      readTime: "4 min",
      content: <CertifiedMailContent />,
    },
  };

  const guide = guides[slug];
  if (!guide) {
    return (
      <div className="min-h-screen page-fade">
        <SiteHeader />
        <main className="mx-auto max-w-lg px-6 py-32 text-center">
          <h1 className="font-serif text-4xl">Guide not found</h1>
          <Link to="/resources" className="mt-6 inline-flex items-center gap-2 rounded-full border border-input px-5 py-3 text-sm font-medium transition-colors hover:bg-muted">Back to resources</Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen page-fade">
      <SiteHeader />
      <article>
        <section className="border-b border-rule/60 bg-paper-deep/20 py-12 md:py-16">
          <div className="mx-auto max-w-2xl px-6">
            <Link to="/resources" className="inline-flex items-center gap-1 text-sm text-stamp hover:underline"><ArrowLeft size={15} /> All guides</Link>
            <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="font-semibold text-stamp">{guide.category}</span>
              <span className="flex items-center gap-1"><Clock size={12} /> {guide.readTime}</span>
            </div>
            <h1 className="mt-3 font-serif text-3xl md:text-4xl">{guide.title}</h1>
          </div>
        </section>

        <section className="py-10 md:py-14">
          <div className="mx-auto max-w-2xl px-6">
            {guide.content}
          </div>
        </section>

        <section className="bg-ink py-12">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <h2 className="font-serif text-2xl text-white">Ready to send your correspondence?</h2>
            <p className="mt-3 text-white/60">Start a guided workflow and get your letter in the mail today.</p>
            <Link to="/workflows/respond-to-notice" className="mt-6 inline-flex items-center gap-2 rounded-full bg-stamp px-6 py-3 text-sm font-medium text-white shadow-stamp transition-transform hover:-translate-y-0.5">Start now</Link>
          </div>
        </section>
      </article>
      <SiteFooter />
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 font-serif text-xl">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-sm leading-7 text-ink-soft">{children}</p>;
}

function UL({ children }: { children: React.ReactNode }) {
  return <ul className="mt-4 space-y-2 pl-5 text-sm text-ink-soft" style={{ listStyle: "disc" }}>{children}</ul>;
}

function Callout({ children, type = "info" }: { children: React.ReactNode; type?: "info" | "warning" | "success" }) {
  const cls = type === "warning"
    ? "border-destructive/30 bg-destructive/5 text-ink-soft"
    : type === "success"
    ? "border-stamp/30 bg-stamp/5 text-ink-soft"
    : "border-rule/70 bg-paper-deep/40 text-ink-soft";
  return <div className={`mt-6 rounded-md border p-4 text-sm ${cls}`}>{children}</div>;
}

function RFEContent() {
  return (
    <>
      <P>A Request for Evidence (RFE) is a notice from USCIS asking for additional documentation or information to process your application or petition. RFEs are common and not necessarily a bad sign — they often mean the adjudicator needs clarification or is missing a specific document.</P>

      <H2>What an RFE typically includes</H2>
      <UL>
        <li>The specific evidence or information being requested</li>
        <li>A deadline for your response (typically 30–90 days from the notice date)</li>
        <li>Instructions on where and how to submit your response</li>
        <li>Your receipt number and case information</li>
      </UL>

      <H2>Step 1: Read the RFE carefully</H2>
      <P>Before anything else, read the entire RFE. Note exactly what is being asked for and the deadline. If you're not sure what a specific request means, consider consulting an immigration attorney — Immigration Mail can help you prepare and send the correspondence, but it cannot tell you what evidence to submit.</P>

      <Callout type="warning"><AlertTriangle size={16} className="inline mr-1" /> <strong>Important:</strong> Missing an RFE deadline can result in your case being denied. Note the deadline immediately and plan to submit well before it.</Callout>

      <H2>Step 2: Gather your documents</H2>
      <P>Collect every document the RFE requests. If you're missing something, prepare an explanation for why it's unavailable and what alternative evidence you're providing instead.</P>

      <UL>
        <li>Make copies of everything — never send original documents unless specifically asked</li>
        <li>Translate any documents not in English and include a certified translation</li>
        <li>Organize documents in the order the RFE lists them</li>
      </UL>

      <H2>Step 3: Write a cover letter</H2>
      <P>A clear cover letter helps the adjudicator understand what you're submitting and why. Include:</P>
      <UL>
        <li>Your name and receipt/case number</li>
        <li>The date and reference number from the RFE</li>
        <li>A list of every document enclosed</li>
        <li>A brief response to each item requested</li>
      </UL>
      <P>Immigration Mail's <Link to="/workflows/respond-to-notice" className="text-stamp font-semibold">Respond to a Notice</Link> workflow guides you through this step by step.</P>

      <H2>Step 4: Mail with proof of delivery</H2>
      <P>For immigration correspondence, certified mail is strongly recommended. It provides a USPS tracking number and a delivery record showing the date and (with return receipt) the signature of the recipient.</P>
      <Callout type="success"><PackageCheck size={16} className="inline mr-1" /> <strong>Tip:</strong> Certified mail with return receipt gives you a signed card back — physical proof that your response was received.</Callout>

      <H2>Step 5: Keep copies of everything</H2>
      <P>Retain copies of your cover letter, all enclosed documents, the tracking number, and the return receipt (if applicable). If USCIS claims they didn't receive your response, these records are your proof of timely submission.</P>

      <Callout><ShieldCheck size={16} className="inline mr-1" /> Immigration Mail retains your mailing record automatically — including the tracking number, mail type, and recipient address.</Callout>

      <H2>Key takeaways</H2>
      <UL>
        <li>Read the RFE carefully and note the deadline</li>
        <li>Gather exactly what's requested, with translations if needed</li>
        <li>Write a clear cover letter listing every enclosure</li>
        <li>Mail certified with return receipt for proof of delivery</li>
        <li>Keep copies of everything</li>
      </UL>

      <P className="mt-8 text-xs text-muted-foreground">This guide is for informational purposes only and does not constitute legal advice. If you need legal guidance, consult a qualified immigration attorney.</P>
    </>
  );
}

function ExplanationContent() {
  return (
    <>
      <P>An explanation letter accompanies your application or response to clarify circumstances that may raise questions — a gap in employment, a name change, a visa overstay explanation, or why certain evidence is unavailable.</P>

      <H2>What an explanation letter should do</H2>
      <UL>
        <li>State the facts clearly and chronologically</li>
        <li>Explain what happened and why</li>
        <li>Reference supporting documents where applicable</li>
        <li>Maintain a professional, respectful tone</li>
      </UL>

      <H2>What an explanation letter should NOT do</H2>
      <UL>
        <li>Make legal arguments or draw legal conclusions</li>
        <li>Include information you cannot verify</li>
        <li>Speculate about what the adjudicator wants to hear</li>
        <li>Be overly emotional or accusatory</li>
      </UL>

      <Callout type="warning"><AlertTriangle size={16} className="inline mr-1" /> <strong>Key principle:</strong> Stick to facts you can prove. The letter should inform, not advocate. If your situation requires legal strategy, consult an attorney.</Callout>

      <H2>Structure of an effective letter</H2>
      <UL>
        <li><strong>Header:</strong> Your name, case/receipt number, date, and "Re:" line referencing the relevant application or notice</li>
        <li><strong>Opening:</strong> State the purpose of the letter in one sentence</li>
        <li><strong>Body:</strong> Present the relevant facts chronologically, with clear dates and context</li>
        <li><strong>Reference:</strong> Mention enclosed supporting documents by name</li>
        <li><strong>Closing:</strong> Thank the reader and offer to provide additional information if needed</li>
      </UL>

      <H2>When to use an explanation letter</H2>
      <UL>
        <li>Clarifying a gap in employment or residence</li>
        <li>Explaining a name change or discrepancy across documents</li>
        <li>Clarifying a name discrepancy across documents</li>
        <li>Explaining why a specific document is unavailable</li>
        <li>Providing context for a visa overstay or status violation</li>
        <li>Clarifying the nature of a relationship for family-based petitions</li>
      </UL>

      <H2>How Immigration Mail helps</H2>
      <P>Immigration Mail's <Link to="/workflows/explanation-letter" className="text-stamp font-semibold">Explanation Letter workflow</Link> guides you through providing your facts and objective, then generates an editable draft. You review every word before it's mailed.</P>

      <Callout><FileText size={16} className="inline mr-1" /> The AI assistant organizes your input — it never invents facts, deadlines, or legal conclusions. Everything is editable.</Callout>

      <P className="mt-8 text-xs text-muted-foreground">This guide is for informational purposes only and does not constitute legal advice.</P>
    </>
  );
}

function CertifiedMailContent() {
  return (
    <>
      <P>When you send immigration correspondence — whether responding to an RFE, submitting supporting documents, or sending an explanation letter — proof that your letter arrived can be just as important as the letter itself.</P>

      <H2>What is certified mail?</H2>
      <P>Certified Mail is a USPS service that provides a tracking number and a delivery record. The sender receives confirmation that the item was delivered, including the date of delivery. With the return receipt option, you also receive a signed card confirming who accepted the delivery.</P>

      <H2>Why it matters for immigration correspondence</H2>
      <UL>
        <li><strong>Proof of timely submission:</strong> If USCIS or another agency claims they didn't receive your response, your certified mail receipt proves otherwise</li>
        <li><strong>Delivery date confirmation:</strong> The USPS delivery record shows exactly when your letter arrived</li>
        <li><strong>Signature proof:</strong> With return receipt, you have a physical card showing who signed for the delivery</li>
      </UL>

      <Callout type="warning"><AlertTriangle size={16} className="inline mr-1" /> <strong>Don't rely on standard mail alone</strong> for deadline-sensitive immigration correspondence. While standard includes tracking, it doesn't provide signature proof or a delivery record.</Callout>

      <H2>Comparing mail types</H2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm border border-rule rounded-lg overflow-hidden">
          <thead className="bg-paper-deep text-left text-xs font-semibold text-muted-foreground">
            <tr><th className="px-4 py-3">Feature</th><th className="px-4 py-3">Standard</th><th className="px-4 py-3">Certified</th><th className="px-4 py-3">Registered</th></tr>
          </thead>
          <tbody className="divide-y divide-rule text-ink-soft">
            <tr><td className="px-4 py-3 font-semibold">Tracking number</td><td className="px-4 py-3"><CheckCircle2 size={14} className="text-emerald-500" /></td><td className="px-4 py-3"><CheckCircle2 size={14} className="text-emerald-500" /></td><td className="px-4 py-3"><CheckCircle2 size={14} className="text-emerald-500" /></td></tr>
            <tr><td className="px-4 py-3 font-semibold">Delivery record</td><td className="px-4 py-3 text-muted-foreground">—</td><td className="px-4 py-3"><CheckCircle2 size={14} className="text-emerald-500" /></td><td className="px-4 py-3"><CheckCircle2 size={14} className="text-emerald-500" /></td></tr>
            <tr><td className="px-4 py-3 font-semibold">Signature proof</td><td className="px-4 py-3 text-muted-foreground">—</td><td className="px-4 py-3"><CheckCircle2 size={14} className="text-emerald-500" /></td><td className="px-4 py-3"><CheckCircle2 size={14} className="text-emerald-500" /></td></tr>
            <tr><td className="px-4 py-3 font-semibold">Insured delivery</td><td className="px-4 py-3 text-muted-foreground">—</td><td className="px-4 py-3 text-muted-foreground">—</td><td className="px-4 py-3"><CheckCircle2 size={14} className="text-emerald-500" /></td></tr>
            <tr><td className="px-4 py-3 font-semibold">Price</td><td className="px-4 py-3">{`${(PRICES.standard / 100).toFixed(2)}`}</td><td className="px-4 py-3">{`${(PRICES.certified / 100).toFixed(2)}`}</td><td className="px-4 py-3">{`${(PRICES.registered / 100).toFixed(2)}`}</td></tr>
          </tbody>
        </table>
      </div>

      <H2>Our recommendation</H2>
      <P>For most immigration correspondence — especially responses to RFEs, NOIDs, or other notices with deadlines — we recommend Certified Mail ($14.94). It provides delivery tracking and confirmation — your proof that your response was received by the agency. For highly sensitive documents, Registered Mail ($32.49) adds insured, secure handling.</P>

      <Callout type="success"><Stamp size={16} className="inline mr-1" /> <strong>Immigration Mail handles everything:</strong> printing, envelope, postage, tracking, and proof — all in one step. No printer or post office visit required.</Callout>

      <P className="mt-8 text-xs text-muted-foreground">This guide is for informational purposes only and does not constitute legal advice.</P>
    </>
  );
}
