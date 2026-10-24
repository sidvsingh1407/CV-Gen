import { z } from 'zod'

const envSchema = z.object({
  PORT: z.string().optional().default('3000'),
  HOST: z.string().optional().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  // Add future variables here as they become needed
})

export const env = envSchema.parse({
  PORT: process.env.PORT,
  HOST: process.env.HOST,
  NODE_ENV: process.env.NODE_ENV,
})
