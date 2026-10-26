import { NextResponse } from 'next/server'
import {
  getPreferences,
  updatePreferences,
  PreferencesServiceError,
} from '@/lib/services/preferences'
import { updatePreferencesSchema } from '@/lib/schemas/preferences'
import { z } from 'zod'

// We will mock the authenticated user context for now
// until actual authentication is implemented, as requested by the test/review.
// Note: As per instructions we are returning 401, but the structure is here to enable future auth.
const getAuthenticatedUserId = () => {
  return null
}

export async function GET() {
  try {
    const userId = getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const preferences = await getPreferences(userId)
    return NextResponse.json(preferences)
  } catch (error) {
    console.error('Error fetching preferences:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    try {
      updatePreferencesSchema.parse(body)
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation Error', details: e.issues }, { status: 400 })
      }
      return NextResponse.json({ error: 'Invalid Request Body' }, { status: 400 })
    }

    const preferences = await updatePreferences(userId, body)
    return NextResponse.json(preferences)
  } catch (error) {
    console.error('Error updating preferences:', error)
    if (error instanceof PreferencesServiceError) {
      if (error.code === 'INVALID_EXCLUSION' || error.code === 'NOT_FOUND') {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
