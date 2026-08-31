'use client'

import { useState } from 'react'
import { colors, typography, radii, spacing, transitions, evidenceTypeConfig, type EvidenceType, provenanceConfig, type ProvenanceStrength } from '../tokens/tokens'
import { Card, Panel, Badge, EmptyState, Button } from '../primitives/primitives'
import type { EvidenceViewModel as EvidenceItem } from '../types/view-models'

// ─── Evidence Types ────────────────────────────────────────────────────────────


// ─── Evidence Center ──────────────────────────────────────────────────────────

interface EvidenceCenterProps {
  items: EvidenceItem[]
  onUpload?: () => void
  onSelect?: (id: string) => void
}

export function EvidenceCenter({ items, onUpload, onSelect }: EvidenceCenterProps) {
  const [selectedType, setSelectedType] = useState<EvidenceType | 'all'>('all')

  const types: (EvidenceType | 'all')[] = ['all', 'notice', 'agency_record', 'inspection_report', 'photo', 'permit', 'property_record', 'correspondence', 'police_record', 'public_record', 'user_statement', 'ai_research', 'other']

  const filtered = selectedType === 'all' ? items : items.filter(i => i.type === selectedType)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[5], maxWidth: '900px' }}>
      {/* Filter bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {types.map(t => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              style={{
                padding: '6px 12px',
                background: selectedType === t ? colors.accent : colors.surfaceRaised,
                color: selectedType === t ? '#fff' : colors.textSecondary,
                border: `1px solid ${selectedType === t ? colors.accent : colors.border}`,
                borderRadius: radii.full,
                fontSize: typography.xs,
                fontWeight: typography.semibold,
                cursor: 'pointer',
                transition: transitions.fast,
              }}
            >
              {t === 'all' ? 'All' : evidenceTypeConfig[t as EvidenceType].label}
            </button>
          ))}
        </div>
        {onUpload && <Button variant="primary" size="sm" onClick={onUpload}>+ Add Evidence</Button>}
      </div>

      {/* Evidence list */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No evidence yet"
          description="Upload a notice, photo, permit, inspection report, or other supporting document to begin building the evidence record."
          action={onUpload && <Button variant="primary" onClick={onUpload}>Upload Evidence</Button>}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(item => (
            <EvidenceCard key={item.id} item={item} onSelect={() => onSelect?.(item.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Evidence Card ────────────────────────────────────────────────────────────

function EvidenceCard({ item, onSelect }: { item: EvidenceItem; onSelect?: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const typeConfig = evidenceTypeConfig[item.type]
  const provConfig = provenanceConfig[item.provenance]

  return (
    <div
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: radii.md,
        background: colors.surface,
        transition: transitions.fast,
      }}
    >
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
      >
        {/* Type icon */}
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: radii.md,
          background: colors.surfaceRaised,
          border: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: typography.sm,
          fontWeight: typography.bold,
          color: colors.textMuted,
          flexShrink: 0,
        }}>
          {typeConfig.icon}
        </div>

        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: typography.sm,
            fontWeight: typography.semibold,
            color: colors.textPrimary,
            marginBottom: '2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {item.title}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: typography.xs, color: colors.textMuted }}>{typeConfig.label}</span>
            {item.date && <span style={{ fontSize: typography.xs, color: colors.textMuted }}>{item.date}</span>}
            <Badge label={provConfig.label} color={provConfig.color} size="sm" />
          </div>
        </div>

        {/* Expand indicator */}
        <span style={{ color: colors.textMuted, fontSize: typography.sm }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div style={{
          padding: '0 14px 14px',
          borderTop: `1px solid ${colors.border}`,
          paddingTop: '14px',
        }}>
          {item.whyItMatters && (
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: typography.xs, color: colors.textMuted, fontWeight: typography.semibold, marginBottom: '4px' }}>Why this matters</div>
              <div style={{ fontSize: typography.xs, color: colors.textSecondary, lineHeight: 1.5 }}>{item.whyItMatters}</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
            <div>
              <div style={{ fontSize: typography.xs, color: colors.textMuted, fontWeight: typography.semibold, marginBottom: '4px' }}>Source</div>
              <div style={{ fontSize: typography.xs, color: colors.textSecondary }}>{item.source}</div>
            </div>
            {item.hash && (
              <div>
                <div style={{ fontSize: typography.xs, color: colors.textMuted, fontWeight: typography.semibold, marginBottom: '4px' }}>Hash</div>
                <div style={{ fontSize: typography.xs, color: colors.textMuted, fontFamily: 'monospace' }}>{item.hash.slice(0, 16)}…</div>
              </div>
            )}
            {item.confidence !== undefined && (
              <div>
                <div style={{ fontSize: typography.xs, color: colors.textMuted, fontWeight: typography.semibold, marginBottom: '4px' }}>Confidence</div>
                <div style={{ fontSize: typography.xs, color: colors.textSecondary }}>{(item.confidence * 100).toFixed(0)}%</div>
              </div>
            )}
          </div>

          {item.relatedFacts && item.relatedFacts.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: typography.xs, color: colors.textMuted, fontWeight: typography.semibold, marginBottom: '4px' }}>Related facts</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {item.relatedFacts.map(f => <Badge key={f} label={f} size="sm" color={colors.accent} />)}
              </div>
            </div>
          )}

          {item.relatedTimelineEvents && item.relatedTimelineEvents.length > 0 && (
            <div>
              <div style={{ fontSize: typography.xs, color: colors.textMuted, fontWeight: typography.semibold, marginBottom: '4px' }}>Related timeline events</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {item.relatedTimelineEvents.map(t => <Badge key={t} label={t} size="sm" color={colors.textMuted} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
