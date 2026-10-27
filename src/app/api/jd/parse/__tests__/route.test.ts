import { describe, it, expect } from 'vitest'
import { POST } from '../route'

describe('POST /api/jd/parse', () => {
  it('should return 401 Unauthorized because authentication is not implemented', async () => {
    const req = new Request('http://localhost:3000/api/jd/parse', {
      method: 'POST',
      body: JSON.stringify({ text: 'Some JD text' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(401)

    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
  })
})
