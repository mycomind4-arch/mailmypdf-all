import { createElement } from "react"
import { ArrowRight, FileText } from "lucide-react"
import type { SectionLandingConfig } from "./section-landing.js"
import { createGlobalFooter, createGlobalHeader } from "./public-page.js"

const AUTH_ENTRY_HREF = "/auth?redirect=%2Fdashboard"
const GlobalHeader = createGlobalHeader(createElement)
const GlobalFooter = createGlobalFooter(createElement)

export type SectionWorkflowDirectoryItem = {
  slug: string
  label: string
  description?: string
}

export function SectionWorkflowDirectoryPage({
  config,
  workflows,
}: {
  config: SectionLandingConfig
  workflows: ReadonlyArray<SectionWorkflowDirectoryItem>
}) {
  const directory = config.path + "/workflows"
  const featuredBySlug = new Map(config.featured.map((item) => [item.slug, item]))

  return <div className="mmp-app" data-mmp-theme={config.id}>
    <GlobalHeader productName={config.name} sectionPath={config.path} workflowsPath={directory} authHref={AUTH_ENTRY_HREF} />
    <main>
      <nav className="mmp-breadcrumbs" aria-label="Breadcrumb">
        <div className="mmp-section__inner">
          <a href="/">MailMyPDF</a><span aria-hidden="true">/</span>
          <a href={config.path}>{config.name}</a><span aria-hidden="true">/</span>
          <span aria-current="page">Workflows</span>
        </div>
      </nav>

      <section className="mmp-section mmp-section--tight">
        <div className="mmp-section__inner">
          <div className="mmp-section-heading">
            <div>
              <div className="mmp-eyebrow">{config.eyebrow}</div>
              <h1>{config.name} workflows</h1>
            </div>
            <p>{config.introText}</p>
          </div>

          <div className="mmp-workflow-grid">
            {workflows.map((workflow) => {
              const featured = featuredBySlug.get(workflow.slug)
              return <article className="mmp-workflow-card" key={workflow.slug}>
                <div className="mmp-workflow-card__body">
                  <div className="mmp-eyebrow">{config.name}</div>
                  <h2>{workflow.label}</h2>
                  <p>{workflow.description ?? featured?.description ?? "Open this workflow guide to review its purpose, required facts, evidence, and current execution state."}</p>
                  <a className="mmp-workflow-card__action" href={directory + "/" + workflow.slug}>
                    Explore {workflow.label} <ArrowRight size={16}/>
                  </a>
                </div>
              </article>
            })}
          </div>

          {!workflows.length ? <div className="mmp-card">
            <FileText size={20}/>
            <h2>No workflows are registered yet.</h2>
            <p>This section is present, but its workflow registry is still being integrated.</p>
          </div> : null}
        </div>
      </section>
    </main>
    <GlobalFooter productName={config.name} tagline={config.name + " workflow directory."} />
  </div>
}
