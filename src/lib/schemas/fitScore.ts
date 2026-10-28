import { z } from 'zod'

export const matchStatusSchema = z.enum([
  'matched',
  'partially_matched',
  'not_found',
  'uncertain',
  'not_evaluated',
])
export type MatchStatus = z.infer<typeof matchStatusSchema>

export const requirementCategorySchema = z.enum([
  'required_skill',
  'preferred_skill',
  'required_qualification',
  'preferred_qualification',
  'experience',
  'education',
  'responsibility',
  'seniority',
])

export const requirementRecordSchema = z.object({
  id: z.string(),
  text: z.string(),
  category: requirementCategorySchema,
  isRequired: z.boolean(),
  status: matchStatusSchema,
  explanation: z.string(),
  supportingEntryIds: z.array(z.string()),
  evidenceVerificationStatus: z.string().nullable(), // 'unverified', 'unknown', etc.
  dimensionContribution: z.number(),
})
export type RequirementRecord = z.infer<typeof requirementRecordSchema>

export const scoreBreakdownSchema = z.object({
  requiredSkills: z.object({ score: z.number(), weight: z.number(), coverage: z.number() }),
  requiredQualifications: z.object({ score: z.number(), weight: z.number(), coverage: z.number() }),
  experienceAndResponsibilities: z.object({
    score: z.number(),
    weight: z.number(),
    coverage: z.number(),
  }),
  preferredSkillsAndQuals: z.object({
    score: z.number(),
    weight: z.number(),
    coverage: z.number(),
  }),
  roleAlignment: z.object({ score: z.number(), weight: z.number(), coverage: z.number() }),
})
export type ScoreBreakdown = z.infer<typeof scoreBreakdownSchema>

export const fitScoreResultSchema = z.object({
  schemaVersion: z.literal(1),
  status: z.enum(['scored', 'insufficient_data']),
  score: z.number().int().min(0).max(100).nullable(),
  scoreBreakdown: scoreBreakdownSchema.nullable(),
  requirements: z.array(requirementRecordSchema),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  uncertainties: z.array(z.string()),
  excludedEvidenceCount: z.number().int(),
  dataLimitations: z.array(z.string()),
  threshold: z.number().int(),
})
export type FitScoreResult = z.infer<typeof fitScoreResultSchema>

export const SCORING_WEIGHTS = {
  requiredSkills: 30,
  requiredQualifications: 20,
  experienceAndResponsibilities: 25,
  preferredSkillsAndQuals: 15,
  roleAlignment: 10,
} as const
