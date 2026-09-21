import type { EcosystemTheme } from './index.js'

/**
 * Tiny renderer adapter used so the design-system package can stay framework-
 * dependency free while React apps still consume one canonical hero/trust UI.
 * Pass React.createElement from the host app and use the returned function as a
 * normal JSX component.
 */
export type ElementFactory = (type: any, props?: any, ...children: any[]) => any

export type HeroTone = 'light' | 'dark'

export interface VerticalHeroProps {
  theme: EcosystemTheme
  eyebrow: string
  title: any
  description: string
  imageSrc: string
  imageAlt: string
  tone?: HeroTone
  imagePosition?: string
  imageBackgroundSize?: string
  imageBackgroundPosition?: string
  actions?: any
  meta?: any
  panel?: any
  className?: string
}

export interface TrustStripItem {
  icon?: any
  title: string
  description?: string
}

export interface TrustStripProps {
  items: TrustStripItem[]
  className?: string
}

export function createVerticalHero(h: ElementFactory) {
  return function VerticalHero({
    theme,
    eyebrow,
    title,
    description,
    imageSrc,
    imageAlt,
    tone = 'light',
    imagePosition = 'center',
    imageBackgroundSize,
    imageBackgroundPosition,
    actions,
    meta,
    panel,
    className = '',
  }: VerticalHeroProps) {
    const media = imageBackgroundSize
      ? h('div', {
          className: 'mmp-vertical-hero__media mmp-vertical-hero__media--background',
          role: 'img',
          'aria-label': imageAlt,
          style: {
            backgroundImage: `url("${imageSrc}")`,
            backgroundSize: imageBackgroundSize,
            backgroundPosition: imageBackgroundPosition ?? imagePosition,
          },
        })
      : h(
          'div',
          { className: 'mmp-vertical-hero__media' },
          h('img', {
            src: imageSrc,
            alt: imageAlt,
            loading: 'eager',
            fetchPriority: 'high',
            style: { objectPosition: imagePosition },
          }),
        )

    return h(
      'section',
      {
        className: `mmp-vertical-hero mmp-vertical-hero--${tone} ${className}`.trim(),
        'data-mmp-hero-theme': theme,
      },
      media,
      h('div', { className: 'mmp-vertical-hero__scrim', 'aria-hidden': 'true' }),
      h(
        'div',
        { className: 'mmp-vertical-hero__inner' },
        h(
          'div',
          { className: 'mmp-vertical-hero__copy' },
          h('div', { className: 'mmp-vertical-hero__eyebrow' }, eyebrow),
          h('h1', { className: 'mmp-vertical-hero__title' }, title),
          h('p', { className: 'mmp-vertical-hero__lede' }, description),
          actions ? h('div', { className: 'mmp-vertical-hero__actions' }, actions) : null,
          meta ? h('div', { className: 'mmp-vertical-hero__meta' }, meta) : null,
        ),
        panel ? h('aside', { className: 'mmp-vertical-hero__panel' }, panel) : null,
      ),
    )
  }
}

export interface GlobalHeaderProps {
  /** Display name shown under the MailMyPDF wordmark, e.g. "Notice Respond". */
  productName: string
  /** Section root, e.g. "/notice-respond". */
  sectionPath: string
  /** Primary nav/CTA destination, e.g. "/notice-respond/workflows". */
  workflowsPath: string
  authHref?: string
}

export interface GlobalFooterProps {
  productName: string
  /** One line describing what the section's workflows do, shown next to the wordmark. */
  tagline: string
}

const DEFAULT_AUTH_HREF = '/auth?redirect=%2Fdashboard'

/**
 * The one global header every public MailMyPDF page (section landing and
 * workflow landing alike) renders, so a visitor never sees two different
 * navigation shells depending on which page depth they land on.
 */
export function createGlobalHeader(h: ElementFactory) {
  return function GlobalHeader({ productName, sectionPath, workflowsPath, authHref = DEFAULT_AUTH_HREF }: GlobalHeaderProps) {
    return h(
      'header',
      { className: 'mmp-site-header' },
      h(
        'div',
        { className: 'mmp-site-header__inner' },
        h(
          'a',
          { className: 'mmp-brand-lockup', href: '/', 'aria-label': 'MailMyPDF home' },
          h('span', { className: 'mmp-brand-mark', 'aria-hidden': 'true' }, 'M'),
          h(
            'span',
            { className: 'mmp-brand-copy' },
            h('span', { className: 'mmp-brand-name' }, 'MailMyPDF'),
            h('span', { className: 'mmp-brand-product' }, productName),
          ),
        ),
        h(
          'nav',
          { className: 'mmp-site-nav', 'aria-label': 'Primary navigation' },
          h('a', { href: '/workflows' }, 'All workflows'),
          h('a', { href: workflowsPath }, `${productName} workflows`),
          h('a', { href: '#how-it-works' }, 'How it works'),
          h('a', { href: '#faq' }, 'FAQ'),
        ),
        h(
          'div',
          { className: 'mmp-site-actions' },
          h('a', { className: 'mmp-button-secondary', href: authHref }, 'Sign in'),
          h('a', { className: 'mmp-button-primary', href: workflowsPath }, 'Start a workflow'),
        ),
      ),
    )
  }
}

/** The one global footer every public MailMyPDF page renders. */
export function createGlobalFooter(h: ElementFactory) {
  return function GlobalFooter({ productName, tagline }: GlobalFooterProps) {
    return h(
      'footer',
      { className: 'mmp-seo-footer' },
      h(
        'div',
        { className: 'mmp-section__inner mmp-seo-footer__inner' },
        h(
          'div',
          null,
          h('strong', { className: 'mmp-brand-name' }, 'MailMyPDF'),
          h('p', null, tagline),
        ),
        h(
          'nav',
          { 'aria-label': 'Footer navigation' },
          h('a', { href: '/workflows' }, 'Workflows'),
          h('a', { href: '/privacy' }, 'Privacy'),
          h('a', { href: '/terms' }, 'Terms'),
          h('a', { href: '/contact' }, 'Contact'),
        ),
      ),
    )
  }
}

export function createTrustStrip(h: ElementFactory) {
  return function TrustStrip({ items, className = '' }: TrustStripProps) {
    return h(
      'section',
      { className: `mmp-trust-row ${className}`.trim(), 'aria-label': 'Product trust and fulfillment details' },
      h(
        'div',
        { className: 'mmp-trust-row__inner' },
        ...items.map((item) =>
          h(
            'div',
            { className: 'mmp-trust-item', key: item.title },
            item.icon ? h('div', { className: 'mmp-trust-item__icon', 'aria-hidden': 'true' }, item.icon) : null,
            h(
              'div',
              null,
              h('strong', null, item.title),
              item.description ? h('span', null, item.description) : null,
            ),
          ),
        ),
      ),
    )
  }
}
