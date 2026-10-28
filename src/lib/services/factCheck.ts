import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { CvDraftOutput, DraftItem } from '../schemas/cvDraft'
import { preferencesSchema } from '../schemas/preferences'
import { FactCheckResult, FactCheckIssue, IssueSeverity } from '../schemas/factCheck'
import { ProfileEntryWithFacts } from './cvSelector'

// We need a helper to compare numbers/dates safely
const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

// A simple deterministic check for numerical mismatch in locked numbers
// In a real app we might use regex to find numbers in text.
// For this exact implementation we will just verify if the text is exactly supported if locked.
const checkNumericalMismatch = (
  draftText: string,
  factText: string,
  isLocked: boolean,
): boolean => {
  if (isLocked) {
    return normalizeText(draftText) !== normalizeText(factText)
  }
  return false
}

export type FactCheckInput = {
  draft: CvDraftOutput
  profileEntries: ProfileEntryWithFacts[]
  preferences?: z.infer<typeof preferencesSchema>
}

export function runFactCheck(input: FactCheckInput): FactCheckResult {
  const { draft, profileEntries, preferences } = input

  const bannedCharacters = preferences?.bannedCharacters || []
  const excludedEntryIds = new Set(preferences?.excludedEntryIds || [])

  const issues: FactCheckIssue[] = []
  const globalWarnings: string[] = []

  let claimsChecked = 0
  let supportedCount = 0
  let partialCount = 0
  let unsupportedCount = 0
  const uncertainCount = 0
  let blockingIssueCount = 0

  const entryLookup = new Map<string, ProfileEntryWithFacts>()
  for (const entry of profileEntries) {
    entryLookup.set(entry.id, entry)
  }

  for (const section of draft.sections) {
    for (const item of section.items) {
      claimsChecked++

      // 1. Check Source Traceability
      let traceabilityOk = true
      let sourceEntry: ProfileEntryWithFacts | undefined = undefined

      if (!item.sourceEntryId) {
        issues.push({
          id: uuidv4(),
          draftItemId: item.id,
          sectionId: section.sectionId,
          category: 'missing_provenance',
          severity: 'blocking',
          explanation: 'Draft item is missing a source entry reference.',
          recommendedAction: 'Remove or link to a valid source entry.',
        })
        blockingIssueCount++
        unsupportedCount++
        traceabilityOk = false
        continue // cannot proceed with content checks without source
      } else {
        sourceEntry = entryLookup.get(item.sourceEntryId)
        if (!sourceEntry) {
          issues.push({
            id: uuidv4(),
            draftItemId: item.id,
            sectionId: section.sectionId,
            category: 'invalid_reference',
            severity: 'blocking',
            explanation: 'Referenced source entry does not exist or is inaccessible.',
            sourceEntryId: item.sourceEntryId,
            recommendedAction: 'Remove or link to a valid source entry.',
          })
          blockingIssueCount++
          unsupportedCount++
          traceabilityOk = false
          continue
        }
      }

      // 2. Visibility and Exclusions
      if (excludedEntryIds.has(sourceEntry.id)) {
        issues.push({
          id: uuidv4(),
          draftItemId: item.id,
          sectionId: section.sectionId,
          category: 'visibility_violation',
          severity: 'blocking',
          explanation: 'Referenced source entry is in the excluded list.',
          sourceEntryId: item.sourceEntryId,
          recommendedAction: 'Remove item from draft.',
        })
        blockingIssueCount++
        unsupportedCount++
        continue
      }

      if (sourceEntry.visibility === 'never') {
        issues.push({
          id: uuidv4(),
          draftItemId: item.id,
          sectionId: section.sectionId,
          category: 'visibility_violation',
          severity: 'blocking',
          explanation: 'Referenced source entry has visibility set to "never".',
          sourceEntryId: item.sourceEntryId,
          recommendedAction: 'Remove item from draft.',
        })
        blockingIssueCount++
        unsupportedCount++
        continue
      }

      if (sourceEntry.visibility === 'on_request') {
        issues.push({
          id: uuidv4(),
          draftItemId: item.id,
          sectionId: section.sectionId,
          category: 'visibility_violation',
          severity: 'blocking',
          explanation:
            'Referenced source entry is "on_request" and requires explicit authorization not present.',
          sourceEntryId: item.sourceEntryId,
          recommendedAction: 'Remove item or provide valid authorization.',
        })
        blockingIssueCount++
        unsupportedCount++
        continue
      }

      // 3. Trace Facts
      let hasFactLevelMismatch = false

      if (item.sourceFactIds.length > 0) {
        const foundFacts = []
        for (const factId of item.sourceFactIds) {
          const fact = sourceEntry.facts.find((f) => f.id === factId)
          if (!fact) {
            issues.push({
              id: uuidv4(),
              draftItemId: item.id,
              sectionId: section.sectionId,
              category: 'invalid_reference',
              severity: 'blocking',
              explanation: `Referenced fact ${factId} does not belong to the source entry.`,
              sourceEntryId: item.sourceEntryId,
              sourceFactId: factId,
              recommendedAction: 'Remove or link to a valid source fact.',
            })
            blockingIssueCount++
            hasFactLevelMismatch = true
          } else {
            foundFacts.push(fact)
          }
        }

        if (!hasFactLevelMismatch) {
          // 4. Textual and Numerical Integrity
          const draftNorm = normalizeText(item.text)
          let isFullySupported = false
          let isPartiallySupported = false

          // We do a simple exact match against the combination of facts, or check individual facts.
          // In this naive deterministic implementation:
          // - If the draft item is EXACTLY one of the facts, it's supported.
          // - If it's a locked number, and it differs at all, blocking issue.
          // - If it combines facts but has extra info, partially supported or unsupported.

          let combinedNorm = ''
          for (const f of foundFacts) {
            const fnorm = normalizeText(f.text)
            combinedNorm += ' ' + fnorm

            if (f.kind === 'locked_number' && fnorm !== draftNorm && !draftNorm.includes(fnorm)) {
              // simplified numerical check: if the draft doesn't contain the locked number text, mismatch.
              // For a stricter check, if the fact is locked, it might need to match exactly or the number must be present.
              if (draftNorm !== fnorm) {
                issues.push({
                  id: uuidv4(),
                  draftItemId: item.id,
                  sectionId: section.sectionId,
                  category: 'numerical_mismatch',
                  severity: 'blocking',
                  explanation: 'Locked numerical fact has been altered.',
                  sourceEntryId: item.sourceEntryId,
                  sourceFactId: f.id,
                  recommendedAction: 'Restore original numerical value.',
                })
                blockingIssueCount++
                hasFactLevelMismatch = true
              }
            }
          }
          combinedNorm = combinedNorm.trim()

          if (!hasFactLevelMismatch) {
            if (foundFacts.length === 1) {
              const fnorm = normalizeText(foundFacts[0].text)
              if (draftNorm === fnorm) {
                isFullySupported = true
              } else if (fnorm.includes(draftNorm) || draftNorm.includes(fnorm)) {
                // e.g. dropped a period, or appended some whitespace
                // if it includes it but is much longer, it might be an embellishment
                if (draftNorm.length > fnorm.length + 10) {
                  isPartiallySupported = true
                  issues.push({
                    id: uuidv4(),
                    draftItemId: item.id,
                    sectionId: section.sectionId,
                    category: 'partially_supported',
                    severity: 'warning',
                    explanation:
                      'Draft claim contains embellishments or details not found in the single source fact.',
                    sourceEntryId: item.sourceEntryId,
                    recommendedAction: 'Review and remove embellishments.',
                  })
                } else {
                  isFullySupported = true
                }
              } else {
                // mismatch
                isPartiallySupported = true
                issues.push({
                  id: uuidv4(),
                  draftItemId: item.id,
                  sectionId: section.sectionId,
                  category: 'unsupported_claim',
                  severity: 'major',
                  explanation:
                    'Draft text does not deterministically match the referenced source fact.',
                  sourceEntryId: item.sourceEntryId,
                  recommendedAction: 'Review for accuracy or revert to source.',
                })
              }
            } else {
              // Combined facts
              if (draftNorm === combinedNorm) {
                isFullySupported = true
              } else {
                isPartiallySupported = true
                issues.push({
                  id: uuidv4(),
                  draftItemId: item.id,
                  sectionId: section.sectionId,
                  category: 'partially_supported',
                  severity: 'warning',
                  explanation: 'Combined claim may contain unverified connective text.',
                  sourceEntryId: item.sourceEntryId,
                  recommendedAction: 'Review combined claim for accuracy.',
                })
              }
            }
          }

          if (hasFactLevelMismatch) {
            unsupportedCount++
          } else if (isFullySupported) {
            supportedCount++
          } else if (isPartiallySupported) {
            partialCount++
          } else {
            unsupportedCount++
          }
        } else {
          unsupportedCount++
        }
      } else {
        // No fact IDs, so this is just the entry heading/title itself
        const draftNorm = normalizeText(item.text)
        const titleNorm = normalizeText(sourceEntry.title)
        const orgNorm = normalizeText(sourceEntry.organization || '')

        if (
          draftNorm === titleNorm ||
          draftNorm === orgNorm ||
          draftNorm === normalizeText(`${titleNorm} at ${orgNorm}`)
        ) {
          supportedCount++
        } else {
          // Could just be a different format. Since it's a heading, maybe partial support.
          // We'll be strict: if it's completely different, issue a warning.
          if (draftNorm.includes(titleNorm)) {
            supportedCount++
          } else {
            partialCount++
            issues.push({
              id: uuidv4(),
              draftItemId: item.id,
              sectionId: section.sectionId,
              category: 'unsupported_claim',
              severity: 'major',
              explanation:
                'Draft entry heading does not closely match the source title/organization.',
              sourceEntryId: item.sourceEntryId,
              recommendedAction: 'Revert to source title.',
            })
          }
        }

        // Check Dates if present
        if (item.dateString) {
          const startNorm = sourceEntry.start ? normalizeText(sourceEntry.start) : ''
          const endNorm = sourceEntry.end ? normalizeText(sourceEntry.end) : 'present'
          const expectedDateStr1 = startNorm ? `${startNorm} - ${endNorm}` : ''
          const expectedDateStr2 = startNorm ? `${startNorm} to ${endNorm}` : ''
          const itemDateNorm = normalizeText(item.dateString)

          if (startNorm && !itemDateNorm.includes(startNorm)) {
            issues.push({
              id: uuidv4(),
              draftItemId: item.id,
              sectionId: section.sectionId,
              category: 'date_mismatch',
              severity: 'major',
              explanation: 'Start date in draft does not match source entry.',
              sourceEntryId: item.sourceEntryId,
              recommendedAction: 'Correct the start date.',
            })
            partialCount++ // Might double count here technically, but keeps logic simple
          }
        }
      }

      // 5. Preferences / Banned Characters
      let hasBanned = false
      for (const char of bannedCharacters) {
        if (item.text.includes(char)) {
          issues.push({
            id: uuidv4(),
            draftItemId: item.id,
            sectionId: section.sectionId,
            category: 'preference_conflict',
            severity: 'info',
            explanation: `Draft text contains banned string/character: "${char}".`,
            sourceEntryId: item.sourceEntryId,
            recommendedAction: 'Remove banned character.',
          })
          hasBanned = true
        }
      }
    }
  }

  // Determine overall status
  let status: 'passed' | 'review_required' | 'blocked' = 'passed'

  if (blockingIssueCount > 0) {
    status = 'blocked'
  } else if (
    partialCount > 0 ||
    uncertainCount > 0 ||
    issues.some((i) => i.severity === 'warning' || i.severity === 'major')
  ) {
    status = 'review_required'
  }

  if (draft.sections.length === 0) {
    status = 'blocked' // Missing provenance equivalent for empty draft
    globalWarnings.push('Draft has no content to check.')
  }

  return {
    schemaVersion: 1,
    status,
    claimsChecked,
    supportedCount,
    partialCount,
    unsupportedCount,
    uncertainCount,
    blockingIssueCount,
    issues,
    warnings: globalWarnings,
    checkedAt: new Date().toISOString(),
  }
}
