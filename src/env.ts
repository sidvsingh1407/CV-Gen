import { z } from 'zod'

const envSchema = z.object({
  PORT: z.string().optional().default('3000'),
  HOST: z.string().optional().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  MAX_CV_UPLOAD_MB: z.coerce.number().positive().default(10),
})

export const env = envSchema.parse({
  PORT: process.env.PORT,
  HOST: process.env.HOST,
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  MAX_CV_UPLOAD_MB: process.env.MAX_CV_UPLOAD_MB,
})
