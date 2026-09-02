import { redirect } from 'next/navigation'
import { PlanningRecordsBuilder } from './builder'
import { getApprovalPrincipal } from '../../../../src/authorization-runtime'

export const metadata = {
  title: 'Build a Planning Records Request | Zoning, Development & Project Files',
  description: 'Build a focused planning records request using property, project, zoning, applicant, date, and document identifiers.',
}

export default async function PlanningRecordsBuilderPage() {
  const principal = await getApprovalPrincipal()
  if (!principal) redirect(`/auth?returnTo=${encodeURIComponent('/workflows/planning-records/builder')}`)
  return <PlanningRecordsBuilder />
}
