import { z } from 'zod';

export const interviewRoundTypeSchema = z.enum(['PHONE', 'TECH', 'ONSITE', 'HR']);
export const interviewRoundResultSchema = z.enum(['PENDING', 'PASS', 'FAIL']);

const isoDateTime = z
  .string()
  .min(1, 'scheduledAt is required')
  .refine((val) => !isNaN(new Date(val).getTime()), {
    message: 'scheduledAt must be a valid ISO datetime',
  });

export const createInterviewRoundSchema = z.object({
  type: interviewRoundTypeSchema,
  scheduledAt: isoDateTime,
  result: interviewRoundResultSchema.optional().default('PENDING'),
  feedback: z.string().max(1000, 'feedback must be at most 1000 characters').optional(),
});

export type CreateInterviewRoundInput = z.infer<typeof createInterviewRoundSchema>;
