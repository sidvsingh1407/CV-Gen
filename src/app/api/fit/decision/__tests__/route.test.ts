import { describe, it, expect } from 'vitest'
import { POST } from '../route'

describe('POST /api/fit/decision', () => {
  it('should return 401 Unauthorized because authentication is not implemented', async () => {
    const req = new Request('http://localhost/api/fit/decision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'proceed' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)

    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
  })
})
