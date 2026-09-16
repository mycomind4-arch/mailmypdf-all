import { createFileRoute } from "@tanstack/react-router"
import { sectionLandingConfigs } from "@/migration-copy/section-catalog"

export const Route = createFileRoute("/migration-preview/")({
  head: () => ({
    meta: [
      { title: "MailMyPDF Section Migration Preview" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PreviewIndex,
})

function PreviewIndex() {
  return <main className="mmp-app">
    <section className="mmp-section">
      <div className="mmp-section__inner">
        <div className="mmp-eyebrow">Migration preview</div>
        <h1 className="mmp-display" style={{fontSize:"clamp(3rem,6vw,5.5rem)",maxWidth:"12ch",margin:"1rem 0"}}>
          New section landing pages
        </h1>
        <p style={{maxWidth:760,color:"var(--mmp-ink-muted)",lineHeight:1.7}}>
          These are copied TanStack routes for validating the simplified MailMyPDF section architecture. Existing production routes have not been changed.
        </p>
        <div className="mmp-workflow-grid" style={{marginTop:"2rem"}}>
          {Object.values(sectionLandingConfigs).map((config) => (
            <article className="mmp-workflow-card" key={config.id}>
              <div className="mmp-workflow-card__body">
                <div className="mmp-eyebrow">Preview</div>
                <h2 style={{margin:0,font:"400 1.6rem/1.05 var(--mmp-font-display)"}}>{config.name}</h2>
                <p>{config.seoDescription}</p>
                <a className="mmp-workflow-card__action" href={"/migration-preview/" + config.id}>Open preview →</a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  </main>
}
