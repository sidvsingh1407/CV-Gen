import { describe, it, expect } from 'vitest'
import { scoreFit } from '../fitScoring'
import { JdParsedResult } from '../../schemas/jdParser'
import { Entry, Fact } from '@prisma/client'

const mockJd: JdParsedResult = {
  schemaVersion: 1,
  jobTitle: 'Software Engineer',
  companyName: 'Tech Co',
  location: 'Remote',
  workArrangement: 'remote',
  employmentType: 'full_time',
  seniority: 'senior',
  requiredSkills: ['React', 'TypeScript', 'Node.js'],
  preferredSkills: ['GraphQL'],
  responsibilities: ['Build features', 'Lead team'],
  requiredQualifications: ["Bachelor's Degree"],
  preferredQualifications: [],
  experienceRequirement: '5+ years',
  educationRequirement: null,
  salaryRange: null,
  benefits: [],
  keywords: [],
  unparsedSections: [],
  warnings: [],
}

const createMockEntry = (
  id: string,
  type: string,
  title: string,
  factsText: string[],
): Entry & { facts: Fact[] } => ({
  id,
  profileId: 'prof-1',
  type: type as any,
  title,
  organization: 'Org',
  start: '2020',
  end: '2022',
  visibility: 'always',
  placement: null,
  displayOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  facts: factsText.map((text, i) => ({
    id: `fact-${id}-${i}`,
    entryId: id,
    text,
    kind: 'free_text',
    evidenceNote: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })),
})

describe('fitScoring', () => {
  it('returns insufficient_data if <2 distinct requirements', () => {
    const emptyJd = {
      ...mockJd,
      requiredSkills: [],
      preferredSkills: [],
      responsibilities: [],
      requiredQualifications: [],
      seniority: 'unknown' as any,
      experienceRequirement: null,
    }
    const result = scoreFit({ jd: emptyJd, profileEntries: [] })
    expect(result.status).toBe('insufficient_data')
    expect(result.score).toBeNull()
  })

  it('calculates score correctly and handles exact matches and synonyms', () => {
    const entries = [
      createMockEntry('e1', 'experience', 'Frontend Dev', ['Used React and TypeScript daily']),
      createMockEntry('e2', 'education', "Bachelor's Degree in CS", []),
    ]
    const result = scoreFit({ jd: mockJd, profileEntries: entries })

    expect(result.status).toBe('scored')
    expect(result.score).toBeGreaterThan(0)

    // React and TS should be matched
    const reactReq = result.requirements.find((r) => r.text === 'React')
    expect(reactReq?.status).toBe('matched')
    expect(reactReq?.evidenceVerificationStatus).toBe('unknown') // as instructed

    const nodeReq = result.requirements.find((r) => r.text === 'Node.js')
    expect(nodeReq?.status).toBe('not_found')

    const bachReq = result.requirements.find((r) => r.text === "Bachelor's Degree")
    expect(bachReq?.status).toBe('matched')
  })

  it('excludes entries specified in excludedEntryIds', () => {
    const entries = [createMockEntry('e1', 'skill', 'Skills', ['React'])]

    const jd = {
      ...mockJd,
      requiredSkills: ['React', 'Vue'],
      responsibilities: [],
      preferredSkills: [],
      requiredQualifications: [],
      experienceRequirement: null,
      seniority: 'unknown' as any,
    }

    const resultWithIt = scoreFit({ jd, profileEntries: entries, excludedEntryIds: [] })
    expect(resultWithIt.requirements.find((r) => r.text === 'React')?.status).toBe('matched')

    const resultWithoutIt = scoreFit({ jd, profileEntries: entries, excludedEntryIds: ['e1'] })
    expect(resultWithoutIt.requirements.find((r) => r.text === 'React')?.status).toBe('not_found')
    expect(resultWithoutIt.excludedEvidenceCount).toBe(1)
  })

  it('does not treat identical texts as multiple requirements for insufficient_data check', () => {
    const jd = {
      ...mockJd,
      requiredSkills: ['React', 'React'],
      responsibilities: [],
      preferredSkills: [],
      requiredQualifications: [],
      experienceRequirement: null,
      seniority: 'unknown' as any,
    }
    const result = scoreFit({ jd, profileEntries: [] })
    expect(result.status).toBe('insufficient_data')
  })
})
