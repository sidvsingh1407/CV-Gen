import { z } from 'zod'
import { SUPPORTED_SECTIONS, TONE_PRESETS, PAGE_MODES } from './preferences'

export const draftStatusSchema = z.enum(['draft_ready', 'insufficient_content'])

export const draftItemWarningSchema = z.object({
  type: z.enum(['banned_character', 'unverified_claim', 'formatting_limitation']),
  message: z.string(),
})

export const draftItemSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
  sourceEntryId: z.string().uuid().optional(),
  sourceFactIds: z.array(z.string().uuid()).default([]),
  verificationStatus: z.enum(['verified', 'unverified', 'unknown']),
  matchedRequirementIds: z.array(z.string()).default([]),
  warnings: z.array(draftItemWarningSchema).default([]),
  // Additional context for rendering (e.g., job title, dates)
  title: z.string().optional(),
  organization: z.string().optional(),
  dateString: z.string().optional(),
})

export const draftSectionSchema = z.object({
  sectionId: z.enum(SUPPORTED_SECTIONS),
  heading: z.string(),
  items: z.array(draftItemSchema),
})

export const draftHeaderSchema = z.object({
  fullName: z.string(),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  linkedin: z.string().url().optional().or(z.literal('')),
  portfolio: z.string().url().optional().or(z.literal('')),
  github: z.string().url().optional().or(z.literal('')),
})

export const cvDraftSchema = z.object({
  schemaVersion: z.literal(1),
  status: draftStatusSchema,
  targetRole: z.string().nullable(),
  header: draftHeaderSchema.nullable(),
  sections: z.array(draftSectionSchema),
  warnings: z.array(z.string()),
  // Forwarded preferences for rendering
  formatting: z
    .object({
      fontFamily: z.string(),
      primaryColor: z.string(),
      margins: z.object({
        top: z.number(),
        bottom: z.number(),
        left: z.number(),
        right: z.number(),
      }),
      linkFormat: z.enum(['anchor_text', 'raw_url']),
    })
    .optional(),
  tone: z.enum(TONE_PRESETS).optional(),
  pageMode: z.enum(PAGE_MODES).optional(),
})

export type CvDraftOutput = z.infer<typeof cvDraftSchema>
export type DraftSection = z.infer<typeof draftSectionSchema>
export type DraftItem = z.infer<typeof draftItemSchema>
export type DraftItemWarning = z.infer<typeof draftItemWarningSchema>
export type DraftHeader = z.infer<typeof draftHeaderSchema>
