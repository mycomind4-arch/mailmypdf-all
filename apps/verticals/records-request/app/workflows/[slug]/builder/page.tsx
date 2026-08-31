import { notFound } from 'next/navigation'
import { workflows } from '../../workflow-data'
import CodeEnforcementBuilder from './builder'
import GenericBuilder from './GenericBuilder'
import { recordsWorkflows } from '@/src/workflows'
import type { RecordsWorkflow } from '@/src/workflow-factory'

// Workflows with their own dedicated builder route (not under [slug])
const SEPARATE_BUILDER_ROUTES = new Set(['police-records', 'planning-records'])

// Workflows with dedicated builder components in [slug]/builder
const DEDICATED_BUILDERS = new Set(['code-enforcement-records'])

// All AI-powered workflow slugs
const AI_WORKFLOW_SLUGS = new Set(recordsWorkflows.map((w: RecordsWorkflow) => w.id))

function getBuilderConfig(slug: string) {
  const wf = recordsWorkflows.find(w => w.id === slug)
  if (!wf) return null

  const categories: [string, string][] = wf.request.categories.map(cat => {
    const label = cat.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
    return [cat, label]
  })

  return {
    slug: wf.id,
    title: wf.name,
    eyebrow: `${wf.name.toUpperCase()} · REQUEST BUILDER`,
    lede: wf.description,
    fields: wf.intake as readonly { id: string; label: string; required?: boolean; helpText?: string }[],
    categories: categories as readonly [string, string][],
    agencyLabel: 'Agency',
    requireDateRange: true,
  }
}

export default async function WorkflowBuilderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const workflow = workflows.find((item) => item.slug === slug)
  if (!workflow) notFound()

  // Skip workflows that have their own separate builder routes
  if (SEPARATE_BUILDER_ROUTES.has(slug)) notFound()

  // Use dedicated builder for code-enforcement
  if (DEDICATED_BUILDERS.has(slug)) return <CodeEnforcementBuilder />

  // Use generic builder for all other AI-powered workflows
  if (AI_WORKFLOW_SLUGS.has(slug)) {
    const config = getBuilderConfig(slug)
    if (config) return <GenericBuilder config={config} />
  }

  notFound()
}
