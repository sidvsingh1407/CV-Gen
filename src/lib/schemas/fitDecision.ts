import { z } from 'zod'

export const fitDecisionSchema = z.enum(['undecided', 'proceed', 'do_not_proceed'])
export type FitDecision = z.infer<typeof fitDecisionSchema>

export const fitDecisionRecordSchema = z.object({
  decision: fitDecisionSchema,
  note: z.string().max(2000).optional(),
})

export type FitDecisionRecord = z.infer<typeof fitDecisionRecordSchema>
