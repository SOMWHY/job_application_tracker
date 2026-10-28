import { z } from 'zod';

// 与 backend/src/schemas/application.ts 保持规则一致（前端本地镜像，后端零改动）。
export const statusSchema = z.enum(['PENDING', 'INTERVIEW', 'REJECTED', 'OFFER']);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '投递日期格式须为 YYYY-MM-DD');

export const applicationSchema = z.object({
  company: z.string().min(1, '请填写公司名称').max(200, '公司名称不能超过 200 字'),
  position: z.string().min(1, '请填写职位').max(200, '职位不能超过 200 字'),
  appliedDate: isoDate,
  status: statusSchema,
  source: z.string().max(200, '来源不能超过 200 字').optional().or(z.literal('')),
  link: z
    .string()
    .url('请输入合法的 URL')
    .optional()
    .or(z.literal('')),
});

export const applicationUpdateSchema = z.object({
  company: z.string().min(1, '请填写公司名称').max(200),
  position: z.string().min(1, '请填写职位').max(200),
  appliedDate: isoDate,
  source: z.string().max(200).optional().or(z.literal('')),
  link: z.string().url('请输入合法的 URL').optional().or(z.literal('')),
});

export const noteSchema = z.object({
  content: z.string().min(1, '请输入备注内容').max(1000, '备注不能超过 1000 字'),
});

export const interviewRoundTypeSchema = z.enum(['PHONE', 'TECH', 'ONSITE', 'HR']);
export const interviewRoundResultSchema = z.enum(['PENDING', 'PASS', 'FAIL']);

export const interviewRoundSchema = z.object({
  type: interviewRoundTypeSchema,
  scheduledAt: z
    .string()
    .min(1, '请选择面试时间')
    .refine((v) => !isNaN(new Date(v).getTime()), '面试时间格式无效'),
  result: interviewRoundResultSchema,
  feedback: z
    .string()
    .max(1000, '复盘备注不能超过 1000 字')
    .optional()
    .or(z.literal('')),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
export type ApplicationUpdateInput = z.infer<typeof applicationUpdateSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
export type InterviewRoundInput = z.infer<typeof interviewRoundSchema>;
