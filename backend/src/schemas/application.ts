import { z } from 'zod';

export const statusSchema = z.enum(['PENDING', 'INTERVIEW', 'REJECTED', 'OFFER']);

export const applicationStatusSchema = z.enum(['PENDING', 'INTERVIEW', 'REJECTED', 'OFFER']);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'appliedDate must be in YYYY-MM-DD format');

export const createApplicationSchema = z.object({
  company: z.string().min(1, 'company is required').max(200),
  position: z.string().min(1, 'position is required').max(200),
  appliedDate: isoDate,
  status: applicationStatusSchema.optional().default('PENDING'),
  source: z.string().max(200).optional(),
  link: z.string().url('link must be a valid URL').optional().or(z.literal('')),
});

export const updateApplicationSchema = z
  .object({
    company: z.string().min(1).max(200).optional(),
    position: z.string().min(1).max(200).optional(),
    appliedDate: isoDate.optional(),
    source: z.string().max(200).nullable().optional(),
    link: z.string().url('link must be a valid URL').nullable().optional().or(z.literal('')),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const updateStatusSchema = z.object({
  status: applicationStatusSchema,
});

export const noteSchema = z.object({
  content: z.string().min(1, 'content is required').max(1000),
});

export const listQuerySchema = z.object({
  status: applicationStatusSchema.optional(),
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
