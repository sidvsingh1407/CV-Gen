import { NextResponse } from 'next/server'
import { env } from '@/env'
import pdfParse from 'pdf-parse'
import * as mammoth from 'mammoth'
import { parseCvText } from '@/lib/services/cvParser'

export async function POST(req: Request) {
  const isAuthenticated = false // Mock authentication check

  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (file.size === 0) return NextResponse.json({ error: 'File is empty' }, { status: 400 })

    const maxSizeInBytes = env.MAX_CV_UPLOAD_MB * 1024 * 1024
    if (file.size > maxSizeInBytes) {
      return NextResponse.json(
        { error: `File exceeds the maximum limit of ${env.MAX_CV_UPLOAD_MB} MB` },
        { status: 400 },
      )
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const isDocx =
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.toLowerCase().endsWith('.docx')

    if (!isPdf && !isDocx) {
      return NextResponse.json(
        { error: 'Unsupported file format. Please upload a PDF or DOCX file.' },
        { status: 400 },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    let text = ''

    try {
      if (isPdf) {
        if (buffer.length < 4 || buffer.toString('utf8', 0, 4) !== '%PDF') {
          return NextResponse.json({ error: 'Invalid PDF file' }, { status: 400 })
        }
        const data = await pdfParse(buffer)
        text = data.text
      } else if (isDocx) {
        if (buffer.length < 4 || buffer.toString('hex', 0, 4) !== '504b0304') {
          return NextResponse.json({ error: 'Invalid DOCX file' }, { status: 400 })
        }
        const result = await mammoth.extractRawText({ buffer })
        text = result.value
      }
    } catch (parseError) {
      console.error('Error parsing document:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse document. Ensure the file is a valid, uncorrupted PDF or DOCX.' },
        { status: 400 },
      )
    }

    if (!text || text.trim() === '') {
      return NextResponse.json(
        {
          error:
            'No extractable text found in the document. Scanned documents (OCR) are not supported.',
        },
        { status: 400 },
      )
    }

    const draftProfile = parseCvText(text)
    return NextResponse.json({ draftProfile })
  } catch (error) {
    console.error('Error processing CV upload:', error)
    return NextResponse.json(
      { error: 'An internal error occurred during processing.' },
      { status: 500 },
    )
  }
}
