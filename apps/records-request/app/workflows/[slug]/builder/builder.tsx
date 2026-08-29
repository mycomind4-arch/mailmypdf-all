'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EcosystemFooter } from '@/app/components/EcosystemFooter'

const CATEGORIES = [
  { id: 'case-file', label: 'Case file', desc: 'Anchor record and indexing history.', badge: 'recommended' as const },
  { id: 'violations', label: 'Violations & citations', desc: 'Notices of violation and citation records.', badge: 'recommended' as const },
  { id: 'complaints', label: 'Complaints & referrals', desc: 'Original complaints that initiated the case.', badge: 'recommended' as const },
  { id: 'inspections', label: 'Inspections & reinspections', desc: 'Inspection reports and field findings.', badge: 'recommended' as const },
  { id: 'notices-and-orders', label: 'Notices & orders', desc: 'Correction notices and administrative orders.', badge: 'recommended' as const },
  { id: 'photographs-and-video', label: 'Photographs & video', desc: 'Field media and related metadata.', badge: 'optional' as const },
  { id: 'correspondence', label: 'Correspondence', desc: 'Letters, emails, and communications.', badge: 'optional' as const },
  { id: 'enforcement-actions', label: 'Enforcement actions', desc: 'Civil penalties, liens, and formal steps.', badge: 'optional' as const },
  { id: 'abatement-and-compliance', label: 'Abatement & compliance', desc: 'Abatement records and close-out documentation.', badge: 'optional' as const },
  { id: 'permits-and-related-records', label: 'Permits & related records', desc: 'Permits and corrections tied to the violation.', badge: 'optional' as const },
]

const INITIAL = Object.fromEntries([
  ['agency', ''], ['department', ''], ['propertyAddress', ''], ['parcelNumber', ''], ['caseNumber', ''],
  ['violationNumber', ''], ['relatedParty', ''], ['jurisdiction', ''], ['dateStart', ''], ['dateEnd', ''], ['subjectMatter', ''],
]) as Record<string, string>

export default function CodeEnforcementBuilder() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [fields, setFields] = useState(INITIAL)
  const [categories, setCategories] = useState<string[]>(CATEGORIES.filter(c => c.badge === 'recommended').map(c => c.id))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (id: string, value: string) => setFields((current) => ({ ...current, [id]: value }))
  const selectedCategories = useMemo(() => CATEGORIES.filter((c) => categories.includes(c.id)), [categories])

  const validation = useMemo(() => {
    const issues: string[] = []
    if (!fields.agency.trim()) issues.push('Identify the agency or records custodian.')
    if (!fields.dateStart || !fields.dateEnd) issues.push('Provide the records date range.')
    if (fields.dateStart && fields.dateEnd && fields.dateStart > fields.dateEnd) issues.push('The end date cannot precede the start date.')
    if (!fields.propertyAddress.trim() && !fields.caseNumber.trim()) issues.push('Provide a property address or case number.')
    if (!fields.subjectMatter.trim()) issues.push('Describe the enforcement matter or code issue.')
    if (!categories.length) issues.push('Select at least one record category.')
    if (!categories.includes('case-file')) issues.push('Consider retaining the case-file category; it is the anchor record for this workflow.')
    return issues
  }, [categories, fields])

  const canContinue = Boolean(fields.agency && fields.subjectMatter && (fields.propertyAddress || fields.caseNumber) && fields.dateStart && fields.dateEnd)

  const createRequest = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const identifiers = [
        fields.propertyAddress && `property address ${fields.propertyAddress}`,
        fields.parcelNumber && `parcel/APN ${fields.parcelNumber}`,
        fields.caseNumber && `case number ${fields.caseNumber}`,
        fields.violationNumber && `violation/citation number ${fields.violationNumber}`,
        fields.relatedParty && `related party ${fields.relatedParty}`,
      ].filter(Boolean).join('; ')

      const items = selectedCategories.map(({ id, label }) => ({
        category: id,
        description: `${label} for the code-enforcement matter concerning ${fields.subjectMatter}. ${identifiers ? `Search using ${identifiers}. ` : ''}Cover records from ${fields.dateStart} through ${fields.dateEnd}.`,
        dateStart: fields.dateStart,
        dateEnd: fields.dateEnd,
        custodian: fields.department || undefined,
        systemHint: id === 'photographs-and-video' ? 'code-enforcement field media / inspection systems' : undefined,
        format: id === 'photographs-and-video' ? 'native digital files where available' : undefined,
      }))

      const response = await fetch('/api/requests', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: `Code Enforcement Records — ${fields.propertyAddress || fields.caseNumber || fields.subjectMatter}`,
          agency: fields.agency,
          jurisdiction: fields.jurisdiction || undefined,
          purpose: 'Research and document the code-enforcement history and agency records for the identified matter.',
          scope: JSON.stringify({ workflow: 'code-enforcement-records', ...fields, categories }),
          items,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.issues?.[0]?.message || data?.error || 'Request creation failed')
      if (!data.request?.id) throw new Error('The request was created without a request ID.')
      router.push(`/dashboard?request=${encodeURIComponent(data.request.id)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request creation failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="builder-shell">
      <section className="builder-wrap">
        <div className="eyebrow">CODE ENFORCEMENT RECORDS · BUILDER</div>
        <h1>Build a precise enforcement-records request.</h1>
        <p className="lede">Start with the property or case, identify the matter, set the time period, then choose the record groups you want the agency to search.</p>

        <div className="builder-progress" role="tablist" aria-label="Builder progress">
          <div className={`step-marker ${step === 1 ? 'active' : step > 1 ? 'done' : ''}`}>
            <span className="step-num">{step > 1 ? '✓' : '1'}</span> Identify
          </div>
          <div className={`step-marker ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`}>
            <span className="step-num">{step > 2 ? '✓' : '2'}</span> Records
          </div>
          <div className={`step-marker ${step === 3 ? 'active' : ''}`}>
            <span className="step-num">3</span> Review
          </div>
        </div>

        {step === 1 && (
          <section className="builder-card">
            <h2>Identify the matter</h2>
            <p>Tell the agency what this request is about and how to locate the records.</p>

            <div className="form-group">
              <div className="form-group-title">Matter</div>
              <div className="form-grid">
                <label><span>Agency / records custodian <span className="req">*</span></span><input type="text" value={fields.agency} onChange={(e) => update('agency', e.target.value)} aria-required="true" /></label>
                <label><span>Likely department or custodian</span><input type="text" value={fields.department} onChange={(e) => update('department', e.target.value)} /></label>
                <label className="full"><span>Issue or subject matter <span className="req">*</span></span><input type="text" value={fields.subjectMatter} onChange={(e) => update('subjectMatter', e.target.value)} aria-required="true" /></label>
              </div>
            </div>

            <div className="form-group">
              <div className="form-group-title">Property / Case Identifiers</div>
              <div className="form-grid">
                <label><span>Property address</span><input type="text" value={fields.propertyAddress} onChange={(e) => update('propertyAddress', e.target.value)} /></label>
                <label><span>Parcel / APN</span><input type="text" value={fields.parcelNumber} onChange={(e) => update('parcelNumber', e.target.value)} /></label>
                <label><span>Case number</span><input type="text" value={fields.caseNumber} onChange={(e) => update('caseNumber', e.target.value)} /></label>
                <label><span>Violation / citation number</span><input type="text" value={fields.violationNumber} onChange={(e) => update('violationNumber', e.target.value)} /></label>
                <label className="full"><span>Owner / operator / related person or entity</span><input type="text" value={fields.relatedParty} onChange={(e) => update('relatedParty', e.target.value)} /></label>
              </div>
              <div className="form-helper">A property address or case number is enough to start. Add the APN, violation number, or related party when known.</div>
            </div>

            <div className="form-group">
              <div className="form-group-title">Time Range</div>
              <div className="form-grid">
                <label><span>Records start date <span className="req">*</span></span><input type="date" value={fields.dateStart} onChange={(e) => update('dateStart', e.target.value)} aria-required="true" /></label>
                <label><span>Records end date <span className="req">*</span></span><input type="date" value={fields.dateEnd} onChange={(e) => update('dateEnd', e.target.value)} aria-required="true" /></label>
              </div>
            </div>

            {validation.length > 0 && <div className="builder-warning">{validation.map((issue) => <div key={issue}>• {issue}</div>)}</div>}

            <div className="builder-actions">
              <span />
              <button className="primary" disabled={!canContinue} onClick={() => setStep(2)}>Choose records →</button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="builder-card">
            <h2>Choose the record groups</h2>
            <p>The case file is the anchor record — we recommend keeping it selected. You can narrow the scope before sending.</p>
            <div className="category-grid">
              {CATEGORIES.map((cat) => (
                <label key={cat.id} className={`category ${categories.includes(cat.id) ? 'selected' : ''}`}>
                  <input type="checkbox" checked={categories.includes(cat.id)} onChange={(e) => setCategories((current) => e.target.checked ? [...current, cat.id] : current.filter((item) => item !== cat.id))} aria-label={cat.label} />
                  <div className="cat-content">
                    <strong>{cat.label}</strong>
                    <small>{cat.desc}</small>
                    <span className={`cat-badge ${cat.badge}`}>{cat.badge === 'recommended' ? 'Usually important' : 'Optional'}</span>
                  </div>
                </label>
              ))}
            </div>
            {validation.length > 0 && <div className="builder-warning">{validation.map((issue) => <div key={issue}>• {issue}</div>)}</div>}
            <div className="builder-actions">
              <button className="secondary" onClick={() => setStep(1)}>← Back</button>
              <button className="primary" disabled={validation.length > 0} onClick={() => setStep(3)}>Review request →</button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="builder-card">
            <h2>Review before creating the request</h2>
            <p>This creates a draft in your workspace. Nothing is mailed until you explicitly approve and send it.</p>
            <div className="review-grid">
              <div><span className="review-label">Agency</span><strong>{fields.agency}</strong></div>
              <div><span className="review-label">Property</span><strong>{fields.propertyAddress || 'Not provided'}</strong></div>
              <div><span className="review-label">Case</span><strong>{fields.caseNumber || 'Not provided'}</strong></div>
              <div><span className="review-label">Parcel / APN</span><strong>{fields.parcelNumber || 'Not provided'}</strong></div>
              <div><span className="review-label">Jurisdiction</span><strong>{fields.jurisdiction || 'Not provided'}</strong></div>
              <div><span className="review-label">Date range</span><strong>{fields.dateStart} → {fields.dateEnd}</strong></div>
              <div><span className="review-label">Matter</span><strong>{fields.subjectMatter}</strong></div>
            </div>
            <div className="review-scope">
              <h3>Records to request ({selectedCategories.length})</h3>
              {selectedCategories.map(({ id, label }) => (
                <div className="review-item" key={id}><strong>{label}</strong><span>Search for the identified matter during the selected date range{fields.department ? ` through ${fields.department}` : ''}.</span></div>
              ))}
            </div>
            {error && <div className="builder-error">{error}</div>}
            <div className="builder-actions">
              <button className="secondary" onClick={() => setStep(2)} disabled={submitting}>← Edit records</button>
              <button className="primary" onClick={createRequest} disabled={submitting}>{submitting ? 'Creating…' : 'Create request →'}</button>
            </div>
          </section>
        )}
      </section>
    <EcosystemFooter />
    </main>
  )
}
