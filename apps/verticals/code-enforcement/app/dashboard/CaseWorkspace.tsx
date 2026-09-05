'use client'

import Link from 'next/link'
import { useCallback, useRef } from 'react'
import { useCaseStore } from '@/src/store/case-store'
import { CodeEnforcementWorkspace } from '@/src/ui/shell/workspace'
import { colors, typography } from '@/src/ui/tokens/tokens'

const MAILMYPDF = 'https://mailmypdf.pages.dev'

export default function CaseWorkspace() {
  const { status, error, caseVM, sidebarItems, timelineEvents, evidenceItems, findings, violations, property, processDocument, reset } = useCaseStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/extract', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Extraction failed')
      }
      const data = await res.json()
      const text = data.extractedText || reconstructText(data.facts, file.name)
      processDocument(text, file.name)
    } catch (err) {
      console.error('Upload failed:', err)
      if (file.type.startsWith('text/') || /\.(txt|md|csv)$/i.test(file.name)) {
        const text = await file.text()
        processDocument(text, file.name)
      }
    }
  }, [processDocument])

  function reconstructText(facts: any, filename: string): string {
    const lines: string[] = [filename, '']
    if (facts.caseNumber) lines.push(`Case Number: ${facts.caseNumber}`)
    if (facts.address) lines.push(`Property Address: ${facts.address}`)
    if (facts.jurisdiction) lines.push(`Jurisdiction: ${facts.jurisdiction}`)
    if (facts.deadlines?.length) lines.push(`Response Deadline: ${facts.deadlines[0]}`)
    if (facts.violationLines?.length) lines.push(...facts.violationLines)
    return lines.join('\n')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--mmp-paper)' }}>
      <header className="mmp-workspace-topbar" style={{ position: 'relative' }}>
        <div className="mmp-workspace-topbar__copy">
          <div className="mmp-workspace-topbar__eyebrow">MailMyPDF Matter Workspace</div>
          <div className="mmp-workspace-topbar__title-row">
            <strong className="mmp-workspace-topbar__title">Code Enforcement</strong>
            <span className="mmp-workspace-topbar__subtitle">Notice → Facts → Evidence → Findings → Response → Review → Proof</span>
          </div>
        </div>
        <div className="mmp-workspace-topbar__actions">
          <Link href="/workflows" className="mmp-button-secondary">Workflow Hub</Link>
          <a href={`${MAILMYPDF}/start`} className="mmp-button-secondary">Mail a PDF</a>
          <a href={`${MAILMYPDF}/account`} className="mmp-workspace-account"><span className="mmp-workspace-account__avatar">CE</span><span>MailMyPDF Account</span></a>
        </div>
      </header>

      <div style={{
        padding: '12px 24px',
        background: 'var(--mmp-surface)',
        borderBottom: '1px solid var(--mmp-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
      }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,.csv"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
        <button onClick={() => fileInputRef.current?.click()} className="mmp-button-primary">Upload Notice</button>
        {status === 'extracting' && <span style={{ color: colors.textMuted, fontSize: typography.sm }}>Extracting document…</span>}
        {status === 'analyzing' && <span style={{ color: colors.textMuted, fontSize: typography.sm }}>Running domain analysis and investigation pipeline…</span>}
        {status === 'ready' && caseVM && (
          <span style={{ color: colors.textSecondary, fontSize: typography.sm }}>
            Case: {caseVM.caseNumber || '—'} · {caseVM.propertyAddress || 'Property not confirmed'} · {caseVM.jurisdiction || 'Jurisdiction not confirmed'}
          </span>
        )}
        {status === 'error' && <span style={{ color: colors.statusHigh, fontSize: typography.sm }}>Error: {error}</span>}
        {status === 'ready' && <button onClick={reset} className="mmp-button-secondary" style={{ marginLeft: 'auto' }}>New Case</button>}
      </div>

      {!caseVM && status === 'idle' && (
        <section style={{ padding: '1rem 24px', borderBottom: '1px solid var(--mmp-border)', background: 'var(--mmp-accent-soft)' }}>
          <div style={{ maxWidth: 920, color: 'var(--mmp-ink-muted)', fontSize: '.82rem', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--mmp-ink)' }}>Start from the actual notice.</strong> This specialized matter workspace keeps Code Enforcement's case areas — property, timeline, allegations, evidence, findings, actions, communications, workflows, and review — rather than forcing them into a generic dashboard. Account persistence is not wired in this app yet, so no previous cases or fake activity are displayed.
          </div>
        </section>
      )}

      <CodeEnforcementWorkspace
        caseData={caseVM}
        sidebarItems={sidebarItems}
        overview={null}
        timelineEvents={timelineEvents}
        evidenceItems={evidenceItems}
        findings={findings}
        violations={violations}
        property={property}
        actions={[]}
        communications={[]}
        workflowProgress={null}
        workflowOptions={[]}
        review={null}
      />
    </div>
  )
}
