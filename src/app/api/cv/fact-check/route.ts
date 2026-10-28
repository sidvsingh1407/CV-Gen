import { NextResponse } from 'next/server'
import { z } from 'zod'
import { cvDraftSchema } from '@/lib/schemas/cvDraft'
import { preferencesSchema } from '@/lib/schemas/preferences'
import { runFactCheck } from '@/lib/services/factCheck'

// Match existing API protected boundary pattern
const isAuthenticated = false

const requestSchema = z.object({
  draft: cvDraftSchema,
  preferences: preferencesSchema.optional(),
})

export async function POST(req: Request) {
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsedBody = requestSchema.parse(body)

    // A real implementation would fetch authoritative profileEntries and preferences based on user session.
    // For now, it evaluates empty arrays or the minimal mock inputs matching the service signature.
    const result = runFactCheck({
      draft: parsedBody.draft,
      profileEntries: [], // Must be fetched server-side
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
    return NextResponse.json({ error: 'Failed to run fact check' }, { status: 500 })
  }
}
