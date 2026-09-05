import type { ElementFactory } from './public-page.js'

export interface PublicWorkflowDirectoryItem {
  id: string
  title: string
  category: string
  description: string
  href: string
  eyebrow?: string
  badge?: string
  meta?: string
  keywords?: string[]
}

export interface PublicWorkflowDirectoryCategory {
  id: string
  label: string
}

export interface PublicWorkflowDirectoryStep {
  title: string
  description: string
}

export interface PublicWorkflowDirectoryProps {
  productName: string
  title?: string
  description: string
  items: PublicWorkflowDirectoryItem[]
  categories?: PublicWorkflowDirectoryCategory[]
  searchPlaceholder?: string
  helperTitle?: string
  helperDescription?: string
  helperHref?: string
  helperLabel?: string
  steps?: PublicWorkflowDirectoryStep[]
  finalTitle?: string
  finalDescription?: string
  finalHref?: string
  finalLabel?: string
  renderLink?: (item: PublicWorkflowDirectoryItem, className: string, children: any[]) => any
  renderActionLink?: (href: string, className: string, children: any[]) => any
}

const css = `
.mmp-directory{font-family:var(--mmp-font-body,Inter,system-ui,sans-serif);color:var(--mmp-ink,#142638);background:var(--mmp-paper,#f8f4ec)}
.mmp-directory *{box-sizing:border-box}.mmp-directory a{text-decoration:none;color:inherit}
.mmp-directory__head{border-bottom:1px solid var(--mmp-border,#ded6c8);background:linear-gradient(180deg,var(--mmp-surface,#fffdf9),var(--mmp-paper,#f8f4ec));padding:clamp(2.4rem,5vw,4.6rem) 1rem 2.2rem}
.mmp-directory__inner{width:min(100% - 2rem,var(--mmp-content-max,1320px));margin-inline:auto}
.mmp-directory__crumb{font-size:.76rem;color:var(--mmp-ink-muted,#5f6973);margin-bottom:1rem}.mmp-directory__eyebrow{font-size:.7rem;font-weight:700;letter-spacing:.17em;text-transform:uppercase;color:var(--mmp-accent,#315f75)}
.mmp-directory__title{margin:.55rem 0 .8rem;font-family:var(--mmp-font-display,Georgia,serif);font-size:clamp(2.8rem,5vw,5rem);font-weight:400;line-height:.96;letter-spacing:-.025em}.mmp-directory__lede{max-width:760px;margin:0;color:var(--mmp-ink-muted,#5f6973);font-size:1rem;line-height:1.65}
.mmp-directory__layout{display:grid;grid-template-columns:230px minmax(0,1fr);gap:2rem;padding-block:2.2rem 4rem}.mmp-directory__rail{align-self:start;position:sticky;top:5.5rem;border:1px solid var(--mmp-border,#ded6c8);border-radius:.75rem;background:var(--mmp-surface,#fffdf9);overflow:hidden}
.mmp-directory__rail-title{padding:1rem 1rem .65rem;font-size:.7rem;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:var(--mmp-ink-muted,#5f6973)}.mmp-directory__cat{width:100%;border:0;border-top:1px solid var(--mmp-border,#ded6c8);background:transparent;padding:.83rem 1rem;display:flex;justify-content:space-between;gap:.7rem;text-align:left;color:var(--mmp-ink,#142638);cursor:pointer;font:600 .84rem/1.25 inherit}.mmp-directory__cat:hover,.mmp-directory__cat[aria-pressed=true]{background:var(--mmp-accent-soft,#e7f0f4);color:var(--mmp-accent,#315f75)}.mmp-directory__count{font-size:.72rem;color:var(--mmp-ink-muted,#5f6973)}
.mmp-directory__toolbar{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.8rem;margin-bottom:1.2rem}.mmp-directory__search{width:100%;min-height:46px;border:1px solid var(--mmp-border,#ded6c8);border-radius:.55rem;background:var(--mmp-surface,#fffdf9);padding:0 1rem;color:var(--mmp-ink,#142638);font:500 .88rem/1 inherit;outline:none}.mmp-directory__search:focus{border-color:var(--mmp-accent,#315f75);box-shadow:0 0 0 3px color-mix(in srgb,var(--mmp-accent,#315f75) 12%,transparent)}.mmp-directory__summary{display:flex;align-items:center;white-space:nowrap;padding:0 .85rem;border:1px solid var(--mmp-border,#ded6c8);border-radius:.55rem;background:var(--mmp-surface,#fffdf9);font-size:.78rem;color:var(--mmp-ink-muted,#5f6973)}
.mmp-directory__grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}.mmp-directory-card{display:flex;min-height:270px;flex-direction:column;overflow:hidden;border:1px solid var(--mmp-border,#ded6c8);border-radius:.75rem;background:var(--mmp-surface,#fffdf9);box-shadow:0 1px 2px rgba(16,40,61,.04);transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}.mmp-directory-card:hover{transform:translateY(-2px);border-color:color-mix(in srgb,var(--mmp-accent,#315f75) 35%,var(--mmp-border,#ded6c8));box-shadow:0 14px 32px -24px rgba(16,40,61,.45)}
.mmp-directory-card__media{height:72px;position:relative;overflow:hidden;border-bottom:1px solid var(--mmp-border,#ded6c8);background:linear-gradient(135deg,color-mix(in srgb,var(--mmp-accent-soft,#e7f0f4) 80%,white),var(--mmp-paper-deep,#efe8dc))}.mmp-directory-card__media:after{content:'';position:absolute;right:-12px;top:-38px;width:118px;height:110px;border:1px solid color-mix(in srgb,var(--mmp-accent,#315f75) 18%,var(--mmp-border,#ded6c8));background:rgba(255,255,255,.52);transform:rotate(8deg);box-shadow:0 4px 14px rgba(16,40,61,.08)}
.mmp-directory-card__category{position:absolute;z-index:1;left:1rem;bottom:.7rem;padding:.25rem .48rem;border-radius:999px;background:color-mix(in srgb,var(--mmp-surface,#fffdf9) 88%,transparent);font-size:.62rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--mmp-accent,#315f75)}.mmp-directory-card__body{display:flex;flex:1;flex-direction:column;padding:1.1rem}.mmp-directory-card__eyebrow{font-size:.64rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--mmp-ink-muted,#5f6973)}.mmp-directory-card__title{margin:.35rem 0 .55rem;font-family:var(--mmp-font-display,Georgia,serif);font-size:1.48rem;font-weight:400;line-height:1.05}.mmp-directory-card__desc{margin:0;color:var(--mmp-ink-muted,#5f6973);font-size:.82rem;line-height:1.55}.mmp-directory-card__meta{margin-top:.7rem;font-size:.7rem;color:var(--mmp-ink-muted,#5f6973)}.mmp-directory-card__action{margin-top:auto;padding-top:1rem;display:flex;justify-content:space-between;align-items:center;font-size:.78rem;font-weight:800}.mmp-directory-card__arrow{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--mmp-brand,#10283d);color:white}
.mmp-directory__empty{display:none;padding:3rem;border:1px dashed var(--mmp-border,#ded6c8);border-radius:.75rem;text-align:center;color:var(--mmp-ink-muted,#5f6973);background:var(--mmp-surface,#fffdf9)}.mmp-directory__helper{margin-top:1.25rem;display:grid;grid-template-columns:auto 1fr auto;gap:1rem;align-items:center;border:1px solid var(--mmp-border,#ded6c8);border-radius:.75rem;background:var(--mmp-surface,#fffdf9);padding:1.2rem 1.4rem}.mmp-directory__helper-icon{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--mmp-accent-soft,#e7f0f4);color:var(--mmp-accent,#315f75);font-size:1.2rem}.mmp-directory__helper h3{margin:0 0 .25rem;font-family:var(--mmp-font-display,Georgia,serif);font-size:1.45rem;font-weight:400}.mmp-directory__helper p{margin:0;color:var(--mmp-ink-muted,#5f6973);font-size:.82rem;line-height:1.5}.mmp-directory__button{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 1rem;border-radius:.5rem;background:var(--mmp-brand,#10283d);color:white!important;font-size:.8rem;font-weight:800;white-space:nowrap}
.mmp-directory__how{border-top:1px solid var(--mmp-border,#ded6c8);background:var(--mmp-surface,#fffdf9);padding:clamp(3rem,6vw,5rem) 1rem}.mmp-directory__how h2{margin:.45rem 0 1.8rem;font-family:var(--mmp-font-display,Georgia,serif);font-size:clamp(2.2rem,4vw,3.7rem);font-weight:400}.mmp-directory__steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--mmp-border,#ded6c8);border-radius:.75rem;overflow:hidden}.mmp-directory__step{padding:1.35rem;border-right:1px solid var(--mmp-border,#ded6c8)}.mmp-directory__step:last-child{border-right:0}.mmp-directory__step-num{font-family:var(--mmp-font-display,Georgia,serif);font-size:2rem;color:var(--mmp-accent,#315f75)}.mmp-directory__step h3{margin:.55rem 0 .35rem;font-size:.9rem}.mmp-directory__step p{margin:0;color:var(--mmp-ink-muted,#5f6973);font-size:.78rem;line-height:1.5}
.mmp-directory__final{padding:clamp(2.5rem,6vw,4.5rem) 1rem;background:var(--mmp-brand,#10283d);color:white}.mmp-directory__final-inner{width:min(100% - 2rem,var(--mmp-content-max,1320px));margin:auto;display:grid;grid-template-columns:1fr auto;align-items:center;gap:1.5rem}.mmp-directory__final h2{margin:0;font-family:var(--mmp-font-display,Georgia,serif);font-size:clamp(2.3rem,4vw,4rem);font-weight:400}.mmp-directory__final p{max-width:700px;margin:.65rem 0 0;color:rgba(255,255,255,.7);line-height:1.55}.mmp-directory__final .mmp-directory__button{background:white;color:var(--mmp-brand,#10283d)!important}
@media(max-width:1050px){.mmp-directory__grid{grid-template-columns:repeat(2,minmax(0,1fr))}.mmp-directory__layout{grid-template-columns:190px minmax(0,1fr)}}
@media(max-width:760px){.mmp-directory__head{padding-top:2.1rem}.mmp-directory__layout{display:block;padding-top:1.2rem}.mmp-directory__rail{position:static;margin-bottom:1rem;border:0;background:transparent;display:flex;gap:.45rem;overflow-x:auto;padding-bottom:.4rem}.mmp-directory__rail-title{display:none}.mmp-directory__cat{flex:none;width:auto;border:1px solid var(--mmp-border,#ded6c8);border-radius:999px;background:var(--mmp-surface,#fffdf9);padding:.58rem .85rem}.mmp-directory__count{margin-left:.35rem}.mmp-directory__toolbar{grid-template-columns:1fr}.mmp-directory__summary{min-height:38px;width:max-content}.mmp-directory__grid{grid-template-columns:1fr;gap:0;border:1px solid var(--mmp-border,#ded6c8);border-radius:.75rem;background:var(--mmp-surface,#fffdf9);overflow:hidden}.mmp-directory-card{min-height:0;display:grid;grid-template-columns:54px minmax(0,1fr) auto;align-items:center;border:0;border-bottom:1px solid var(--mmp-border,#ded6c8);border-radius:0;box-shadow:none;padding:.9rem 1rem}.mmp-directory-card:last-child{border-bottom:0}.mmp-directory-card:hover{transform:none;box-shadow:none}.mmp-directory-card__media{width:44px;height:44px;border:1px solid var(--mmp-border,#ded6c8);border-radius:.5rem;grid-column:1;grid-row:1;background:var(--mmp-accent-soft,#e7f0f4)}.mmp-directory-card__media:after,.mmp-directory-card__category{display:none}.mmp-directory-card__body{display:contents}.mmp-directory-card__eyebrow,.mmp-directory-card__desc,.mmp-directory-card__meta{display:none}.mmp-directory-card__title{grid-column:2;grid-row:1;margin:0;font-family:var(--mmp-font-body,Inter,sans-serif);font-size:.92rem;font-weight:700;line-height:1.25;padding-right:.5rem}.mmp-directory-card__action{grid-column:3;grid-row:1;margin:0;padding:0;font-size:0}.mmp-directory-card__arrow{width:28px;height:28px}.mmp-directory__helper{grid-template-columns:auto 1fr}.mmp-directory__helper .mmp-directory__button{grid-column:1/-1}.mmp-directory__steps{grid-template-columns:1fr}.mmp-directory__step{border-right:0;border-bottom:1px solid var(--mmp-border,#ded6c8)}.mmp-directory__step:last-child{border-bottom:0}.mmp-directory__final-inner{grid-template-columns:1fr}.mmp-directory__final .mmp-directory__button{width:max-content}}
`

export function createWorkflowDirectory(h: ElementFactory) {
  return function WorkflowDirectory({
    productName,
    title = `${productName} Workflows`,
    description,
    items,
    categories,
    searchPlaceholder = `Search ${productName.toLowerCase()} workflows…`,
    helperTitle = 'Not sure which workflow you need?',
    helperDescription = 'Start from the document or situation you have and use the directory to find the right workflow.',
    helperHref = '/',
    helperLabel = 'Find My Workflow',
    steps = [
      { title: 'Choose the workflow', description: 'Start with the notice, decision, request, or task that matches your situation.' },
      { title: 'Add your documents', description: 'Upload the documents and facts the workflow needs.' },
      { title: 'Review the result', description: 'Review the prepared output and make any needed changes.' },
      { title: 'Send or keep proof', description: 'Download it, or use MailMyPDF mailing and proof options when available.' },
    ],
    finalTitle = 'Ready to move the matter forward?',
    finalDescription = `Choose a ${productName} workflow and start with the document or situation you already have.`,
    finalHref = '/',
    finalLabel = 'Start a Workflow',
    renderLink,
    renderActionLink,
  }: PublicWorkflowDirectoryProps) {
    const resolvedCategories = categories ?? Array.from(new Set(items.map((item) => item.category))).map((label) => ({ id: label, label }))
    let selectedCategory = 'all'
    let searchValue = ''
    const rootId = `mmp-directory-${productName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

    const updateVisible = () => {
      if (typeof document === 'undefined') return
      const root = document.getElementById(rootId)
      if (!root) return
      let visible = 0
      root.querySelectorAll<HTMLElement>('[data-mmp-directory-card]').forEach((card) => {
        const category = card.dataset.category ?? ''
        const haystack = card.dataset.search ?? ''
        const categoryMatch = selectedCategory === 'all' || category === selectedCategory
        const searchMatch = !searchValue || haystack.includes(searchValue)
        const show = categoryMatch && searchMatch
        card.style.display = show ? '' : 'none'
        if (show) visible += 1
      })
      root.querySelectorAll<HTMLElement>('[data-mmp-directory-count]').forEach((node) => { node.textContent = `${visible} workflow${visible === 1 ? '' : 's'}` })
      const empty = root.querySelector<HTMLElement>('[data-mmp-directory-empty]')
      if (empty) empty.style.display = visible ? 'none' : 'block'
      root.querySelectorAll<HTMLButtonElement>('[data-mmp-directory-category]').forEach((button) => {
        button.setAttribute('aria-pressed', button.dataset.mmpDirectoryCategory === selectedCategory ? 'true' : 'false')
      })
    }

    const action = (href: string, className: string, label: string) => renderActionLink?.(href, className, [label, ' →']) ?? h('a', { href, className }, label, ' →')
    const card = (item: PublicWorkflowDirectoryItem) => {
      const children = [
        h('div', { className: 'mmp-directory-card__media', key: 'media' }, h('span', { className: 'mmp-directory-card__category' }, item.category)),
        h('div', { className: 'mmp-directory-card__body', key: 'body' },
          item.eyebrow ? h('span', { className: 'mmp-directory-card__eyebrow' }, item.eyebrow) : null,
          h('h3', { className: 'mmp-directory-card__title' }, item.title),
          h('p', { className: 'mmp-directory-card__desc' }, item.description),
          item.meta || item.badge ? h('div', { className: 'mmp-directory-card__meta' }, [item.badge, item.meta].filter(Boolean).join(' · ')) : null,
          h('div', { className: 'mmp-directory-card__action' }, h('span', null, 'Explore workflow'), h('span', { className: 'mmp-directory-card__arrow', 'aria-hidden': 'true' }, '→')),
        ),
      ]
      const className = 'mmp-directory-card'
      const rendered = renderLink?.(item, className, children) ?? h('a', { href: item.href, className, key: item.id }, ...children)
      return h('div', {
        key: item.id,
        'data-mmp-directory-card': 'true',
        'data-category': item.category,
        'data-search': [item.title, item.category, item.description, ...(item.keywords ?? [])].join(' ').toLowerCase(),
      }, rendered)
    }

    return h('div', { className: 'mmp-directory', id: rootId },
      h('style', { dangerouslySetInnerHTML: { __html: css } }),
      h('section', { className: 'mmp-directory__head' }, h('div', { className: 'mmp-directory__inner' },
        h('div', { className: 'mmp-directory__crumb' }, 'Home  ›  ', productName, '  ›  Workflows'),
        h('div', { className: 'mmp-directory__eyebrow' }, `${productName} directory`),
        h('h1', { className: 'mmp-directory__title' }, title),
        h('p', { className: 'mmp-directory__lede' }, description),
      )),
      h('div', { className: 'mmp-directory__inner mmp-directory__layout' },
        h('aside', { className: 'mmp-directory__rail', 'aria-label': 'Workflow categories' },
          h('div', { className: 'mmp-directory__rail-title' }, 'Browse by category'),
          h('button', { type: 'button', className: 'mmp-directory__cat', 'aria-pressed': 'true', 'data-mmp-directory-category': 'all', onClick: () => { selectedCategory = 'all'; updateVisible() } }, h('span', null, 'All Workflows'), h('span', { className: 'mmp-directory__count' }, String(items.length))),
          ...resolvedCategories.map((category) => h('button', { type: 'button', className: 'mmp-directory__cat', 'aria-pressed': 'false', 'data-mmp-directory-category': category.id, onClick: () => { selectedCategory = category.id; updateVisible() } }, h('span', null, category.label), h('span', { className: 'mmp-directory__count' }, String(items.filter((item) => item.category === category.id).length))))
        ),
        h('div', null,
          h('div', { className: 'mmp-directory__toolbar' },
            h('input', { className: 'mmp-directory__search', type: 'search', placeholder: searchPlaceholder, 'aria-label': searchPlaceholder, onInput: (event: any) => { searchValue = String(event.currentTarget?.value ?? '').trim().toLowerCase(); updateVisible() } }),
            h('div', { className: 'mmp-directory__summary', 'data-mmp-directory-count': 'true' }, `${items.length} workflows`),
          ),
          h('div', { className: 'mmp-directory__grid' }, ...items.map(card)),
          h('div', { className: 'mmp-directory__empty', 'data-mmp-directory-empty': 'true' }, 'No workflows match those filters. Try another category or search term.'),
          h('section', { className: 'mmp-directory__helper' },
            h('div', { className: 'mmp-directory__helper-icon', 'aria-hidden': 'true' }, '?'),
            h('div', null, h('h3', null, helperTitle), h('p', null, helperDescription)),
            action(helperHref, 'mmp-directory__button', helperLabel),
          ),
        ),
      ),
      h('section', { className: 'mmp-directory__how' }, h('div', { className: 'mmp-directory__inner' },
        h('div', { className: 'mmp-directory__eyebrow' }, 'How it works'),
        h('h2', null, `How ${productName} works.`),
        h('div', { className: 'mmp-directory__steps' }, ...steps.map((step, index) => h('div', { className: 'mmp-directory__step', key: step.title }, h('div', { className: 'mmp-directory__step-num' }, String(index + 1)), h('h3', null, step.title), h('p', null, step.description)))),
      )),
      h('section', { className: 'mmp-directory__final' }, h('div', { className: 'mmp-directory__final-inner' },
        h('div', null, h('h2', null, finalTitle), h('p', null, finalDescription)),
        action(finalHref, 'mmp-directory__button', finalLabel),
      )),
    )
  }
}
