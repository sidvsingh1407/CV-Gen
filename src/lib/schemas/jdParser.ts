import { z } from 'zod'

export const jdInputSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Job description cannot be empty')
    .max(30000, 'Job description exceeds maximum length of 30,000 characters'),
})

export const workArrangementSchema = z.enum(['onsite', 'hybrid', 'remote', 'unknown'])
export const employmentTypeSchema = z.enum([
  'full_time',
  'part_time',
  'contract',
  'temporary',
  'internship',
  'unknown',
])
export const senioritySchema = z.enum([
  'intern',
  'entry',
  'mid',
  'senior',
  'lead',
  'manager',
  'director',
  'executive',
  'unknown',
])

export const salaryRangeSchema = z.object({
  min: z.number(),
  max: z.number(),
  currency: z.string().optional(),
  payPeriod: z.string().optional(),
})

export const unparsedSectionSchema = z.object({
  heading: z.string().optional(),
  text: z.string(),
})

export const jdParsedSchema = z.object({
  schemaVersion: z.literal(1),
  jobTitle: z.string().nullable(),
  companyName: z.string().nullable(),
  location: z.string().nullable(),
  workArrangement: workArrangementSchema,
  employmentType: employmentTypeSchema,
  seniority: senioritySchema,
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()),
  responsibilities: z.array(z.string()),
  requiredQualifications: z.array(z.string()),
  preferredQualifications: z.array(z.string()),
  experienceRequirement: z.string().nullable(),
  educationRequirement: z.string().nullable(),
  salaryRange: salaryRangeSchema.nullable(),
  benefits: z.array(z.string()),
  keywords: z.array(z.string()),
  unparsedSections: z.array(unparsedSectionSchema),
  warnings: z.array(z.string()),
})

export type JdInput = z.infer<typeof jdInputSchema>
export type JdParsedResult = z.infer<typeof jdParsedSchema>
