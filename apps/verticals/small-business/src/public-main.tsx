import React from 'react'
import { createRoot } from 'react-dom/client'
import '../../../../packages/design-system/src/tokens.css'
import '../../../../packages/design-system/src/patterns.css'
import { PublicLanding } from './PublicLanding'

const params = new URLSearchParams(window.location.search)
const returningFromCheckout = params.get('checkout') === 'success' && Boolean(params.get('session_id'))
const workspaceMode = params.get('workspace') === '1' || returningFromCheckout

document.body.dataset.mmpTheme = 'small-business'

if (returningFromCheckout) {
  const current = new URL(window.location.href)
  current.searchParams.set('workspace', '1')
  window.history.replaceState({}, '', current.toString())
}

if (workspaceMode) {
  void Promise.all([import('./ui/ux-overrides.css'), import('./main')])
} else {
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <PublicLanding />
    </React.StrictMode>,
  )
}
