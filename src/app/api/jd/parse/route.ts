import { NextResponse } from 'next/server'
import { parseJdService } from '@/lib/services/jdParser'
import { z } from 'zod'

export async function POST(req: Request) {
  // Mock authentication check based on existing repository conventions (like profile/import)
  const isAuthenticated = false

  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const result = parseJdService(body)
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.issues },
        { status: 400 },
      )
    }
    // Prevent leaking internal details
    return NextResponse.json({ error: 'Failed to parse Job Description' }, { status: 500 })
  }
}
