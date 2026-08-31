'use client'

import { colors, typography, spacing } from '../tokens/tokens'
import { Badge } from '../primitives/primitives'
import type { EnforcementCase, CaseFinding } from '@/src/lib/base44-client'

interface CaseDetailProps {
  caseData: EnforcementCase | null
  findings: CaseFinding[]
  loading: boolean
}

const severityColors: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  info: '#6b7280',
}

export function CaseDetail({ caseData, findings, loading }: CaseDetailProps) {
  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: colors.textMuted, fontSize: typography.sm }}>
        Loading case details...
      </div>
    )
  }

  if (!caseData) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: colors.textMuted, fontSize: typography.sm }}>
        Select a case to view details.
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: `${spacing[4]} ${spacing[5]}` }}>
      {/* Header */}
      <div style={{ marginBottom: spacing[5] }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <h2 style={{ fontSize: typography.lg, fontWeight: typography.semibold, color: colors.textPrimary, margin: 0 }}>
            {caseData.caseNumber || 'Case (pending extraction)'}
          </h2>
          <Badge label={caseData.status} size="sm" color={colors.statusInfo} />
          {caseData.goldCertified && (
            <Badge label="Gold Certified" size="sm" color="#22c55e" />
          )}
        </div>
        <p style={{ fontSize: typography.sm, color: colors.textMuted, margin: 0 }}>
          {caseData.propertyAddress || 'Address pending'}
          {caseData.agencyName && ` · ${caseData.agencyName}`}
        </p>
      </div>

      {/* Extracted fields grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        marginBottom: spacing[5],
      }}>
        <DetailField label="Recipient" value={caseData.recipientName} />
        <DetailField label="APN" value={caseData.apn} />
        <DetailField label="Notice Date" value={caseData.noticeDate} />
        <DetailField label="Response Deadline" value={caseData.responseDeadline} />
        <DetailField label="Complaint Number" value={caseData.complaintNumber} />
        <DetailField label="Jurisdiction" value={caseData.jurisdiction} />
        <DetailField label="Due Process Score" value={caseData.dueProcessScore != null ? `${caseData.dueProcessScore}/100` : null} />
        <DetailField label="Findings Count" value={caseData.findingsCount?.toString()} />
      </div>

      {/* Blocking issues */}
      {caseData.blockingIssues && caseData.blockingIssues.length > 0 && (
        <div style={{
          padding: '14px 16px',
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '8px',
          marginBottom: spacing[4],
        }}>
          <div style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: '#ef4444', marginBottom: '8px' }}>
            Blocking Issues
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: typography.sm, color: colors.textSecondary }}>
            {caseData.blockingIssues.map((issue, i) => (
              <li key={i} style={{ marginBottom: '4px' }}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Findings */}
      {findings.length > 0 && (
        <div style={{ marginBottom: spacing[4] }}>
          <h3 style={{ fontSize: typography.base, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: '12px' }}>
            Findings ({findings.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {findings.map((f) => (
              <div
                key={f.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '12px 14px',
                  background: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                }}
              >
                <div style={{
                  flexShrink: 0,
                  width: '70px',
                  fontSize: typography.xs,
                  fontWeight: typography.semibold,
                  textTransform: 'uppercase',
                  color: severityColors[f.severity] || colors.textMuted,
                  paddingTop: '2px',
                }}>
                  {f.severity}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: '4px' }}>
                    {f.type.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: typography.sm, color: colors.textSecondary, marginBottom: '4px' }}>
                    {f.description}
                  </div>
                  <div style={{ fontSize: typography.xs, color: colors.textMuted }}>
                    Source: {f.source}
                    {f.resolved && ' · Resolved'}
                    {f.recommendedAction && ` · Action: ${f.recommendedAction}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Findings summary */}
      {caseData.findingsSummary && (
        <div style={{
          padding: '14px 16px',
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          marginBottom: spacing[4],
        }}>
          <div style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: '8px' }}>
            Pipeline Summary
          </div>
          <pre style={{
            fontSize: typography.xs,
            color: colors.textSecondary,
            margin: 0,
            whiteSpace: 'pre-wrap',
            fontFamily: 'inherit',
          }}>
            {caseData.findingsSummary}
          </pre>
        </div>
      )}
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div style={{
      padding: '10px 14px',
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: '8px',
    }}>
      <div style={{ fontSize: typography.xs, color: colors.textMuted, marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: typography.sm, color: colors.textPrimary, fontWeight: typography.medium }}>
        {value || '—'}
      </div>
    </div>
  )
}
