'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MAILMYPDF_HOME } from '@/app/lib/ecosystem'
import { EcosystemFooter } from '@/app/components/EcosystemFooter'
import Link from 'next/link'

type Field = { id: string; label: string; required?: boolean; helpText?: string; type?: string }
type WorkflowConfig = {
  slug: string
  title: string
  eyebrow: string
  lede: string
  fields: readonly Field[]
  categories: readonly [string, string][]
  agencyLabel: string
  requireDateRange: boolean
}

export default function GenericBuilder({ config }: { config: WorkflowConfig }) {
  const router = useRouter()
  const [fields, setFields] = useState<Record<string, string>>(() => Object.fromEntries(config.fields.map(f => [f.id, ''])))
  const [selectedCats, setSelectedCats] = useState<string[]>(config.categories.map(([id]) => id))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (id: string, value: string) => setFields(current => ({ ...current, [id]: value }))

  const requiredFields = config.fields.filter(f => f.required)
  const canSubmit = requiredFields.every(f => fields[f.id]?.trim())

  // Request readiness indicators
  const hasAgency = Boolean(fields.agency?.trim())
  const hasDateRange = Boolean(fields.dateStart && fields.dateEnd)
  const hasCategories = selectedCats.length > 0
  const hasIdentifiers = config.fields
    .filter(f => !['agency', 'jurisdiction', 'dateStart', 'dateEnd'].includes(f.id))
    .some(f => fields[f.id]?.trim())

  const readiness = [
    { label: 'Agency identified', done: hasAgency },
    { label: 'Date range specified', done: hasDateRange },
    { label: 'Record categories selected', done: hasCategories },
    { label: 'Identifying information provided', done: hasIdentifiers },
  ]

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const catMap = new Map(config.categories)
      const items = selectedCats.map(catId => ({
        category: catId,
        description: `${catMap.get(catId) ?? catId} for the requested matter. ${config.fields.filter(f => fields[f.id]).map(f => `${f.label}: ${fields[f.id]}`).join('. ')}.`,
        dateStart: fields.dateStart || undefined,
        dateEnd: fields.dateEnd || undefined,
      }))

      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: `${config.title} — ${fields[config.fields[0].id] || 'Request'}`,
          agency: fields.agency || '',
          jurisdiction: fields.jurisdiction || undefined,
          purpose: `Build a ${config.title} using the Records Requests workflow.`,
          scope: JSON.stringify({ workflow: config.slug, ...fields, categories: selectedCats }),
          items,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.issues?.[0]?.message || data?.error || 'Request creation failed')
      router.push(`/dashboard?request=${encodeURIComponent(data.request?.id ?? '')}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request creation failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="builder-shell">
      <section className="builder-wrap">
        <div className="eyebrow">{config.eyebrow}</div>
        <h1>Build the request.</h1>
        <p className="lede">{config.lede}</p>

        <div className="builder-card" style={{ padding: 28 }}>
          <h2>1. Identify the matter</h2>
          <p>Provide the key details so the agency can locate the records.</p>
          <div className="form-grid" style={{ marginTop: 18 }}>
            {config.fields.map(field => (
              <label key={field.id} className={field.id.includes('date') ? '' : 'full'}>
                <span className="label">{field.label}{field.required && ' *'}</span>
                <input
                  type={field.id.includes('date') ? 'date' : 'text'}
                  value={fields[field.id]}
                  onChange={e => update(field.id, e.target.value)}
                  aria-required={field.required ?? false}
                  placeholder={field.helpText || ''}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="builder-card" style={{ padding: 28, marginTop: 16 }}>
          <h2>2. Choose the records</h2>
          <p>Select the record categories to include in your request.</p>
          <div className="category-grid" style={{ marginTop: 16 }}>
            {config.categories.map(([id, label]) => (
              <label key={id}>
                <input
                  type="checkbox"
                  checked={selectedCats.includes(id)}
                  onChange={e => setSelectedCats(current => e.target.checked ? [...current, id] : current.filter(c => c !== id))}
                />
                <div className="cat-content">
                  <strong>{label}</strong>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="builder-card" style={{ padding: 28, marginTop: 16 }}>
          <h2>3. Request readiness</h2>
          <p>Review what you have before creating the request. Missing items can be added later.</p>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {readiness.map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                <span style={{ color: item.done ? 'var(--success-text)' : 'var(--ink-muted)' }}>{item.done ? '✓' : '○'}</span>
                <span style={{ color: item.done ? 'var(--ink)' : 'var(--ink-muted)' }}>{item.label}</span>
              </div>
            ))}
          </div>
          {error && <div className="issue" style={{ margin: '16px 0' }}>{error}</div>}
          <div className="builder-actions">
            <button className="primary" onClick={submit} disabled={submitting || !canSubmit}>
              {submitting ? 'Saving…' : 'Create request →'}
            </button>
            <Link className="secondary" href={`/workflows/${config.slug}`}>Back to overview</Link>
          </div>
        </div>
      </section>
      <EcosystemFooter />
    </main>
  )
}
