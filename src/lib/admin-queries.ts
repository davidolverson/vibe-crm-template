import { neon } from '@neondatabase/serverless';

/**
 * Lazy-init a neon SQL client per call. DATABASE_URL may be empty at build
 * time; we fail fast at call time instead of at module evaluation. We also
 * strip the `channel_binding=require` flag which breaks the neon HTTP driver.
 */
function sql() {
  const raw = process.env.DATABASE_URL || '';
  if (!raw) {
    throw new Error('DATABASE_URL is not set');
  }
  const connectionString = raw.replace(/[&?]channel_binding=require/g, '');
  return neon(connectionString);
}

function logError(err: unknown) {
  console.error('[admin-queries]', err);
}

// ---------- Signup Stats ----------

export type SignupStats = {
  total: number;
  last7d: number;
  last30d: number;
  daily: Array<{ date: string; count: number }>;
};

export async function getSignupStats(): Promise<SignupStats> {
  const empty: SignupStats = { total: 0, last7d: 0, last30d: 0, daily: [] };
  try {
    const s = sql();
    const totalRows = (await s.query(
      `select count(*)::int as c from "users"`
    )) as Array<{ c: number }>;
    const last7Rows = (await s.query(
      `select count(*)::int as c from "users" where "created_at" > now() - interval '7 days'`
    )) as Array<{ c: number }>;
    const last30Rows = (await s.query(
      `select count(*)::int as c from "users" where "created_at" > now() - interval '30 days'`
    )) as Array<{ c: number }>;
    const dailyRows = (await s.query(
      `select to_char(date_trunc('day', "created_at"), 'YYYY-MM-DD') as date, count(*)::int as count
       from "users"
       where "created_at" > now() - interval '30 days'
       group by 1
       order by 1 asc`
    )) as Array<{ date: string; count: number }>;

    // Zero-fill the last 30 days
    const byDate = new Map<string, number>();
    for (const r of dailyRows) byDate.set(r.date, r.count);
    const daily: Array<{ date: string; count: number }> = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setUTCDate(today.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      daily.push({ date: key, count: byDate.get(key) ?? 0 });
    }

    return {
      total: totalRows[0]?.c ?? 0,
      last7d: last7Rows[0]?.c ?? 0,
      last30d: last30Rows[0]?.c ?? 0,
      daily,
    };
  } catch (err) {
    logError(err);
    return empty;
  }
}

// ---------- Tenant Stats ----------

export type TenantStats = {
  total: number;
  byPlan: Array<{ plan: string; count: number }>;
  bySubscriptionStatus: Array<{ status: string; count: number }>;
  recent: Array<{ id: string; name: string; plan: string; createdAt: string }>;
};

export async function getTenantStats(): Promise<TenantStats> {
  const empty: TenantStats = {
    total: 0,
    byPlan: [],
    bySubscriptionStatus: [],
    recent: [],
  };
  try {
    const s = sql();
    const totalRows = (await s.query(
      `select count(*)::int as c from "tenants"`
    )) as Array<{ c: number }>;

    let byPlan: Array<{ plan: string; count: number }> = [];
    try {
      const rows = (await s.query(
        `select coalesce(plan, 'unknown') as plan, count(*)::int as count
         from "tenants" group by 1 order by count desc`
      )) as Array<{ plan: string; count: number }>;
      byPlan = rows;
    } catch (err) {
      logError(err);
    }

    let bySubscriptionStatus: Array<{ status: string; count: number }> = [];
    try {
      const rows = (await s.query(
        `select coalesce(subscription_status, 'unknown') as status, count(*)::int as count
         from "tenants" group by 1 order by count desc`
      )) as Array<{ status: string; count: number }>;
      bySubscriptionStatus = rows;
    } catch (err) {
      logError(err);
    }

    let recent: Array<{ id: string; name: string; plan: string; createdAt: string }> = [];
    try {
      const rows = (await s.query(
        `select id, name, coalesce(plan, 'unknown') as plan,
                to_char("created_at", 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt"
         from "tenants" order by "created_at" desc limit 10`
      )) as Array<{ id: string; name: string; plan: string; createdAt: string }>;
      recent = rows;
    } catch (err) {
      logError(err);
    }

    return {
      total: totalRows[0]?.c ?? 0,
      byPlan,
      bySubscriptionStatus,
      recent,
    };
  } catch (err) {
    logError(err);
    return empty;
  }
}

// ---------- Activity Stats ----------

export type ActivityStats = {
  dau: number;
  wau: number;
  recentAudit: Array<{
    id: string;
    action: string;
    entity: string;
    userId: string | null;
    tenantId: string | null;
    createdAt: string;
  }>;
};

export async function getActivityStats(): Promise<ActivityStats> {
  const empty: ActivityStats = { dau: 0, wau: 0, recentAudit: [] };
  try {
    const s = sql();

    let dau = 0;
    try {
      const rows = (await s.query(
        `select count(distinct "user_id")::int as c from "sessions"
         where "created_at" > now() - interval '24 hours'`
      )) as Array<{ c: number }>;
      dau = rows[0]?.c ?? 0;
    } catch (err) {
      logError(err);
    }

    let wau = 0;
    try {
      const rows = (await s.query(
        `select count(distinct "user_id")::int as c from "sessions"
         where "created_at" > now() - interval '7 days'`
      )) as Array<{ c: number }>;
      wau = rows[0]?.c ?? 0;
    } catch (err) {
      logError(err);
    }

    let recentAudit: ActivityStats['recentAudit'] = [];
    try {
      const rows = (await s.query(
        `select id, action, entity,
                "user_id" as "userId",
                "tenant_id" as "tenantId",
                to_char("created_at", 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt"
         from "audit_logs"
         order by "created_at" desc
         limit 25`
      )) as Array<{
        id: string;
        action: string;
        entity: string;
        userId: string | null;
        tenantId: string | null;
        createdAt: string;
      }>;
      recentAudit = rows;
    } catch (err) {
      logError(err);
    }

    return { dau, wau, recentAudit };
  } catch (err) {
    logError(err);
    return empty;
  }
}

// ---------- Health Stats ----------

export type HealthStats = {
  failedLoginsLast24h: number;
  webhookFailuresLast24h: number;
  dbLatencyMs: number;
};

export async function getHealthStats(): Promise<HealthStats> {
  const empty: HealthStats = {
    failedLoginsLast24h: 0,
    webhookFailuresLast24h: 0,
    dbLatencyMs: 0,
  };
  try {
    const s = sql();

    let failedLoginsLast24h = 0;
    try {
      const rows = (await s.query(
        `select count(*)::int as c from "audit_logs"
         where "created_at" > now() - interval '24 hours'
           and (action ilike '%failed_login%' or action ilike '%login_failed%' or action ilike '%auth.failed%')`
      )) as Array<{ c: number }>;
      failedLoginsLast24h = rows[0]?.c ?? 0;
    } catch (err) {
      logError(err);
    }

    let webhookFailuresLast24h = 0;
    try {
      const rows = (await s.query(
        `select count(*)::int as c from "webhook_events"
         where "created_at" > now() - interval '24 hours'
           and status is not null
           and status not in ('success', 'processed')`
      )) as Array<{ c: number }>;
      webhookFailuresLast24h = rows[0]?.c ?? 0;
    } catch (err) {
      logError(err);
    }

    let dbLatencyMs = 0;
    try {
      const start = performance.now();
      await s.query(`select 1 as ok`);
      dbLatencyMs = Math.round(performance.now() - start);
    } catch (err) {
      logError(err);
    }

    return { failedLoginsLast24h, webhookFailuresLast24h, dbLatencyMs };
  } catch (err) {
    logError(err);
    return empty;
  }
}

// ---------- Recent Signups ----------

export type RecentSignup = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  hasOrg: boolean;
};

export async function getRecentSignups(limit = 20): Promise<RecentSignup[]> {
  try {
    const s = sql();
    const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 200));
    const rows = (await s.query(
      `select u.id, u.email, u.name,
              to_char(u."created_at", 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as "createdAt",
              (count(m.id) > 0) as "hasOrg"
       from "users" u
       left join "members" m on m."user_id" = u.id
       group by u.id, u.email, u.name, u."created_at"
       order by u."created_at" desc
       limit $1`,
      [safeLimit]
    )) as Array<RecentSignup>;
    return rows;
  } catch (err) {
    logError(err);
    return [];
  }
}
