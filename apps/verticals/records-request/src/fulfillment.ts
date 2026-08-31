export type FulfillmentRequest = {
  requestId: string
  idempotencyKey: string
  recipient: {
    name: string
    address1: string
    address2?: string
    city: string
    state: string
    postalCode: string
  }
  document: {
    filename: string
    contentBase64: string
  }
  mailingClass?: 'certified' | 'registered' | 'first_class'
}

export type FulfillmentResult = {
  provider: string
  submissionId: string
  trackingNumber?: string
  proofId?: string
}

export type MailMyPDFFulfillment = {
  submit(request: FulfillmentRequest): Promise<FulfillmentResult>
}

export function createMailMyPDFFulfillment(fetcher: typeof fetch, endpoint: string, apiKey: string): MailMyPDFFulfillment {
  return {
    async submit(request) {
      if (!request.requestId.trim()) throw new Error('Records fulfillment requestId is required')
      if (!request.idempotencyKey.trim()) throw new Error('Records fulfillment idempotencyKey is required')
      if (!endpoint || !apiKey) throw new Error('MailMyPDF fulfillment configuration is incomplete')

      const response = await fetcher(`${endpoint.replace(/\/$/, '')}/api/v1/mail`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
          'idempotency-key': request.idempotencyKey,
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        throw new Error(`MailMyPDF fulfillment failed with HTTP ${response.status}`)
      }

      const payload = await response.json() as Partial<FulfillmentResult>
      if (!payload.submissionId || !payload.provider) {
        throw new Error('MailMyPDF fulfillment response is missing required submission data')
      }

      return {
        provider: payload.provider,
        submissionId: payload.submissionId,
        trackingNumber: payload.trackingNumber,
        proofId: payload.proofId,
      }
    },
  }
}
