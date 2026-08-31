'use client'

import { colors, typography, radii, spacing, transitions } from '../tokens/tokens'
import { Badge, Button, EmptyState, Panel } from '../primitives/primitives'
import type { ActionViewModel as Action } from '../types/view-models'

// ─── Action Types ──────────────────────────────────────────────────────────────


// ─── Action Center ────────────────────────────────────────────────────────────

interface ActionCenterProps {
  actions: Action[]
  onAction?: (id: string) => void
}

export function ActionCenter({ actions, onAction }: ActionCenterProps) {
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  const sorted = [...actions].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  const priorityColors: Record<string, { color: string; bg: string }> = {
    critical: { color: colors.statusCritical, bg: colors.statusCriticalBg },
    high: { color: colors.statusHigh, bg: colors.statusHighBg },
    medium: { color: colors.statusMedium, bg: colors.statusMediumBg },
    low: { color: colors.statusLow, bg: colors.statusLowBg },
  }

  const statusLabels: Record<string, string> = {
    pending: 'Pending', in_progress: 'In Progress', completed: 'Completed', blocked: 'Blocked',
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      {actions.length === 0 ? (
        <EmptyState
          title="No actions pending"
          description="Actions appear as the case develops. Upload the notice, run analysis, and the system will surface what needs to be done."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sorted.map(action => {
            const pri = priorityColors[action.priority]
            return (
              <div key={action.id} style={{
                border: `1px solid ${colors.border}`,
                borderLeft: `3px solid ${pri.color}`,
                borderRadius: radii.md,
                padding: '14px',
                background: colors.surface,
                transition: transitions.fast,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <Badge label={action.priority.toUpperCase()} color={pri.color} bg={pri.bg} size="sm" />
                      <Badge label={statusLabels[action.status]} color={colors.textMuted} size="sm" />
                      {action.relatedWorkflow && <Badge label={action.relatedWorkflow} size="sm" color={colors.accent} />}
                    </div>
                    <div style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: '2px' }}>
                      {action.title}
                    </div>
                    <div style={{ fontSize: typography.xs, color: colors.textMuted, lineHeight: 1.5 }}>
                      {action.description}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: typography.xs, color: colors.textMuted }}>
                      <span>Source: {action.source}</span>
                      {action.dueDate && <span>Due: {action.dueDate}</span>}
                    </div>
                  </div>
                  {action.status !== 'completed' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => { onAction?.(action.id) }}
                    >
                      Take Action →
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
