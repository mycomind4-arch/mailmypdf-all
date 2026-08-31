export type RequestItemInput = {
  category: string
  description: string
  dateStart?: string
  dateEnd?: string
  custodian?: string
  systemHint?: string
  format?: string
}

export type CreateRequestInput = {
  title: string
  agency: string
  jurisdiction?: string
  purpose?: string
  scope?: string
  items: RequestItemInput[]
}

export type ValidationIssue = {
  field: string
  message: string
}

export type ValidatedRequest = CreateRequestInput & {
  normalizedTitle: string
  normalizedAgency: string
}

export type RequestRepository = {
  createRequest(input: ValidatedRequest, ownerId?: string): Promise<{ id: string }>
}

function cleanOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const cleaned = value.trim()
  return cleaned || undefined
}

export function validateCreateRequest(input: unknown):
  | { ok: true; value: ValidatedRequest }
  | { ok: false; issues: ValidationIssue[] } {
  if (!input || typeof input !== 'object') {
    return { ok: false, issues: [{ field: 'body', message: 'Request body must be an object' }] }
  }

  const value = input as Record<string, unknown>
  const issues: ValidationIssue[] = []
  const title = typeof value.title === 'string' ? value.title.trim() : ''
  const agency = typeof value.agency === 'string' ? value.agency.trim() : ''
  const jurisdiction = cleanOptionalString(value.jurisdiction)
  const purpose = cleanOptionalString(value.purpose)
  const scope = cleanOptionalString(value.scope)
  const rawItems = Array.isArray(value.items) ? value.items : []

  if (!title) issues.push({ field: 'title', message: 'Title is required' })
  if (!agency) issues.push({ field: 'agency', message: 'Agency is required' })
  if (!rawItems.length) issues.push({ field: 'items', message: 'At least one request item is required' })

  const items: RequestItemInput[] = []
  rawItems.forEach((raw, index) => {
    if (!raw || typeof raw !== 'object') {
      issues.push({ field: `items.${index}`, message: 'Request item must be an object' })
      return
    }
    const item = raw as Record<string, unknown>
    const category = typeof item.category === 'string' ? item.category.trim() : ''
    const description = typeof item.description === 'string' ? item.description.trim() : ''
    const dateStart = cleanOptionalString(item.dateStart)
    const dateEnd = cleanOptionalString(item.dateEnd)
    if (!category) issues.push({ field: `items.${index}.category`, message: 'Category is required' })
    if (!description) issues.push({ field: `items.${index}.description`, message: 'Description is required' })
    if (dateStart && dateEnd && dateStart > dateEnd) {
      issues.push({ field: `items.${index}.dateEnd`, message: 'End date cannot be before start date' })
    }
    if (category && description) {
      items.push({
        category,
        description,
        dateStart,
        dateEnd,
        custodian: cleanOptionalString(item.custodian),
        systemHint: cleanOptionalString(item.systemHint),
        format: cleanOptionalString(item.format),
      })
    }
  })

  if (issues.length) return { ok: false, issues }

  return {
    ok: true,
    value: {
      title,
      agency,
      jurisdiction,
      purpose,
      scope,
      items,
      normalizedTitle: title.replace(/\s+/g, ' '),
      normalizedAgency: agency.replace(/\s+/g, ' '),
    },
  }
}

export function buildRequestAuditPayload(request: ValidatedRequest) {
  return {
    eventType: 'request_validated',
    actorType: 'system',
    payload: {
      title: request.normalizedTitle,
      agency: request.normalizedAgency,
      itemCount: request.items.length,
    },
  }
}
