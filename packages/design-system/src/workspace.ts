import type { EcosystemTheme } from './index.js'
import type { ElementFactory } from './public-page.js'

export interface WorkspaceLinkItem {
  label: string
  href: string
  icon?: any
  active?: boolean
  badge?: string | number
}

export interface WorkspaceSection {
  label?: string
  items: WorkspaceLinkItem[]
}

export interface WorkspaceShellProps {
  theme: EcosystemTheme
  productName: string
  productLabel?: string
  homeHref?: string
  sections: WorkspaceSection[]
  mailPdfHref?: string
  ecosystemHref?: string
  footer?: any
  topbar?: any
  children?: any
  renderLink?: (item: WorkspaceLinkItem, className: string) => any
}

export interface WorkspaceTopbarProps {
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: any
  account?: any
}

export interface WorkspacePageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: any
  meta?: any
}

export interface WorkspaceMetric {
  label: string
  value: string | number
  detail?: string
}

function defaultLink(h: ElementFactory, item: WorkspaceLinkItem, className: string) {
  return h('a', { href: item.href, className },
    item.icon ? h('span', { className: 'mmp-workspace-nav__icon', 'aria-hidden': 'true' }, item.icon) : null,
    h('span', { className: 'mmp-workspace-nav__label' }, item.label),
    item.badge !== undefined ? h('span', { className: 'mmp-workspace-nav__badge' }, String(item.badge)) : null,
  )
}

export function createWorkspaceShell(h: ElementFactory) {
  return function WorkspaceShell({
    theme,
    productName,
    productLabel = 'MailMyPDF',
    homeHref = '/',
    sections,
    mailPdfHref = '/mail-a-pdf',
    ecosystemHref = '/products',
    footer,
    topbar,
    children,
    renderLink,
  }: WorkspaceShellProps) {
    const link = (item: WorkspaceLinkItem, className: string) => renderLink?.(item, className) ?? defaultLink(h, item, className)

    return h('div', { className: 'mmp-workspace', 'data-mmp-workspace-theme': theme },
      h('aside', { className: 'mmp-workspace-sidebar' },
        h('div', { className: 'mmp-workspace-sidebar__brand' },
          link({ label: productName, href: homeHref }, 'mmp-workspace-brand'),
          h('span', { className: 'mmp-workspace-brand__product' }, productLabel),
        ),
        h('nav', { className: 'mmp-workspace-nav', 'aria-label': `${productName} workspace navigation` },
          ...sections.map((section, index) => h('div', { className: 'mmp-workspace-nav__section', key: `${section.label ?? 'section'}-${index}` },
            section.label ? h('div', { className: 'mmp-workspace-nav__section-label' }, section.label) : null,
            ...section.items.map((item) => link(item, `mmp-workspace-nav__item${item.active ? ' is-active' : ''}`)),
          )),
        ),
        h('div', { className: 'mmp-workspace-sidebar__utilities' },
          link({ label: 'Mail a PDF', href: mailPdfHref }, 'mmp-workspace-utility'),
          link({ label: 'All MailMyPDF products', href: ecosystemHref }, 'mmp-workspace-utility'),
        ),
        footer ? h('div', { className: 'mmp-workspace-sidebar__footer' }, footer) : null,
      ),
      h('div', { className: 'mmp-workspace-main' },
        topbar,
        h('div', { className: 'mmp-workspace-content' }, children),
      ),
    )
  }
}

export function createWorkspaceTopbar(h: ElementFactory) {
  return function WorkspaceTopbar({ eyebrow, title, subtitle, actions, account }: WorkspaceTopbarProps) {
    return h('header', { className: 'mmp-workspace-topbar' },
      h('div', { className: 'mmp-workspace-topbar__copy' },
        eyebrow ? h('div', { className: 'mmp-workspace-topbar__eyebrow' }, eyebrow) : null,
        h('div', { className: 'mmp-workspace-topbar__title-row' },
          h('strong', { className: 'mmp-workspace-topbar__title' }, title),
          subtitle ? h('span', { className: 'mmp-workspace-topbar__subtitle' }, subtitle) : null,
        ),
      ),
      h('div', { className: 'mmp-workspace-topbar__actions' }, actions, account),
    )
  }
}

export function createWorkspacePageHeader(h: ElementFactory) {
  return function WorkspacePageHeader({ eyebrow, title, description, actions, meta }: WorkspacePageHeaderProps) {
    return h('section', { className: 'mmp-workspace-page-header' },
      h('div', { className: 'mmp-workspace-page-header__copy' },
        eyebrow ? h('div', { className: 'mmp-eyebrow' }, eyebrow) : null,
        h('h1', { className: 'mmp-workspace-page-header__title' }, title),
        description ? h('p', { className: 'mmp-workspace-page-header__description' }, description) : null,
        meta ? h('div', { className: 'mmp-workspace-page-header__meta' }, meta) : null,
      ),
      actions ? h('div', { className: 'mmp-workspace-page-header__actions' }, actions) : null,
    )
  }
}

export function createWorkspaceMetrics(h: ElementFactory) {
  return function WorkspaceMetrics({ metrics }: { metrics: WorkspaceMetric[] }) {
    return h('section', { className: 'mmp-metric-grid', 'aria-label': 'Workspace summary' },
      ...metrics.map((metric) => h('div', { className: 'mmp-metric', key: metric.label },
        h('strong', null, String(metric.value)),
        h('span', null, metric.label),
        metric.detail ? h('small', null, metric.detail) : null,
      )),
    )
  }
}
