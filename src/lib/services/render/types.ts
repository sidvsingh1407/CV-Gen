import { z } from 'zod';
import { cvDraftSchema } from '@/lib/schemas/cvDraft';

export const renderRequestSchema = z.object({
  draft: cvDraftSchema,
  format: z.enum(['docx', 'pdf']),
});

export type RenderRequest = z.infer<typeof renderRequestSchema>;
