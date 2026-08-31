import type { MailClass } from '../domain/models'

export interface ExecuteMailJobRequest {
  mailJobId: string
  businessId: string
  recipientId: string
  documentId: string
  mailClass: MailClass
}

export interface ExecuteMailJobResponse {
  mailJobId: string
  status: string
  trackingNumber?: string
  proofId?: string
}

export class MailMyPDFApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = 'MailMyPDFApiError'
  }
}

export class MailMyPDFApiClient {
  constructor(private readonly baseUrl: string, private readonly apiKey: string) {}

  async executeMailJob(request: ExecuteMailJobRequest, signal?: AbortSignal): Promise<ExecuteMailJobResponse> {
    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/v1/business/mail-jobs/${request.mailJobId}/execute`, {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
        'idempotency-key': `${request.businessId}:${request.mailJobId}`,
      },
      body: JSON.stringify({
        businessId: request.businessId,
        recipientId: request.recipientId,
        documentId: request.documentId,
        mailClass: request.mailClass,
      }),
    })

    if (!response.ok) {
      const message = (await response.text()).slice(0, 1000)
      throw new MailMyPDFApiError(response.status, message || 'MailMyPDF execution failed')
    }

    return response.json() as Promise<ExecuteMailJobResponse>
  }
}
