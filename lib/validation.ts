import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').max(100),
  password: z.string().min(1, 'Password is required').max(256),
});

export const startSessionSchema = z.object({
  duration: z.number().refine((d) => [30, 60, 90].includes(d), {
    message: 'Duration must be 30, 60, or 90 minutes',
  }),
  machineId: z.string().min(1, 'Machine ID is required').max(200),
  imageUrl: z.string().max(2048).optional(),
});

export const updateRateSchema = z.object({
  ratePerMinute: z.number().positive('Rate must be positive').finite().max(1e6),
});

export const terminateSessionSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

export const markAlertReadSchema = z.object({
  alertId: z.string().optional(),
  markAllRead: z.boolean().optional(),
}).refine((d) => d.alertId || d.markAllRead === true, {
  message: 'Either alertId or markAllRead is required',
});

export const saveLoginImageSchema = z
  .object({
    imageBase64: z.string().optional(),
    image: z.string().optional(),
  })
  .refine((d) => {
    const s = (d.imageBase64 ?? d.image ?? '').toString();
    return s.length > 0 && s.length <= 5 * 1024 * 1024;
  }, { message: 'Image data required, max 5MB' });

export type LoginInput = z.infer<typeof loginSchema>;
export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type UpdateRateInput = z.infer<typeof updateRateSchema>;
