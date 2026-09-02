import { redirect } from 'next/navigation'
import { PoliceRecordsBuilder } from './builder'
import { getApprovalPrincipal } from '../../../../src/authorization-runtime'

export const metadata = {
  title: 'Build a Police Records Request | Incident, CAD & Body-Camera Records',
  description: 'Build a targeted police records request using incident numbers, dates, locations, people, vehicles, dispatch, reports, and media categories.',
}

export default async function PoliceRecordsBuilderPage() {
  const principal = await getApprovalPrincipal()
  if (!principal) redirect(`/auth?returnTo=${encodeURIComponent('/workflows/police-records/builder')}`)
  return <PoliceRecordsBuilder />
}
