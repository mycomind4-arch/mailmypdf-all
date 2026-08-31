/**
 * Design Tokens — Local Presentation Layer
 *
 * Centralized design tokens for the Code Enforcement vertical.
 * These are temporary local tokens designed to be replaceable
 * when the shared ecosystem redesign becomes available.
 *
 * Structure:
 * - Colors (semantic, not raw)
 * - Typography
 * - Spacing
 * - Radii
 * - Borders
 * - Shadows
 * - Status states
 * - Interaction states
 *
 * DO NOT import colors or spacing directly in components.
 * Import from here.
 */

// ─── Color Tokens ─────────────────────────────────────────────────────────────

import type { UrgencyLevel, FactCategory, EvidenceType, ViolationStatus, WorkflowStepStatus, ProvenanceStrength } from '../types/view-models'
export type { UrgencyLevel, FactCategory, EvidenceType, ViolationStatus, WorkflowStepStatus, ProvenanceStrength } from '../types/view-models'

export const colors = {
  // Surface
  background: '#0a0e14',
  surface: '#0f141c',
  surfaceRaised: '#141a24',
  surfaceHover: '#191f2b',

  // Text
  textPrimary: '#eef2f7',
  textSecondary: '#a4b0c0',
  textMuted: '#6b7a8e',
  textDisabled: '#4a5568',

  // Accent — used sparingly
  accent: '#3b8dde',
  accentHover: '#4d9ef0',
  accentMuted: '#2868a8',

  // Status — semantic
  statusCritical: '#e5484d',
  statusCriticalBg: '#2a1518',
  statusHigh: '#e8833a',
  statusHighBg: '#2a1d12',
  statusMedium: '#eab308',
  statusMediumBg: '#252318',
  statusLow: '#22c55e',
  statusLowBg: '#14291e',
  statusInfo: '#3b8dde',
  statusInfoBg: '#13243a',

  // Fact taxonomy — color-independent (always paired with label)
  factVerified: '#22c55e',
  factUserAssertion: '#eab308',
  factInference: '#8b5cf6',
  factUnknown: '#6b7a8e',
  factConflict: '#e5484d',
  factRule: '#3b8dde',
  factRecommendation: '#14b8a6',

  // Borders
  border: '#1e2632',
  borderHover: '#2a3442',
  borderFocus: '#3b8dde',

  // Provenance
  provenanceStrong: '#22c55e',
  provenancePartial: '#eab308',
  provenanceNone: '#6b7a8e',
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────

export const typography = {
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSizeMono: '"SF Mono", ui-monospace, "Cascadia Code", monospace',

  // Size scale
  xs: '11px',
  sm: '13px',
  base: '15px',
  lg: '17px',
  xl: '21px',
  xxl: '28px',
  display: '42px',

  // Weights
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,

  // Line heights
  tight: 1.15,
  snug: 1.35,
  normal: 1.55,
  relaxed: 1.7,

  // Tracking
  tightTracking: '-0.03em',
  normalTracking: '0',
  wideTracking: '0.08em',
  widerTracking: '0.12em',

  // Eyebrow style
  eyebrow: {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.12em',
    color: colors.textMuted,
  },
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const spacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

// ─── Radii ────────────────────────────────────────────────────────────────────

export const radii = {
  sm: '6px',
  md: '10px',
  lg: '14px',
  xl: '20px',
  full: '999px',
} as const;

// ─── Borders ──────────────────────────────────────────────────────────────────

export const borders = {
  thin: `1px solid ${colors.border}`,
  thinHover: `1px solid ${colors.borderHover}`,
  focus: `1px solid ${colors.borderFocus}`,
  accent: `1px solid ${colors.accent}`,
  dashed: `1px dashed ${colors.borderHover}`,
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────────────

export const shadows = {
  sm: '0 1px 3px rgba(0,0,0,0.12)',
  md: '0 4px 12px rgba(0,0,0,0.15)',
  lg: '0 12px 30px rgba(0,0,0,0.18)',
  xl: '0 20px 50px rgba(0,0,0,0.22)',
  focus: '0 0 0 3px rgba(59,141,222,0.25)',
} as const;

// ─── Status States ────────────────────────────────────────────────────────────


export const urgencyConfig: Record<UrgencyLevel, {
  label: string;
  color: string;
  bg: string;
  description: string;
}> = {
  low: { label: 'LOW', color: colors.statusLow, bg: colors.statusLowBg, description: 'No immediate deadline pressure.' },
  medium: { label: 'MEDIUM', color: colors.statusMedium, bg: colors.statusMediumBg, description: 'Deadline approaching.' },
  high: { label: 'HIGH', color: colors.statusHigh, bg: colors.statusHighBg, description: 'Deadline imminent.' },
  critical: { label: 'CRITICAL', color: colors.statusCritical, bg: colors.statusCriticalBg, description: 'Immediate action required.' },
};


export const factConfig: Record<FactCategory, {
  label: string;
  shortLabel: string;
  color: string;
  icon: string;
  description: string;
}> = {
  verified_fact: { label: 'VERIFIED', shortLabel: 'VERIFIED', color: colors.factVerified, icon: '✓', description: 'Confirmed against authoritative source documents.' },
  user_assertion: { label: 'USER ASSERTION', shortLabel: 'ASSERTED', color: colors.factUserAssertion, icon: '⚠', description: 'Asserted by the user, not yet verified against sources.' },
  inference: { label: 'AI INFERENCE', shortLabel: 'INFERRED', color: colors.factInference, icon: '◇', description: 'Derived by inference from other facts.' },
  unknown: { label: 'UNKNOWN', shortLabel: 'UNKNOWN', color: colors.factUnknown, icon: '?', description: 'Status not yet determined.' },
  rule: { label: 'RULE', shortLabel: 'RULE', color: colors.factRule, icon: '§', description: 'Governing rule or regulation.' },
  recommendation: { label: 'RECOMMENDATION', shortLabel: 'REC', color: colors.factRecommendation, icon: '→', description: 'Recommended action based on analysis.' },
  conflict: { label: 'CONFLICT', shortLabel: 'CONFLICT', color: colors.factConflict, icon: '!', description: 'Contradicts other evidence; needs resolution.' },
};


export const evidenceTypeConfig: Record<EvidenceType, { label: string; icon: string }> = {
  notice: { label: 'Notice', icon: 'N' },
  agency_record: { label: 'Agency Record', icon: 'A' },
  inspection_report: { label: 'Inspection Report', icon: 'I' },
  photo: { label: 'Photo', icon: 'P' },
  video: { label: 'Video', icon: 'V' },
  permit: { label: 'Permit', icon: 'P' },
  property_record: { label: 'Property Record', icon: 'R' },
  correspondence: { label: 'Correspondence', icon: 'C' },
  police_record: { label: 'Police / Incident', icon: 'X' },
  public_record: { label: 'Public Record', icon: 'U' },
  user_statement: { label: 'User Statement', icon: 'S' },
  ai_research: { label: 'AI Research', icon: 'AI' },
  other: { label: 'Other', icon: '·' },
};


export const violationStatusConfig: Record<ViolationStatus, { label: string; color: string }> = {
  alleged: { label: 'Alleged', color: colors.statusMedium },
  under_review: { label: 'Under Review', color: colors.statusInfo },
  supported: { label: 'Supported', color: colors.statusHigh },
  contradicted: { label: 'Contradicted', color: colors.statusLow },
  corrected: { label: 'Corrected', color: colors.statusLow },
  unresolved: { label: 'Unresolved', color: colors.statusCritical },
  closed: { label: 'Closed', color: colors.textMuted },
};


export const workflowStepConfig: Record<WorkflowStepStatus, { label: string; icon: string; color: string }> = {
  pending: { label: 'Pending', icon: '○', color: colors.textMuted },
  active: { label: 'In Progress', icon: '◐', color: colors.accent },
  complete: { label: 'Complete', icon: '✓', color: colors.statusLow },
  blocked: { label: 'Blocked', icon: '✕', color: colors.statusCritical },
};


export const provenanceConfig: Record<ProvenanceStrength, { label: string; color: string }> = {
  strong: { label: 'SUPPORTED BY MULTIPLE SOURCES', color: colors.provenanceStrong },
  partial: { label: 'PARTIAL SUPPORT', color: colors.provenancePartial },
  none: { label: 'USER ASSERTION ONLY', color: colors.provenanceNone },
};

// ─── Z-Index ──────────────────────────────────────────────────────────────────

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  drawer: 300,
  modal: 400,
  toast: 500,
} as const;

// ─── Transitions ──────────────────────────────────────────────────────────────

export const transitions = {
  fast: '150ms ease',
  normal: '200ms ease',
  slow: '350ms ease',
} as const;
