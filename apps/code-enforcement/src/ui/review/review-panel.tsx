'use client'

import { useState } from 'react'
import { colors, typography, radii, spacing, transitions, factConfig } from '../tokens/tokens'
import { Card, Panel, Badge, Button, Divider } from '../primitives/primitives'
import type { ReviewItemViewModel as ReviewItem, ReviewConflictViewModel as ReviewConflict, HighConsequenceReviewViewModel as HighConsequenceReviewData, FactCategory } from '../types/view-models'

// ─── Review Types ──────────────────────────────────────────────────────────────




// ─── High-Consequence Review Panel ───────────────────────────────────────────

interface ReviewPanelProps {
  data: HighConsequenceReviewData
  onApprove?: () => void
  onReject?: (notes: string) => void
  onRequestChanges?: (notes: string) => void
}

export function ReviewPanel({ data, onApprove, onReject, onRequestChanges }: ReviewPanelProps) {
  const [decision, setDecision] = useState<'none' | 'approve' | 'reject' | 'changes'>('none')
  const [notes, setNotes] = useState('')

  return (
    <div style={{ maxWidth: '850px' }}>
      {/* Subject */}
      <div style={{
        background: colors.surface,
        border: `1px solid ${colors.statusHigh}30`,
        borderLeft: `3px solid ${colors.statusHigh}`,
        borderRadius: radii.lg,
        padding: spacing[5],
        marginBottom: spacing[4],
      }}>
        <div style={{ fontSize: typography.xs, fontWeight: typography.bold, color: colors.statusHigh, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
          High-Consequence Review
        </div>
        <h2 style={{ fontSize: typography.xl, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: '6px' }}>
          {data.subject}
        </h2>
        <p style={{ fontSize: typography.sm, color: colors.textSecondary, lineHeight: 1.55 }}>
          {data.summary}
        </p>
      </div>

      {/* AI Agreement */}
      {data.aiAgreement && data.aiAgreement !== 'NO_REVIEW' && (
        <div style={{
          background: data.aiAgreement === 'AGREEMENT' ? colors.statusLowBg : colors.statusCriticalBg,
          border: `1px solid ${data.aiAgreement === 'AGREEMENT' ? colors.statusLow + '30' : colors.statusCritical + '30'}`,
          borderRadius: radii.md,
          padding: '12px 14px',
          marginBottom: spacing[4],
        }}>
          <div style={{ fontSize: typography.xs, fontWeight: typography.semibold, color: data.aiAgreement === 'AGREEMENT' ? colors.statusLow : colors.statusCritical, marginBottom: '4px' }}>
            Independent Review: {data.aiAgreement === 'AGREEMENT' ? 'Models Agreed' : 'Models Disagreed'}
          </div>
          {data.aiDisagreementDetail && (
            <div style={{ fontSize: typography.xs, color: colors.textSecondary, lineHeight: 1.5 }}>
              {data.aiDisagreementDetail}
              <div style={{ marginTop: '4px', color: colors.statusHigh, fontWeight: typography.semibold }}>Human review required.</div>
            </div>
          )}
        </div>
      )}

      {/* Facts */}
      {data.facts.length > 0 && (
        <ReviewSection title="Facts">
          {data.facts.map((fact, i) => {
            const fc = fact.factCategory ? factConfig[fact.factCategory] : null
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 0' }}>
                {fc && <Badge label={fc.shortLabel} color={fc.color} size="sm" icon={fc.icon} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: typography.xs, color: colors.textMuted, fontWeight: typography.semibold }}>{fact.label}</div>
                  <div style={{ fontSize: typography.sm, color: colors.textSecondary }}>{fact.value}</div>
                  {fact.source && <div style={{ fontSize: typography.xs, color: colors.textMuted, marginTop: '2px' }}>Source: {fact.source}</div>}
                </div>
              </div>
            )
          })}
        </ReviewSection>
      )}

      {/* Evidence */}
      {data.evidence.length > 0 && (
        <ReviewSection title="Evidence">
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {data.evidence.map(e => <Badge key={e} label={e} size="sm" color={colors.accent} />)}
          </div>
        </ReviewSection>
      )}

      {/* Rules */}
      {data.rules.length > 0 && (
        <ReviewSection title="Rules">
          {data.rules.map((r, i) => (
            <div key={i} style={{ fontSize: typography.xs, color: colors.textSecondary, lineHeight: 1.5, padding: '4px 0' }}>
              <span style={{ color: colors.factRule, fontWeight: typography.semibold }}>§</span> {r}
            </div>
          ))}
        </ReviewSection>
      )}

      {/* Conflicts */}
      {data.conflicts.length > 0 && (
        <ReviewSection title="Conflicts" highlight="critical">
          {data.conflicts.map((c, i) => (
            <div key={i} style={{
              padding: '10px 12px',
              background: colors.statusCriticalBg,
              border: `1px solid ${colors.statusCritical}30`,
              borderRadius: radii.md,
              marginBottom: '8px',
            }}>
              <div style={{ fontSize: typography.xs, color: colors.textSecondary, lineHeight: 1.5 }}>{c.description}</div>
              <div style={{ fontSize: typography.xs, color: colors.textMuted, marginTop: '4px' }}>Sources: {c.sources.join(', ')}</div>
            </div>
          ))}
        </ReviewSection>
      )}

      {/* Unknowns */}
      {data.unknowns.length > 0 && (
        <ReviewSection title="Unknowns">
          {data.unknowns.map((u, i) => (
            <div key={i} style={{ fontSize: typography.xs, color: colors.textMuted, lineHeight: 1.5, padding: '4px 0' }}>
              ? {u}
            </div>
          ))}
        </ReviewSection>
      )}

      {/* Risks */}
      {data.risks.length > 0 && (
        <ReviewSection title="Risks">
          {data.risks.map((r, i) => (
            <div key={i} style={{ fontSize: typography.xs, color: colors.statusHigh, lineHeight: 1.5, padding: '4px 0' }}>
              ⚠ {r}
            </div>
          ))}
        </ReviewSection>
      )}

      {/* Draft excerpt */}
      {data.draftExcerpt && (
        <ReviewSection title="Draft">
          <div style={{
            padding: '12px',
            background: colors.surfaceRaised,
            borderRadius: radii.md,
            border: `1px solid ${colors.border}`,
            fontFamily: 'monospace',
            fontSize: typography.xs,
            color: colors.textSecondary,
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
          }}>
            {data.draftExcerpt}
          </div>
        </ReviewSection>
      )}

      <Divider />

      {/* Decision */}
      <div style={{ marginTop: spacing[4] }}>
        <div style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: '10px' }}>
          Authorization Decision
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <Button
            variant={decision === 'approve' ? 'primary' : 'secondary'}
            size="md"
            onClick={() => setDecision('approve')}
          >
            Approve
          </Button>
          <Button
            variant={decision === 'changes' ? 'primary' : 'secondary'}
            size="md"
            onClick={() => setDecision('changes')}
          >
            Request Changes
          </Button>
          <Button
            variant={decision === 'reject' ? 'danger' : 'ghost'}
            size="md"
            onClick={() => setDecision('reject')}
          >
            Reject
          </Button>
        </div>

        {decision !== 'none' && decision !== 'approve' && (
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={decision === 'reject' ? 'Reason for rejection (required)' : 'What changes are needed?'}
            style={{
              width: '100%',
              minHeight: '80px',
              background: colors.surfaceRaised,
              border: `1px solid ${colors.border}`,
              borderRadius: radii.md,
              padding: '10px 12px',
              color: colors.textPrimary,
              fontSize: typography.sm,
              outline: 'none',
              resize: 'vertical',
              marginBottom: '12px',
            }}
          />
        )}

        {decision === 'approve' && (
          <div style={{ marginBottom: '12px', padding: '10px 12px', background: colors.statusLowBg, borderRadius: radii.md, fontSize: typography.xs, color: colors.statusLow }}>
            By approving, you authorize the document to be mailed via MailMyPDF. This action is final and will be recorded with proof.
          </div>
        )}

        {decision !== 'none' && (
          <div>
            <Button
              variant={decision === 'reject' ? 'danger' : 'primary'}
              onClick={() => {
                if (decision === 'approve') onApprove?.()
                else if (decision === 'reject' && notes.trim()) onReject?.(notes)
                else if (decision === 'changes' && notes.trim()) onRequestChanges?.(notes)
              }}
              disabled={decision !== 'approve' && !notes.trim()}
            >
              {decision === 'approve' ? 'Confirm Approval' : decision === 'reject' ? 'Confirm Rejection' : 'Send Change Request'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Review Section ──────────────────────────────────────────────────────────

function ReviewSection({ title, highlight, children }: { title: string; highlight?: 'critical'; children: React.ReactNode }) {
  return (
    <div style={{
      border: `1px solid ${highlight === 'critical' ? colors.statusCritical + '30' : colors.border}`,
      borderRadius: radii.md,
      padding: '14px',
      marginBottom: '12px',
      background: colors.surface,
    }}>
      <div style={{
        fontSize: typography.xs,
        fontWeight: typography.bold,
        color: highlight === 'critical' ? colors.statusCritical : colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: '10px',
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}
