import { NextResponse } from 'next/server'
import { scoreFit } from '@/lib/services/fitScoring'
import { jdParsedSchema } from '@/lib/schemas/jdParser'
import { z } from 'zod'

// Match existing API protected boundary pattern
const isAuthenticated = false

export async function POST(req: Request) {
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    // The request body must include the parsed JD.
    // In a real implementation with auth, we'd also retrieve the profile entries and preferences here.
    // For now, since it's an unauthenticated mock, it's sufficient to parse the input.
    const jdParsed = jdParsedSchema.parse(body.jd)

    // A real implementation would fetch profileEntries and excludedEntryIds based on userId.
    const result = scoreFit({
      jd: jdParsed,
      profileEntries: [],
      excludedEntryIds: [],
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.issues },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: 'Failed to score fit' }, { status: 500 })
  }
}
