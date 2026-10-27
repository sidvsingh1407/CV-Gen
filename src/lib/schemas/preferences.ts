import { z } from 'zod'

export const SUPPORTED_SECTIONS = [
  'header',
  'summary',
  'experience',
  'projects',
  'freelance',
  'certifications',
  'education',
  'skills',
  'positions',
  'volunteer',
] as const

export const TONE_PRESETS = ['professional', 'concise', 'analytical', 'confident'] as const

export const PAGE_MODES = ['one_page', 'two_page'] as const

export const LINK_FORMATS = ['anchor_text', 'raw_url'] as const

export const preferencesSchema = z.object({
  version: z.literal(1).default(1),
  sectionOrder: z
    .array(z.enum(SUPPORTED_SECTIONS))
    .min(1)
    .refine((items) => new Set(items).size === items.length, {
      message: 'Sections must be unique',
    })
    .default([...SUPPORTED_SECTIONS]),
  excludedEntryIds: z.array(z.string().uuid()).default([]),
  tone: z.enum(TONE_PRESETS).default('professional'),
  pageMode: z.enum(PAGE_MODES).default('two_page'),
  formatting: z
    .object({
      fontFamily: z.string().default('Arial'),
      primaryColor: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color')
        .default('#1B3A6B'),
      margins: z
        .object({
          top: z.number().min(0).max(100).default(20),
          bottom: z.number().min(0).max(100).default(20),
          left: z.number().min(0).max(100).default(20),
          right: z.number().min(0).max(100).default(20),
        })
        .default({ top: 20, bottom: 20, left: 20, right: 20 }),
      linkFormat: z.enum(LINK_FORMATS).default('anchor_text'),
    })
    .default({
      fontFamily: 'Arial',
      primaryColor: '#1B3A6B',
      margins: { top: 20, bottom: 20, left: 20, right: 20 },
      linkFormat: 'anchor_text',
    }),
  bannedCharacters: z
    .array(z.string().min(1).trim())
    .max(50)
    .transform((items) => Array.from(new Set(items)))
    .default([]),
  fitThreshold: z.number().int().min(0).max(100).default(70),
})

export const updatePreferencesSchema = preferencesSchema.partial()
