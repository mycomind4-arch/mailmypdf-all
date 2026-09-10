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

async function parseResponse(response: Response): Promise<Record<string, any>> {
  const text = await response.text()
  let payload: Record<string, any> = {}
  try { payload = text ? JSON.parse(text) as Record<string, any> : {} } catch { payload = { raw: text } }
  if (!response.ok) {
    const message = payload?.error?.message || payload?.error || `HTTP ${response.status}`
    throw new Error(`MailMyPDF fulfillment failed: ${String(message)}`)
  }
  return payload
}

export function createMailMyPDFFulfillment(fetcher: typeof fetch, endpoint: string, apiKey: string): MailMyPDFFulfillment {
  return {
    async submit(request) {
      if (!request.requestId.trim()) throw new Error('Records fulfillment requestId is required')
      if (!request.idempotencyKey.trim()) throw new Error('Records fulfillment idempotencyKey is required')
      if (!endpoint || !apiKey) throw new Error('MailMyPDF fulfillment configuration is incomplete')

      const base = endpoint.replace(/\/$/, '')
      const documentPayload = await parseResponse(await fetcher(`${base}/v1/documents`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          content: request.document.contentBase64,
          filename: request.document.filename,
          mime_type: 'application/pdf',
        }),
      }))
      const document = documentPayload.document && typeof documentPayload.document === 'object' ? documentPayload.document : documentPayload
      if (!document?.id) throw new Error('MailMyPDF document upload response is missing document id')

      const communication = await parseResponse(await fetcher(`${base}/v1/communications`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          accept: 'application/json',
          'content-type': 'application/json',
          'idempotency-key': request.idempotencyKey,
        },
        body: JSON.stringify({
          document_id: document.id,
          recipient: {
            name: request.recipient.name,
            address_line1: request.recipient.address1,
            address_line2: request.recipient.address2 || null,
            city: request.recipient.city,
            state: request.recipient.state,
            postal_code: request.recipient.postalCode,
            country: 'US',
          },
          mail_type: request.mailingClass || 'first_class',
          matter_reference: request.requestId,
          matter_type: 'records-request',
          legal_reference: {
            type: 'other',
            citation: 'Records Request workflow',
            description: 'Public-records correspondence prepared through MailMyPDF Records Request.',
          },
          metadata: {
            vertical: 'records-request',
            request_id: request.requestId,
          },
          idempotency_key: request.idempotencyKey,
        }),
      }))

      const submissionId = communication.id || communication.communication?.id
      if (!submissionId) throw new Error('MailMyPDF communication response is missing submission id')
      return {
        provider: 'mailmypdf',
        submissionId: String(submissionId),
        trackingNumber: communication.tracking_number || communication.communication?.tracking_number || undefined,
        proofId: communication.proof_id || communication.communication?.proof_id || undefined,
      }
    },
  }
}
