import { describe, it, expect, vi } from 'vitest'
import { POST } from '../route'
import { JdParsedResult } from '@/lib/schemas/jdParser'

describe('POST /api/fit/score', () => {
  it('should return 401 Unauthorized because authentication is not implemented', async () => {
    const mockJd: JdParsedResult = {
      schemaVersion: 1,
      jobTitle: 'Title',
      companyName: null,
      location: null,
      workArrangement: 'unknown',
      employmentType: 'unknown',
      seniority: 'unknown',
      requiredSkills: [],
      preferredSkills: [],
      responsibilities: [],
      requiredQualifications: [],
      preferredQualifications: [],
      experienceRequirement: null,
      educationRequirement: null,
      salaryRange: null,
      benefits: [],
      keywords: [],
      unparsedSections: [],
      warnings: [],
    }

    const req = new Request('http://localhost/api/fit/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jd: mockJd }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)

    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
  })
})
