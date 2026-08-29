'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { colors, typography } from '@/src/ui/tokens/tokens'
import { CaseList, type BackendCase } from '@/src/ui/cases/case-list'
import { CaseDetail } from '@/src/ui/cases/case-detail'
import type { EnforcementCase, CaseFinding } from '@/src/lib/base44-client'

type View = 'list' | 'detail' | 'upload'

export default function PipelineDashboard() {
  const [view, setView] = useState<View>('list')
  const [cases, setCases] = useState<BackendCase[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [caseData, setCaseData] = useState<EnforcementCase | null>(null)
  const [findings, setFindings] = useState<CaseFinding[]>([])
  const [caseLoading, setCaseLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch cases from backend
  const fetchCases = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/cases')
      if (!res.ok) throw new Error('Failed to fetch cases')
      const data = await res.json()
      setCases(data.cases || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setCases([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Load cases on mount
  useEffect(() => {
    fetchCases()
  }, [fetchCases])

  // Auto-refresh every 30 seconds (pipeline runs every 5 min)
  useEffect(() => {
    const interval = setInterval(fetchCases, 30000)
    return () => clearInterval(interval)
  }, [fetchCases])

  // Fetch case detail
  const fetchCaseDetail = useCallback(async (caseId: string) => {
    setCaseLoading(true)
    setSelectedCaseId(caseId)
    try {
      const res = await fetch(`/api/cases/${caseId}`)
      if (!res.ok) throw new Error('Failed to fetch case')
      const data = await res.json()
      setCaseData(data.case)
      setFindings(data.findings || [])
      setView('detail')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setCaseLoading(false)
    }
  }, [])

  // Handle file upload
  const handleFile = useCallback(async (file: File) => {
    setUploadStatus('Uploading...')
    setError(null)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Upload failed')
      }
      const data = await res.json()
      setUploadStatus(`Uploaded! Case queued for processing (ID: ${data.caseId?.substring(0, 8)}...)`)
      // Refresh case list after a short delay
      setTimeout(fetchCases, 2000)
    } catch (err) {
      setUploadStatus(null)
      setError(err instanceof Error ? err.message : 'Upload failed')
    }
  }, [fetchCases])

  return (
    <div style={{ minHeight: '100vh', background: colors.background }}>
      {/* Top bar */}
      <div style={{
        padding: '12px 24px',
        background: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <strong style={{ fontSize: typography.base, color: colors.textPrimary }}>
          My-CoMind <span style={{ color: colors.textMuted, fontWeight: 'normal' }}>/ Pipeline Dashboard</span>
        </strong>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => { setView('list'); fetchCases() }}
            style={{
              padding: '6px 12px',
              background: view === 'list' ? colors.accent : 'transparent',
              color: view === 'list' ? '#fff' : colors.textSecondary,
              border: `1px solid ${view === 'list' ? colors.accent : colors.border}`,
              borderRadius: '6px',
              fontSize: typography.sm,
              cursor: 'pointer',
            }}
          >
            Cases
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '6px 12px',
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
        </nav>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md,.csv"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = '' // reset for re-upload
          }}
        />

        {uploadStatus && (
          <span style={{ fontSize: typography.sm, color: colors.textMuted }}>{uploadStatus}</span>
        )}

        {view === 'detail' && (
          <button
            onClick={() => { setView('list'); fetchCases() }}
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
            ← Back to cases
          </button>
        )}
      </div>

      {/* Content */}
      {view === 'list' && (
        <CaseList
          cases={cases}
          loading={loading}
          error={error}
          onSelectCase={fetchCaseDetail}
          selectedCaseId={selectedCaseId}
          onRefresh={fetchCases}
        />
      )}

      {view === 'detail' && (
        <CaseDetail
          caseData={caseData}
          findings={findings}
          loading={caseLoading}
        />
      )}
    </div>
  )
}
