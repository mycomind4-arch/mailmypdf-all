import PipelineDashboard from './PipelineDashboard'

export const metadata = {
  title: 'Pipeline Dashboard | Code Enforcement',
  description: 'View cases processed through the automated defense pipeline.',
}

export default function Page() {
  return <PipelineDashboard />
}
