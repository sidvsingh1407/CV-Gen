import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, PATCH } from '../route'
import * as preferencesService from '@/lib/services/preferences'
import { PreferencesServiceError } from '@/lib/services/preferences'

vi.mock('@/lib/services/preferences', () => ({
  getPreferences: vi.fn(),
  updatePreferences: vi.fn(),
  PreferencesServiceError: class extends Error {
    constructor(
      message: string,
      public code: string,
    ) {
      super(message)
      this.name = 'PreferencesServiceError'
    }
  },
}))

describe('preferences API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET returns 401 Unauthorized', async () => {
    const res = await GET()
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toEqual({ error: 'Unauthorized' })
  })

  it('PATCH returns 401 Unauthorized', async () => {
    const req = new Request('http://localhost/api/preferences', {
      method: 'PATCH',
      body: JSON.stringify({ tone: 'concise' }),
    })
    const res = await PATCH(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json).toEqual({ error: 'Unauthorized' })
  })
})
