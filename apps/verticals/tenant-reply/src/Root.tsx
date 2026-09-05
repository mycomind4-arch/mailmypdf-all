import { useState } from 'react'
import App from './App'
import { PublicLanding } from './PublicLanding'
import { TenantWorkflowDirectory } from './WorkflowDirectory'

export default function Root() {
  const pathname = typeof window !== 'undefined' ? window.location.pathname.replace(/\/$/, '') || '/' : '/'
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
  const [workspaceOpen, setWorkspaceOpen] = useState(params.get('workspace') === '1')
  if (pathname === '/workflows') return <TenantWorkflowDirectory />
  if (workspaceOpen) return <App />
  return <PublicLanding onStart={() => setWorkspaceOpen(true)} />
}
