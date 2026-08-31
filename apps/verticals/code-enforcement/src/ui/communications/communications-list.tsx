'use client'

import { useState } from 'react'
import { colors, typography, radii, spacing, transitions } from '../tokens/tokens'
import { Badge, Button, EmptyState, Panel } from '../primitives/primitives'
import type { CommunicationViewModel as Communication } from '../types/view-models'

// ─── Communication Types ───────────────────────────────────────────────────────


// ─── Communications List ──────────────────────────────────────────────────────

interface CommunicationsListProps {
  communications: Communication[]
  onSelect?: (id: string) => void
}

export function CommunicationsList({ communications, onSelect }: CommunicationsListProps) {
  const [filter, setFilter] = useState<'all' | 'drafts' | 'sent' | 'replies' | 'notes'>('all')

  const typeConfig: Record<string, { label: string; color: string }> = {
    draft: { label: 'Draft', color: colors.statusMedium },
    sent: { label: 'Sent', color: colors.accent },
    delivered: { label: 'Delivered', color: colors.statusLow },
    reply: { label: 'Agency Reply', color: colors.statusInfo },
    note: { label: 'Note', color: colors.textMuted },
  }

  const filtered = communications.filter(c => {
    switch (filter) {
      case 'drafts': return c.type === 'draft'
      case 'sent': return c.type === 'sent' || c.type === 'delivered'
      case 'replies': return c.type === 'reply'
      case 'notes': return c.type === 'note'
      default: return true
    }
  })

  const filters: { key: typeof filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'drafts', label: 'Drafts' },
    { key: 'sent', label: 'Sent' },
    { key: 'replies', label: 'Replies' },
    { key: 'notes', label: 'Notes' },
  ]

  return (
    <div style={{ maxWidth: '800px' }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '6px 12px',
              background: filter === f.key ? colors.accent : colors.surfaceRaised,
              color: filter === f.key ? '#fff' : colors.textSecondary,
              border: `1px solid ${filter === f.key ? colors.accent : colors.border}`,
              borderRadius: radii.full,
              fontSize: typography.xs,
              fontWeight: typography.semibold,
              cursor: 'pointer',
              transition: transitions.fast,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No communications"
          description="Drafts, sent mailings, agency replies, and notes will appear here. Every communication is permanently linked to the case."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(comm => {
            const typeCfg = typeConfig[comm.type]
            return (
              <div
                key={comm.id}
                onClick={() => onSelect?.(comm.id)}
                style={{
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.md,
                  padding: '14px',
                  background: colors.surface,
                  cursor: onSelect ? 'pointer' : 'default',
                  transition: transitions.fast,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = colors.borderHover }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = colors.border }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Badge label={typeCfg.label} color={typeCfg.color} size="sm" />
                    <span style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textPrimary }}>
                      {comm.title}
                    </span>
                  </div>
                  <span style={{ fontSize: typography.xs, color: colors.textMuted }}>{comm.date}</span>
                </div>
                {comm.recipient && (
                  <div style={{ fontSize: typography.xs, color: colors.textMuted }}>To: {comm.recipient}</div>
                )}
                {comm.excerpt && (
                  <div style={{ fontSize: typography.xs, color: colors.textMuted, marginTop: '4px', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {comm.excerpt}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {comm.workflow && <Badge label={comm.workflow} size="sm" color={colors.accent} />}
                  {comm.trackingNumber && <Badge label={`Tracking: ${comm.trackingNumber}`} size="sm" color={colors.textMuted} />}
                  {comm.proofHash && <Badge label="Proof on file" size="sm" color={colors.statusLow} />}
                  {comm.evidenceIds && comm.evidenceIds.length > 0 && <span style={{ fontSize: typography.xs, color: colors.textMuted }}>{comm.evidenceIds.length} evidence link(s)</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
