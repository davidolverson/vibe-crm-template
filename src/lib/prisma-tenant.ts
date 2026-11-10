import { prisma } from './prisma';
import { getTenantContext } from './tenant-context';

// Explicit type for $allModels query callback params
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryArgs = any;
type QueryParams = {
  model: string;
  args: QueryArgs;
  query: (args: QueryArgs) => Promise<QueryArgs>;
};

// Models that require tenant_id scoping
const TENANT_SCOPED_MODELS = [
  'tenantUser',
  'role',
  // Note: 'permission' is scoped via role (FK cascade), no tenantId column
  'contact',
  'contactIdentity',
  'contactTag',
  'activity',
  'task',
  'pipeline',
  'pipelineStage',
  'deal',
  'dealActivity',
  'dealParticipant',
  'form',
  'formField',
  'formSubmission',
  'trackingEvent',
  'assignmentRule',
  'notification',
  'auditLog',
  'emailTemplate',
  'smsMessage',
  'callLog',
  'sequence',
  // Note: 'sequenceStep' is scoped via sequence (FK cascade), no tenantId column
  'sequenceEnrollment',
  'automation',
  // Note: 'automationLog' is scoped via automation (FK cascade), no tenantId column
  'tenantPhoneNumber',
  'tenantTwilioConfig',
  'emailSend',
  'usageCounter',
  'site',
  'sitePage',
  'businessEntity',
  'qboConnection',
  'qboSyncLog',
  'jvAgreement',
  'jvPartner',
  'jvDistribution',
  'socialAccount',
  'socialPost',
  'socialLeadWebhook',
  'pushToken',
  'lead',
  'leadActivity',
] as const;

/**
 * Returns a Prisma client that automatically scopes all queries
 * to the current tenant via AsyncLocalStorage context.
 *
 * Usage:
 *   const db = getTenantDb();
 *   const contacts = await db.contact.findMany(); // auto-filtered by tenant_id
 */
export function getTenantDb() {
  const ctx = getTenantContext();
  const { tenantId } = ctx;

  return prisma.$extends({
    query: {
      $allModels: {
        async findMany(params: QueryParams) {
          const { model, args, query } = params;
          if (isModelTenantScoped(model)) {
            args.where = { ...args.where as object, tenantId };
          }
          return query(args);
        },
        async findFirst(params: QueryParams) {
          const { model, args, query } = params;
          if (isModelTenantScoped(model)) {
            args.where = { ...args.where as object, tenantId };
          }
          return query(args);
        },
        async findUnique(params: QueryParams) {
          const { model, args, query } = params;
          const result = await query(args) as Record<string, unknown> | null;
          if (result && isModelTenantScoped(model) && result.tenantId !== tenantId) {
            return null; // Cross-tenant access blocked
          }
          return result;
        },
        async create(params: QueryParams) {
          const { model, args, query } = params;
          if (isModelTenantScoped(model)) {
            (args.data as Record<string, unknown>).tenantId = tenantId;
          }
          return query(args);
        },
        async createMany(params: QueryParams) {
          const { model, args, query } = params;
          if (isModelTenantScoped(model)) {
            if (Array.isArray(args.data)) {
              args.data = args.data.map((d: Record<string, unknown>) => ({ ...d, tenantId }));
            } else {
              (args.data as Record<string, unknown>).tenantId = tenantId;
            }
          }
          return query(args);
        },
        async update(params: QueryParams) {
          const { model, args, query } = params;
          if (isModelTenantScoped(model)) {
            args.where = { ...args.where as object, tenantId };
          }
          return query(args);
        },
        async updateMany(params: QueryParams) {
          const { model, args, query } = params;
          if (isModelTenantScoped(model)) {
            args.where = { ...args.where as object, tenantId };
          }
          return query(args);
        },
        async delete(params: QueryParams) {
          const { model, args, query } = params;
          if (isModelTenantScoped(model)) {
            args.where = { ...args.where as object, tenantId };
          }
          return query(args);
        },
        async deleteMany(params: QueryParams) {
          const { model, args, query } = params;
          if (isModelTenantScoped(model)) {
            args.where = { ...args.where as object, tenantId };
          }
          return query(args);
        },
        async count(params: QueryParams) {
          const { model, args, query } = params;
          if (isModelTenantScoped(model)) {
            args.where = { ...args.where as object, tenantId };
          }
          return query(args);
        },
        async aggregate(params: QueryParams) {
          const { model, args, query } = params;
          if (isModelTenantScoped(model)) {
            args.where = { ...args.where as object, tenantId };
          }
          return query(args);
        },
        async groupBy(params: QueryParams) {
          const { model, args, query } = params;
          if (isModelTenantScoped(model)) {
            args.where = { ...args.where as object, tenantId };
          }
          return query(args);
        },
        async upsert(params: QueryParams) {
          const { model, args, query } = params;
          if (isModelTenantScoped(model)) {
            args.where = { ...args.where as object, tenantId };
            (args.create as Record<string, unknown>).tenantId = tenantId;
          }
          return query(args);
        },
      },
    },
  });
}

function isModelTenantScoped(model: string): boolean {
  // Convert PascalCase model name to camelCase for comparison
  const camelCase = model.charAt(0).toLowerCase() + model.slice(1);
  return TENANT_SCOPED_MODELS.includes(
    camelCase as (typeof TENANT_SCOPED_MODELS)[number]
  );
}
