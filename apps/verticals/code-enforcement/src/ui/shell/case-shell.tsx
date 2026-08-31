'use client'

import { type ReactNode, useState } from 'react'
import { colors, typography, radii, spacing, transitions, urgencyConfig } from '../tokens/tokens'
import { Badge } from '../primitives/primitives'
import type {
  CaseViewModel as CaseContext,
  CaseAreaView,
  SidebarItemViewModel as SidebarItem,
} from '../types/view-models'

// ─── Case Header ─────────────────────────────────────────────────────────────

interface CaseHeaderProps {
  context: CaseContext
  onContinue?: () => void
  onReviewFindings?: () => void
}

export function CaseHeader({ context, onContinue, onReviewFindings }: CaseHeaderProps) {
  const urgency = urgencyConfig[context.urgency]
  return (
    <header
      role="banner"
      style={{
        background: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        padding: `${spacing[3]} ${spacing[5]}`,
        position: 'sticky',
        top: 0,
        zIndex: 200,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: spacing[5], flexWrap: 'wrap' }}>
        {/* Left: Property + Case */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
          <div style={{ fontSize: typography.xs, fontWeight: typography.bold, color: colors.textMuted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Code Enforcement
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: typography.lg, fontWeight: typography.semibold, color: colors.textPrimary, margin: 0 }}>
              {context.propertyAddress || 'Unknown property'}
            </h1>
            <Badge label={context.jurisdiction || 'Jurisdiction unknown'} size="sm" color={colors.textMuted} />
            <span style={{ fontSize: typography.sm, color: colors.textMuted }}>
              Case {context.caseNumber || '—'}
            </span>
          </div>
        </div>

        {/* Right: Status + Urgency + Deadline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Status */}
          <Badge
            label={context.status.toUpperCase()}
            color={context.status === 'open' ? colors.statusInfo : context.status === 'closed' ? colors.textMuted : colors.statusMedium}
            bg={context.status === 'open' ? colors.statusInfoBg : 'transparent'}
          />

          {/* Urgency */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <Badge label={urgency.label} color={urgency.color} bg={urgency.bg} icon="!" />
            <span style={{ fontSize: typography.xs, color: colors.textMuted, maxWidth: '220px' }}>
              {context.urgencyReason}
            </span>
          </div>

          {/* Deadline */}
          {context.deadline && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right' }}>
              <div style={{ fontSize: typography.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: typography.semibold }}>
                {context.deadline.label}
              </div>
              <div style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: context.deadline.daysRemaining !== null && context.deadline.daysRemaining <= 3 ? colors.statusHigh : colors.textPrimary }}>
                {context.deadline.date}
              </div>
              {context.deadline.daysRemaining !== null && (
                <div style={{ fontSize: typography.xs, color: context.deadline.daysRemaining < 0 ? colors.statusCritical : colors.textMuted }}>
                  {context.deadline.daysRemaining < 0
                    ? `${Math.abs(context.deadline.daysRemaining)} days past`
                    : `${context.deadline.daysRemaining} days remaining`}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {onContinue && (
              <button
                onClick={onContinue}
                style={{
                  padding: '8px 16px',
                  background: colors.accent,
                  color: '#fff',
                  border: 'none',
                  borderRadius: radii.md,
                  fontSize: typography.sm,
                  fontWeight: typography.semibold,
                  cursor: 'pointer',
                  transition: transitions.fast,
                }}
              >
                Continue
              </button>
            )}
            {onReviewFindings && (
              <button
                onClick={onReviewFindings}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  color: colors.textSecondary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.md,
                  fontSize: typography.sm,
                  fontWeight: typography.semibold,
                  cursor: 'pointer',
                  transition: transitions.fast,
                }}
              >
                Review Findings
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active workflow bar */}
      {context.activeWorkflow && (
        <div style={{
          marginTop: spacing[3],
          paddingTop: spacing[3],
          borderTop: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: typography.xs,
          color: colors.textMuted,
        }}>
          <span style={{ fontWeight: typography.semibold, color: colors.textSecondary }}>
            Active workflow:
          </span>
          <span style={{ color: colors.accent }}>{context.activeWorkflow.name}</span>
          <span>·</span>
          <span>Step {context.activeWorkflow.step}/{context.activeWorkflow.totalSteps}: {context.activeWorkflow.stepName}</span>
        </div>
      )}
    </header>
  )
}

// ─── Case Sidebar ─────────────────────────────────────────────────────────────

interface CaseSidebarProps {
  currentView: CaseAreaView
  onNavigate: (view: CaseAreaView) => void
  items: SidebarItem[]
}

export function CaseSidebar({ currentView, onNavigate, items }: CaseSidebarProps) {
  return (
    <nav
      role="navigation"
      aria-label="Case areas"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        padding: `${spacing[3]} 0`,
      }}
    >
      {items.map(item => {
        const isActive = currentView === item.view
        return (
          <button
            key={item.view}
            onClick={() => onNavigate(item.view)}
            aria-current={isActive ? 'page' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: `${spacing[2]} ${spacing[4]}`,
              background: isActive ? colors.surfaceRaised : 'transparent',
              border: 'none',
              borderLeft: isActive ? `2px solid ${colors.accent}` : '2px solid transparent',
              color: isActive ? colors.textPrimary : colors.textSecondary,
              fontSize: typography.sm,
              fontWeight: isActive ? typography.semibold : typography.regular,
              cursor: 'pointer',
              textAlign: 'left',
              transition: transitions.fast,
              width: '100%',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = colors.surfaceHover }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
          >
            <span style={{ width: '16px', textAlign: 'center', opacity: 0.7 }} aria-hidden>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.count !== undefined && item.count > 0 && (
              <span style={{ fontSize: typography.xs, color: colors.textMuted, fontWeight: typography.semibold }}>
                {item.count}
              </span>
            )}
            {item.badge && (
              <Badge label={item.badge.label} color={item.badge.color} size="sm" />
            )}
          </button>
        )
      })}
    </nav>
  )
}

// ─── Case Shell ───────────────────────────────────────────────────────────────

interface CaseShellProps {
  context: CaseContext
  children: ReactNode
  sidebarItems: SidebarItem[]
  initialView?: CaseAreaView
  onContinue?: () => void
  onReviewFindings?: () => void
}

export function CaseShell({ context, children, sidebarItems, initialView = 'overview', onContinue, onReviewFindings }: CaseShellProps) {
  const [currentView, setCurrentView] = useState<CaseAreaView>(initialView)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <CaseHeader context={context} onContinue={onContinue} onReviewFindings={onReviewFindings} />

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Sidebar — desktop */}
        <aside
          style={{
            width: '240px',
            flexShrink: 0,
            borderRight: `1px solid ${colors.border}`,
            background: colors.surface,
            display: 'none',
            '@media (min-width: 768px)': { display: 'block' },
          } as React.CSSProperties}
        >
          <CaseSidebar currentView={currentView} onNavigate={setCurrentView} items={sidebarItems} />
        </aside>

        {/* Main content */}
        <main
          role="main"
          style={{
            flex: 1,
            minWidth: 0,
            padding: spacing[6],
            overflow: 'auto',
          }}
        >
          {children}
        </main>
      </div>

      {/* Mobile nav — bottom drawer trigger */}
      <MobileNav currentView={currentView} onNavigate={setCurrentView} items={sidebarItems} />
    </div>
  )
}

// ─── Mobile Navigation ───────────────────────────────────────────────────────

function MobileNav({ currentView, onNavigate, items }: CaseSidebarProps) {
  const [open, setOpen] = useState(false)
  const currentItem = items.find(i => i.view === currentView)

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'block',
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 300,
          padding: `${spacing[3]} ${spacing[4]}`,
          background: colors.surface,
          borderTop: `1px solid ${colors.border}`,
          color: colors.textPrimary,
          fontSize: typography.sm,
          fontWeight: typography.semibold,
          textAlign: 'left',
          cursor: 'pointer',
          '@media (min-width: 768px)': { display: 'none' },
        } as React.CSSProperties}
        aria-expanded={open}
        aria-label="Toggle case navigation"
      >
        {currentItem?.icon} {currentItem?.label}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            top: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 299,
            '@media (min-width: 768px)': { display: 'none' },
          } as React.CSSProperties}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: colors.surface,
              borderTop: `1px solid ${colors.border}`,
              borderRadius: `${radii.xl} ${radii.xl} 0 0`,
              padding: `${spacing[4]} 0`,
              maxHeight: '70vh',
              overflow: 'auto',
            }}
          >
            <CaseSidebar currentView={currentView} onNavigate={(v) => { onNavigate(v); setOpen(false) }} items={items} />
          </div>
        </div>
      )}
    </>
  )
}
