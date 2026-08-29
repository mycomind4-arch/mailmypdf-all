'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'

type Workflow = { slug: string; title: string; description: string; category: string }

const FEATURED_SLUGS = [
  'public-records-request',
  'code-enforcement-records',
  'property-records',
  'police-records',
  'permit-inspection-records',
  'planning-records',
]

export default function FeaturedWorkflowsCarousel({ workflows }: { workflows: Workflow[] }) {
  const featured = useMemo(() => FEATURED_SLUGS
    .map((slug) => workflows.find((workflow) => workflow.slug === slug))
    .filter((workflow): workflow is Workflow => Boolean(workflow)), [workflows])
  const [index, setIndex] = useState(0)

  if (!featured.length) return null

  const visible = featured.map((_, offset) => featured[(index + offset) % featured.length])
  const move = (delta: number) => setIndex((current) => (current + delta + featured.length) % featured.length)

  return (
    <div className="featuredCarousel" aria-label="Featured records workflows">
      <div className="featuredCarouselViewport">
        {visible.slice(0, 3).map((workflow) => (
          <Link key={workflow.slug} href={`/workflows/${workflow.slug}`} className="featuredWorkflowCard">
            <div className="featuredWorkflowCard__media" aria-hidden="true">
              <div className="featuredWorkflowCard__rule" />
              <span>{workflow.category}</span>
            </div>
            <div className="featuredWorkflowCard__body">
              <h3>{workflow.title}</h3>
              <p>{workflow.description}</p>
              <span className="featuredWorkflowCard__link">Explore workflow <ArrowRight size={14} /></span>
            </div>
          </Link>
        ))}
      </div>
      <div className="featuredCarouselControls">
        <div className="featuredCarouselDots" aria-label="Featured workflow position">
          {featured.map((workflow, dotIndex) => (
            <button
              key={workflow.slug}
              type="button"
              aria-label={`Show featured workflow ${dotIndex + 1}`}
              aria-current={dotIndex === index}
              onClick={() => setIndex(dotIndex)}
            />
          ))}
        </div>
        <div className="featuredCarouselArrows">
          <button type="button" onClick={() => move(-1)} aria-label="Previous featured workflows"><ChevronLeft size={18} /></button>
          <button type="button" onClick={() => move(1)} aria-label="Next featured workflows"><ChevronRight size={18} /></button>
        </div>
      </div>
    </div>
  )
}
