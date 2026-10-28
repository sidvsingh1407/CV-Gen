import { NextResponse } from 'next/server'
import { z } from 'zod'
import { jdParsedSchema } from '@/lib/schemas/jdParser'
import { cvSelectorOutputSchema } from '@/lib/schemas/cvSelector'
import { draftHeaderSchema } from '@/lib/schemas/cvDraft'
import { preferencesSchema } from '@/lib/schemas/preferences'
import { generateCvDraft } from '@/lib/services/cvWriter'

const isAuthenticated = false

const requestSchema = z.object({
  jd: jdParsedSchema,
  selection: cvSelectorOutputSchema,
  headerData: draftHeaderSchema.optional(),
  preferences: preferencesSchema.optional(),
})

export async function POST(req: Request) {
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsedBody = requestSchema.parse(body)

    // In a real implementation, profileEntries would be fetched securely server-side.
    // For now, matching the `select-content` route pattern of mocking.
    const result = generateCvDraft({
      jd: parsedBody.jd,
      selection: parsedBody.selection,
      profileEntries: [], // Fetched server-side normally
      headerData: parsedBody.headerData,
      preferences: parsedBody.preferences,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.issues },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: 'Failed to generate CV draft' }, { status: 500 })
  }
}
