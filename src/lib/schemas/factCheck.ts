import { z } from 'zod'

export const factCheckStatusSchema = z.enum(['passed', 'review_required', 'blocked'])
export type FactCheckStatus = z.infer<typeof factCheckStatusSchema>

export const issueSeveritySchema = z.enum(['info', 'warning', 'major', 'blocking'])
export type IssueSeverity = z.infer<typeof issueSeveritySchema>

export const issueCategorySchema = z.enum([
  'missing_provenance',
  'invalid_reference',
  'unsupported_claim',
  'partially_supported',
  'numerical_mismatch',
  'date_mismatch',
  'visibility_violation',
  'preference_conflict',
])

export const factCheckIssueSchema = z.object({
  id: z.string(),
  draftItemId: z.string(),
  sectionId: z.string(),
  category: issueCategorySchema,
  severity: issueSeveritySchema,
  explanation: z.string(),
  sourceEntryId: z.string().uuid().optional(),
  sourceFactId: z.string().uuid().optional(),
  recommendedAction: z.string().optional(),
})
export type FactCheckIssue = z.infer<typeof factCheckIssueSchema>

export const factCheckResultSchema = z.object({
  schemaVersion: z.literal(1),
  status: factCheckStatusSchema,
  claimsChecked: z.number().int().nonnegative(),
  supportedCount: z.number().int().nonnegative(),
  partialCount: z.number().int().nonnegative(),
  unsupportedCount: z.number().int().nonnegative(),
  uncertainCount: z.number().int().nonnegative(),
  blockingIssueCount: z.number().int().nonnegative(),
  issues: z.array(factCheckIssueSchema),
  warnings: z.array(z.string()),
  checkedAt: z.string().datetime().optional(), // Using ISO datetime string
})
export type FactCheckResult = z.infer<typeof factCheckResultSchema>
