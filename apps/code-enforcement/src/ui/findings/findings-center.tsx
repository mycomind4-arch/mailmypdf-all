'use client'

import { useState } from 'react'
import { colors, typography, radii, spacing, transitions } from '../tokens/tokens'
import { Card, Panel, Badge, EmptyState, Button, Divider } from '../primitives/primitives'
import type { FindingViewModel as Finding, AIReviewViewModel as AIReviewInfo } from '../types/view-models'

// ─── Finding Types ─────────────────────────────────────────────────────────────



// ─── Findings Center ─────────────────────────────────────────────────────────

interface FindingsCenterProps {
  findings: Finding[]
  onStartCorrectionWorkflow?: (findingId: string) => void
  onResolve?: (findingId: string) => void
}

export function FindingsCenter({ findings, onStartCorrectionWorkflow, onResolve }: FindingsCenterProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  const sorted = [...findings].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4], maxWidth: '900px' }}>
      {findings.length === 0 ? (
        <EmptyState
          title="No findings detected"
          description="Findings appear after document analysis and discrepancy detection. Upload the notice and run analysis to surface conflicts, missing evidence, and procedural issues."
        />
      ) : (
        sorted.map(finding => (
          <FindingCard
            key={finding.id}
            finding={finding}
            expanded={expandedId === finding.id}
            onToggle={() => setExpandedId(expandedId === finding.id ? null : finding.id)}
            onStartCorrectionWorkflow={onStartCorrectionWorkflow}
            onResolve={onResolve}
          />
        ))
      )}
    </div>
  )
}

// ─── Finding Card ─────────────────────────────────────────────────────────────

function FindingCard({
  finding,
  expanded,
  onToggle,
  onStartCorrectionWorkflow,
  onResolve,
}: {
  finding: Finding
  expanded: boolean
  onToggle: () => void
  onStartCorrectionWorkflow?: (id: string) => void
  onResolve?: (id: string) => void
}) {
  const severityColors: Record<string, { color: string; bg: string }> = {
    critical: { color: colors.statusCritical, bg: colors.statusCriticalBg },
    high: { color: colors.statusHigh, bg: colors.statusHighBg },
    medium: { color: colors.statusMedium, bg: colors.statusMediumBg },
    low: { color: colors.statusLow, bg: colors.statusLowBg },
  }
  const sev = severityColors[finding.severity]
  const statusLabels: Record<string, string> = {
    open: 'Open', reviewing: 'Under Review', resolved: 'Resolved', blocked: 'Blocked',
  }

  return (
    <div style={{
      border: `1px solid ${finding.severity === 'critical' ? sev.color + '40' : colors.border}`,
      borderLeft: `3px solid ${sev.color}`,
      borderRadius: radii.md,
      background: colors.surface,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <button
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
            <Badge label={finding.severity.toUpperCase()} color={sev.color} bg={sev.bg} icon="!" />
            <Badge label={statusLabels[finding.status]} color={colors.textMuted} size="sm" />
            {finding.humanReviewRequired && <Badge label="HUMAN REVIEW" color={colors.statusCritical} size="sm" />}
          </div>
          <div style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: '2px' }}>
            {finding.title}
          </div>
          <div style={{ fontSize: typography.xs, color: colors.textMuted, lineHeight: 1.5 }}>
            {finding.description}
          </div>
        </div>
        <span style={{ color: colors.textMuted, fontSize: typography.sm, marginTop: '2px' }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded */}
      {expanded && (
        <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${colors.border}`, paddingTop: '14px' }}>
          {/* What this means */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: typography.xs, color: colors.textMuted, fontWeight: typography.semibold, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>What this means</div>
            <div style={{ fontSize: typography.xs, color: colors.textSecondary, lineHeight: 1.55 }}>{finding.whatThisMeans}</div>
          </div>

          {/* Evidence */}
          {finding.evidence.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: typography.xs, color: colors.textMuted, fontWeight: typography.semibold, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Evidence</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {finding.evidence.map(e => <Badge key={e} label={e} size="sm" color={colors.accent} />)}
              </div>
            </div>
          )}

          {/* Sources */}
          {finding.sources.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: typography.xs, color: colors.textMuted, fontWeight: typography.semibold, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sources</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {finding.sources.map(s => <Badge key={s} label={s} size="sm" color={colors.textMuted} />)}
              </div>
            </div>
          )}

          {/* AI Review transparency */}
          {finding.aiReview && (
            <div style={{
              background: colors.surfaceRaised,
              borderRadius: radii.md,
              padding: '12px',
              marginBottom: '12px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{ fontSize: typography.xs, color: colors.textMuted, fontWeight: typography.semibold, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Independent Review
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontSize: typography.xs, color: colors.textMuted }}>Analyses compared: </span>
                  <span style={{ fontSize: typography.xs, color: colors.textSecondary, fontWeight: typography.semibold }}>{finding.aiReview.modelsCompared}</span>
                </div>
                <div>
                  <span style={{ fontSize: typography.xs, color: colors.textMuted }}>Agreement: </span>
                  <span style={{
                    fontSize: typography.xs,
                    fontWeight: typography.semibold,
                    color: finding.aiReview.agreement === 'AGREEMENT' ? colors.statusLow : finding.aiReview.agreement === 'DISAGREEMENT' ? colors.statusCritical : colors.textMuted,
                  }}>
                    {finding.aiReview.agreement === 'AGREEMENT' ? 'Yes' : finding.aiReview.agreement === 'DISAGREEMENT' ? 'No' : 'N/A'}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: typography.xs, color: colors.textMuted }}>Confidence: </span>
                  <span style={{ fontSize: typography.xs, color: colors.textSecondary, fontWeight: typography.semibold }}>{finding.aiReview.confidence}</span>
                </div>
                <div>
                  <span style={{ fontSize: typography.xs, color: colors.textMuted }}>Source support: </span>
                  <span style={{ fontSize: typography.xs, color: colors.textSecondary, fontWeight: typography.semibold }}>{finding.aiReview.sourceCount} source(s)</span>
                </div>
              </div>
              {finding.aiReview.disagreementDetail && (
                <div style={{ marginTop: '8px', fontSize: typography.xs, color: colors.statusCritical, lineHeight: 1.5 }}>
                  Models disagreed: {finding.aiReview.disagreementDetail}
                  <div style={{ marginTop: '4px', color: colors.statusHigh, fontWeight: typography.semibold }}>Human review required.</div>
                </div>
              )}
            </div>
          )}

          {/* Recommended action */}
          {finding.recommendedAction && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: typography.xs, color: colors.textMuted, fontWeight: typography.semibold, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recommended next action</div>
              <div style={{ fontSize: typography.xs, color: colors.accent }}>{finding.recommendedAction}</div>
            </div>
          )}

          <Divider />

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {onStartCorrectionWorkflow && finding.recommendedAction && (
              <Button variant="primary" size="sm" onClick={() => onStartCorrectionWorkflow(finding.id)}>
                Start Correction Workflow
              </Button>
            )}
            {onResolve && finding.status !== 'resolved' && (
              <Button variant="ghost" size="sm" onClick={() => onResolve(finding.id)}>
                Mark Resolved
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
