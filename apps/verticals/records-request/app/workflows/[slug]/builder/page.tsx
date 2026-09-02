import { notFound, redirect } from 'next/navigation'
import { workflows } from '../../workflow-data'
import CodeEnforcementBuilder from './builder'
import GenericBuilder from './GenericBuilder'
import { recordsWorkflows } from '@/src/workflows'
import type { RecordsWorkflow } from '@/src/workflow-factory'
import { getApprovalPrincipal } from '@/src/authorization-runtime'

const SEPARATE_BUILDER_ROUTES = new Set(['police-records', 'planning-records'])
const DEDICATED_BUILDERS = new Set(['code-enforcement-records'])
const AI_WORKFLOW_SLUGS = new Set(recordsWorkflows.map((w: RecordsWorkflow) => w.id))

function getBuilderConfig(slug: string) {
  const wf = recordsWorkflows.find(w => w.id === slug)
  if (wf) {
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

  const catalog = workflows.find(item => item.slug === slug)
  if (!catalog) return null

  return {
    slug: catalog.slug,
    title: catalog.title,
    eyebrow: `${catalog.title.toUpperCase()} · REQUEST BUILDER`,
    lede: catalog.description,
    fields: [
      { id: 'agency', label: 'Agency', required: true, helpText: 'Which government agency or public body holds the records?' },
      { id: 'jurisdiction', label: 'Jurisdiction', helpText: 'City, county, state, department, or other jurisdiction.' },
      { id: 'dateStart', label: 'Start date', required: true },
      { id: 'dateEnd', label: 'End date', required: true },
      { id: 'matter', label: 'Matter or identifying details', required: true, helpText: 'Names, addresses, case numbers, project numbers, subjects, or other identifiers you know.' },
    ],
    categories: (catalog.bestFor.length ? catalog.bestFor : [catalog.intent]).map(value => [value, value]) as readonly [string, string][],
    agencyLabel: 'Agency',
    requireDateRange: true,
  }
}

export default async function WorkflowBuilderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const workflow = workflows.find(item => item.slug === slug)
  if (!workflow) notFound()

  const principal = await getApprovalPrincipal()
  if (!principal) {
    const returnTo = encodeURIComponent(`/workflows/${slug}/builder`)
    redirect(`/auth?returnTo=${returnTo}`)
  }

  if (SEPARATE_BUILDER_ROUTES.has(slug)) redirect(`/workflows/${slug}/builder`)
  if (DEDICATED_BUILDERS.has(slug)) return <CodeEnforcementBuilder />

  if (AI_WORKFLOW_SLUGS.has(slug)) {
    const config = getBuilderConfig(slug)
    if (config) return <GenericBuilder config={config} />
  }

  const config = getBuilderConfig(slug)
  if (config) return <GenericBuilder config={config} />
  notFound()
}
