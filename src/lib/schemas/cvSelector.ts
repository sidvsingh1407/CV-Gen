import { z } from 'zod'
import { EntryType, Visibility } from '@prisma/client'
import { SUPPORTED_SECTIONS, PAGE_MODES } from './preferences'

export const selectionStatusSchema = z.enum([
  'selected',
  'no_relevant_entries',
  'insufficient_input',
])

export const selectedFactSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
  isVerified: z.boolean(),
  isLockedNumber: z.boolean(),
  originalOrder: z.number().optional(),
})

export const selectedEntryRecordSchema = z.object({
  sourceEntryId: z.string().uuid(),
  entryType: z.nativeEnum(EntryType),
  relevanceScore: z.number().min(0).max(100),
  selectionRationale: z.string(),
  matchedRequirementIds: z.array(z.string()),
  selectedFacts: z.array(selectedFactSchema),
  visibility: z.nativeEnum(Visibility),
  originalOrder: z.number(),
})

export const exclusionReasonSchema = z.enum([
  'user_excluded',
  'visibility_restricted',
  'not_eligible',
])

export const excludedEntryRecordSchema = z.object({
  entryId: z.string().uuid().optional(),
  reason: exclusionReasonSchema,
})

export const unselectedReasonSchema = z.enum([
  'low_relevance',
  'no_supporting_requirement',
  'uncertain_relevance',
])

export const unselectedEntryRecordSchema = z.object({
  entryId: z.string().uuid(),
  reason: unselectedReasonSchema,
})

export const cvSelectorOutputSchema = z.object({
  schemaVersion: z.literal(1),
  status: selectionStatusSchema,
  selectedEntries: z.array(selectedEntryRecordSchema),
  excludedEntries: z.array(excludedEntryRecordSchema),
  unselectedEntries: z.array(unselectedEntryRecordSchema),
  sectionOrder: z.array(z.enum(SUPPORTED_SECTIONS)),
  pageMode: z.enum(PAGE_MODES).optional(),
  selectionWarnings: z.array(z.string()),
})

export type CvSelectorOutput = z.infer<typeof cvSelectorOutputSchema>
export type SelectedEntryRecord = z.infer<typeof selectedEntryRecordSchema>
export type SelectedFact = z.infer<typeof selectedFactSchema>
export type ExcludedEntryRecord = z.infer<typeof excludedEntryRecordSchema>
export type UnselectedEntryRecord = z.infer<typeof unselectedEntryRecordSchema>
