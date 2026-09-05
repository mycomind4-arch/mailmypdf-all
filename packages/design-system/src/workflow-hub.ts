import type { ElementFactory } from './public-page.js'

export interface WorkflowHubItem {
  title: string
  description: string
  href: string
  eyebrow?: string
  badge?: string
  meta?: string
  icon?: any
}

export interface WorkflowHubProps {
  title: string
  description?: string
  items: WorkflowHubItem[]
  actions?: any
  renderLink?: (item: WorkflowHubItem, className: string, children: any[]) => any
}

export function createWorkflowHub(h: ElementFactory) {
  return function WorkflowHub({ title, description, items, actions, renderLink }: WorkflowHubProps) {
    const cards = items.map((item) => {
      const children = [
        h('div', { className: 'mmp-workflow-hub-card__top', key: 'top' },
          item.icon ? h('span', { className: 'mmp-workflow-hub-card__icon', 'aria-hidden': 'true' }, item.icon) : null,
          h('div', { className: 'mmp-workflow-hub-card__labels' },
            item.eyebrow ? h('span', { className: 'mmp-workflow-hub-card__eyebrow' }, item.eyebrow) : null,
            item.badge ? h('span', { className: 'mmp-workflow-hub-card__badge' }, item.badge) : null,
          ),
        ),
        h('h3', { className: 'mmp-workflow-hub-card__title', key: 'title' }, item.title),
        h('p', { className: 'mmp-workflow-hub-card__description', key: 'description' }, item.description),
        item.meta ? h('div', { className: 'mmp-workflow-hub-card__meta', key: 'meta' }, item.meta) : null,
        h('span', { className: 'mmp-workflow-hub-card__action', key: 'action' }, 'Open workflow →'),
      ]
      return renderLink?.(item, 'mmp-workflow-hub-card', children) ?? h('a', { href: item.href, className: 'mmp-workflow-hub-card', key: item.href }, ...children)
    })

    return h('section', { className: 'mmp-workflow-hub' },
      h('div', { className: 'mmp-workflow-hub__header' },
        h('div', null,
          h('div', { className: 'mmp-eyebrow' }, 'Workflow Hub'),
          h('h2', null, title),
          description ? h('p', null, description) : null,
        ),
        actions ? h('div', { className: 'mmp-workflow-hub__actions' }, actions) : null,
      ),
      h('div', { className: 'mmp-workflow-hub__grid' }, ...cards),
    )
  }
}
