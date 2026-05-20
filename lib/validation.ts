import { z } from 'zod';

// ── Shared constants ──────────────────────────────────────────────────────────
export const ALLOWED_LANGUAGES = [
  'plaintext','javascript','typescript','python','java','go','rust',
  'bash','json','html','css','markdown','yaml','sql','cpp','c','php','ruby',
] as const;

export const ALLOWED_VISIBILITIES = ['public', 'unlisted', 'private'] as const;
export const ALLOWED_EXPIRATIONS  = ['never', '1h', '1d', '7d'] as const;

// ── Paste creation ────────────────────────────────────────────────────────────
export const CreatePasteSchema = z.object({
  title: z
    .string()
    .max(200, 'Title must be ≤ 200 characters')
    .optional()
    .default(''),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(512_000, 'Content exceeds 500 KB limit'),   // ~500 KB in chars
  language: z
    .enum(ALLOWED_LANGUAGES)
    .optional()
    .default('plaintext'),
  visibility: z
    .enum(ALLOWED_VISIBILITIES)
    .optional()
    .default('unlisted'),
  expiration: z
    .enum(ALLOWED_EXPIRATIONS)
    .optional()
    .default('never'),
  burnAfterRead: z.boolean().optional().default(false),
  password: z
    .string()
    .max(128, 'Password must be ≤ 128 characters')
    .optional()
    .default(''),
});

export type CreatePasteInput = z.infer<typeof CreatePasteSchema>;

// ── User registration ─────────────────────────────────────────────────────────
export const RegisterSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .max(254, 'Email too long')
    .toLowerCase(),
  username: z
    .string()
    .min(3,  'Username must be ≥ 3 characters')
    .max(30, 'Username must be ≤ 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, _ and -'),
  password: z
    .string()
    .min(8,  'Password must be ≥ 8 characters')
    .max(72, 'Password must be ≤ 72 characters'),  // bcrypt 72-byte limit
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

// ── Paste ID param ────────────────────────────────────────────────────────────
export const ShortIdSchema = z
  .string()
  .min(6)
  .max(16)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid paste ID');

// ── Password header ───────────────────────────────────────────────────────────
export const PastePasswordSchema = z
  .string()
  .max(128, 'Password header too long')
  .optional();
