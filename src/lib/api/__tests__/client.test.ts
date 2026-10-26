import { describe, it, expect, vi, beforeEach } from 'vitest'
import { profileApi, ApiError } from '../client'

global.fetch = vi.fn()

describe('Api Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws ApiError on 401', async () => {
    ;(global.fetch as unknown as import('vitest').Mock).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: 'Unauthorized' }),
    })

    await expect(profileApi.getProfile()).rejects.toThrow(ApiError)
    await expect(profileApi.getProfile()).rejects.toMatchObject({ status: 401 })
  })

  it('handles successful requests', async () => {
    const mockProfile = { header: { fullName: 'Test' } }
    ;(global.fetch as unknown as import('vitest').Mock).mockResolvedValue({
      ok: true,
      json: async () => mockProfile,
    })

    const result = await profileApi.getProfile()
    expect(result).toEqual(mockProfile)
  })
})
