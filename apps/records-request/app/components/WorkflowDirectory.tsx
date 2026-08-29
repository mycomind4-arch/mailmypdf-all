'use client'

import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

type Workflow = { slug: string; title: string; description: string; category: string }
type Group = { title: string; items: string[]; description: string }

const FEATURED_SLUGS = ['public-records-request', 'code-enforcement-records', 'property-records', 'police-records', 'permit-inspection-records', 'planning-records']

export default function WorkflowDirectory({ workflows, groups }: { workflows: Workflow[]; groups: Group[] }) {
  const pathname = usePathname()
  const [query, setQuery] = useState('')
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return workflows
    return workflows.filter((w) => `${w.slug} ${w.title} ${w.description} ${w.category}`.toLowerCase().includes(normalized))
  }, [query, workflows])
  const allowed = new Set(filtered.map((w) => w.slug))
  const featured = FEATURED_SLUGS.map((slug) => workflows.find((workflow) => workflow.slug === slug)).filter((workflow): workflow is Workflow => Boolean(workflow))
  const featuredVisible = featured.length ? featured.map((_, offset) => featured[(featuredIndex + offset) % featured.length]).slice(0, 3) : []

  if (pathname === '/') {
    return <div className="featuredCarousel" aria-label="Featured records workflows">
      <div className="sectionHeadingRow featuredCarouselHeading">
        <div><h3>Start with a common records job.</h3><p>Featured starting points for some of the most common records requests.</p></div>
        <Link className="textLink" href="/workflows">View all workflows →</Link>
      </div>
      {featuredVisible.length > 0 && <>
        <div className="featuredCarouselViewport">
          {featuredVisible.map((workflow) => <Link key={workflow.slug} href={`/workflows/${workflow.slug}`} className="featuredWorkflowCard">
            <div className="featuredWorkflowCard__media"><span>{workflow.category}</span></div>
            <div className="featuredWorkflowCard__body"><h3>{workflow.title}</h3><p>{workflow.description}</p><span className="featuredWorkflowCard__link">Explore workflow <ArrowRight size={14} /></span></div>
          </Link>)}
        </div>
        {featured.length > 1 && <div className="featuredCarouselControls"><div className="featuredCarouselDots">
          {featured.map((workflow, index) => <button key={workflow.slug} type="button" aria-label={`Show featured workflow ${index + 1}`} aria-current={index === featuredIndex} onClick={() => setFeaturedIndex(index)} />)}
        </div><div className="featuredCarouselArrows">
          <button type="button" onClick={() => setFeaturedIndex((current) => (current - 1 + featured.length) % featured.length)} aria-label="Previous featured workflows"><ChevronLeft size={18} /></button>
          <button type="button" onClick={() => setFeaturedIndex((current) => (current + 1) % featured.length)} aria-label="Next featured workflows"><ChevronRight size={18} /></button>
        </div></div>}
      </>}
    </div>
  }

  return <>
    <div className="directorySearch">
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search workflows — police records, permits, FOIA, property…" aria-label="Search records workflows" />
      <span>{filtered.length} workflows</span>
    </div>
    <div className="workflowGroups">
      {groups.map((group) => {
        const visible = group.items.filter((slug) => allowed.has(slug))
        if (!visible.length) return null
        return <div className="workflowGroup" key={group.title}>
          <div><h3>{group.title}</h3><p>{group.description}</p></div>
          <div className="workflowCards">
            {visible.map((slug) => {
              const item = workflows.find((w) => w.slug === slug)
              if (!item) return null
              return <Link key={slug} href={`/workflows/${slug}`} className="workflowCard workflowCardPremium">
                <div className="workflowCardImage"><span>{item.category}</span></div>
                <div className="workflowCardBody"><strong>{item.title}</strong><span>{item.description}</span><span className="workflowLink">Explore workflow →</span></div>
              </Link>
            })}
          </div>
        </div>
      })}
    </div>
  </>
}
