import { NextResponse } from 'next/server'
import { selectCvContent } from '@/lib/services/cvSelector'
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
    const jdParsed = jdParsedSchema.parse(body.jd)

    // A real implementation would fetch authoritative profileEntries and preferences based on user session.
    // For now, it evaluates empty arrays or the minimal mock inputs matching the service signature.
    const result = selectCvContent({
      jd: jdParsed,
      profileEntries: [],
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.issues },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: 'Failed to select CV content' }, { status: 500 })
  }
}
