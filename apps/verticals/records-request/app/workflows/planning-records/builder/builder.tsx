'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { EcosystemFooter } from '@/app/components/EcosystemFooter'

const categories = [
  ['planning-application','Planning / development applications'],
  ['zoning','Zoning and land-use records'],
  ['staff-reports','Staff reports / analyses'],
  ['site-plans','Site plans and project plans'],
  ['planning-communications','Planning department communications'],
  ['public-notices','Notices and hearing materials'],
  ['planning-commission','Planning commission records'],
  ['conditions-of-approval','Conditions / resolutions / approvals'],
  ['environmental','Environmental review records'],
  ['related-permits','Related permits and cross-referenced records'],
] as const

const fields: { id: string; label: string; required?: boolean }[] = [
  { id: 'agency', label: 'Agency *', required: true },
  { id: 'jurisdiction', label: 'City / county / jurisdiction' },
  { id: 'address', label: 'Property address' },
  { id: 'parcel', label: 'Parcel / APN' },
  { id: 'projectNumber', label: 'Project / application number' },
  { id: 'projectName', label: 'Project name' },
  { id: 'applicant', label: 'Applicant / owner' },
] as const

export function PlanningRecordsBuilder() {
  const [form, setForm] = useState<Record<string, string>>(Object.fromEntries(fields.map(f => [f.id, ''])))
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [subjectMatter, setSubjectMatter] = useState('')
  const [selected, setSelected] = useState<string[]>(categories.map(([id]) => id))
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const set = (key: string, value: string) => setForm(current => ({ ...current, [key]: value }))

  const requestItems = useMemo(() => {
    const context = [
      form.address && `property address: ${form.address}`,
      form.parcel && `parcel/APN: ${form.parcel}`,
      form.projectNumber && `project number: ${form.projectNumber}`,
      form.projectName && `project name: ${form.projectName}`,
      form.applicant && `applicant: ${form.applicant}`,
    ].filter(Boolean).join('; ')
    return selected.map(id => {
      const label = categories.find(([categoryId]) => categoryId === id)?.[1] ?? id
      return {
        category: label,
        description: `${label} relating to ${subjectMatter || 'the identified planning matter'}${context ? ` (${context})` : ''}. Include responsive attachments and records that are maintained with the identified matter.`,
        dateStart: dateStart || undefined,
        dateEnd: dateEnd || undefined,
        format: 'Electronic/native format when available',
      }
    })
  }, [form, selected, subjectMatter, dateStart, dateEnd])

  const submit = async () => {
    if (!form.agency.trim() || !dateStart.trim() || !dateEnd.trim() || !subjectMatter.trim()) {
      setStatus('error')
      setMessage('Add the planning matter, date range, and agency.')
      return
    }
    if (!selected.length || (!form.address.trim() && !form.parcel.trim() && !form.projectNumber.trim() && !form.projectName.trim())) {
      setStatus('error')
      setMessage('Add at least one property or project identifier and select at least one record category.')
      return
    }
    setStatus('saving')
    setMessage('')
    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: `Planning Records — ${subjectMatter}`,
          agency: form.agency,
          jurisdiction: form.jurisdiction || undefined,
          purpose: 'Planning, zoning, development, and related public-records research',
          scope: `Planning matter: ${subjectMatter}. ${form.address ? `Address: ${form.address}. ` : ''}${form.parcel ? `Parcel/APN: ${form.parcel}. ` : ''}${form.projectNumber ? `Project number: ${form.projectNumber}. ` : ''}${form.projectName ? `Project name: ${form.projectName}. ` : ''}${form.applicant ? `Applicant: ${form.applicant}.` : ''}`.trim(),
          items: requestItems,
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
  const hasDates = Boolean(dateStart && dateEnd)
  const hasCategories = selected.length > 0
  const hasIdentifier = Boolean(form.address?.trim() || form.parcel?.trim() || form.projectNumber?.trim() || form.projectName?.trim())
  const readiness = [
    { label: 'Agency identified', done: hasAgency },
    { label: 'Date range specified', done: hasDates },
    { label: 'Record categories selected', done: hasCategories },
    { label: 'Property/project identifier provided', done: hasIdentifier },
  ]

  return (
    <main className="builder-shell">
      <section className="builder-wrap">
        <div className="eyebrow">PLANNING RECORDS · REQUEST BUILDER</div>
        <h1>Build the request around the project, property, and planning file.</h1>
        <p className="lede">Give the custodian the identifiers that connect the project to zoning, applications, staff reports, notices, approvals, and communications.</p>

        <div className="builder-card">
          <h2>1. Identify the planning matter</h2>
          <p>Provide the key details so the agency can locate the records.</p>
          <div className="form-grid" style={{ marginTop: 18 }}>
            {fields.map(field => (
              <label key={field.id}>
                <span className="label">{field.label}</span>
                <input value={form[field.id]} onChange={e => set(field.id, e.target.value)} aria-required={field.required ?? false} />
              </label>
            ))}
            <label>
              <span className="label">Record start date *</span>
              <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} />
            </label>
            <label>
              <span className="label">Record end date *</span>
              <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
            </label>
          </div>
          <label style={{ display: 'block', marginTop: 18 }}>
            <span className="label">Planning matter / subject *</span>
            <textarea rows={4} value={subjectMatter} onChange={e => setSubjectMatter(e.target.value)} placeholder="e.g. rezoning, subdivision, development application, conditional use permit, site plan review" style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--rule)', borderRadius: 'var(--r-md)', background: 'var(--paper)', fontSize: 14, marginTop: 6 }} />
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
            <Link className="secondary" href="/workflows/planning-records">Back to overview</Link>
          </div>
        </div>
      </section>
      <EcosystemFooter />
    </main>
  )
}
