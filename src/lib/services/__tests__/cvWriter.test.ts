import { describe, it, expect } from 'vitest'
import { generateCvDraft } from '../cvWriter'
import { JdParsedResult } from '../../schemas/jdParser'
import { CvSelectorOutput, SelectedEntryRecord } from '../../schemas/cvSelector'
import { EntryType, Visibility, FactKind } from '@prisma/client'
import { ProfileEntryWithFacts } from '../cvSelector'
import { DraftHeader } from '../../schemas/cvDraft'

describe('cvWriter', () => {
  const mockJd: JdParsedResult = {
    schemaVersion: 1,
    jobTitle: 'Software Engineer',
    companyName: 'Tech Corp',
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

  const mockHeader: DraftHeader = {
    fullName: 'John Doe',
    email: 'john@example.com',
  }

  it('filters out on_request and never content, adding a global warning for on_request', () => {
    const entryId1 = '00000000-0000-0000-0000-000000000001'
    const entryId2 = '00000000-0000-0000-0000-000000000002'

    const selection: CvSelectorOutput = {
      schemaVersion: 1,
      status: 'selected',
      sectionOrder: ['experience'],
      selectionWarnings: [],
      excludedEntries: [],
      unselectedEntries: [],
      selectedEntries: [
        {
          sourceEntryId: entryId1,
          entryType: EntryType.experience,
          relevanceScore: 90,
          selectionRationale: '',
          matchedRequirementIds: [],
          selectedFacts: [],
          visibility: Visibility.on_request,
          originalOrder: 0,
        },
        {
          sourceEntryId: entryId2,
          entryType: EntryType.experience,
          relevanceScore: 80,
          selectionRationale: '',
          matchedRequirementIds: [],
          selectedFacts: [],
          visibility: Visibility.never,
          originalOrder: 1,
        },
      ],
    }

    const profileEntries: ProfileEntryWithFacts[] = [
      {
        id: entryId1,
        profileId: 'profile-1',
        type: EntryType.experience,
        title: 'Secret Agent',
        organization: 'MI6',
        start: null,
        end: null,
        visibility: Visibility.on_request,
        placement: null,
        displayOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        facts: [],
      },
      {
        id: entryId2,
        profileId: 'profile-1',
        type: EntryType.experience,
        title: 'Hidden Project',
        organization: 'None',
        start: null,
        end: null,
        visibility: Visibility.never,
        placement: null,
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        facts: [],
      },
    ]

    const result = generateCvDraft({
      jd: mockJd,
      selection,
      profileEntries,
      headerData: mockHeader,
    })

    expect(result.sections).toHaveLength(0) // None should make it through
    expect(result.warnings).toContain(
      'Some conditional (on_request) content was withheld from this draft as authorization is required.',
    )
  })

  it('preserves text but flags banned characters with item-level warnings', () => {
    const entryId = '00000000-0000-0000-0000-000000000001'
    const factId = '11111111-1111-1111-1111-111111111111'

    const selection: CvSelectorOutput = {
      schemaVersion: 1,
      status: 'selected',
      sectionOrder: ['experience'],
      selectionWarnings: [],
      excludedEntries: [],
      unselectedEntries: [],
      selectedEntries: [
        {
          sourceEntryId: entryId,
          entryType: EntryType.experience,
          relevanceScore: 100,
          selectionRationale: '',
          matchedRequirementIds: [],
          selectedFacts: [
            {
              id: factId,
              text: 'Increased revenue by 50% using special-word.',
              isVerified: true,
              isLockedNumber: true,
            },
          ],
          visibility: Visibility.always,
          originalOrder: 0,
        },
      ],
    }

    const profileEntries: ProfileEntryWithFacts[] = [
      {
        id: entryId,
        profileId: 'profile-1',
        type: EntryType.experience,
        title: 'Software Engineer',
        organization: 'Tech Corp',
        start: null,
        end: null,
        visibility: Visibility.always,
        placement: null,
        displayOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        facts: [
          {
            id: factId,
            entryId: entryId,
            text: 'Increased revenue by 50% using special-word.',
            kind: FactKind.locked_number,
            evidenceNote: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      },
    ]

    const result = generateCvDraft({
      jd: mockJd,
      selection,
      profileEntries,
      headerData: mockHeader,
      preferences: {
        version: 1,
        sectionOrder: ['experience'],
        excludedEntryIds: [],
        tone: 'professional',
        pageMode: 'two_page',
        formatting: {
          fontFamily: 'Arial',
          primaryColor: '#000000',
          margins: { top: 20, bottom: 20, left: 20, right: 20 },
          linkFormat: 'anchor_text',
        },
        bannedCharacters: ['special-word'],
        fitThreshold: 70,
      },
    })

    expect(result.sections).toHaveLength(1)
    expect(result.sections[0].items).toHaveLength(1)

    const item = result.sections[0].items[0]
    expect(item.text).toBe('Increased revenue by 50% using special-word.') // Preserved exactly

    // Warning applied
    expect(item.warnings).toHaveLength(1)
    expect(item.warnings[0].type).toBe('banned_character')
    expect(item.warnings[0].message).toContain('special-word')
  })
})
