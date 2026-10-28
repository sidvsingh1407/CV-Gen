import { Entry, Fact, Visibility } from '@prisma/client'
import { JdParsedResult } from '../schemas/jdParser'
import { z } from 'zod'
import { preferencesSchema, SUPPORTED_SECTIONS } from '../schemas/preferences'
import {
  CvSelectorOutput,
  ExcludedEntryRecord,
  SelectedEntryRecord,
  UnselectedEntryRecord,
} from '../schemas/cvSelector'

// Include MatchStatus implicitly from logic or reuse if needed
type RequirementMatch = {
  text: string
  category: string
  isRequired: boolean
  matchedEntryIds: Set<string>
}

export type ProfileEntryWithFacts = Entry & { facts: Fact[] }

export type SelectionInput = {
  jd: JdParsedResult
  profileEntries: ProfileEntryWithFacts[]
  preferences?: z.infer<typeof preferencesSchema>
}

// Weights as specified
const WEIGHTS = {
  required: 40,
  experience: 25,
  skills: 20,
  role: 10,
  preferred: 5,
}

const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const evaluatePhraseMatch = (requirement: string, entryText: string): boolean => {
  const normReq = normalizeText(requirement)
  const normEntry = normalizeText(entryText)

  if (!normReq) return false
  if (normEntry.includes(normReq)) return true

  const reqWords = normReq.split(' ')
  if (reqWords.length <= 2) {
    const entryWords = normEntry.split(' ')
    return reqWords.every((w) => entryWords.includes(w))
  }

  const stopWords = new Set(['and', 'or', 'the', 'a', 'an', 'in', 'on', 'with', 'to', 'for', 'of'])
  const importantReqWords = reqWords.filter((w) => !stopWords.has(w))
  if (importantReqWords.length === 0) return false

  const entryWords = new Set(normEntry.split(' '))
  let matchCount = 0
  for (const rw of importantReqWords) {
    if (entryWords.has(rw)) matchCount++
  }

  return matchCount / importantReqWords.length >= 0.7 // Strict enough for selection
}

export function selectCvContent(input: SelectionInput): CvSelectorOutput {
  const { jd, profileEntries, preferences } = input

  const sectionOrder = preferences?.sectionOrder || [...SUPPORTED_SECTIONS]
  const pageMode = preferences?.pageMode
  const excludedEntryIds = new Set(preferences?.excludedEntryIds || [])

  const selectedEntries: SelectedEntryRecord[] = []
  const excludedEntries: ExcludedEntryRecord[] = []
  const unselectedEntries: UnselectedEntryRecord[] = []
  const selectionWarnings: string[] = []

  // Extract all requirements from JD
  const requirements: RequirementMatch[] = [
    ...jd.requiredSkills.map((r) => ({
      text: r,
      category: 'skill',
      isRequired: true,
      matchedEntryIds: new Set<string>(),
    })),
    ...jd.preferredSkills.map((r) => ({
      text: r,
      category: 'skill',
      isRequired: false,
      matchedEntryIds: new Set<string>(),
    })),
    ...jd.requiredQualifications.map((r) => ({
      text: r,
      category: 'qualification',
      isRequired: true,
      matchedEntryIds: new Set<string>(),
    })),
    ...jd.preferredQualifications.map((r) => ({
      text: r,
      category: 'qualification',
      isRequired: false,
      matchedEntryIds: new Set<string>(),
    })),
    ...jd.responsibilities.map((r) => ({
      text: r,
      category: 'responsibility',
      isRequired: true,
      matchedEntryIds: new Set<string>(),
    })),
  ]

  if (jd.experienceRequirement)
    requirements.push({
      text: jd.experienceRequirement,
      category: 'experience',
      isRequired: true,
      matchedEntryIds: new Set<string>(),
    })
  if (jd.educationRequirement)
    requirements.push({
      text: jd.educationRequirement,
      category: 'education',
      isRequired: true,
      matchedEntryIds: new Set<string>(),
    })
  if (jd.seniority && jd.seniority !== 'unknown')
    requirements.push({
      text: `Seniority: ${jd.seniority}`,
      category: 'role',
      isRequired: true,
      matchedEntryIds: new Set<string>(),
    })

  if (requirements.length === 0) {
    return {
      schemaVersion: 1,
      status: 'insufficient_input',
      selectedEntries: [],
      excludedEntries: [],
      unselectedEntries: [],
      sectionOrder,
      pageMode,
      selectionWarnings: ['Job description does not contain enough evaluable requirements.'],
    }
  }

  // 1. Eligibility Filtering & Matching
  const eligibleEntries: ProfileEntryWithFacts[] = []

  for (const entry of profileEntries) {
    if (excludedEntryIds.has(entry.id)) {
      excludedEntries.push({ entryId: undefined, reason: 'user_excluded' })
      continue
    }

    if (entry.visibility === 'never') {
      excludedEntries.push({ entryId: undefined, reason: 'visibility_restricted' })
      continue
    }

    eligibleEntries.push(entry)
  }

  // Score eligible entries
  type ScoredEntry = {
    entry: ProfileEntryWithFacts
    score: number
    matchedReqs: RequirementMatch[]
    relevantFacts: Set<string>
  }
  const scoredEntries: ScoredEntry[] = []

  for (const entry of eligibleEntries) {
    let score = 0
    const matchedReqs: RequirementMatch[] = []
    const relevantFacts = new Set<string>()

    const searchTexts = [
      entry.title,
      entry.organization || '',
      ...entry.facts.map((f) => f.text),
    ].filter(Boolean)

    for (const req of requirements) {
      let reqMatched = false
      // Determine what part matched to add to relevant facts
      if (
        evaluatePhraseMatch(req.text, entry.title) ||
        evaluatePhraseMatch(req.text, entry.organization || '')
      ) {
        reqMatched = true
      }

      for (const fact of entry.facts) {
        if (evaluatePhraseMatch(req.text, fact.text)) {
          reqMatched = true
          relevantFacts.add(fact.id)
        }
      }

      if (reqMatched) {
        req.matchedEntryIds.add(entry.id)
        matchedReqs.push(req)

        // Award points based on category
        if (req.isRequired) {
          score += WEIGHTS.required
        } else {
          score += WEIGHTS.preferred
        }

        if (
          req.category === 'experience' ||
          req.category === 'responsibility' ||
          entry.type === 'experience' ||
          entry.type === 'project'
        ) {
          score += WEIGHTS.experience
        } else if (
          req.category === 'skill' ||
          req.category === 'qualification' ||
          entry.type === 'skill' ||
          entry.type === 'education' ||
          entry.type === 'certification'
        ) {
          score += WEIGHTS.skills
        } else if (req.category === 'role') {
          score += WEIGHTS.role
        }
      }
    }

    // Normalize to 100 roughly
    const normalizedScore = Math.min(
      100,
      Math.round(
        (score / (WEIGHTS.required + WEIGHTS.experience + WEIGHTS.skills + WEIGHTS.role)) * 100,
      ),
    )

    if (normalizedScore > 0) {
      scoredEntries.push({ entry, score: normalizedScore, matchedReqs, relevantFacts })
    } else {
      unselectedEntries.push({ entryId: entry.id, reason: 'low_relevance' })
    }
  }

  // Deduplicate identical matching facts across entries if needed (Simplified: just rely on score and original order)

  // Sort entries: relevance score DESC, then section order index ASC, then original display order ASC
  scoredEntries.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score

    // Section order index tie breaker
    const aSectionIndex = sectionOrder.indexOf(a.entry.type as any)
    const bSectionIndex = sectionOrder.indexOf(b.entry.type as any)

    if (aSectionIndex !== -1 && bSectionIndex !== -1 && aSectionIndex !== bSectionIndex) {
      return aSectionIndex - bSectionIndex
    }

    return a.entry.displayOrder - b.entry.displayOrder
  })

  for (const se of scoredEntries) {
    if (se.entry.visibility === 'on_request') {
      selectionWarnings.push(
        `Entry ${se.entry.id} is marked 'on_request'. Consent rules must be checked before final CV generation.`,
      )
    }

    selectedEntries.push({
      sourceEntryId: se.entry.id,
      entryType: se.entry.type,
      relevanceScore: se.score,
      selectionRationale: `Matched ${se.matchedReqs.length} requirements.`, // Concise
      matchedRequirementIds: se.matchedReqs.map((r) => r.text), // using text as id proxy for now
      selectedFacts: se.entry.facts
        .map((f) => ({
          id: f.id,
          text: f.text,
          isVerified: f.evidenceNote ? true : false,
          isLockedNumber: f.kind === 'locked_number',
          originalOrder: 0, // Default or extract if fact has order
        }))
        .filter((f) => se.relevantFacts.has(f.id)), // Only include facts that explicitly matched a requirement
      visibility: se.entry.visibility,
      originalOrder: se.entry.displayOrder,
    })
  }

  return {
    schemaVersion: 1,
    status: selectedEntries.length > 0 ? 'selected' : 'no_relevant_entries',
    selectedEntries,
    excludedEntries,
    unselectedEntries,
    sectionOrder,
    pageMode,
    selectionWarnings,
  }
}
