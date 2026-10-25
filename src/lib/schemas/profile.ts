import { z } from 'zod'
import { EntryType, Visibility, FactKind } from '@prisma/client'

const validateDateString = (val: string) => {
  if (val === 'Ongoing') return true
  const match = val.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/)
  if (!match) return false
  const year = parseInt(match[1], 10)
  const month = parseInt(match[2], 10)
  const day = match[3] ? parseInt(match[3], 10) : 1

  if (month < 1 || month > 12) return false

  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

export const headerSchema = z.object({
  fullName: z.string().min(1, 'Full name cannot be empty'),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  linkedin: z.string().url().optional().or(z.literal('')),
  portfolio: z.string().url().optional().or(z.literal('')),
  github: z.string().url().optional().or(z.literal('')),
})

export const entrySchema = z
  .object({
    type: z.nativeEnum(EntryType),
    title: z.string().min(1, 'Title cannot be empty'),
    organization: z.string().optional().nullable(),
    start: z
      .string()
      .refine((val) => validateDateString(val), 'Invalid start date format')
      .optional()
      .nullable(),
    end: z
      .string()
      .refine((val) => validateDateString(val), 'Invalid end date format')
      .optional()
      .nullable(),
    visibility: z.nativeEnum(Visibility).default(Visibility.always),
    placement: z.string().optional().nullable(),
    displayOrder: z.number().int().default(0),
  })
  .refine(
    (data) => {
      if (!data.start || !data.end) return true
      if (data.start === 'Ongoing') return false // Start date usually isn't Ongoing, but let's just make sure we don't crash
      if (data.end === 'Ongoing') return true

      const startDate = new Date(data.start + (data.start.length === 7 ? '-01' : ''))
      const endDate = new Date(data.end + (data.end.length === 7 ? '-01' : ''))

      return startDate <= endDate
    },
    {
      message: 'End date cannot be earlier than start date',
      path: ['end'],
    },
  )

export const factSchema = z.object({
  text: z.string().trim().min(1, 'Fact text cannot be empty'),
  kind: z.nativeEnum(FactKind).default(FactKind.free_text),
  evidenceNote: z.string().optional().nullable(),
})
