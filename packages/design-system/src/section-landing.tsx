import { createElement } from "react"
import { ArrowRight, CheckCircle2, FileText, Mail, Search, ShieldCheck } from "lucide-react"
import type { EcosystemTheme } from "./index.js"
import { createTrustStrip, createVerticalHero } from "./public-page.js"

export type SectionTone = "light" | "dark"
export interface SectionLandingConfig {
  id: EcosystemTheme
  name: string
  path: string
  tone: SectionTone
  seoTitle: string
  seoDescription: string
  eyebrow: string
  heroTitle: string
  heroDescription: string
  heroImage: string
  introTitle: string
  introText: string
  trustLead: string
  topics: ReadonlyArray<{ title: string; text: string }>
  featured: ReadonlyArray<{ slug: string; title: string; description: string; imageSrc?: string; imageAlt?: string }>
  outcomes: ReadonlyArray<string>
  safetyTitle: string
  safetyBody: string
  faqs: ReadonlyArray<readonly [string, string]>
  related: ReadonlyArray<{ name: string; path: string; description: string }>
}

const VerticalHero = createVerticalHero(createElement)
const TrustStrip = createTrustStrip(createElement)

function GlobalHeader({ config }: { config: SectionLandingConfig }) {
  return <header className="mmp-site-header">
    <div className="mmp-site-header__inner">
      <a className="mmp-brand-lockup" href="/" aria-label="MailMyPDF home">
        <span className="mmp-brand-mark" aria-hidden="true">M</span>
        <span className="mmp-brand-copy">
          <span className="mmp-brand-name">MailMyPDF</span>
          <span className="mmp-brand-product">{config.name}</span>
        </span>
      </a>
      <nav className="mmp-site-nav" aria-label="Primary navigation">
        <a href="/workflows">All workflows</a>
        <a href={config.path + "/workflows"}>{config.name} workflows</a>
        <a href="#how-it-works">How it works</a>
        <a href="#faq">FAQ</a>
      </nav>
      <div className="mmp-site-actions">
        <a className="mmp-button-secondary" href="/auth">Sign in</a>
        <a className="mmp-button-primary" href={config.path + "/workflows"}>Start a workflow</a>
      </div>
    </div>
  </header>
}

function GlobalFooter({ config }: { config: SectionLandingConfig }) {
  return <footer className="mmp-seo-footer">
    <div className="mmp-section__inner mmp-seo-footer__inner">
      <div>
        <strong className="mmp-brand-name">MailMyPDF</strong>
        <p>{config.name} workflows for document preparation, review, mailing, and proof.</p>
      </div>
      <nav aria-label="Footer navigation">
        <a href="/workflows">Workflows</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="/contact">Contact</a>
      </nav>
    </div>
  </footer>
}

export function SectionLandingPage({ config }: { config: SectionLandingConfig }) {
  const directory = config.path + "/workflows"
  return <div className="mmp-app" data-mmp-theme={config.id}>
    <GlobalHeader config={config} />
    <main>
      <nav className="mmp-breadcrumbs" aria-label="Breadcrumb">
        <div className="mmp-section__inner">
          <a href="/">MailMyPDF</a><span aria-hidden="true">/</span><span aria-current="page">{config.name}</span>
        </div>
      </nav>

      <VerticalHero
        theme={config.id}
        tone={config.tone}
        eyebrow={config.eyebrow}
        title={config.heroTitle}
        description={config.heroDescription}
        imageSrc={config.heroImage}
        imageAlt={config.name + " guided workflow documents and correspondence"}
        actions={<>
          <a className="mmp-button-primary" href={directory}>Browse {config.name} workflows <ArrowRight size={16}/></a>
          <a className="mmp-button-secondary" href="#how-it-works">How it works</a>
        </>}
        meta={<><span>30 focused workflows</span><span>Review before consequential action</span><span>Mailing & proof options</span></>}
      />

      <TrustStrip items={[
        { icon:<FileText size={16}/>, title:config.trustLead, description:"Start from the real document, decision, notice, claim, or record" },
        { icon:<Search size={16}/>, title:"Evidence stays connected", description:"Keep facts, dates, records, and supporting documents together" },
        { icon:<ShieldCheck size={16}/>, title:"You review the result", description:"Generated drafts and extracted details remain reviewable" },
        { icon:<Mail size={16}/>, title:"Mailing and proof", description:"Keep the approved packet and available delivery record together" },
      ]}/>

      <section className="mmp-section">
        <div className="mmp-section__inner">
          <div className="mmp-section-heading">
            <div><div className="mmp-eyebrow">Focused workflows</div><h2>{config.introTitle}</h2></div>
            <p>{config.introText}</p>
          </div>
          <div className="mmp-workflow-grid">
            {config.featured.map((workflow) => <article className="mmp-workflow-card" key={workflow.slug}>
              {workflow.imageSrc ? <a className="mmp-workflow-card__media" href={directory + "/" + workflow.slug} aria-label={workflow.title}>
                <img src={workflow.imageSrc} alt={workflow.imageAlt ?? ""}/>
              </a> : null}
              <div className="mmp-workflow-card__body">
                <div className="mmp-eyebrow">{config.name}</div>
                <h3>{workflow.title}</h3>
                <p>{workflow.description}</p>
                <a className="mmp-workflow-card__action" href={directory + "/" + workflow.slug}>Explore {workflow.title} →</a>
              </div>
            </article>)}
          </div>
          <div className="mmp-seo-centered-action"><a className="mmp-button-primary" href={directory}>Browse all 30 {config.name} workflows <ArrowRight size={16}/></a></div>
        </div>
      </section>

      <section className="mmp-section mmp-section--tight mmp-seo-topics">
        <div className="mmp-section__inner">
          <div className="mmp-section-heading">
            <div><div className="mmp-eyebrow">What you can handle</div><h2>Choose the workflow that matches the situation.</h2></div>
            <p>Each page is intended to answer a distinct search need and route the user into a workflow built for that specific problem rather than a generic letter generator.</p>
          </div>
          <div className="mmp-seo-topic-grid">
            {config.topics.map((topic) => <article className="mmp-card mmp-seo-topic-card" key={topic.title}><h3>{topic.title}</h3><p>{topic.text}</p></article>)}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mmp-section">
        <div className="mmp-section__inner">
          <div className="mmp-section-heading">
            <div><div className="mmp-eyebrow">How it works</div><h2>Source record → organized matter → reviewed correspondence → proof.</h2></div>
            <p>The same MailMyPDF engine handles secure documents, structured facts, drafting, review, packet generation, mailing, and proof while each workflow supplies the questions and rules unique to the situation.</p>
          </div>
          <div className="mmp-process-grid">
            {[
              ["1","Identify","Choose the workflow and start from the actual notice, decision, claim, record, or correspondence."],
              ["2","Organize","Add the facts, dates, people, amounts, documents, and supporting evidence relevant to the matter."],
              ["3","Prepare","Build structured, editable correspondence or a packet from the reviewed record."],
              ["4","Review","Verify material facts, recipient details, attachments, and the exact outgoing document."],
              ["5","Send & prove","Download it or use supported mailing options and retain the available tracking and proof record."],
            ].map(([n,t,d]) => <div className="mmp-process-step" key={n}><span className="mmp-process-step__number">{n}</span><h3>{t}</h3><p>{d}</p></div>)}
          </div>
        </div>
      </section>

      <section className="mmp-section mmp-section--ink">
        <div className="mmp-section__inner">
          <div className="mmp-section-heading">
            <div><div className="mmp-eyebrow mmp-seo-eyebrow-light">Review and control</div><h2>{config.safetyTitle}</h2></div>
            <p>{config.safetyBody}</p>
          </div>
          <div className="mmp-seo-outcome-grid">
            {config.outcomes.map((item) => <div className="mmp-seo-outcome" key={item}><CheckCircle2 size={19}/><span>{item}</span></div>)}
          </div>
        </div>
      </section>

      <section id="faq" className="mmp-section">
        <div className="mmp-section__inner mmp-seo-faq-wrap">
          <div><div className="mmp-eyebrow">Common questions</div><h2 className="mmp-seo-faq-title">Questions people ask before starting.</h2></div>
          <div className="mmp-seo-faq-list">
            {config.faqs.map(([q,a]) => <details className="mmp-seo-faq" key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}
          </div>
        </div>
      </section>

      <section className="mmp-section mmp-section--tight mmp-seo-related">
        <div className="mmp-section__inner">
          <div className="mmp-section-heading">
            <div><div className="mmp-eyebrow">Related MailMyPDF sections</div><h2>Continue from the problem, not the product menu.</h2></div>
            <p>Related sections connect adjacent search intent and give users a useful next path when the issue spans more than one type of correspondence.</p>
          </div>
          <div className="mmp-seo-related-grid">
            {config.related.map((item) => <a className="mmp-card mmp-seo-related-card" href={item.path} key={item.path}><span className="mmp-eyebrow">MailMyPDF</span><h3>{item.name}</h3><p>{item.description}</p><strong>Explore {item.name} →</strong></a>)}
          </div>
        </div>
      </section>

      <section className="mmp-section">
        <div className="mmp-section__inner">
          <div className="mmp-final-cta"><div className="mmp-final-cta__inner">
            <div><h2>Start with the workflow built for your situation.</h2><p>Choose from the {config.name} workflow directory, review the information and documents as you go, and keep the final packet and proof record connected.</p></div>
            <div><a className="mmp-button-primary" href={directory}>Browse {config.name} workflows <ArrowRight size={16}/></a></div>
          </div></div>
        </div>
      </section>
    </main>
    <GlobalFooter config={config} />
  </div>
}
