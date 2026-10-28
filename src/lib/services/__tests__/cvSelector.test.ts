import { describe, it, expect } from 'vitest'
import { selectCvContent, SelectionInput, ProfileEntryWithFacts } from '../cvSelector'
import { JdParsedResult } from '../../schemas/jdParser'
import { Visibility, EntryType } from '@prisma/client'

describe('CV Content Selector', () => {
  const baseJd: JdParsedResult = {
    schemaVersion: 1,
    jobTitle: 'Software Engineer',
    companyName: 'Tech Corp',
    location: null,
    workArrangement: 'unknown',
    employmentType: 'full_time',
    seniority: 'mid',
    requiredSkills: ['TypeScript', 'React'],
    preferredSkills: ['GraphQL'],
    responsibilities: ['Develop web applications'],
    requiredQualifications: [],
    preferredQualifications: [],
    experienceRequirement: '3 years of experience',
    educationRequirement: 'Bachelors in Computer Science',
    salaryRange: null,
    benefits: [],
    keywords: [],
    unparsedSections: [],
    warnings: [],
  }

  const createEntry = (overrides: Partial<ProfileEntryWithFacts>): ProfileEntryWithFacts => ({
    id: 'entry-1',
    profileId: 'profile-1',
    type: EntryType.experience,
    title: 'Software Engineer',
    organization: 'Old Corp',
    start: '2020-01',
    end: '2023-01',
    visibility: Visibility.always,
    placement: null,
    displayOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    facts: [],
    ...overrides,
  })

  it('filters excluded entries', () => {
    const input: SelectionInput = {
      jd: baseJd,
      profileEntries: [createEntry({ id: 'entry-excl' })],
      preferences: {
        version: 1,
        sectionOrder: ['experience'] as any,
        excludedEntryIds: ['entry-excl'],
        tone: 'professional',
        pageMode: 'two_page',
        formatting: {
          fontFamily: 'Arial',
          primaryColor: '#000',
          margins: { top: 1, bottom: 1, left: 1, right: 1 },
          linkFormat: 'raw_url',
        },
        bannedCharacters: [],
        fitThreshold: 70,
      },
    }

    const result = selectCvContent(input)
    expect(result.excludedEntries).toContainEqual(
      expect.objectContaining({ reason: 'user_excluded' }),
    )
    expect(result.selectedEntries).toHaveLength(0)
  })

  it('respects visibility rules (never)', () => {
    const input: SelectionInput = {
      jd: baseJd,
      profileEntries: [createEntry({ visibility: Visibility.never })],
    }

    const result = selectCvContent(input)
    expect(result.excludedEntries).toContainEqual(
      expect.objectContaining({ reason: 'visibility_restricted' }),
    )
    expect(result.selectedEntries).toHaveLength(0)
  })

  it('flags on_request visibility', () => {
    const entry = createEntry({
      id: 'entry-on-req',
      visibility: Visibility.on_request,
      facts: [
        {
          id: 'fact-1',
          entryId: 'entry-on-req',
          text: 'TypeScript expert',
          kind: 'free_text',
          evidenceNote: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    })

    const input: SelectionInput = {
      jd: baseJd,
      profileEntries: [entry],
    }

    const result = selectCvContent(input)
    expect(result.selectedEntries[0].visibility).toBe(Visibility.on_request)
    expect(result.selectionWarnings).toContain(
      "Entry entry-on-req is marked 'on_request'. Consent rules must be checked before final CV generation.",
    )
  })

  it('ranks mandatory requirements higher than preferred', () => {
    const entryMandatory = createEntry({
      id: 'entry-req',
      facts: [
        {
          id: 'fact-req',
          entryId: 'entry-req',
          text: 'Used TypeScript extensively',
          kind: 'free_text',
          evidenceNote: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    })
    const entryPreferred = createEntry({
      id: 'entry-pref',
      facts: [
        {
          id: 'fact-pref',
          entryId: 'entry-pref',
          text: 'Used GraphQL',
          kind: 'free_text',
          evidenceNote: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    })

    const input: SelectionInput = {
      jd: baseJd,
      profileEntries: [entryPreferred, entryMandatory], // wrong order to verify sorting
    }

    const result = selectCvContent(input)
    expect(result.selectedEntries).toHaveLength(2)
    expect(result.selectedEntries[0].sourceEntryId).toBe('entry-req')
    expect(result.selectedEntries[1].sourceEntryId).toBe('entry-pref')
    expect(result.selectedEntries[0].relevanceScore).toBeGreaterThan(
      result.selectedEntries[1].relevanceScore,
    )
  })

  it('preserves fact integrity (locked numbers, verification status)', () => {
    const entry = createEntry({
      id: 'entry-integ',
      facts: [
        {
          id: 'fact-1',
          entryId: 'entry-integ',
          text: 'TypeScript',
          kind: 'locked_number',
          evidenceNote: 'Verified certificate',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    })

    const input: SelectionInput = { jd: baseJd, profileEntries: [entry] }
    const result = selectCvContent(input)

    expect(result.selectedEntries[0].selectedFacts[0].isLockedNumber).toBe(true)
    expect(result.selectedEntries[0].selectedFacts[0].isVerified).toBe(true)
  })

  it('handles insufficient JD input safely', () => {
    const emptyJd: JdParsedResult = {
      ...baseJd,
      requiredSkills: [],
      responsibilities: [],
      seniority: 'unknown',
      experienceRequirement: null,
      educationRequirement: null,
      preferredSkills: [],
    }
    const input: SelectionInput = { jd: emptyJd, profileEntries: [createEntry({})] }
    const result = selectCvContent(input)

    expect(result.status).toBe('insufficient_input')
    expect(result.selectionWarnings).toContain(
      'Job description does not contain enough evaluable requirements.',
    )
  })
})
