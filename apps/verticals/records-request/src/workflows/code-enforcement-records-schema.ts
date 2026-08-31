export const codeEnforcementRecordCategorySchema = [
  { id: 'case-file', label: 'Case file and routing history', required: true },
  { id: 'complaints', label: 'Complaints and service requests', required: true },
  { id: 'inspections', label: 'Inspections and inspection reports', required: true },
  { id: 'photographs-and-video', label: 'Photographs and video', required: true },
  { id: 'notices-and-orders', label: 'Notices, citations and orders', required: true },
  { id: 'correspondence', label: 'Correspondence and enforcement communications', required: true },
  { id: 'enforcement-actions', label: 'Enforcement actions', required: true },
  { id: 'abatement-and-compliance', label: 'Abatement and compliance', required: true },
  { id: 'permits-and-related-records', label: 'Permits and related records', required: false },
  { id: 'referenced-and-attached-records', label: 'Referenced or attached records', required: true },
] as const

export type CodeEnforcementCategoryId = typeof codeEnforcementRecordCategorySchema[number]['id']

export function isCodeEnforcementCategory(value: string): value is CodeEnforcementCategoryId {
  return codeEnforcementRecordCategorySchema.some(category => category.id === value)
}

export function defaultCodeEnforcementCategories(): CodeEnforcementCategoryId[] {
  return codeEnforcementRecordCategorySchema.filter(category => category.required).map(category => category.id)
}
