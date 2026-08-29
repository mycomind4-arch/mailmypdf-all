export type RecordsDocumentInput = {
  senderName: string
  senderAddress: string
  recipientName: string
  recipientAddress: string
  agency: string
  subject: string
  body: string
  requestId: string
  date?: string
}

const escapePdf = (value: string): string => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[^\x20-\x7E]/g, '?')

export function renderRecordsRequestPdf(input: RecordsDocumentInput): Uint8Array {
  const lines = [
    input.date ?? new Date().toISOString().slice(0, 10),
    input.senderName,
    input.senderAddress,
    '',
    input.recipientName,
    input.recipientAddress,
    '',
    `Subject: ${input.subject}`,
    '',
    ...input.body.split(/\r?\n/),
    '',
    `Request ID: ${input.requestId}`,
  ]

  const commands = ['BT', '/F1 11 Tf', '72 740 Td', ...lines.map((line, index) => `${index === 0 ? '' : '0 -16 Td '}(${escapePdf(line)}) Tj`), 'ET'].join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]
  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`
  }
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let i = 1; i < offsets.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new TextEncoder().encode(pdf)
}

export async function attestRecordsRequestPdf(input: RecordsDocumentInput): Promise<{ bytes: Uint8Array; sha256: string }> {
  const bytes = renderRecordsRequestPdf(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource)
  const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  return { bytes, sha256 }
}
