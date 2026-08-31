'use client'

import { useState } from 'react'
import { colors, typography, radii, spacing, transitions, factConfig } from '../tokens/tokens'
import { Badge, EmptyState } from '../primitives/primitives'
import type { TimelineEventViewModel, FactCategory } from '../types/view-models'

type TimelineFilter = 'all' | 'verified' | 'user_assertion' | 'conflict' | 'deadlines' | 'agency' | 'user'

interface TimelineProps {
  events: TimelineEventViewModel[]
}

export function Timeline({ events }: TimelineProps) {
  const [filter, setFilter] = useState<TimelineFilter>('all')

  const filters: { key: TimelineFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'verified', label: 'Verified' },
    { key: 'user_assertion', label: 'User Assertions' },
    { key: 'conflict', label: 'Conflicts' },
    { key: 'deadlines', label: 'Deadlines' },
    { key: 'agency', label: 'Agency Actions' },
    { key: 'user', label: 'User Actions' },
  ]

  const filtered = events.filter(e => {
    switch (filter) {
      case 'verified': return e.factCategory === 'verified_fact'
      case 'user_assertion': return e.factCategory === 'user_assertion'
      case 'conflict': return e.factCategory === 'conflict'
      case 'deadlines': return e.event.toLowerCase().includes('deadline') || e.event.toLowerCase().includes('due')
      case 'agency': return e.source === 'document' || e.source === 'agency'
      case 'user': return e.source === 'user'
      default: return true
    }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[5], maxWidth: '800px' }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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

      {/* Timeline */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No timeline events"
          description="Timeline events appear after documents are analyzed. Upload the notice to begin building the case timeline."
        />
      ) : (
        <div style={{ position: 'relative', paddingLeft: '24px' }}>
          <div style={{
            position: 'absolute',
            left: '7px',
            top: '8px',
            bottom: '8px',
            width: '1px',
            background: colors.border,
          }} />
          {filtered.map((event, i) => (
            <TimelineEventRow key={event.id} event={event} isLast={i === filtered.length - 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function TimelineEventRow({ event, isLast }: { event: TimelineEventViewModel; isLast: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const fact = factConfig[event.factCategory as FactCategory]
  const isDeadline = event.event.toLowerCase().includes('deadline') || event.event.toLowerCase().includes('due')

  return (
    <div style={{ position: 'relative', paddingBottom: isLast ? 0 : '20px' }}>
      <div style={{
        position: 'absolute',
        left: '-24px',
        top: '4px',
        width: '14px',
        height: '14px',
        borderRadius: '50%',
        background: colors.surface,
        border: `2px solid ${fact.color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '8px',
        color: fact.color,
        fontWeight: 'bold',
        zIndex: 1,
      }}>
        {fact.icon}
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'left',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
        }}
        aria-expanded={expanded}
      >
        {event.date && (
          <div style={{ fontSize: typography.xs, color: colors.textMuted, marginBottom: '2px' }}>
            {event.dateApproximate && '~ '}
            {event.date}
          </div>
        )}

        <div style={{
          fontSize: typography.sm,
          fontWeight: typography.semibold,
          color: colors.textPrimary,
          marginBottom: '4px',
        }}>
          {event.event}
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
          <Badge label={fact.shortLabel} color={fact.color} size="sm" icon={fact.icon} />
          {isDeadline && <Badge label="DEADLINE" color={colors.statusHigh} size="sm" />}
          <span style={{ fontSize: typography.xs, color: colors.textMuted }}>
            Source: {event.source}
          </span>
        </div>

        {event.description && (
          <div style={{
            fontSize: typography.xs,
            color: colors.textMuted,
            lineHeight: 1.5,
            overflow: expanded ? 'visible' : 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: expanded ? 'normal' : 'nowrap',
          }}>
            {event.description}
          </div>
        )}

        {expanded && (
          <div style={{ marginTop: '8px', padding: '10px', background: colors.surfaceRaised, borderRadius: radii.md, border: `1px solid ${colors.border}` }}>
            {event.excerpt && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: typography.xs, color: colors.textMuted, fontWeight: typography.semibold, marginBottom: '4px' }}>Excerpt:</div>
                <div style={{ fontSize: typography.xs, color: colors.textSecondary, fontFamily: 'monospace', background: colors.background, padding: '8px', borderRadius: radii.sm, lineHeight: 1.5 }}>
                  {event.excerpt}
                </div>
              </div>
            )}
            {event.actor && (
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: typography.xs, color: colors.textMuted, fontWeight: typography.semibold }}>Actor: </span>
                <span style={{ fontSize: typography.xs, color: colors.textSecondary }}>{event.actor}</span>
              </div>
            )}
            {event.relatedEvidence && event.relatedEvidence.length > 0 && (
              <div>
                <div style={{ fontSize: typography.xs, color: colors.textMuted, fontWeight: typography.semibold, marginBottom: '4px' }}>Related evidence:</div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {event.relatedEvidence.map(id => (
                    <Badge key={id} label={id} size="sm" color={colors.accent} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </button>
    </div>
  )
}
