import { describe, it, expect } from 'vitest'
import { runFactCheck } from '../factCheck'
import { ProfileEntryWithFacts } from '../cvSelector'
import { CvDraftOutput } from '../../schemas/cvDraft'

describe('Fact Check Service', () => {
  const mockFact1 = {
    id: 'f1-uuid',
    entryId: 'e1-uuid',
    text: 'Managed a team of 10 engineers.',
    kind: 'free_text' as const,
    evidenceNote: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockFact2 = {
    id: 'f2-uuid',
    entryId: 'e1-uuid',
    text: '500000',
    kind: 'locked_number' as const,
    evidenceNote: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockEntry: ProfileEntryWithFacts = {
    id: 'e1-uuid',
    profileId: 'p1-uuid',
    type: 'experience',
    title: 'Software Manager',
    organization: 'Tech Corp',
    start: '2020-01',
    end: '2022-01',
    visibility: 'always',
    placement: null,
    displayOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    facts: [mockFact1, mockFact2],
  }

  const baseDraft: CvDraftOutput = {
    schemaVersion: 1,
    status: 'draft_ready',
    targetRole: 'Manager',
    header: null,
    sections: [
      {
        sectionId: 'experience',
        heading: 'Experience',
        items: [
          {
            id: 'item1-uuid',
            text: 'Managed a team of 10 engineers.',
            sourceEntryId: 'e1-uuid',
            sourceFactIds: ['f1-uuid'],
            verificationStatus: 'unverified',
            matchedRequirementIds: [],
            warnings: [],
            title: 'Software Manager',
            organization: 'Tech Corp',
          },
        ],
      },
    ],
    warnings: [],
  }

  it('should pass if claim is exact match and traceability holds', () => {
    const result = runFactCheck({
      draft: baseDraft,
      profileEntries: [mockEntry],
    })
    expect(result.status).toBe('passed')
    expect(result.supportedCount).toBe(1)
    expect(result.blockingIssueCount).toBe(0)
  })

  it('should fail with blocking issue if sourceEntryId is missing', () => {
    const draftWithoutSource = JSON.parse(JSON.stringify(baseDraft))
    delete draftWithoutSource.sections[0].items[0].sourceEntryId

    const result = runFactCheck({
      draft: draftWithoutSource,
      profileEntries: [mockEntry],
    })
    expect(result.status).toBe('blocked')
    expect(result.blockingIssueCount).toBe(1)
    expect(result.issues[0].category).toBe('missing_provenance')
  })

  it('should fail with blocking issue if fact belongs to different entry/doesnt exist', () => {
    const draftWrongFact = JSON.parse(JSON.stringify(baseDraft))
    draftWrongFact.sections[0].items[0].sourceFactIds = ['non-existent-id']

    const result = runFactCheck({
      draft: draftWrongFact,
      profileEntries: [mockEntry],
    })
    expect(result.status).toBe('blocked')
    expect(result.blockingIssueCount).toBe(1)
    expect(result.issues[0].category).toBe('invalid_reference')
  })

  it('should flag numerical mismatch for locked numbers if altered', () => {
    const draftAlteredNumber = JSON.parse(JSON.stringify(baseDraft))
    draftAlteredNumber.sections[0].items[0].text = '500,001'
    draftAlteredNumber.sections[0].items[0].sourceFactIds = ['f2-uuid']

    const result = runFactCheck({
      draft: draftAlteredNumber,
      profileEntries: [mockEntry],
    })
    expect(result.status).toBe('blocked')
    expect(result.blockingIssueCount).toBe(1)
    expect(result.issues[0].category).toBe('numerical_mismatch')
  })

  it('should correctly handle visibility and exclusions (never)', () => {
    const neverEntry = { ...mockEntry, visibility: 'never' as const }
    const result = runFactCheck({
      draft: baseDraft,
      profileEntries: [neverEntry],
    })
    expect(result.status).toBe('blocked')
    expect(result.issues[0].category).toBe('visibility_violation')
  })

  it('should correctly handle visibility and exclusions (on_request without auth)', () => {
    const neverEntry = { ...mockEntry, visibility: 'on_request' as const }
    const result = runFactCheck({
      draft: baseDraft,
      profileEntries: [neverEntry],
    })
    expect(result.status).toBe('blocked')
    expect(result.issues[0].category).toBe('visibility_violation')
  })

  it('should warn on banned characters', () => {
    const result = runFactCheck({
      draft: baseDraft,
      profileEntries: [mockEntry],
      preferences: {
        version: 1,
        sectionOrder: ['experience'],
        excludedEntryIds: [],
        tone: 'professional',
        pageMode: 'one_page',
        formatting: {
          fontFamily: 'Arial',
          primaryColor: '#000',
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          linkFormat: 'anchor_text',
        },
        bannedCharacters: ['10'],
        fitThreshold: 70,
      },
    })
    // In our implementation, a banned character yields an "info" level issue.
    // That wouldn't block, but would produce an issue.
    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues[0].category).toBe('preference_conflict')
  })
})
