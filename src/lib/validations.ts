import { z } from 'zod';

export const CreateAttemptSchema = z.object({
  nickname: z.string().min(2, 'Nickname must be at least 2 characters').max(50),
  pin: z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 digits').optional().or(z.literal('')),
});

export const VerifyPinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 digits'),
});

export const SaveAnswerSchema = z.object({
  itemId: z.string().min(1),
  partId: z.string().min(1),
  sectionId: z.string().min(1),
  selected: z.any().optional(),
  reason: z.string().optional(),
  choiceIndex: z.number().int().optional(),
  confidence: z.enum(['Sure', 'Maybe', 'Guess']).nullable().optional(),
  timeSpentSeconds: z.number().nonnegative().optional().default(0),
  visits: z.number().int().nonnegative().optional().default(1),
  skipped: z.boolean().optional().default(false),
  markedForReview: z.boolean().optional().default(false),
  writingStats: z
    .object({
      wordCount: z.number().int().nonnegative().default(0),
      pasteCount: z.number().int().nonnegative().default(0),
      editTimeline: z
        .array(
          z.object({
            ts: z.string().or(z.date()),
            length: z.number().int().nonnegative(),
          })
        )
        .optional()
        .default([]),
    })
    .optional(),
  clientEventId: z.string().optional(),
});

export const SectionTimerActionSchema = z.object({
  sectionId: z.string().min(1),
  action: z.enum(['start', 'use_buffer', 'stop_buffer', 'submit']),
});

export const LogEventSchema = z.object({
  type: z.string().min(1),
  payload: z.record(z.any()).optional(),
});

export const SaveNotepadSchema = z.object({
  notepad: z.string().max(50000),
});

export const AdminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const ExtendTimeSchema = z.object({
  sectionId: z.string().min(1),
  additionalMinutes: z.number().int().positive().max(120),
});

export const ReopenSectionSchema = z.object({
  sectionId: z.string().min(1),
});

export const UpdateQuestionSchema = z.object({
  stem: z.string().min(1).optional(),
  stem_hi: z.string().optional(),
  opts: z.array(z.string()).optional(),
  opts_hi: z.array(z.string()).optional(),
  ans: z.string().optional(),
});
