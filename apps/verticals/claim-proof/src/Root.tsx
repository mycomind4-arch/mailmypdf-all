import { useState } from 'react'
import App from './App'
import { PublicLanding } from './PublicLanding'

export default function Root() {
  const [workspaceOpen, setWorkspaceOpen] = useState(false)

  if (workspaceOpen) return <App />
  return <PublicLanding onStart={() => setWorkspaceOpen(true)} />
}
