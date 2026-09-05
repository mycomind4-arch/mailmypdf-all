import React from 'react'
import { createRoot } from 'react-dom/client'
import '../../../../packages/design-system/src/tokens.css'
import '../../../../packages/design-system/src/patterns.css'
import { PublicLanding } from './PublicLanding'

const params = new URLSearchParams(window.location.search)
const workspaceMode = params.get('workspace') === '1' || (params.get('checkout') === 'success' && Boolean(params.get('session_id')))

document.body.dataset.mmpTheme = 'small-business'

if (workspaceMode) {
  void import('./main')
} else {
  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <PublicLanding />
    </React.StrictMode>,
  )
}
