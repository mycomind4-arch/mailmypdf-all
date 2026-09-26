import { createElement } from "react"
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  BriefcaseBusiness,
  CheckCircle2,
  CircleHelp,
  CreditCard,
  FileCheck2,
  FileText,
  FolderOpen,
  LayoutGrid,
  Mail,
  ShieldCheck,
  Truck,
  Upload,
  UserRound,
} from "lucide-react"
import { createGlobalFooter, createGlobalHeader, createTrustStrip, createVerticalHero } from "./public-page.js"
import { getWorkflowImageSrc } from './workflow-images.js'

const AUTH_ENTRY_HREF = "/auth?redirect=%2Fdashboard"
const VerticalHero = createVerticalHero(createElement)
const TrustStrip = createTrustStrip(createElement)
const GlobalHeader = createGlobalHeader(createElement)
const GlobalFooter = createGlobalFooter(createElement)

export interface WorkflowDiscoveryConfig {
  /** The natural-language question this page should answer most directly. */
  primaryQuestion: string
  /** Closely related user questions that are substantively answered on-page. */
  alternateQuestions?: ReadonlyArray<string>
  /** Government agency, organization, or decision-maker named by the source document. */
  agency?: string
  /** Jurisdiction the workflow content was reviewed for. */
  jurisdiction?: string
  /** Human-readable source document or matter type. */
  documentType?: string
}

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
  /** Canonical workflow visual. Reuse this same asset for directory thumbnails. */
  heroImage?: string
  heroImageAlt?: string
  heroTone?: "light" | "dark"
  indexable: boolean
  contentStatus: "scaffold" | "reviewed" | "published"
  /** Structured retrieval context used by SEO/schema generators; never a substitute for visible page content. */
  discovery?: WorkflowDiscoveryConfig
  whatYouDo?: ReadonlyArray<string>
  whatYouNeed?: ReadonlyArray<string>
  outputs?: ReadonlyArray<string>
  faqs?: ReadonlyArray<readonly [string, string]>
  workspaceHighlights?: ReadonlyArray<readonly [string, string]>
  workflowSteps?: ReadonlyArray<readonly [string, string]>
  readyItems?: ReadonlyArray<readonly [string, string]>
  /** Adjacent workflows to cross-link when this one isn't quite the right fit. */
  relatedWorkflows?: ReadonlyArray<{ title: string; path: string; description: string }>
  primaryCtaLabel?: string
  secondaryCtaLabel?: string
  secondaryCtaHref?: string
  overview?: string
  responseOptions?: ReadonlyArray<readonly [string, string]>
  commonMistakes?: ReadonlyArray<string>
  sources?: ReadonlyArray<{ title: string; href: string; publisher?: string }>
  disclaimer?: string
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

const defaultTrustHighlights = [
  ["Source-grounded drafting", "Drafts are prepared only from the source document and the facts you confirm, never invented."],
  ["Reviewed at every step", "Extracted details and generated text stay visible and editable before anything moves forward."],
  ["Mailing and proof included", "Approve the exact packet, then mail it and keep the tracking and proof record together."],
] as const

const trustIcons = [FileCheck2, BrainCircuit, ShieldCheck] as const
const readyIcons = [FileText, FolderOpen, FileCheck2, UserRound] as const

const defaultAppealHighlights = [
  ["Official forms", "Prepare the forms and correspondence required for the appeal."],
  ["Document analysis", "Extract key details and organize the source record and supporting evidence."],
  ["Complete filing support", "Review, assemble, mail, track, and retain proof for the finished packet."],
] as const

const defaultAppealSteps = [
  ["Upload documents", "Add the decision or notice and any supporting evidence."],
  ["We analyze", "Extract key information and identify what the workflow needs."],
  ["Review your packet", "See the completed forms and correspondence before anything is sent."],
  ["Pay and mail", "Complete payment and submit the approved packet for mailing."],
  ["Track and retain proof", "Keep tracking, fulfillment status, and mailing proof with the matter."],
] as const

const appealLandingStyles = `
.mmp-appeal-landing{min-height:100vh;display:grid;grid-template-columns:220px minmax(0,1fr);color:var(--mmp-ink);background:#f8fafc;font-family:var(--mmp-font-body)}
.mmp-appeal-landing__sidebar{position:sticky;top:0;height:100vh;display:flex;flex-direction:column;border-right:1px solid #e2e8f0;background:#fff}
.mmp-appeal-landing__brand{height:70px;padding:0 24px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #e2e8f0;color:#0f172a;text-decoration:none;font-weight:750;font-size:18px}
.mmp-appeal-landing__brand-mark{width:28px;height:28px;display:grid;place-items:center;border-radius:7px;color:#fff;background:#2563eb}
.mmp-appeal-landing__nav{display:grid;gap:4px;padding:12px}
.mmp-appeal-landing__nav a{min-height:44px;padding:0 12px;display:flex;align-items:center;gap:11px;border-radius:8px;color:#475569;text-decoration:none;font-size:14px;font-weight:600}
.mmp-appeal-landing__nav a:hover{background:#f1f5f9;color:#0f172a}.mmp-appeal-landing__nav a.is-active{color:#1d4ed8;background:#eaf2ff}
.mmp-appeal-landing__nav svg{width:18px;height:18px}.mmp-appeal-landing__sidebar-foot{margin-top:auto;padding:18px 24px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px}
.mmp-appeal-landing__main{min-width:0}.mmp-appeal-landing__topbar{height:70px;padding:0 36px;display:flex;align-items:center;justify-content:flex-end;border-bottom:1px solid #e2e8f0;background:rgba(255,255,255,.94);position:sticky;top:0;z-index:10;backdrop-filter:blur(14px)}
.mmp-appeal-landing__account{display:flex;align-items:center;gap:9px;color:#334155;font-size:14px;font-weight:600}.mmp-appeal-landing__avatar{width:34px;height:34px;display:grid;place-items:center;border-radius:50%;color:#334155;background:#e2e8f0;font-size:12px;font-weight:800}
.mmp-appeal-landing__content{width:min(calc(100% - 64px),1180px);margin:0 auto;padding:30px 0 64px}.mmp-appeal-landing__back{display:inline-flex;align-items:center;gap:7px;margin-bottom:30px;color:#2563eb;text-decoration:none;font-size:14px;font-weight:650}
.mmp-appeal-landing__hero{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(320px,.9fr);gap:44px;align-items:start}.mmp-appeal-landing__title{margin:0;color:#0f172a;font:700 clamp(2.2rem,4vw,3.45rem)/1.02 var(--mmp-font-body);letter-spacing:-.035em}
.mmp-appeal-landing__description{max-width:720px;margin:14px 0 0;color:#475569;font-size:17px;line-height:1.6}.mmp-appeal-landing__highlights{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:28px}.mmp-appeal-landing__highlight{display:grid;grid-template-columns:28px minmax(0,1fr);gap:10px}.mmp-appeal-landing__highlight-icon{width:26px;height:26px;display:grid;place-items:center;color:#2563eb}.mmp-appeal-landing__highlight-icon svg{width:22px;height:22px}.mmp-appeal-landing__highlight strong{display:block;color:#0f172a;font-size:13px}.mmp-appeal-landing__highlight span{display:block;margin-top:4px;color:#64748b;font-size:11px;line-height:1.45}
.mmp-appeal-landing__start{margin-top:30px;min-height:48px;padding:0 22px;display:inline-flex;align-items:center;gap:12px;border-radius:7px;color:#fff;background:#2563eb;text-decoration:none;font-size:15px;font-weight:700;box-shadow:0 8px 20px -12px rgba(37,99,235,.65)}.mmp-appeal-landing__start:hover{background:#1d4ed8}.mmp-appeal-landing__visual{aspect-ratio:1.34/1;overflow:hidden;border:1px solid #d8e0e9;border-radius:10px;background:#e7edf4;box-shadow:0 8px 24px -18px rgba(15,23,42,.28)}.mmp-appeal-landing__visual img{width:100%;height:100%;display:block;object-fit:cover}.mmp-appeal-landing__visual-fallback{width:100%;height:100%;display:grid;place-items:center;color:#334155;background:linear-gradient(145deg,#e6edf5,#f8fafc)}
.mmp-appeal-landing__steps{margin-top:40px;padding:24px 20px 26px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:0;border:1px solid #dbe7f5;border-radius:10px;background:#eef6ff}.mmp-appeal-landing__step{position:relative;padding:0 12px;text-align:center}.mmp-appeal-landing__step:not(:last-child):after{content:"";position:absolute;top:17px;left:calc(50% + 28px);right:calc(-50% + 28px);height:1px;background:#bfd0e4}.mmp-appeal-landing__step-number{position:relative;z-index:1;width:34px;height:34px;margin:0 auto 12px;display:grid;place-items:center;border:1px solid #cbd5e1;border-radius:50%;color:#475569;background:#fff;font-size:13px;font-weight:750}.mmp-appeal-landing__step:first-child .mmp-appeal-landing__step-number{border-color:#2563eb;color:#fff;background:#2563eb}.mmp-appeal-landing__step strong{display:block;color:#0f172a;font-size:12px}.mmp-appeal-landing__step p{margin:7px auto 0;color:#64748b;font-size:10.5px;line-height:1.45;max-width:170px}
.mmp-appeal-landing__lower{margin-top:28px;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(320px,.85fr);gap:26px}.mmp-appeal-landing__panel{padding:24px;border:1px solid #dbe2ea;border-radius:10px;background:#fff;box-shadow:0 2px 8px -7px rgba(15,23,42,.28)}.mmp-appeal-landing__panel h2{margin:0;color:#0f172a;font-size:22px;letter-spacing:-.02em}.mmp-appeal-landing__panel-lede{margin:8px 0 18px;color:#64748b;font-size:13px}.mmp-appeal-landing__ready-list{display:grid}.mmp-appeal-landing__ready-item{padding:15px 0;display:grid;grid-template-columns:42px minmax(0,1fr);gap:14px;border-top:1px solid #eef2f7}.mmp-appeal-landing__ready-item:first-child{border-top:0}.mmp-appeal-landing__ready-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:7px;color:#334155;background:#f1f5f9}.mmp-appeal-landing__ready-icon svg{width:19px;height:19px}.mmp-appeal-landing__ready-item strong{display:block;color:#0f172a;font-size:13px}.mmp-appeal-landing__ready-item span{display:block;margin-top:4px;color:#64748b;font-size:12px;line-height:1.45}.mmp-appeal-landing__faq{border-top:1px solid #e2e8f0}.mmp-appeal-landing__faq details{border-bottom:1px solid #e2e8f0}.mmp-appeal-landing__faq summary{padding:14px 2px;display:flex;justify-content:space-between;gap:10px;cursor:pointer;list-style:none;color:#0f172a;font-size:13px;font-weight:650}.mmp-appeal-landing__faq summary::-webkit-details-marker{display:none}.mmp-appeal-landing__faq p{margin:0;padding:0 2px 15px;color:#64748b;font-size:12px;line-height:1.6}
.mmp-appeal-landing__helper{margin-top:28px;padding:18px 20px;display:flex;align-items:center;gap:14px;border:1px solid #bfdbfe;border-radius:9px;background:#eff6ff}.mmp-appeal-landing__helper svg{flex:0 0 auto;color:#2563eb}.mmp-appeal-landing__helper-copy{min-width:0;flex:1}.mmp-appeal-landing__helper strong{display:block;color:#0f172a;font-size:13px}.mmp-appeal-landing__helper span{display:block;margin-top:4px;color:#64748b;font-size:11.5px}.mmp-appeal-landing__helper a{min-height:38px;padding:0 14px;display:inline-flex;align-items:center;border:1px solid #bfdbfe;border-radius:7px;color:#2563eb;background:#fff;text-decoration:none;font-size:12px;font-weight:700}
@media(max-width:1050px){.mmp-appeal-landing{grid-template-columns:1fr}.mmp-appeal-landing__sidebar{position:static;height:auto}.mmp-appeal-landing__brand{height:60px}.mmp-appeal-landing__nav{display:flex;overflow:auto}.mmp-appeal-landing__nav a{flex:0 0 auto}.mmp-appeal-landing__sidebar-foot{display:none}.mmp-appeal-landing__topbar{top:0}.mmp-appeal-landing__hero{grid-template-columns:1fr}.mmp-appeal-landing__visual{max-width:620px}.mmp-appeal-landing__lower{grid-template-columns:1fr}}
@media(max-width:720px){.mmp-appeal-landing__content{width:min(calc(100% - 32px),1180px);padding-top:20px}.mmp-appeal-landing__topbar{height:58px;padding:0 16px}.mmp-appeal-landing__title{font-size:2.35rem}.mmp-appeal-landing__description{font-size:15px}.mmp-appeal-landing__highlights{grid-template-columns:1fr}.mmp-appeal-landing__steps{grid-template-columns:1fr;gap:14px}.mmp-appeal-landing__step{display:grid;grid-template-columns:38px minmax(0,1fr);gap:12px;text-align:left}.mmp-appeal-landing__step:not(:last-child):after{display:none}.mmp-appeal-landing__step-number{margin:0}.mmp-appeal-landing__step p{max-width:none;margin-top:4px}.mmp-appeal-landing__helper{align-items:flex-start;flex-wrap:wrap}.mmp-appeal-landing__helper a{margin-left:40px}}
`

function AppealMailWorkflowLandingPage({ config }: { config: WorkflowLandingConfig }) {
  const heroImage = config.heroImage ?? getWorkflowImageSrc(config.id)
  const highlights = config.workspaceHighlights ?? defaultAppealHighlights
  const steps = config.workflowSteps ?? defaultAppealSteps
  const readyItems = config.readyItems ?? (config.whatYouNeed ?? defaultWhatYouNeed).map((item) => [item, ""] as const)
  const highlightIcons = [FileCheck2, BrainCircuit, Mail] as const
  const readyIcons = [FileText, FolderOpen, FileCheck2, UserRound] as const

  return <div className="mmp-appeal-landing" data-mmp-theme="appeal-mail">
    <style>{appealLandingStyles}</style>
    <aside className="mmp-appeal-landing__sidebar">
      <a className="mmp-appeal-landing__brand" href={config.sectionPath}>
        <span className="mmp-appeal-landing__brand-mark"><Mail size={17}/></span>
        <span>Appeal Mail</span>
      </a>
      <nav className="mmp-appeal-landing__nav" aria-label="Appeal Mail workspace">
        <a className="is-active" href={config.sectionPath + "/workflows"}><LayoutGrid/> Workflows</a>
        <a href="/matters"><BriefcaseBusiness/> My Matters</a>
        <a href="/documents"><FolderOpen/> Documents</a>
        <a href="/billing"><CreditCard/> Billing</a>
        <a href="/account"><UserRound/> Account</a>
      </nav>
      <div className="mmp-appeal-landing__sidebar-foot">MailMyPDF · Appeal Mail</div>
    </aside>

    <div className="mmp-appeal-landing__main">
      <header className="mmp-appeal-landing__topbar">
        <div className="mmp-appeal-landing__account"><span className="mmp-appeal-landing__avatar">A</span><span>Account</span></div>
      </header>

      <main className="mmp-appeal-landing__content">
        <a className="mmp-appeal-landing__back" href={config.sectionPath + "/workflows"}><ArrowLeft size={16}/> All workflows</a>

        <section className="mmp-appeal-landing__hero">
          <div>
            <h1 className="mmp-appeal-landing__title">{config.heroTitle}</h1>
            <p className="mmp-appeal-landing__description">{config.heroDescription}</p>
            <div className="mmp-appeal-landing__highlights">
              {highlights.map(([title, description], index) => {
                const Icon = highlightIcons[index % highlightIcons.length]
                return <div className="mmp-appeal-landing__highlight" key={title}>
                  <span className="mmp-appeal-landing__highlight-icon"><Icon/></span>
                  <span><strong>{title}</strong><span>{description}</span></span>
                </div>
              })}
            </div>
            <a className="mmp-appeal-landing__start" href={config.startPath}>Start new appeal <ArrowRight size={17}/></a>
          </div>

          <div className="mmp-appeal-landing__visual">
            {heroImage ? <img src={heroImage} alt={config.heroImageAlt ?? config.title}/> : <div className="mmp-appeal-landing__visual-fallback"><FileText size={72}/></div>}
          </div>
        </section>

        <section className="mmp-appeal-landing__steps" aria-label="How the workflow works">
          {steps.map(([title, description], index) => <div className="mmp-appeal-landing__step" key={title}>
            <div className="mmp-appeal-landing__step-number">{index + 1}</div>
            <div><strong>{title}</strong><p>{description}</p></div>
          </div>)}
        </section>

        <section className="mmp-appeal-landing__lower">
          <article className="mmp-appeal-landing__panel">
            <h2>What you’ll need</h2>
            <p className="mmp-appeal-landing__panel-lede">Have these items ready to get started. You can add more supporting material later.</p>
            <div className="mmp-appeal-landing__ready-list">
              {readyItems.map(([title, description], index) => {
                const Icon = readyIcons[index % readyIcons.length]
                return <div className="mmp-appeal-landing__ready-item" key={title}>
                  <span className="mmp-appeal-landing__ready-icon"><Icon/></span>
                  <span><strong>{title}</strong>{description ? <span>{description}</span> : null}</span>
                </div>
              })}
            </div>
          </article>

          <article className="mmp-appeal-landing__panel">
            <h2>Common questions</h2>
            <p className="mmp-appeal-landing__panel-lede">Review the workflow details before you begin.</p>
            {config.faqs?.length ? <div className="mmp-appeal-landing__faq">
              {config.faqs.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">⌄</span></summary><p>{answer}</p></details>)}
            </div> : <div className="mmp-appeal-landing__ready-list">
              <div className="mmp-appeal-landing__ready-item"><span className="mmp-appeal-landing__ready-icon"><CircleHelp/></span><span><strong>Questions about this workflow?</strong><span>You can review the source documents and each step before anything is submitted or mailed.</span></span></div>
            </div>}
          </article>
        </section>

        <section className="mmp-appeal-landing__helper">
          <CircleHelp size={20}/>
          <div className="mmp-appeal-landing__helper-copy"><strong>Not sure if this is the right workflow?</strong><span>If your appeal involves a different decision or process, browse the other Appeal Mail workflows.</span></div>
          <a href={config.sectionPath + "/workflows"}>View all workflows</a>
        </section>
      </main>
    </div>
  </div>
}

/**
 * The one public, unauthenticated workflow landing page every workflow uses
 * (this is deliberately the SEO surface — the matching authenticated
 * workspace/dashboard views live under _authenticated/dashboard/workflows and
 * are out of scope here). Sections beyond the hero and 3-up summary render
 * only when the config actually supplies their data, so an unfinished config
 * degrades gracefully instead of showing an empty section.
 */
export function WorkflowLandingPage({ config }: { config: WorkflowLandingConfig }) {
  if (config.sectionId === "appeal-mail") {
    return <AppealMailWorkflowLandingPage config={config}/>
  }

  const whatYouDo = config.whatYouDo ?? defaultWhatYouDo
  const whatYouNeed = config.whatYouNeed ?? defaultWhatYouNeed
  const outputs = config.outputs ?? defaultOutputs
  const heroImage = config.heroImage ?? getWorkflowImageSrc(config.id)
  const directory = config.sectionPath + "/workflows"
  const trustHighlights = config.workspaceHighlights ?? defaultTrustHighlights
  const workflowSteps = config.workflowSteps ?? []
  const readyItems = config.readyItems ?? []
  const relatedWorkflows = config.relatedWorkflows ?? []
  const responseOptions = config.responseOptions ?? []
  const commonMistakes = config.commonMistakes ?? []
  const sources = config.sources ?? []
  const primaryCtaLabel = config.primaryCtaLabel ?? `Start ${config.title}`
  const secondaryCtaLabel = config.secondaryCtaLabel ?? (workflowSteps.length ? "See how it works" : "Browse related workflows")
  const secondaryCtaHref = config.secondaryCtaHref ?? (workflowSteps.length ? "#how-it-works" : directory)

  return <div className="mmp-app" data-mmp-theme={config.sectionId}>
    <GlobalHeader productName={config.sectionName} sectionPath={config.sectionPath} workflowsPath={directory} authHref={AUTH_ENTRY_HREF} />

    <main>
      <nav className="mmp-breadcrumbs" aria-label="Breadcrumb">
        <div className="mmp-section__inner">
          <a href="/">MailMyPDF</a><span aria-hidden="true">/</span>
          <a href={config.sectionPath}>{config.sectionName}</a><span aria-hidden="true">/</span>
          <span aria-current="page">{config.title}</span>
        </div>
      </nav>

      {heroImage ? (
        <VerticalHero
          theme={config.sectionId as any}
          tone={config.heroTone ?? "dark"}
          eyebrow={config.eyebrow}
          title={config.heroTitle}
          description={config.heroDescription}
          imageSrc={heroImage}
          imageAlt={config.heroImageAlt ?? config.title}
          actions={<>
            <a className="mmp-button-primary" href={config.startPath}>{primaryCtaLabel} <ArrowRight size={16}/></a>
            <a className="mmp-button-secondary" href={secondaryCtaHref}>{secondaryCtaLabel}</a>
          </>}
          meta={<>
            {workflowSteps.length ? <span>{workflowSteps.length}-step guided workflow</span> : null}
            <span>Review before mailing</span>
          </>}
        />
      ) : <section className="mmp-section">
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
                <a className="mmp-button-secondary" href={directory}>Browse related workflows</a>
              </div>
            </div>
          </div>
        </div>
      </section>}

      <TrustStrip items={trustHighlights.map(([title, description], index) => {
        const Icon = trustIcons[index % trustIcons.length]!
        return { icon: <Icon size={16}/>, title, description }
      })} />

      {config.overview ? <section className="mmp-section">
        <div className="mmp-section__inner">
          <div className="mmp-section-heading">
            <div><div className="mmp-eyebrow">What this means</div><h2>Understand the situation before you start.</h2></div>
            <p>{config.overview}</p>
          </div>
        </div>
      </section> : null}

      <section className="mmp-section mmp-section--tight">
        <div className="mmp-section__inner">
          <div className="mmp-seo-topic-grid">
            <article className="mmp-card mmp-seo-topic-card">
              <FileText size={20}/>
              <h2>What this workflow helps you do</h2>
              {whatYouDo.map(item => <p key={item}><CheckCircle2 size={15}/> {item}</p>)}
            </article>
            <article className="mmp-card mmp-seo-topic-card">
              <Upload size={20}/>
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

      {responseOptions.length ? <section className="mmp-section">
        <div className="mmp-section__inner">
          <div className="mmp-section-heading">
            <div><div className="mmp-eyebrow">Your response path</div><h2>Choose the path that matches your records.</h2></div>
            <p>The workflow does not assume a particular outcome. It helps you organize the response path supported by the source document and the facts you confirm.</p>
          </div>
          <div className="mmp-seo-topic-grid">
            {responseOptions.map(([title, description]) => <article className="mmp-card mmp-seo-topic-card" key={title}>
              <FileCheck2 size={20}/>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>)}
          </div>
        </div>
      </section> : null}

      {workflowSteps.length ? <section id="how-it-works" className="mmp-section">
        <div className="mmp-section__inner">
          <div className="mmp-section-heading">
            <div><div className="mmp-eyebrow">How it works</div><h2>Step by step, from the source document to mailed proof.</h2></div>
            <p>{config.title} follows the same reviewed sequence every time: a source document, confirmed facts, a drafted response, an exact reviewed packet, and a mailed, tracked record.</p>
          </div>
          <div className="mmp-process-grid">
            {workflowSteps.map(([title, description], index) => (
              <div className="mmp-process-step" key={title}>
                <span className="mmp-process-step__number">{index + 1}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section> : null}

      {readyItems.length ? <section className="mmp-section mmp-section--tight">
        <div className="mmp-section__inner">
          <div className="mmp-section-heading">
            <div><div className="mmp-eyebrow">Before you start</div><h2>What you'll need for {config.title}.</h2></div>
            <p>Have these ready to get started. You can add more supporting material once the matter is open.</p>
          </div>
          <div className="mmp-ready-grid">
            {readyItems.map(([title, description], index) => {
              const Icon = readyIcons[index % readyIcons.length]!
              return <div className="mmp-card mmp-ready-item" key={title}>
                <span className="mmp-ready-item__icon" aria-hidden="true"><Icon/></span>
                <div><h3>{title}</h3>{description ? <p>{description}</p> : null}</div>
              </div>
            })}
          </div>
        </div>
      </section> : null}

      {commonMistakes.length ? <section className="mmp-section mmp-section--tight">
        <div className="mmp-section__inner">
          <div className="mmp-section-heading">
            <div><div className="mmp-eyebrow">Common mistakes</div><h2>Keep the response specific, documented, and reviewable.</h2></div>
            <p>Use the source document and your own records as the source of truth. Review each important fact before anything is submitted or mailed.</p>
          </div>
          <div className="mmp-card mmp-seo-topic-card">
            {commonMistakes.map(item => <p key={item}><CheckCircle2 size={15}/> {item}</p>)}
          </div>
        </div>
      </section> : null}

      {config.faqs?.length ? <section id="faq" className="mmp-section">
        <div className="mmp-section__inner mmp-seo-faq-wrap">
          <div><div className="mmp-eyebrow">Common questions</div><h2 className="mmp-seo-faq-title">About this workflow</h2></div>
          <div className="mmp-seo-faq-list">
            {config.faqs.map(([q,a]) => <details className="mmp-seo-faq" key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}
          </div>
        </div>
      </section> : null}

      {sources.length ? <section className="mmp-section mmp-section--tight">
        <div className="mmp-section__inner">
          <div className="mmp-section-heading">
            <div><div className="mmp-eyebrow">Official sources</div><h2>Review the guidance behind this workflow.</h2></div>
            <p>Always follow the instructions, dates, and addresses on your own source document. These links provide additional official context.</p>
          </div>
          <div className="mmp-seo-related-grid">
            {sources.map(source => <a className="mmp-card mmp-seo-related-card" href={source.href} key={source.href}>
              <span className="mmp-eyebrow">{source.publisher ?? "Official source"}</span>
              <h3>{source.title}</h3>
              <strong>Open source →</strong>
            </a>)}
          </div>
          {config.disclaimer ? <p>{config.disclaimer}</p> : null}
        </div>
      </section> : null}

      {relatedWorkflows.length ? <section className="mmp-section mmp-section--tight mmp-seo-related">
        <div className="mmp-section__inner">
          <div className="mmp-section-heading">
            <div><div className="mmp-eyebrow">Not quite the right fit?</div><h2>Related {config.sectionName} workflows.</h2></div>
            <p>If your situation is close but not exactly this one, one of these may match it better.</p>
          </div>
          <div className="mmp-seo-related-grid">
            {relatedWorkflows.map((item) => (
              <a className="mmp-card mmp-seo-related-card" href={item.path} key={item.path}>
                <span className="mmp-eyebrow">{config.sectionName}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <strong>Explore {item.title} →</strong>
              </a>
            ))}
          </div>
        </div>
      </section> : null}

      <section className="mmp-section">
        <div className="mmp-section__inner">
          <div className="mmp-final-cta"><div className="mmp-final-cta__inner">
            <div>
              <h2>Ready to start {config.title}?</h2>
              <p>Work from the real source document, confirm the important facts, and review the exact output before any consequential action or mailing.</p>
            </div>
            <div><a className="mmp-button-primary" href={config.startPath}>{primaryCtaLabel} <ArrowRight size={16}/></a></div>
          </div></div>
        </div>
      </section>
    </main>
    <GlobalFooter productName={config.sectionName} tagline={`${config.sectionName} workflows for document preparation, review, mailing, and proof.`} />
  </div>
}
