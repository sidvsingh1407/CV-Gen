import { describe, it, expect } from 'vitest'
import { parseJdService } from '../jdParser'
import { z } from 'zod'

describe('JD Parser Service', () => {
  it('should validate input length', () => {
    expect(() => parseJdService({ text: '' })).toThrow(z.ZodError)
    expect(() => parseJdService({ text: 'a'.repeat(30001) })).toThrow(z.ZodError)
  })

  it('should reject invalid payload types', () => {
    expect(() => parseJdService({ somethingElse: 'text' })).toThrow(z.ZodError)
    expect(() => parseJdService(null)).toThrow(z.ZodError)
  })

  it('should parse basic job details', () => {
    const jd = `
      We are looking for a Senior Software Engineer.
      This is a full-time remote position.
      Salary is $100,000 - $150,000 per year.
    `
    const result = parseJdService({ text: jd })
    expect(result.seniority).toBe('senior')
    expect(result.workArrangement).toBe('remote')
    expect(result.employmentType).toBe('full_time')
    expect(result.salaryRange).toEqual({
      min: 100000,
      max: 150000,
      currency: 'USD',
      payPeriod: 'year',
    })
  })

  it('should parse sections based on headings', () => {
    const jd = `
Responsibilities:
- Write code
- Test code

Requirements
* 3+ years of experience
* Bachelor's degree

Benefits
- Health insurance
    `
    const result = parseJdService({ text: jd })
    expect(result.responsibilities).toContain('Write code')
    expect(result.responsibilities).toContain('Test code')

    expect(result.requiredQualifications).toContain('3+ years of experience')
    expect(result.requiredQualifications).toContain("Bachelor's degree")
    expect(result.experienceRequirement).toBe('3+ years of experience')
    expect(result.educationRequirement).toBe("Bachelor's Degree")

    expect(result.benefits).toContain('Health insurance')
  })

  it('should preserve unparsed sections', () => {
    const jd = `
Random Section:
This should be preserved.
    `
    const result = parseJdService({ text: jd })
    expect(result.unparsedSections.length).toBeGreaterThan(0)
    expect(result.unparsedSections[0].text).toContain('This should be preserved.')
  })

  it('should return warnings for missing info', () => {
    const jd = `Just a vague paragraph.`
    const result = parseJdService({ text: jd })
    expect(result.warnings).toContain('Job title could not be confidently identified.')
    expect(result.warnings).toContain(
      'Could not definitively extract responsibilities or requirements. The text may lack clear section headings.',
    )
  })
})
