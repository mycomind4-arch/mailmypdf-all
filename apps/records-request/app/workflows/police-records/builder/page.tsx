import { PoliceRecordsBuilder } from './builder'

export const metadata = {
  title: 'Build a Police Records Request | Incident, CAD & Body-Camera Records',
  description: 'Build a targeted police records request using incident numbers, dates, locations, people, vehicles, dispatch, reports, and media categories.',
}

export default function PoliceRecordsBuilderPage() {
  return <PoliceRecordsBuilder />
}
