import { JdParsedResult } from '../schemas/jdParser'
import {
  FitScoreResult,
  MatchStatus,
  RequirementRecord,
  ScoreBreakdown,
  SCORING_WEIGHTS,
} from '../schemas/fitScore'
import { Entry, Fact } from '@prisma/client'

type ProfileEntryWithFacts = Entry & { facts: Fact[] }

export interface FitScoringInput {
  jd: JdParsedResult
  profileEntries: ProfileEntryWithFacts[]
  excludedEntryIds?: string[]
  threshold?: number
}

// Bounded synonym map for defensible equivalence
const SYNONYM_MAP: Record<string, string[]> = {
  javascript: ['js'],
  typescript: ['ts'],
  react: ['reactjs', 'react.js'],
  node: ['nodejs', 'node.js'],
  postgres: ['postgresql'],
  frontend: ['front-end', 'front end'],
  backend: ['back-end', 'back end'],
  fullstack: ['full-stack', 'full stack'],
  bachelor: ["bachelor's", 'bs', 'ba', 'b.s.', 'b.a.'],
  master: ["master's", 'ms', 'ma', 'm.s.', 'm.a.'],
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function getSynonyms(word: string): string[] {
  const normalized = normalizeText(word)
  for (const [key, variants] of Object.entries(SYNONYM_MAP)) {
    if (key === normalized || variants.includes(normalized)) {
      return [key, ...variants]
    }
  }
  return [normalized]
}

// Conservative phrase matching
function evaluateTextMatch(
  requirement: string,
  entryText: string,
): { status: MatchStatus; explanation: string; isUncertain: boolean } {
  const normReq = normalizeText(requirement)
  const normEntry = normalizeText(entryText)

  if (normReq === '')
    return { status: 'not_evaluated', explanation: 'Empty requirement', isUncertain: false }

  // Exact phrase match
  if (normEntry.includes(normReq)) {
    return {
      status: 'matched',
      explanation: 'Exact phrase match found in profile',
      isUncertain: false,
    }
  }

  // Word boundary match / Synonym match for short keywords (1-2 words)
  const reqWords = normReq.split(' ')
  if (reqWords.length <= 2) {
    const synonyms = reqWords.flatMap(getSynonyms)
    const entryWords = normEntry.split(' ')
    const hasMatch = synonyms.some((syn) => entryWords.includes(syn))
    if (hasMatch) {
      return {
        status: 'matched',
        explanation: 'Keyword/synonym match found in profile',
        isUncertain: false,
      }
    }
  }

  // Partial match for longer phrases (e.g. responsibilities)
  // If > 50% of important words match (ignoring stop words)
  if (reqWords.length > 2) {
    const stopWords = new Set([
      'and',
      'or',
      'the',
      'a',
      'an',
      'in',
      'on',
      'with',
      'to',
      'for',
      'of',
    ])
    const importantReqWords = reqWords.filter((w) => !stopWords.has(w))
    const entryWords = new Set(normEntry.split(' '))

    let matchCount = 0
    for (const rw of importantReqWords) {
      if (entryWords.has(rw)) matchCount++
    }

    if (importantReqWords.length > 0) {
      const matchRatio = matchCount / importantReqWords.length
      if (matchRatio >= 0.8) {
        return {
          status: 'matched',
          explanation: 'Strong conceptual match found in profile',
          isUncertain: false,
        }
      } else if (matchRatio >= 0.4) {
        return {
          status: 'partially_matched',
          explanation: 'Partial conceptual match found in profile',
          isUncertain: false,
        }
      }
    }
  }

  return { status: 'not_found', explanation: 'No supporting evidence found', isUncertain: false }
}

export function scoreFit(input: FitScoringInput): FitScoreResult {
  const { jd, profileEntries, excludedEntryIds = [], threshold = 70 } = input

  // Filter excluded entries
  const availableEntries = profileEntries.filter((e) => !excludedEntryIds.includes(e.id))

  const requirements: RequirementRecord[] = []
  let reqIdCounter = 1

  const addRequirement = (
    text: string,
    category: RequirementRecord['category'],
    isRequired: boolean,
    targetEntryTypes?: string[],
  ) => {
    let bestStatus: MatchStatus = 'not_found'
    let bestExplanation = 'No supporting evidence found in relevant profile sections.'
    const supportingIds = new Set<string>()
    let isUncertain = false

    // If empty text, skip evaluating
    if (!text.trim()) return

    for (const entry of availableEntries) {
      if (targetEntryTypes && !targetEntryTypes.includes(entry.type)) continue

      // Search in title, organization, and facts
      const textsToSearch = [
        entry.title,
        entry.organization || '',
        ...entry.facts.map((f) => f.text),
      ].filter(Boolean)

      for (const t of textsToSearch) {
        const match = evaluateTextMatch(text, t)
        if (match.status === 'matched') {
          bestStatus = 'matched'
          bestExplanation = match.explanation
          supportingIds.add(entry.id)
          isUncertain = true // by default, unverified
          break
        } else if (match.status === 'partially_matched' && bestStatus === 'not_found') {
          bestStatus = 'partially_matched'
          bestExplanation = match.explanation
          supportingIds.add(entry.id)
          isUncertain = true
        }
      }
    }

    // We no longer set bestStatus to uncertain, just use the evidenceVerificationStatus to reflect uncertainty
    requirements.push({
      id: `req-${reqIdCounter++}`,
      text,
      category,
      isRequired,
      status: bestStatus,
      explanation: bestExplanation,
      supportingEntryIds: Array.from(supportingIds),
      evidenceVerificationStatus: bestStatus !== 'not_found' ? 'unknown' : null,
      dimensionContribution: 0,
    })
  }

  // Evaluate distinct items
  jd.requiredSkills.forEach((s) =>
    addRequirement(s, 'required_skill', true, ['skill', 'experience', 'project', 'freelance']),
  )
  jd.preferredSkills.forEach((s) =>
    addRequirement(s, 'preferred_skill', false, ['skill', 'experience', 'project', 'freelance']),
  )
  jd.requiredQualifications.forEach((q) =>
    addRequirement(q, 'required_qualification', true, ['education', 'certification', 'experience']),
  )
  jd.preferredQualifications.forEach((q) =>
    addRequirement(q, 'preferred_qualification', false, [
      'education',
      'certification',
      'experience',
    ]),
  )
  jd.responsibilities.forEach((r) =>
    addRequirement(r, 'responsibility', true, ['experience', 'project', 'freelance', 'position']),
  )

  if (jd.experienceRequirement) {
    addRequirement(jd.experienceRequirement, 'experience', true, ['experience'])
  }
  if (jd.educationRequirement) {
    addRequirement(jd.educationRequirement, 'education', true, ['education'])
  }
  if (jd.seniority && jd.seniority !== 'unknown') {
    addRequirement(`Seniority: ${jd.seniority}`, 'seniority', true, ['experience', 'position'])
  }

  // Deduplicate and count evaluable requirements
  const uniqueReqs = new Set(requirements.map((r) => normalizeText(r.text)))

  if (uniqueReqs.size < 2) {
    return {
      schemaVersion: 1,
      status: 'insufficient_data',
      score: null,
      scoreBreakdown: null,
      requirements,
      strengths: [],
      gaps: [],
      uncertainties: [],
      excludedEvidenceCount: excludedEntryIds.length,
      dataLimitations: [
        'Job description does not contain enough evaluable requirements (minimum 2).',
      ],
      threshold,
    }
  }

  // Calculate scores
  const breakdown: ScoreBreakdown = {
    requiredSkills: { score: 0, weight: SCORING_WEIGHTS.requiredSkills, coverage: 0 },
    requiredQualifications: {
      score: 0,
      weight: SCORING_WEIGHTS.requiredQualifications,
      coverage: 0,
    },
    experienceAndResponsibilities: {
      score: 0,
      weight: SCORING_WEIGHTS.experienceAndResponsibilities,
      coverage: 0,
    },
    preferredSkillsAndQuals: {
      score: 0,
      weight: SCORING_WEIGHTS.preferredSkillsAndQuals,
      coverage: 0,
    },
    roleAlignment: { score: 0, weight: SCORING_WEIGHTS.roleAlignment, coverage: 0 },
  }

  const scoreDimension = (reqs: RequirementRecord[], dimension: keyof ScoreBreakdown) => {
    if (reqs.length === 0) return

    let totalScore = 0
    reqs.forEach((r) => {
      let val = 0
      if (r.status === 'matched') val = 1.0
      else if (r.status === 'partially_matched') val = 0.5
      else if (r.status === 'uncertain') val = 0.3

      if (val > 0 && r.evidenceVerificationStatus === 'unknown') {
        val *= 0.8
      }

      const contribution = (val / reqs.length) * breakdown[dimension].weight
      r.dimensionContribution = contribution
      totalScore += val
    })

    breakdown[dimension].score = (totalScore / reqs.length) * breakdown[dimension].weight
    breakdown[dimension].coverage = reqs.length
  }

  const reqSkills = requirements.filter((r) => r.category === 'required_skill')
  const reqQuals = requirements.filter(
    (r) => r.category === 'required_qualification' || r.category === 'education',
  )
  const expResp = requirements.filter(
    (r) => r.category === 'responsibility' || r.category === 'experience',
  )
  const prefReqs = requirements.filter(
    (r) => r.category === 'preferred_skill' || r.category === 'preferred_qualification',
  )
  const roleAlign = requirements.filter((r) => r.category === 'seniority')

  scoreDimension(reqSkills, 'requiredSkills')
  scoreDimension(reqQuals, 'requiredQualifications')
  scoreDimension(expResp, 'experienceAndResponsibilities')
  scoreDimension(prefReqs, 'preferredSkillsAndQuals')
  scoreDimension(roleAlign, 'roleAlignment')

  // Normalization
  let activeWeight = 0
  let rawScore = 0
  for (const key of Object.keys(breakdown) as (keyof ScoreBreakdown)[]) {
    if (breakdown[key].coverage > 0) {
      activeWeight += breakdown[key].weight
      rawScore += breakdown[key].score
    }
  }

  let finalScore = 0
  if (activeWeight > 0) {
    finalScore = Math.round((rawScore / activeWeight) * 100)
  }

  const strengths = requirements.filter((r) => r.status === 'matched').map((r) => r.text)
  const gaps = requirements.filter((r) => r.status === 'not_found').map((r) => r.text)
  const uncertainties = requirements
    .filter((r) => r.evidenceVerificationStatus === 'unknown' || r.status === 'partially_matched')
    .map((r) => r.text)

  return {
    schemaVersion: 1,
    status: 'scored',
    score: finalScore,
    scoreBreakdown: breakdown,
    requirements,
    strengths,
    gaps,
    uncertainties,
    excludedEvidenceCount: excludedEntryIds.length,
    dataLimitations: [],
    threshold,
  }
}
