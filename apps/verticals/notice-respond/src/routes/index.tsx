import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Eye, FileText, Mail, Search, ShieldCheck } from "lucide-react";
import { createElement } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { NOTICE_WORKFLOWS } from "@/components/notice-workflow-directory-fixed";
import { createTrustStrip, createVerticalHero } from "../../../../../packages/design-system/src/index";

const SITE_ORIGIN = "https://notice-respond.pages.dev";
const VerticalHero = createVerticalHero(createElement);
const TrustStrip = createTrustStrip(createElement);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Notice Respond — Respond to Government & Official Notices | MailMyPDF" },
      { name: "description", content: "Find the right workflow for IRS notices, Social Security notices, DMV and state notices, benefits notices, code enforcement, permits, courts, and other official agency correspondence." },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "Notice Respond — Government Notice Response Workflows" },
      { property: "og:description", content: "Understand the notice, organize the facts and evidence, prepare the response, review it, and keep mailing and proof together." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Notice Respond · MailMyPDF" },
      { property: "og:url", content: SITE_ORIGIN + "/" },
      { property: "og:image", content: SITE_ORIGIN + "/ecosystem-hero-sprite.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: SITE_ORIGIN + "/" }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: "Notice Respond", description: "Specialized workflows for responding to official notices and government correspondence.", url: SITE_ORIGIN, publisher: { "@type": "Organization", name: "MailMyPDF" }, hasPart: NOTICE_WORKFLOWS.map((workflow) => ({ "@type": "WebPage", name: workflow.title, url: SITE_ORIGIN + workflow.route, about: workflow.searchIntent })) }) }],
  }),
  component: HomePage,
});

function HomePage() {
  const featured = NOTICE_WORKFLOWS.slice(0, 6);
  const categories = [...new Set(NOTICE_WORKFLOWS.map((workflow) => workflow.category))];
  return <main>
    <SiteHeader />
    <VerticalHero
      theme="notice-respond"
      tone="dark"
      eyebrow="Notice Respond · Open. Understand. Respond."
      title="Don't ignore that notice."
      description="Start from the official notice you actually received. Identify what it says, organize the facts and supporting records, prepare a reviewable response, and use MailMyPDF mailing and proof options when you're ready to send."
      imageSrc="/ecosystem-hero-sprite.jpg"
      imageAlt="Government building representing official notices and agency correspondence"
      imageBackgroundSize="200% 300%"
      imageBackgroundPosition="0% 0%"
      actions={<>
        <Link to="/workflows/analyze" className="mmp-button-primary">Analyze My Notice <ArrowRight size={16}/></Link>
        <Link to="/workflows" className="mmp-button-secondary">Find a Workflow</Link>
      </>}
      meta={<><span>Public workflow discovery</span><span>Protected private execution</span><span>Review before mailing</span></>}
    />
    <TrustStrip items={[
      { icon:<FileText size={16}/>, title:"Notice-first workflows", description:"Start from the document you received" },
      { icon:<Search size={16}/>, title:"Facts & deadlines surfaced", description:"Keep extracted information reviewable" },
      { icon:<ShieldCheck size={16}/>, title:"Approval before mailing", description:"You review the exact response" },
      { icon:<Mail size={16}/>, title:"Tracking & proof options", description:"Keep the mailing record together" },
    ]}/>

    <section className="mmp-section">
      <div className="mmp-section__inner">
        <div className="mmp-section-heading"><div><div className="eyebrow">Popular notice workflows</div><h2>Find the workflow for the notice in front of you.</h2></div><p>Notice Respond is organized around distinct notice types and agency actions rather than one generic government-letter template.</p></div>
        <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:10,marginBottom:24}}>{categories.slice(0,7).map(category=><a key={category} href={`/workflows?category=${encodeURIComponent(category)}`} className="mmp-button-secondary" style={{whiteSpace:'nowrap'}}>{category}</a>)}</div>
        <div className="mmp-workflow-grid">{featured.map(workflow=><article className="mmp-workflow-card" key={workflow.slug}><div className="mmp-workflow-card__body"><div className="eyebrow">{workflow.category}</div><h3>{workflow.title}</h3><p>{workflow.description}</p><Link className="mmp-workflow-card__action" to={workflow.route}>View workflow →</Link></div></article>)}</div>
        <div style={{marginTop:28}}><Link to="/workflows" className="mmp-button-primary">Browse all {NOTICE_WORKFLOWS.length} workflows <ArrowRight size={16}/></Link></div>
      </div>
    </section>

    <section className="mmp-section mmp-section--tight" style={{background:'var(--mmp-paper-deep)'}}>
      <div className="mmp-section__inner"><div className="mmp-section-heading"><div><div className="eyebrow">Not sure which workflow?</div><h2>Start from the notice itself.</h2></div><p>The authenticated notice analyzer can help identify the notice and organize the next step from the source document. Starting that private analysis still requires your MailMyPDF account.</p></div><Link to="/workflows/analyze" className="mmp-button-primary">Analyze My Notice <ArrowRight size={16}/></Link></div>
    </section>

    <section id="how" className="mmp-section">
      <div className="mmp-section__inner"><div className="mmp-section-heading"><div><div className="eyebrow">How Notice Respond works</div><h2>Notice → facts → evidence → response → proof.</h2></div><p>Each stage keeps the source document visible and separates extracted facts, user-supplied facts, generated suggestions, approval, payment, and mailing.</p></div><div className="mmp-process-grid">{[
        ['1','Upload or identify','Start from the actual notice, agency, notice number, dates, and requested action.'],
        ['2','Understand the record','Surface facts, deadlines, reference numbers, and questions that need review.'],
        ['3','Organize evidence','Attach records and supporting material to the issues they actually support.'],
        ['4','Review & approve','Prepare the response and verify the exact wording and attachments before authorization.'],
        ['5','Send & prove','Use MailMyPDF mailing when selected, then retain tracking and available delivery proof.'],
      ].map(([n,t,d])=><div className="mmp-process-step" key={n}><span className="mmp-process-step__number">{n}</span><h3>{t}</h3><p>{d}</p></div>)}</div></div>
    </section>

    <section className="mmp-section mmp-section--ink">
      <div className="mmp-section__inner"><div className="mmp-section-heading"><div><div className="eyebrow" style={{color:'var(--mmp-accent-soft)'}}>Trust architecture</div><h2>You stay in control of every consequential step.</h2></div><p>The notice remains source material. AI assistance does not become verified fact automatically. You review the response, approval applies to the exact draft, and mailing requires explicit authorization.</p></div><div className="mmp-workflow-grid">{[
        ['Source material first','The notice and supporting documents remain distinguishable from generated suggestions.'],
        ['No fabricated facts','Missing details should be asked for or marked uncertain rather than invented.'],
        ['Review before approval','You review names, dates, amounts, claims, recipient details, and attachments.'],
        ['Mail only when authorized','Payment, approval, and physical mailing remain separate consequential steps.'],
      ].map(([t,d])=><div className="mmp-workflow-card" key={t}><div className="mmp-workflow-card__body"><Eye size={18}/><h3>{t}</h3><p>{d}</p></div></div>)}</div></div>
    </section>

    <section className="mmp-section"><div className="mmp-section__inner"><div className="mmp-final-cta"><div className="mmp-final-cta__inner"><div><h2>Open the notice. Understand it. Build the response.</h2><p>Start with the document in front of you and move into the protected workflow only when you're ready to work on the actual response.</p></div><Link to="/workflows/analyze" className="mmp-button-primary">Analyze My Notice →</Link></div></div></div></section>
    <SiteFooter />
  </main>;
}
