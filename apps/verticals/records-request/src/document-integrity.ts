export type ApprovedDocument = {
  bytes: Uint8Array
  contentType: 'application/pdf'
  fileName: string
}

export type DocumentIntegrity = {
  sha256: string
  byteLength: number
  contentType: 'application/pdf'
  fileName: string
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource)
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('')
}

export async function attestApprovedDocument(document: ApprovedDocument): Promise<DocumentIntegrity> {
  if (document.contentType !== 'application/pdf') {
    throw new Error('Only approved PDF documents may enter the fulfillment boundary')
  }
  if (!document.fileName.toLowerCase().endsWith('.pdf')) {
    throw new Error('Approved document filename must end with .pdf')
  }
  if (!document.bytes.byteLength) {
    throw new Error('Approved document cannot be empty')
  }

  return {
    sha256: await sha256Hex(document.bytes),
    byteLength: document.bytes.byteLength,
    contentType: document.contentType,
    fileName: document.fileName,
  }
}

export function buildFulfillmentDocumentMetadata(integrity: DocumentIntegrity) {
  return {
    documentHash: integrity.sha256,
    documentBytes: integrity.byteLength,
    contentType: integrity.contentType,
    fileName: integrity.fileName,
  }
}
