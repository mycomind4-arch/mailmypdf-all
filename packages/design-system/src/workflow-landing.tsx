import { ArrowRight, CheckCircle2, FileText, Search, ShieldCheck } from "lucide-react"

export interface WorkflowLandingConfig {
  id: string
  sectionId: string
  sectionName: string
  sectionPath: string
  path: string
  startPath: string
  title: string
  seoTitle: string
  seoDescription: string
  eyebrow: string
  heroTitle: string
  heroDescription: string
  indexable: boolean
  contentStatus: "scaffold" | "reviewed" | "published"
  whatYouDo?: ReadonlyArray<string>
  whatYouNeed?: ReadonlyArray<string>
  outputs?: ReadonlyArray<string>
  faqs?: ReadonlyArray<readonly [string, string]>
}

const defaultWhatYouDo = [
  "Start from the real notice, decision, record, claim, or correspondence involved.",
  "Organize the relevant facts, dates, people, amounts, documents, and supporting evidence.",
  "Prepare a focused, reviewable document or packet for this specific workflow.",
]

const defaultWhatYouNeed = [
  "The source document or event that triggered the workflow",
  "Relevant dates, names, account or case information, and prior correspondence",
  "Supporting documents or evidence you want connected to the matter",
]

const defaultOutputs = [
  "A structured, editable draft or packet",
  "A connected record of supporting facts and documents",
  "A review step before any consequential action or mailing",
]

export function WorkflowLandingPage({ config }: { config: WorkflowLandingConfig }) {
  const whatYouDo = config.whatYouDo ?? defaultWhatYouDo
  const whatYouNeed = config.whatYouNeed ?? defaultWhatYouNeed
  const outputs = config.outputs ?? defaultOutputs

  return <div className="mmp-app" data-mmp-theme={config.sectionId}>
    <header className="mmp-site-header">
      <div className="mmp-site-header__inner">
        <a className="mmp-brand-lockup" href="/" aria-label="MailMyPDF home">
          <span className="mmp-brand-mark" aria-hidden="true">M</span>
          <span className="mmp-brand-copy">
            <span className="mmp-brand-name">MailMyPDF</span>
            <span className="mmp-brand-product">{config.sectionName}</span>
          </span>
        </a>
        <nav className="mmp-site-nav" aria-label="Primary navigation">
          <a href={config.sectionPath}>Overview</a>
          <a href={config.sectionPath + "/workflows"}>{config.sectionName} workflows</a>
          <a href="/workflows">All workflows</a>
        </nav>
        <div className="mmp-site-actions">
          <a className="mmp-button-secondary" href="/auth">Sign in</a>
          <a className="mmp-button-primary" href={config.startPath}>Start workflow</a>
        </div>
      </div>
    </header>

    <main>
      <nav className="mmp-breadcrumbs" aria-label="Breadcrumb">
        <div className="mmp-section__inner">
          <a href="/">MailMyPDF</a><span aria-hidden="true">/</span>
          <a href={config.sectionPath}>{config.sectionName}</a><span aria-hidden="true">/</span>
          <span aria-current="page">{config.title}</span>
        </div>
      </nav>

      <section className="mmp-section">
        <div className="mmp-section__inner">
          <div className="mmp-section-heading">
            <div>
              <div className="mmp-eyebrow">{config.eyebrow}</div>
              <h1>{config.heroTitle}</h1>
            </div>
            <div>
              <p>{config.heroDescription}</p>
              <div className="mmp-site-actions">
                <a className="mmp-button-primary" href={config.startPath}>Start {config.title} <ArrowRight size={16}/></a>
                <a className="mmp-button-secondary" href={config.sectionPath + "/workflows"}>Browse related workflows</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mmp-section mmp-section--tight">
        <div className="mmp-section__inner">
          <div className="mmp-seo-topic-grid">
            <article className="mmp-card mmp-seo-topic-card">
              <FileText size={20}/>
              <h2>What this workflow helps you do</h2>
              {whatYouDo.map(item => <p key={item}><CheckCircle2 size={15}/> {item}</p>)}
            </article>
            <article className="mmp-card mmp-seo-topic-card">
              <Search size={20}/>
              <h2>What to have ready</h2>
              {whatYouNeed.map(item => <p key={item}><CheckCircle2 size={15}/> {item}</p>)}
            </article>
            <article className="mmp-card mmp-seo-topic-card">
              <ShieldCheck size={20}/>
              <h2>What you keep control of</h2>
              {outputs.map(item => <p key={item}><CheckCircle2 size={15}/> {item}</p>)}
            </article>
          </div>
        </div>
      </section>

      {config.faqs?.length ? <section id="faq" className="mmp-section">
        <div className="mmp-section__inner mmp-seo-faq-wrap">
          <div><div className="mmp-eyebrow">Common questions</div><h2 className="mmp-seo-faq-title">About this workflow</h2></div>
          <div className="mmp-seo-faq-list">
            {config.faqs.map(([q,a]) => <details className="mmp-seo-faq" key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}
          </div>
        </div>
      </section> : null}

      <section className="mmp-section">
        <div className="mmp-section__inner">
          <div className="mmp-final-cta"><div className="mmp-final-cta__inner">
            <div>
              <h2>Start with the workflow built for this situation.</h2>
              <p>Review the information and documents as you go. Consequential actions remain behind explicit review and approval steps.</p>
            </div>
            <div><a className="mmp-button-primary" href={config.startPath}>Start workflow <ArrowRight size={16}/></a></div>
          </div></div>
        </div>
      </section>
    </main>
  </div>
}
