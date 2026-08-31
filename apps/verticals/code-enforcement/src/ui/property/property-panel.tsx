'use client'

import { colors, typography, radii, spacing, transitions, type ProvenanceStrength, provenanceConfig } from '../tokens/tokens'
import { Card, Panel, Badge, EmptyState } from '../primitives/primitives'
import type { PropertyViewModel as PropertyInfo } from '../types/view-models'

// ─── Property Types ────────────────────────────────────────────────────────────


// ─── Property Panel ──────────────────────────────────────────────────────────

interface PropertyPanelProps {
  info: PropertyInfo
}

export function PropertyPanel({ info }: PropertyPanelProps) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    verified: { label: 'Verified', color: colors.statusLow },
    user_supplied: { label: 'User supplied', color: colors.statusMedium },
    unavailable: { label: 'Unavailable', color: colors.textMuted },
    not_searched: { label: 'Not searched', color: colors.textMuted },
  }
  const status = statusConfig[info.dataStatus] || statusConfig.not_searched

  return (
    <div style={{ maxWidth: '800px' }}>
      {/* Header */}
      <div style={{
        padding: spacing[5],
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.lg,
        marginBottom: spacing[4],
      }}>
        <div style={{ fontSize: typography.xs, fontWeight: typography.bold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
          Property
        </div>
        <h2 style={{ fontSize: typography.xl, fontWeight: typography.semibold, color: colors.textPrimary, marginBottom: '6px' }}>
          {info.address || 'Unknown address'}
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {info.apn && <span style={{ fontSize: typography.sm, color: colors.textMuted }}>APN: {info.apn}</span>}
          <Badge label={status.label} color={status.color} size="sm" />
          {info.sourceLabel && <span style={{ fontSize: typography.xs, color: colors.textMuted }}>Source: {info.sourceLabel}</span>}
        </div>
      </div>

      {/* Details grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: spacing[4] }}>
        <DetailField label="Parcel Number" value={info.parcelNumber} />
        <DetailField label="Legal Description" value={info.legalDescription} />
        <DetailField label="Zoning" value={info.zoning} />
        <DetailField label="Land Use" value={info.landUse} />
        <DetailField label="Acreage" value={info.acreage !== undefined ? `${info.acreage} acres` : undefined} />
        <DetailField label="Source" value={info.source} />
      </div>

      {/* Case context */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '12px',
        marginBottom: spacing[4],
      }}>
        <StatCard label="Open Cases" value={info.openCases} />
        <StatCard label="Prior Notices" value={info.priorNotices} />
        <StatCard label="Permits" value={info.permits} />
      </div>

      {/* Map placeholder */}
      {info.mapAvailable && info.mapUrl ? (
        <div style={{
          border: `1px solid ${colors.border}`,
          borderRadius: radii.lg,
          overflow: 'hidden',
          background: colors.surface,
        }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: typography.xs, fontWeight: typography.semibold, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Property Map</div>
          </div>
          <div style={{ height: '300px', position: 'relative' }}>
            <iframe
              src={info.mapUrl}
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="Property map"
              loading="lazy"
            />
          </div>
        </div>
      ) : (
        <div style={{
          border: `1px dashed ${colors.border}`,
          borderRadius: radii.lg,
          padding: '40px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: typography.sm, color: colors.textMuted, marginBottom: '4px' }}>Map data not available</div>
          <div style={{ fontSize: typography.xs, color: colors.textMuted }}>GIS/property map will appear here when property data is resolved.</div>
        </div>
      )}
    </div>
  )
}

// ─── Detail Field ────────────────────────────────────────────────────────────

function DetailField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div style={{ fontSize: typography.xs, color: colors.textMuted, fontWeight: typography.semibold, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: typography.sm, color: value ? colors.textSecondary : colors.textMuted }}>
        {value || '—'}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value?: number }) {
  return (
    <div style={{
      padding: '14px',
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: radii.md,
    }}>
      <div style={{ fontSize: typography.xs, color: colors.textMuted, fontWeight: typography.semibold, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: typography.xl, fontWeight: typography.bold, color: value !== undefined ? colors.textPrimary : colors.textMuted }}>
        {value !== undefined ? value : '—'}
      </div>
    </div>
  )
}
