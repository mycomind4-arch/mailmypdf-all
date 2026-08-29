'use client'

import { useState } from 'react'
import { colors, typography, spacing } from '../tokens/tokens'
import { Badge } from '../primitives/primitives'

export interface BackendCase {
  id: string
  status: string
  caseNumber: string | null
  propertyAddress: string | null
  recipientName: string | null
  agencyName: string | null
  responseDeadline: string | null
  findingsCount: number | null
  defenseReady: boolean | null
  goldCertified: boolean | null
  created_date: string
  updated_date: string
}

interface CaseListProps {
  cases: BackendCase[]
  loading: boolean
  error: string | null
  onSelectCase: (caseId: string) => void
  selectedCaseId: string | null
  onRefresh: () => void
}

const statusColors: Record<string, string> = {
  intake: colors.statusInfo,
  defense_ready: colors.statusMedium,
  records_pending: colors.statusMedium,
  review_pending: colors.statusHigh,
  authorized: colors.statusLow,
  completed: colors.textMuted,
  error: colors.statusHigh,
}

const statusLabels: Record<string, string> = {
  intake: 'Queued',
  extracting: 'Extracting',
  analyzing: 'Analyzing',
  investigating: 'Investigating',
  records_pending: 'Records Request',
  defense_ready: 'Defense Ready',
  review_pending: 'Awaiting Review',
  authorized: 'Authorized',
  submitted: 'Submitted',
  completed: 'Completed',
  error: 'Error',
}

export function CaseList({
  cases,
  loading,
  error,
  onSelectCase,
  selectedCaseId,
  onRefresh,
}: CaseListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = cases.filter((c) => {
    const q = searchQuery.toLowerCase()
    return (
      !q ||
      c.caseNumber?.toLowerCase().includes(q) ||
      c.propertyAddress?.toLowerCase().includes(q) ||
      c.recipientName?.toLowerCase().includes(q) ||
      c.agencyName?.toLowerCase().includes(q)
    )
  })

  return (
    <div style={{
      width: '100%',
      maxWidth: 900,
      margin: '0 auto',
      padding: `${spacing[4]} ${spacing[5]}`,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing[4],
      }}>
        <div>
          <h2 style={{ fontSize: typography.lg, fontWeight: typography.semibold, color: colors.textPrimary, margin: 0 }}>
            Pipeline Cases
          </h2>
          <p style={{ fontSize: typography.sm, color: colors.textMuted, margin: '4px 0 0 0' }}>
            Cases processed through the automated defense pipeline
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '6px 12px',
              border: `1px solid ${colors.border}`,
              borderRadius: '6px',
              fontSize: typography.sm,
              width: 200,
            }}
          />
          <button
            onClick={onRefresh}
            disabled={loading}
            style={{
              padding: '6px 16px',
              background: colors.accent,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: typography.sm,
              fontWeight: typography.semibold,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px',
          background: colors.statusHighBg || 'rgba(239, 68, 68, 0.1)',
          borderRadius: '8px',
          color: colors.statusHigh,
          fontSize: typography.sm,
          marginBottom: spacing[3],
        }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: colors.textMuted,
          fontSize: typography.sm,
        }}>
          {cases.length === 0
            ? 'No cases yet. Upload a notice to get started.'
            : 'No cases match your search.'}
        </div>
      )}

      {/* Case list */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectCase(c.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '14px 16px',
                background: selectedCaseId === c.id ? colors.surfaceHover || colors.accent + '11' : colors.surface,
                border: `1px solid ${selectedCaseId === c.id ? colors.accent : colors.border}`,
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Left: Case info */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textPrimary }}>
                    {c.caseNumber || 'Pending extraction'}
                  </span>
                  {c.goldCertified && (
                    <Badge label="Gold" size="sm" color={colors.statusLow} bg={colors.statusLowBg || 'rgba(34, 197, 94, 0.1)'} />
                  )}
                </div>
                <div style={{ fontSize: typography.xs, color: colors.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.propertyAddress || c.recipientName || 'Address pending'}
                  {c.agencyName && ` · ${c.agencyName}`}
                </div>
              </div>

              {/* Right: Status + findings */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                {c.findingsCount != null && c.findingsCount > 0 && (
                  <span style={{ fontSize: typography.xs, color: colors.statusHigh }}>
                    {c.findingsCount} finding{c.findingsCount !== 1 ? 's' : ''}
                  </span>
                )}
                {c.responseDeadline && (
                  <span style={{ fontSize: typography.xs, color: colors.textMuted }}>
                    Due: {c.responseDeadline}
                  </span>
                )}
                <Badge
                  label={statusLabels[c.status] || c.status}
                  size="sm"
                  color={statusColors[c.status] || colors.textMuted}
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
