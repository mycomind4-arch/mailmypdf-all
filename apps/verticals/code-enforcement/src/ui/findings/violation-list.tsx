'use client'
import { useState } from 'react'

import { colors, typography, radii, spacing, transitions, violationStatusConfig, type ViolationStatus } from '../tokens/tokens'
import { Card, Panel, Badge, EmptyState, Button, Divider } from '../primitives/primitives'
import type { ViolationViewModel as Violation } from '../types/view-models'

// ─── Violation Types ───────────────────────────────────────────────────────────


// ─── Violation List ────────────────────────────────────────────────────────────

interface ViolationListProps {
  violations: Violation[]
  onSelect?: (id: string) => void
}

export function ViolationList({ violations, onSelect }: ViolationListProps) {
  if (violations.length === 0) {
    return (
      <EmptyState
        title="No alleged violations recorded"
        description="Alleged violations appear after the notice is extracted. Upload the notice to identify what the agency claims is in violation."
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '900px' }}>
      <div style={{ fontSize: typography.xs, color: colors.textMuted, marginBottom: '4px', fontStyle: 'italic' }}>
        Allegations are not established facts. Each item reflects what the agency claims, not what has been proven.
      </div>
      {violations.map(v => (
        <ViolationCard key={v.id} violation={v} onSelect={() => onSelect?.(v.id)} />
      ))}
    </div>
  )
}

// ─── Violation Card ───────────────────────────────────────────────────────────

function ViolationCard({ violation, onSelect }: { violation: Violation; onSelect?: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const statusConfig = violationStatusConfig[violation.status]

  return (
    <div style={{
      border: `1px solid ${colors.border}`,
      borderRadius: radii.md,
      background: colors.surface,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => { setExpanded(!expanded); onSelect?.() }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px',
          width: '100%',
          textAlign: 'left',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
        aria-expanded={expanded}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: '4px' }}>
            {violation.allegation}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge label={statusConfig.label} color={statusConfig.color} size="sm" />
            {violation.codeReference && <span style={{ fontSize: typography.xs, color: colors.textMuted }}>{violation.codeReference}</span>}
            <span style={{ fontSize: typography.xs, color: colors.textMuted }}>Source: {violation.source}</span>
          </div>
        </div>
        <span style={{ color: colors.textMuted, fontSize: typography.sm }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${colors.border}`, paddingTop: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
            <div>
              <div style={{ fontSize: typography.xs, color: colors.textMuted, fontWeight: typography.semibold, marginBottom: '4px' }}>Evidence</div>
              <div style={{ fontSize: typography.xs, color: colors.textSecondary }}>{violation.evidenceCount} item(s)</div>
            </div>
            {violation.deadline && (
              <div>
                <div style={{ fontSize: typography.xs, color: colors.textMuted, fontWeight: typography.semibold, marginBottom: '4px' }}>Deadline</div>
                <div style={{ fontSize: typography.xs, color: colors.textSecondary }}>{violation.deadline}</div>
              </div>
            )}
          </div>

          {violation.requiredCorrection && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: typography.xs, color: colors.textMuted, fontWeight: typography.semibold, marginBottom: '4px' }}>Required correction</div>
              <div style={{ fontSize: typography.xs, color: colors.textSecondary, lineHeight: 1.5 }}>{violation.requiredCorrection}</div>
            </div>
          )}

          {violation.relatedFindings && violation.relatedFindings.length > 0 && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: typography.xs, color: colors.textMuted, fontWeight: typography.semibold, marginBottom: '4px' }}>Related findings</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {violation.relatedFindings.map(f => <Badge key={f} label={f} size="sm" color={colors.accent} />)}
              </div>
            </div>
          )}

          {violation.relatedCommunications && violation.relatedCommunications.length > 0 && (
            <div>
              <div style={{ fontSize: typography.xs, color: colors.textMuted, fontWeight: typography.semibold, marginBottom: '4px' }}>Related communications</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {violation.relatedCommunications.map(c => <Badge key={c} label={c} size="sm" color={colors.textMuted} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Need useState import
