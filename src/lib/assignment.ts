'use server';

import { prisma } from './prisma';
import { AssignmentRuleType } from '@/generated/prisma/enums';
import type { RoundRobinConfig, DefaultOwnerConfig } from './validations/assignment-rule';

// ─────────────────────────────────────────────────────────────────────────────
// assignContact
//
// Evaluates the active assignment rules for a tenant and returns the userId
// who should own the new contact/lead.
//
// Priority: round_robin (if active) > default_owner (if active) > null
// ─────────────────────────────────────────────────────────────────────────────

export async function assignContact(
  tenantId: string
): Promise<string | null> {
  // Fetch all assignment rules for this tenant (max 2: one per type)
  const rules = await prisma.assignmentRule.findMany({
    where: { tenantId },
    orderBy: { type: 'asc' }, // default_owner < round_robin alphabetically
  });

  // Try round-robin first
  const roundRobinRule = rules.find(
    (r) => r.type === AssignmentRuleType.round_robin
  );

  if (roundRobinRule) {
    const config = roundRobinRule.configJson as unknown as RoundRobinConfig;

    if (config.active && config.userIds.length > 0) {
      const nextIndex =
        (roundRobinRule.lastAssignedIndex + 1) % config.userIds.length;
      const assignedUserId = config.userIds[nextIndex];

      // Atomically update the index to prevent race conditions
      await prisma.assignmentRule.update({
        where: { id: roundRobinRule.id },
        data: { lastAssignedIndex: nextIndex },
      });

      return assignedUserId;
    }
  }

  // Fall back to default owner
  const defaultOwnerRule = rules.find(
    (r) => r.type === AssignmentRuleType.default_owner
  );

  if (defaultOwnerRule) {
    const config = defaultOwnerRule.configJson as unknown as DefaultOwnerConfig;

    if (config.active && config.userId) {
      return config.userId;
    }
  }

  // No active rules -- no assignment
  return null;
}
