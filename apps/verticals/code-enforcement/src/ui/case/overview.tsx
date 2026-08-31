'use client'

import { colors, typography, spacing, urgencyConfig } from '../tokens/tokens'
import { Panel, Badge, Eyebrow, Button, ProgressBar, EmptyState } from '../primitives/primitives'
import type { CaseViewModel, OverviewViewModel, FindingSummaryViewModel, NextActionViewModel } from '../types/view-models'

interface OverviewProps {
  context: CaseViewModel
  data: OverviewViewModel
  onNavigate?: (view: string) => void
}

export function CaseOverview({ context, data, onNavigate }: OverviewProps) {
  const urgency = urgencyConfig[data.urgency.level]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[5], maxWidth: '900px' }}>
      {/* WHAT IS HAPPENING */}
      <Panel title="At a Glance" subtitle="What is happening with this case">
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Badge label={urgency.label} color={urgency.color} bg={urgency.bg} icon="!" />
              <span style={{ fontSize: typography.sm, color: colors.textSecondary }}>{context.agency || 'Agency not identified'}</span>
            </div>
            <p style={{ fontSize: typography.sm, color: colors.textMuted, lineHeight: 1.55 }}>
              {data.urgency.reason}
            </p>
          </div>
        </div>
      </Panel>

      {/* WHAT IS DUE */}
      {data.deadline && (
        <Panel title="Deadline" subtitle="What is due and when">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <div>
              <div style={{ fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: '0.08em', color: colors.textMuted, fontWeight: typography.semibold, marginBottom: '4px' }}>
                {data.deadline.label}
              </div>
              <div style={{ fontSize: typography.xl, fontWeight: typography.bold, color: data.deadline.daysRemaining !== null && data.deadline.daysRemaining <= 3 ? colors.statusHigh : colors.textPrimary }}>
                {data.deadline.date}
              </div>
              {data.deadline.daysRemaining !== null && (
                <div style={{ fontSize: typography.sm, color: data.deadline.daysRemaining < 0 ? colors.statusCritical : colors.textMuted, marginTop: '4px' }}>
                  {data.deadline.daysRemaining < 0
                    ? `${Math.abs(data.deadline.daysRemaining)} days past`
                    : `${data.deadline.daysRemaining} days remaining`}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: typography.xs, color: colors.textMuted }}>Source</div>
              <div style={{ fontSize: typography.sm, color: colors.textSecondary }}>{data.deadline.source}</div>
              <Badge
                label={data.deadline.submitted ? 'Submitted' : 'Not submitted'}
                color={data.deadline.submitted ? colors.statusLow : colors.statusMedium}
                size="sm"
              />
            </div>
          </div>
        </Panel>
      )}

      {/* WHAT IS WRONG — Top Findings */}
      <Panel
        title="Top Findings"
        subtitle="What needs attention"
        rightAction={onNavigate && <Button variant="ghost" size="sm" onClick={() => onNavigate('findings')}>View all →</Button>}
      >
        {data.topFindings.length === 0 ? (
          <EmptyState
            title="No findings yet"
            description="Findings appear after document analysis. Upload the notice and run extraction to begin."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.topFindings.slice(0, 4).map(finding => (
              <FindingRow key={finding.id} finding={finding} onClick={() => onNavigate?.('findings')} />
            ))}
          </div>
        )}
      </Panel>

      {/* WHAT EVIDENCE EXISTS */}
      <Panel
        title="Evidence Status"
        subtitle="What evidence is available"
        rightAction={onNavigate && <Button variant="ghost" size="sm" onClick={() => onNavigate('evidence')}>View all →</Button>}
      >
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <ProgressBar
              completed={Math.round(data.evidenceStatus.completeness)}
              total={100}
              label="Completeness"
            />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: typography.xxl, fontWeight: typography.bold, color: colors.textPrimary }}>{data.evidenceStatus.total}</div>
            <div style={{ fontSize: typography.xs, color: colors.textMuted }}>evidence items</div>
          </div>
        </div>
        {Object.entries(data.evidenceStatus.byType).length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px' }}>
            {Object.entries(data.evidenceStatus.byType).map(([type, count]) => (
              <Badge key={type} label={`${type}: ${count}`} size="sm" color={colors.textMuted} />
            ))}
          </div>
        )}
      </Panel>

      {/* Workflow Progress */}
      <Panel title="Workflow Progress" subtitle="Where you are in the process">
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: '4px' }}>
            {data.workflowProgress.workflowName}
          </div>
          <ProgressBar
            completed={data.workflowProgress.completedSteps}
            total={data.workflowProgress.totalSteps}
            label={`Current: ${data.workflowProgress.currentStepName}`}
          />
        </div>
        {data.workflowProgress.blockedSteps.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            {data.workflowProgress.blockedSteps.map(step => (
              <div key={step} style={{ fontSize: typography.xs, color: colors.statusCritical, marginBottom: '2px' }}>
                ✕ Blocked: {step}
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* WHAT SHOULD HAPPEN NEXT — Next Best Action */}
      {data.nextBestAction && (
        <div style={{
          background: `linear-gradient(135deg, ${colors.accentMuted}20, ${colors.accent}10)`,
          border: `1px solid ${colors.accent}40`,
          borderRadius: '14px',
          padding: spacing[5],
        }}>
          <Eyebrow>Next Best Action</Eyebrow>
          <h3 style={{ fontSize: typography.lg, fontWeight: typography.semibold, color: colors.textPrimary, marginTop: '8px', marginBottom: '6px' }}>
            {data.nextBestAction.title}
          </h3>
          <p style={{ fontSize: typography.sm, color: colors.textSecondary, lineHeight: 1.55, marginBottom: '8px' }}>
            {data.nextBestAction.description}
          </p>
          <p style={{ fontSize: typography.xs, color: colors.textMuted, marginBottom: '16px' }}>
            <strong style={{ color: colors.textSecondary }}>Why:</strong> {data.nextBestAction.reason}
          </p>
          <Button variant="primary">
            {data.nextBestAction.actionLabel}
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Finding Row ───────────────────────────────────────────────────────────────

function FindingRow({ finding, onClick }: { finding: FindingSummaryViewModel; onClick?: () => void }) {
  const severityColors: Record<string, string> = {
    low: colors.statusLow,
    medium: colors.statusMedium,
    high: colors.statusHigh,
    critical: colors.statusCritical,
  }
  const severityBg: Record<string, string> = {
    low: colors.statusLowBg,
    medium: colors.statusMediumBg,
    high: colors.statusHighBg,
    critical: colors.statusCriticalBg,
  }
  const sev = severityColors[finding.severity] || colors.textMuted
  const sevBg = severityBg[finding.severity] || 'transparent'

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px',
        background: colors.surfaceRaised,
        border: `1px solid ${colors.border}`,
        borderRadius: '10px',
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
        width: '100%',
        transition: `border-color 150ms ease`,
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.borderColor = colors.borderHover }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border }}
    >
      <Badge label={finding.severity.toUpperCase()} color={sev} bg={sevBg} icon="!" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: '2px' }}>
          {finding.title}
        </div>
        <div style={{ fontSize: typography.xs, color: colors.textMuted, lineHeight: 1.5 }}>
          {finding.briefDescription}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
          <span style={{ fontSize: typography.xs, color: colors.textMuted }}>{finding.evidenceCount} evidence item(s)</span>
          {finding.recommendedAction && (
            <span style={{ fontSize: typography.xs, color: colors.accent }}>→ {finding.recommendedAction}</span>
          )}
        </div>
      </div>
    </button>
  )
}
