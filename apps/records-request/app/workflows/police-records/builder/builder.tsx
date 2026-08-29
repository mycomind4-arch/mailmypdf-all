'use client'

import { useState } from 'react'
import Link from 'next/link'
import { EcosystemFooter } from '@/app/components/EcosystemFooter'

const categories = [
  ['incident-report','Incident / offense reports'],
  ['arrest-records','Arrest / booking records'],
  ['dispatch-cad','CAD / dispatch'],
  ['body-camera','Body-camera footage'],
  ['dash-camera','Dash-camera footage'],
  ['911-calls','911 calls / communications'],
  ['photographs-and-video','Photographs / video'],
  ['witness-and-victim-statements','Witness / victim statements'],
  ['supplemental-reports','Supplemental reports'],
  ['correspondence-and-case-notes','Correspondence / case notes'],
] as const

const fields: { id: string; label: string; required?: boolean; type?: string }[] = [
  { id: 'agency', label: 'Agency *', required: true },
  { id: 'department', label: 'Likely unit / custodian' },
  { id: 'incidentDateStart', label: 'Incident start date *', required: true, type: 'date' },
  { id: 'incidentDateEnd', label: 'Incident end date *', required: true, type: 'date' },
  { id: 'incidentNumber', label: 'Incident / report number' },
  { id: 'arrestNumber', label: 'Arrest / booking number' },
  { id: 'location', label: 'Incident location' },
  { id: 'person', label: 'Person involved' },
  { id: 'vehicle', label: 'Vehicle / plate / unit identifier' },
] as const

export function PoliceRecordsBuilder() {
  const [form, setForm] = useState<Record<string, string>>(Object.fromEntries(fields.map(f => [f.id, ''])))
  const [subjectMatter, setSubjectMatter] = useState('')
  const [selected, setSelected] = useState<string[]>(categories.map(([id]) => id))
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const set = (key: string, value: string) => setForm(current => ({ ...current, [key]: value }))

  const submit = async () => {
    const missing = fields.filter(f => f.required && !form[f.id]?.trim())
    if (missing.length || !subjectMatter.trim() || (!form.incidentNumber.trim() && !form.location.trim() && !form.person.trim())) {
      setStatus('error')
      setMessage('Add the required incident details and at least one identifier such as an incident number, location, or person.')
      return
    }
    setStatus('saving')
    setMessage('')
    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: `Police Records — ${subjectMatter}`,
          agency: form.agency,
          purpose: 'Police records request',
          scope: JSON.stringify({ workflow: 'police-records', ...form, subjectMatter, categories: selected }),
          items: selected.map(id => ({
            category: categories.find(([catId]) => catId === id)?.[1] ?? id,
            description: `${categories.find(([catId]) => catId === id)?.[1] ?? id} for ${subjectMatter}. ${fields.filter(f => form[f.id]).map(f => `${f.label}: ${form[f.id]}`).join('. ')}.`,
            dateStart: form.incidentDateStart || undefined,
            dateEnd: form.incidentDateEnd || undefined,
          })),
        }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body?.issues?.[0]?.message ?? body?.error ?? 'Unable to create request')
      setStatus('saved')
      setMessage(`Request ${body.request?.id ?? ''} created and saved.`)
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Unable to create request')
    }
  }

  const hasAgency = Boolean(form.agency?.trim())
  const hasDates = Boolean(form.incidentDateStart && form.incidentDateEnd)
  const hasCategories = selected.length > 0
  const hasIdentifier = Boolean(form.incidentNumber?.trim() || form.location?.trim() || form.person?.trim())
  const readiness = [
    { label: 'Agency identified', done: hasAgency },
    { label: 'Date range specified', done: hasDates },
    { label: 'Record categories selected', done: hasCategories },
    { label: 'Incident identifier provided', done: hasIdentifier },
  ]

  return (
    <main className="builder-shell">
      <section className="builder-wrap">
        <div className="eyebrow">POLICE RECORDS · REQUEST BUILDER</div>
        <h1>Build the request around the incident.</h1>
        <p className="lede">Give the agency the identifiers it already uses so the search can reach reports, dispatch, recordings, and case materials without unnecessary guesswork.</p>

        <div className="builder-card">
          <h2>1. Identify the incident</h2>
          <p>Provide the key details so the agency can locate the records.</p>
          <div className="form-grid" style={{ marginTop: 18 }}>
            {fields.map(field => (
              <label key={field.id} className={field.type === 'date' ? '' : 'full'}>
                <span className="label">{field.label}</span>
                <input
                  type={field.type === 'date' ? 'date' : 'text'}
                  value={form[field.id]}
                  onChange={e => set(field.id, e.target.value)}
                  aria-required={field.required ?? false}
                />
              </label>
            ))}
          </div>
          <label style={{ display: 'block', marginTop: 18 }}>
            <span className="label">Incident or subject matter *</span>
            <textarea rows={4} value={subjectMatter} onChange={e => setSubjectMatter(e.target.value)} placeholder="e.g. traffic collision, arrest, use of force, burglary, welfare check" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', background: 'var(--paper)', fontSize: 14, marginTop: 6 }} />
          </label>
        </div>

        <div className="builder-card">
          <h2>2. Choose the records</h2>
          <p>Select the record categories to include in your request.</p>
          <div className="category-grid" style={{ marginTop: 16 }}>
            {categories.map(([id, label]) => (
              <label key={id}>
                <input type="checkbox" checked={selected.includes(id)} onChange={e => setSelected(current => e.target.checked ? [...current, id] : current.filter(value => value !== id))} />
                <div className="cat-content"><strong>{label}</strong></div>
              </label>
            ))}
          </div>
        </div>

        <div className="builder-card">
          <h2>3. Request readiness</h2>
          <p>Review what you have before creating the request.</p>
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {readiness.map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                <span style={{ color: item.done ? 'var(--success-text)' : 'var(--ink-muted)' }}>{item.done ? '✓' : '○'}</span>
                <span style={{ color: item.done ? 'var(--ink)' : 'var(--ink-muted)' }}>{item.label}</span>
              </div>
            ))}
          </div>
          {message && <div className={status === 'error' ? 'issue' : 'builder-note'} style={{ margin: '16px 0' }}>{message}</div>}
          <div className="builder-actions">
            <button className="primary" onClick={submit} disabled={status === 'saving'}>
              {status === 'saving' ? 'Saving…' : 'Create request →'}
            </button>
            <Link className="secondary" href="/workflows/police-records">Back to overview</Link>
          </div>
        </div>
      </section>
      <EcosystemFooter />
    </main>
  )
}
