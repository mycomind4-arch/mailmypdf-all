import { NextResponse } from 'next/server'
import { createCase } from '@/src/lib/base44-client'
import pdf from 'pdf-parse'

export const runtime = 'nodejs'

/**
 * POST /api/upload — extract text from uploaded document, create case in Base44
 * 
 * Accepts: multipart/form-data with "file" field (PDF, TXT, MD, CSV)
 * Returns: { caseId, extractedText, documentName }
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const file = form.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'A file is required.' }, { status: 400 })
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'Files must be 15 MB or smaller.' }, { status: 413 })
    }

    // Extract text from the file
    const buffer = Buffer.from(await file.arrayBuffer())
    let text = ''

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const parsed = await pdf(buffer)
      text = parsed.text || ''
    } else if (file.type.startsWith('text/') || /\.(txt|md|csv)$/i.test(file.name)) {
      text = buffer.toString('utf8')
    } else {
      return NextResponse.json(
        { error: 'Supports PDF and plain-text documents.' },
        { status: 415 },
      )
    }

    if (!text.trim()) {
      return NextResponse.json({ error: 'No text could be extracted from the file.' }, { status: 422 })
    }

    // Create case in Base44 (enters intake queue — processed by scheduled workflow)
    const newCase = await createCase(file.name, text)

    return NextResponse.json({
      caseId: newCase.id,
      extractedText: text,
      documentName: file.name,
      status: 'intake',
      message: 'Document uploaded and queued for processing. The pipeline will extract fields and route the case automatically.',
    })
  } catch (error) {
    console.error('Upload failed:', error)
    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 },
    )
  }
}
