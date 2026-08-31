'use client'

import { type ReactNode, type ButtonHTMLAttributes } from 'react'
import { typography, radii, shadows, transitions, colors } from '../tokens/tokens'

// ─── Button ────────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}

const buttonSizes: Record<ButtonSize, { padding: string; fontSize: string }> = {
  sm: { padding: '6px 12px', fontSize: typography.xs },
  md: { padding: '10px 16px', fontSize: typography.sm },
  lg: { padding: '14px 20px', fontSize: typography.base },
}

export function Button({ variant = 'secondary', size = 'md', children, style, ...props }: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    border: '1px solid transparent',
    borderRadius: radii.md,
    cursor: props.disabled ? 'not-allowed' : 'pointer',
    opacity: props.disabled ? 0.5 : 1,
    transition: `background ${transitions.fast}, border-color ${transitions.fast}, color ${transitions.fast}`,
    fontWeight: typography.semibold,
    whiteSpace: 'nowrap',
    ...buttonSizes[size],
    ...style,
  }

  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary: {
      background: colors.accent,
      color: '#fff',
      border: `1px solid ${colors.accent}`,
    },
    secondary: {
      background: colors.surfaceRaised,
      color: colors.textPrimary,
      border: `1px solid ${colors.border}`,
    },
    ghost: {
      background: 'transparent',
      color: colors.textSecondary,
      border: '1px solid transparent',
    },
    danger: {
      background: 'transparent',
      color: colors.statusCritical,
      border: `1px solid ${colors.statusCritical}40`,
    },
  }

  return (
    <button
      style={{ ...baseStyle, ...variants[variant] }}
      onMouseEnter={e => { if (!props.disabled && variant !== 'ghost') e.currentTarget.style.borderColor = colors.borderHover }}
      onMouseLeave={e => { if (!props.disabled) e.currentTarget.style.borderColor = variants[variant].border as string }}
      {...props}
    >
      {children}
    </button>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────

interface BadgeProps {
  label: string
  color?: string
  bg?: string
  size?: 'sm' | 'md'
  icon?: string
}

export function Badge({ label, color, bg, size = 'sm', icon }: BadgeProps) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: size === 'sm' ? '3px 8px' : '5px 12px',
      borderRadius: '999px',
      fontSize: size === 'sm' ? typography.xs : typography.sm,
      fontWeight: typography.semibold,
      color: color ?? colors.textSecondary,
      background: bg ?? 'transparent',
      border: `1px solid ${color ?? colors.border}30`,
      letterSpacing: '0.04em',
      whiteSpace: 'nowrap',
    }}>
      {icon && <span aria-hidden>{icon}</span>}
      {label}
    </span>
  )
}

// ─── Card ──────────────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode
  padding?: string
  hoverable?: boolean
  style?: React.CSSProperties
}

export function Card({ children, padding = '20px', hoverable, style }: CardProps) {
  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: radii.lg,
      padding,
      transition: `border-color ${transitions.fast}`,
      ...style,
    }}
    onMouseEnter={e => { if (hoverable) e.currentTarget.style.borderColor = colors.borderHover }}
    onMouseLeave={e => { if (hoverable) e.currentTarget.style.borderColor = colors.border }}
    >
      {children}
    </div>
  )
}

// ─── Panel (a titled Card) ───────────────────────────────────────────────────

interface PanelProps {
  title: string
  subtitle?: string
  rightAction?: ReactNode
  children: ReactNode
  padding?: string
}

export function Panel({ title, subtitle, rightAction, children, padding = '20px' }: PanelProps) {
  return (
    <div style={{
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      borderRadius: radii.lg,
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: `${padding} ${padding} 0 ${padding}`,
        gap: '12px',
      }}>
        <div>
          <h3 style={{ fontSize: typography.sm, fontWeight: typography.semibold, color: colors.textSecondary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{title}</h3>
          {subtitle && <p style={{ fontSize: typography.xs, color: colors.textMuted, marginTop: '4px' }}>{subtitle}</p>}
        </div>
        {rightAction}
      </div>
      <div style={{ padding }}>{children}</div>
    </div>
  )
}

// ─── Eyebrow ─────────────────────────────────────────────────────────────────

interface EyebrowProps {
  children: ReactNode
}

export function Eyebrow({ children }: EyebrowProps) {
  return (
    <div style={{
      fontSize: typography.eyebrow.fontSize,
      fontWeight: typography.eyebrow.fontWeight,
      textTransform: typography.eyebrow.textTransform,
      letterSpacing: typography.eyebrow.letterSpacing,
      color: typography.eyebrow.color,
    }}>
      {children}
    </div>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
}

export function Input({ label, hint, style, ...props }: InputProps) {
  return (
    <label style={{ display: 'grid', gap: '6px' }}>
      {label && <span style={{ fontSize: typography.xs, fontWeight: typography.semibold, color: colors.textSecondary }}>{label}</span>}
      <input
        style={{
          width: '100%',
          background: colors.surfaceRaised,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.md,
          padding: '10px 12px',
          color: colors.textPrimary,
          outline: 'none',
          transition: `border-color ${transitions.fast}`,
          ...style,
        }}
        onFocus={e => { e.currentTarget.style.borderColor = colors.borderFocus }}
        onBlur={e => { e.currentTarget.style.borderColor = colors.border }}
        {...props}
      />
      {hint && <span style={{ fontSize: typography.xs, color: colors.textMuted }}>{hint}</span>}
    </label>
  )
}

// ─── Textarea ────────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
}

export function Textarea({ label, hint, style, ...props }: TextareaProps) {
  return (
    <label style={{ display: 'grid', gap: '6px' }}>
      {label && <span style={{ fontSize: typography.xs, fontWeight: typography.semibold, color: colors.textSecondary }}>{label}</span>}
      <textarea
        style={{
          width: '100%',
          background: colors.surfaceRaised,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.md,
          padding: '10px 12px',
          color: colors.textPrimary,
          outline: 'none',
          transition: `border-color ${transitions.fast}`,
          minHeight: '80px',
          resize: 'vertical',
          ...style,
        }}
        onFocus={e => { e.currentTarget.style.borderColor = colors.borderFocus }}
        onBlur={e => { e.currentTarget.style.borderColor = colors.border }}
        {...props}
      />
      {hint && <span style={{ fontSize: typography.xs, color: colors.textMuted }}>{hint}</span>}
    </label>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner({ size = 16, label }: { size?: number; label?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <span style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `2px solid ${colors.border}`,
        borderTopColor: colors.accent,
        animation: 'ce-spin 0.6s linear infinite',
      }} />
      {label && <span style={{ fontSize: typography.sm, color: colors.textMuted }}>{label}</span>}
      <style>{'@keyframes ce-spin{to{transform:rotate(360deg)}}'}</style>
    </span>
  )
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────

interface ProgressBarProps {
  completed: number
  total: number
  label?: string
}

export function ProgressBar({ completed, total, label }: ProgressBarProps) {
  const pct = total > 0 ? (completed / total) * 100 : 0
  return (
    <div>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: typography.xs, color: colors.textMuted }}>
          <span>{label}</span>
          <span>{completed}/{total}</span>
        </div>
      )}
      <div style={{
        height: '4px',
        background: colors.border,
        borderRadius: '999px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: colors.accent,
          borderRadius: '999px',
          transition: `width ${transitions.slow}`,
        }} />
      </div>
    </div>
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────────

export function Divider() {
  return <div style={{ height: '1px', background: colors.border, margin: '16px 0' }} />
}

// ─── EmptyState ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: string
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '48px 24px',
      border: `1px dashed ${colors.border}`,
      borderRadius: radii.lg,
    }}>
      {icon && <div style={{ fontSize: '28px', marginBottom: '12px', opacity: 0.5 }}>{icon}</div>}
      <h3 style={{ fontSize: typography.lg, fontWeight: typography.semibold, color: colors.textSecondary, marginBottom: '8px' }}>{title}</h3>
      <p style={{ fontSize: typography.sm, color: colors.textMuted, maxWidth: '380px', lineHeight: 1.55, marginBottom: action ? '20px' : 0 }}>{description}</p>
      {action}
    </div>
  )
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

export function Skeleton({ width = '100%', height = '20px' }: { width?: string | number; height?: string | number }) {
  return (
    <div style={{
      width,
      height,
      background: colors.border,
      borderRadius: radii.sm,
      animation: 'ce-pulse 1.5s ease-in-out infinite',
    }}>
      <style>{'@keyframes ce-pulse{0%,100%{opacity:1}50%{opacity:0.5}}'}</style>
    </div>
  )
}
