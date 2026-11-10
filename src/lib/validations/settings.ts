import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// General tenant settings
// ─────────────────────────────────────────────────────────────────────────────

export const TenantSettingsUpdateSchema = z.object({
  name:     z.string().min(1, 'Company name is required').max(120),
  timezone: z.string().min(1, 'Timezone is required').max(60),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code').toUpperCase(),
});

export type TenantSettingsUpdate = z.infer<typeof TenantSettingsUpdateSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline stage rename
// ─────────────────────────────────────────────────────────────────────────────

export const StageRenameSchema = z.object({
  name: z.string().min(1, 'Stage name is required').max(100),
});

export type StageRename = z.infer<typeof StageRenameSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Team invite
// ─────────────────────────────────────────────────────────────────────────────

export const TeamInviteSchema = z.object({
  email:  z.string().email('Must be a valid email address'),
  roleId: z.string().uuid('Must be a valid role ID'),
});

export type TeamInvite = z.infer<typeof TeamInviteSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Role update
// ─────────────────────────────────────────────────────────────────────────────

export const TeamRoleUpdateSchema = z.object({
  roleId: z.string().uuid('Must be a valid role ID'),
});

export type TeamRoleUpdate = z.infer<typeof TeamRoleUpdateSchema>;
