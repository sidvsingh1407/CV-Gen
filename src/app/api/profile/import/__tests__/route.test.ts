import { describe, it, expect, vi, beforeEach } from 'vitest'
// mock env before importing the route
vi.mock('@/env', () => ({
  env: {
    MAX_CV_UPLOAD_MB: 10,
    DATABASE_URL: 'dummy',
  },
}))

import { POST } from '../route'

describe('POST /api/profile/import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 Unauthorized because authentication is not implemented', async () => {
    const formData = new FormData()
    formData.append('file', new Blob(['fake content'], { type: 'application/pdf' }), 'test.pdf')

    const req = new Request('http://localhost/api/profile/import', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(req)
    expect(response.status).toBe(401)

    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })
})
