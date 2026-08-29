'use client'

import { colors, typography, radii, spacing, transitions, workflowStepConfig, type WorkflowStepStatus } from '../tokens/tokens'
import { Badge, Button, ProgressBar } from '../primitives/primitives'
import type { WorkflowStepViewModel as WorkflowStep, WorkflowProgressViewModel as WorkflowProgressData, WorkflowOptionViewModel as WorkflowOption } from '../types/view-models'

// ─── Workflow Progress Types ──────────────────────────────────────────────────



// ─── Workflow Progress ───────────────────────────────────────────────────────

interface WorkflowProgressProps {
  data: WorkflowProgressData
  onContinue?: () => void
  onStepClick?: (stepId: string) => void
}

export function WorkflowProgress({ data, onContinue, onStepClick }: WorkflowProgressProps) {
  return (
    <div style={{ maxWidth: '700px' }}>
      {/* Header */}
      <div style={{ marginBottom: spacing[4] }}>
        <h3 style={{ fontSize: typography.lg, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: '4px' }}>
          {data.workflowName}
        </h3>
        <ProgressBar
          completed={data.completedSteps}
          total={data.totalSteps}
          label={`Current: ${data.currentStepName}`}
        />
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {data.steps.map((step, i) => (
          <WorkflowStepRow key={step.id} step={step} index={i} onClick={onStepClick} />
        ))}
      </div>

      {/* Blocked summary */}
      {data.blockedSteps.length > 0 && (
        <div style={{
          marginTop: spacing[4],
          padding: '12px 14px',
          background: colors.statusCriticalBg,
          border: `1px solid ${colors.statusCritical}30`,
          borderRadius: radii.md,
        }}>
          <div style={{ fontSize: typography.xs, fontWeight: typography.semibold, color: colors.statusCritical, marginBottom: '4px' }}>
            {data.blockedSteps.length} step(s) blocked
          </div>
          {data.blockedSteps.map(s => (
            <div key={s} style={{ fontSize: typography.xs, color: colors.textMuted, marginBottom: '2px' }}>
              ✕ {s}
            </div>
          ))}
        </div>
      )}

      {/* Continue */}
      {onContinue && data.blockedSteps.length === 0 && data.completedSteps < data.totalSteps && (
        <div style={{ marginTop: spacing[4] }}>
          <Button variant="primary" onClick={onContinue}>Continue Workflow →</Button>
        </div>
      )}
    </div>
  )
}

// ─── Step Row ────────────────────────────────────────────────────────────────

function WorkflowStepRow({ step, index, onClick }: { step: WorkflowStep; index: number; onClick?: (id: string) => void }) {
  const config = workflowStepConfig[step.status]

  return (
    <button
      onClick={() => onClick?.(step.id)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '10px 12px',
        background: 'transparent',
        border: 'none',
        borderRadius: radii.sm,
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
        width: '100%',
        transition: transitions.fast,
        opacity: step.status === 'pending' ? 0.6 : 1,
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.background = colors.surfaceHover }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      {/* Icon */}
      <span style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '22px',
        height: '22px',
        borderRadius: '50%',
        fontSize: typography.sm,
        fontWeight: typography.bold,
        color: config.color,
        border: `1.5px solid ${config.color}`,
        flexShrink: 0,
        marginTop: '1px',
      }}>
        {config.icon}
      </span>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{
            fontSize: typography.sm,
            fontWeight: typography.semibold,
            color: step.status === 'pending' ? colors.textMuted : colors.textPrimary,
          }}>
            {step.title}
          </span>
          {!step.required && (
            <Badge label="optional" size="sm" color={colors.textMuted} />
          )}
        </div>
        <div style={{ fontSize: typography.xs, color: colors.textMuted, lineHeight: 1.4, marginTop: '2px' }}>
          {step.description}
        </div>
        {step.blockedReason && (
          <div style={{ fontSize: typography.xs, color: colors.statusCritical, marginTop: '4px', lineHeight: 1.4 }}>
            ⛔ {step.blockedReason}
          </div>
        )}
        {step.evidenceCount !== undefined && step.evidenceCount > 0 && step.status === 'complete' && (
          <div style={{ fontSize: typography.xs, color: colors.textMuted, marginTop: '4px' }}>
            {step.evidenceCount} evidence item(s) linked
          </div>
        )}
      </div>
    </button>
  )
}

// ─── Workflow Selector ────────────────────────────────────────────────────────


interface WorkflowSelectorProps {
  options: WorkflowOption[]
  onStart?: (workflowId: string) => void
}

export function WorkflowSelector({ options, onStart }: WorkflowSelectorProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3], maxWidth: '700px' }}>
      {options.map(opt => (
        <div
          key={opt.id}
          style={{
            border: `1px solid ${opt.available ? colors.border : colors.border}30`,
            borderRadius: radii.md,
            padding: '14px',
            background: colors.surface,
            opacity: opt.available ? 1 : 0.5,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: '2px' }}>
                {opt.name}
              </div>
              <div style={{ fontSize: typography.xs, color: colors.textMuted, lineHeight: 1.5 }}>
                {opt.description}
              </div>
              {opt.contextPreserved && opt.contextPreserved.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {opt.contextPreserved.map(c => (
                    <Badge key={c} label={`Preserves: ${c}`} size="sm" color={colors.textMuted} />
                  ))}
                </div>
              )}
            </div>
            <Button
              variant={opt.available ? 'primary' : 'secondary'}
              size="sm"
              disabled={!opt.available}
              onClick={() => opt.available && onStart?.(opt.id)}
            >
              {opt.available ? 'Start →' : opt.reason || 'Unavailable'}
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
