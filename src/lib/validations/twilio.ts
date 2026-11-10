import { z } from 'zod';

export const twilioCredentialsSchema = z.object({
  accountSid: z
    .string()
    .min(1, 'Account SID is required')
    .regex(/^AC[a-f0-9]{32}$/i, 'Invalid Twilio Account SID format'),
  authToken: z
    .string()
    .min(1, 'Auth Token is required')
    .length(32, 'Auth Token must be 32 characters'),
});

export const provisionNumberSchema = z.object({
  areaCode: z
    .string()
    .regex(/^\d{3}$/, 'Area code must be 3 digits')
    .optional(),
  country: z.string().length(2).optional(),
});

export type TwilioCredentialsInput = z.infer<typeof twilioCredentialsSchema>;
export type ProvisionNumberInput = z.infer<typeof provisionNumberSchema>;
