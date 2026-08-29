'use client'

import { useCallback, useRef } from 'react'
import { useCaseStore } from '@/src/store/case-store'
import { CodeEnforcementWorkspace } from '@/src/ui/shell/workspace'
import { colors, typography } from '@/src/ui/tokens/tokens'

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
    <div style={{ minHeight: '100vh', background: colors.background }}>
      {/* Upload Bar */}
      <div style={{
        padding: '12px 24px',
        background: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
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
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            padding: '8px 16px',
            background: colors.accent,
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: typography.sm,
            fontWeight: typography.semibold,
            cursor: 'pointer',
          }}
        >
          Upload Notice
        </button>
        {status === 'extracting' && <span style={{ color: colors.textMuted, fontSize: typography.sm }}>Extracting...</span>}
        {status === 'analyzing' && <span style={{ color: colors.textMuted, fontSize: typography.sm }}>Running domain analysis + investigation pipeline...</span>}
        {status === 'ready' && caseVM && (
          <span style={{ color: colors.textSecondary, fontSize: typography.sm }}>
            Case: {caseVM.caseNumber} • {caseVM.propertyAddress} • {caseVM.jurisdiction}
          </span>
        )}
        {status === 'error' && <span style={{ color: colors.statusHigh, fontSize: typography.sm }}>Error: {error}</span>}
        {status === 'ready' && (
          <button
            onClick={reset}
            style={{
              marginLeft: 'auto',
              padding: '6px 12px',
              background: 'transparent',
              color: colors.textMuted,
              border: `1px solid ${colors.border}`,
              borderRadius: '6px',
              fontSize: typography.sm,
              cursor: 'pointer',
            }}
          >
            New Case
          </button>
        )}
      </div>

      {/* Workspace */}
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
