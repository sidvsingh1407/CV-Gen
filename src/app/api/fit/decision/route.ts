import { NextResponse } from 'next/server'
import { fitDecisionRecordSchema } from '@/lib/schemas/fitDecision'
import { z } from 'zod'

const isAuthenticated = false

export async function POST(req: Request) {
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const decision = fitDecisionRecordSchema.parse(body)

    // A real implementation would store this in the db related to the current run
    // For now, it just succeeds.

    return NextResponse.json({ success: true, decision }, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', details: error.issues },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: 'Failed to record decision' }, { status: 500 })
  }
}
