import { randomBytes, createHmac } from 'crypto';
import { prisma } from './prisma';
import { encrypt, decrypt } from './encryption';

// ─────────────────────────────────────────────────────────────────────────────
// QuickBooks Online API Client
// ─────────────────────────────────────────────────────────────────────────────

const QBO_BASE_URL = process.env.QBO_SANDBOX === 'true'
  ? 'https://sandbox-quickbooks.api.intuit.com'
  : 'https://quickbooks.api.intuit.com';

const QBO_AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2';
const QBO_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

/**
 * Resolve the OAuth callback URL. Prefer an explicit QBO_REDIRECT_URI (must match
 * exactly what's registered in the Intuit developer dashboard), but fall back to
 * deriving it from the app's base URL so prod never silently ships the localhost
 * default. The derived path must stay in sync with the callback route at
 * src/app/api/auth/quickbooks/callback.
 */
function resolveRedirectUri(): string | undefined {
  const explicit = process.env.QBO_REDIRECT_URI;
  if (explicit) return explicit;
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || process.env.APP_URL;
  if (!base) return undefined;
  return `${base.replace(/\/$/, '')}/api/auth/quickbooks/callback`;
}

function getClientCredentials() {
  const clientId = process.env.QBO_CLIENT_ID;
  const clientSecret = process.env.QBO_CLIENT_SECRET;
  const redirectUri = resolveRedirectUri();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('QuickBooks OAuth env vars not configured');
  }
  return { clientId, clientSecret, redirectUri };
}

// ─────────────────────────────────────────────────────────────────────────────
// OAuth helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a signed OAuth state parameter binding tenantId to a nonce.
 * Format: nonce:tenantId:hmac(nonce:tenantId)
 */
function signOAuthState(tenantId: string): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY required for QBO OAuth');
  const nonce = randomBytes(16).toString('hex');
  const payload = `${nonce}:${tenantId}`;
  const sig = createHmac('sha256', key).update(payload).digest('hex').slice(0, 16);
  return `${payload}:${sig}`;
}

/**
 * Verify and extract tenantId from a signed OAuth state parameter.
 * Returns null if invalid or tampered.
 */
export function verifyOAuthState(state: string): string | null {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) return null;
  const parts = state.split(':');
  if (parts.length !== 3) return null;
  const [nonce, tenantId, sig] = parts;
  const expected = createHmac('sha256', key).update(`${nonce}:${tenantId}`).digest('hex').slice(0, 16);
  if (sig !== expected) return null;
  return tenantId;
}

export function getQboAuthUrl(tenantId: string): string {
  const { clientId, redirectUri } = getClientCredentials();
  const state = signOAuthState(tenantId);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    state,
  });
  return `${QBO_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, realmId: string, tenantId: string) {
  const { clientId, clientSecret, redirectUri } = getClientCredentials();

  const resp = await fetch(QBO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`QBO token exchange failed: ${resp.status} ${text}`);
  }

  const data = await resp.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  await prisma.qboConnection.upsert({
    where: { tenantId },
    create: {
      tenantId,
      realmId,
      accessToken: encrypt(data.access_token),
      refreshToken: encrypt(data.refresh_token),
      tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
    update: {
      realmId,
      accessToken: encrypt(data.access_token),
      refreshToken: encrypt(data.refresh_token),
      tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      syncStatus: 'idle',
      lastError: null,
    },
  });
}

async function refreshAccessToken(tenantId: string): Promise<string> {
  const conn = await prisma.qboConnection.findUnique({ where: { tenantId } });
  if (!conn) throw new Error('No QBO connection found');

  // If token is still valid (with 5min buffer), return it
  if (conn.tokenExpiresAt > new Date(Date.now() + 5 * 60 * 1000)) {
    return decrypt(conn.accessToken);
  }

  const { clientId, clientSecret } = getClientCredentials();

  const resp = await fetch(QBO_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: decrypt(conn.refreshToken),
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    await prisma.qboConnection.update({
      where: { tenantId },
      data: { syncStatus: 'error', lastError: `Token refresh failed: ${resp.status}` },
    });
    throw new Error(`QBO refresh failed: ${resp.status} ${text}`);
  }

  const data = await resp.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  await prisma.qboConnection.update({
    where: { tenantId },
    data: {
      accessToken: encrypt(data.access_token),
      refreshToken: encrypt(data.refresh_token),
      tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    },
  });

  return data.access_token;
}

// ─────────────────────────────────────────────────────────────────────────────
// QBO API query
// ─────────────────────────────────────────────────────────────────────────────

interface QboQueryResponse<T> {
  QueryResponse: Record<string, T[]> & { maxResults?: number };
}

async function qboQuery<T>(
  tenantId: string,
  realmId: string,
  query: string,
): Promise<T[]> {
  const token = await refreshAccessToken(tenantId);
  const url = `${QBO_BASE_URL}/v3/company/${realmId}/query?query=${encodeURIComponent(query)}`;

  const resp = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`QBO query failed: ${resp.status} ${text}`);
  }

  const data = await resp.json() as QboQueryResponse<T>;
  // The key in QueryResponse matches the entity name
  const keys = Object.keys(data.QueryResponse).filter(k => k !== 'maxResults' && k !== 'startPosition');
  return keys.length > 0 ? (data.QueryResponse[keys[0]] as T[]) : [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync functions
// ─────────────────────────────────────────────────────────────────────────────

interface QboInvoice {
  Id: string;
  DocNumber: string;
  TxnDate: string;
  DueDate?: string;
  TotalAmt: number;
  Balance: number;
  CustomerRef: { value: string; name: string };
  MetaData: { LastUpdatedTime: string };
}

interface QboPayment {
  Id: string;
  TxnDate: string;
  TotalAmt: number;
  CustomerRef: { value: string; name: string };
  MetaData: { LastUpdatedTime: string };
}

export interface QboSyncResult {
  invoicesSynced: number;
  paymentsSynced: number;
  totalRevenue: number;
  errors: string[];
}

export async function syncQboData(tenantId: string): Promise<QboSyncResult> {
  const conn = await prisma.qboConnection.findUnique({ where: { tenantId } });
  if (!conn) throw new Error('No QBO connection');

  // Mark as syncing
  await prisma.qboConnection.update({
    where: { tenantId },
    data: { syncStatus: 'syncing' },
  });

  const log = await prisma.qboSyncLog.create({
    data: { tenantId, syncType: 'full' },
  });

  const result: QboSyncResult = { invoicesSynced: 0, paymentsSynced: 0, totalRevenue: 0, errors: [] };

  try {
    // Build incremental query if we have a last sync time.
    // QBO's SQL dialect rejects the millisecond portion in a timestamp literal,
    // so strip it: 2026-04-22T12:34:56.789Z -> 2026-04-22T12:34:56-00:00
    const since = conn.lastSyncAt
      ? ` WHERE MetaData.LastUpdatedTime > '${conn.lastSyncAt.toISOString().replace(/\.\d{3}Z$/, '-00:00')}'`
      : '';

    // Fetch invoices
    const invoices = await qboQuery<QboInvoice>(
      tenantId,
      conn.realmId,
      `SELECT * FROM Invoice${since} MAXRESULTS 1000`,
    );
    result.invoicesSynced = invoices.length;
    result.totalRevenue = invoices.reduce((sum, inv) => sum + (inv.TotalAmt - inv.Balance), 0);

    // Persist invoices
    for (const inv of invoices) {
      const balance = inv.Balance;
      const isPaid = balance === 0 && inv.TotalAmt > 0;
      const isOverdue = !isPaid && inv.DueDate && new Date(inv.DueDate) < new Date() && balance > 0;
      const status = isPaid ? 'paid' : isOverdue ? 'overdue' : 'open';

      await prisma.qboInvoice.upsert({
        where: {
          tenantId_qboId: { tenantId, qboId: inv.Id },
        },
        create: {
          tenantId,
          qboId: inv.Id,
          docNumber: inv.DocNumber || null,
          customerName: inv.CustomerRef.name,
          customerQboId: inv.CustomerRef.value,
          txnDate: new Date(inv.TxnDate),
          dueDate: inv.DueDate ? new Date(inv.DueDate) : null,
          totalAmt: String(inv.TotalAmt),
          balance: String(balance),
          status,
          lastSyncedAt: new Date(),
        },
        update: {
          docNumber: inv.DocNumber || null,
          customerName: inv.CustomerRef.name,
          customerQboId: inv.CustomerRef.value,
          txnDate: new Date(inv.TxnDate),
          dueDate: inv.DueDate ? new Date(inv.DueDate) : null,
          totalAmt: String(inv.TotalAmt),
          balance: String(balance),
          status,
          lastSyncedAt: new Date(),
        },
      });
    }

    // Fetch payments
    const payments = await qboPayments(tenantId, conn.realmId, since);
    result.paymentsSynced = payments.length;
    result.totalRevenue += payments.reduce((sum, pmt) => sum + pmt.TotalAmt, 0);

    // Persist payments
    for (const pmt of payments) {
      await prisma.qboPayment.upsert({
        where: {
          tenantId_qboId: { tenantId, qboId: pmt.Id },
        },
        create: {
          tenantId,
          qboId: pmt.Id,
          customerName: pmt.CustomerRef.name,
          customerQboId: pmt.CustomerRef.value,
          txnDate: new Date(pmt.TxnDate),
          totalAmt: String(pmt.TotalAmt),
          lastSyncedAt: new Date(),
        },
        update: {
          customerName: pmt.CustomerRef.name,
          customerQboId: pmt.CustomerRef.value,
          txnDate: new Date(pmt.TxnDate),
          totalAmt: String(pmt.TotalAmt),
          lastSyncedAt: new Date(),
        },
      });
    }

    // Update connection
    await prisma.qboConnection.update({
      where: { tenantId },
      data: {
        lastSyncAt: new Date(),
        syncStatus: 'idle',
        lastError: null,
      },
    });

    // Complete log
    await prisma.qboSyncLog.update({
      where: { id: log.id },
      data: {
        status: 'completed',
        recordsSynced: result.invoicesSynced + result.paymentsSynced,
        completedAt: new Date(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    result.errors.push(message);

    await prisma.qboConnection.update({
      where: { tenantId },
      data: { syncStatus: 'error', lastError: message },
    });

    await prisma.qboSyncLog.update({
      where: { id: log.id },
      data: { status: 'error', errorMessage: message, completedAt: new Date() },
    });
  }

  return result;
}

async function qboPayments(tenantId: string, realmId: string, since: string): Promise<QboPayment[]> {
  return qboQuery<QboPayment>(tenantId, realmId, `SELECT * FROM Payment${since} MAXRESULTS 1000`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary query (for CFO dashboard)
// ─────────────────────────────────────────────────────────────────────────────

export interface QboRevenueSummary {
  connected: boolean;
  lastSyncAt: string | null;
  syncStatus: string;
  realmId: string | null;
}

export type QboPeriod = 'mtd' | 'qtd' | 'ytd' | 'all';

export const QBO_PERIOD_LABELS: Record<QboPeriod, string> = {
  mtd: 'Month to date',
  qtd: 'Quarter to date',
  ytd: 'Year to date',
  all: 'All time',
};

export function qboPeriodStart(period: QboPeriod, now = new Date()): Date | null {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  switch (period) {
    case 'mtd':
      return new Date(d.getFullYear(), d.getMonth(), 1);
    case 'qtd': {
      const qMonth = Math.floor(d.getMonth() / 3) * 3;
      return new Date(d.getFullYear(), qMonth, 1);
    }
    case 'ytd':
      return new Date(d.getFullYear(), 0, 1);
    case 'all':
      return null;
  }
}

export interface QboFinancials {
  connected: boolean;
  period: QboPeriod;
  periodLabel: string;
  periodStart: string | null;
  entityId: string | null;
  totalQboRevenue: number;
  outstandingAR: number;
  overdueInvoices: number;
  recentPayments: {
    id: string;
    customerName: string;
    txnDate: string;
    totalAmt: number;
  }[];
  lastSyncAt: string | null;
  syncStatus: string;
}

export async function getQboFinancials(
  tenantId: string,
  period: QboPeriod = 'ytd',
  entityId?: string | null
): Promise<QboFinancials> {
  const conn = await prisma.qboConnection.findUnique({
    where: { tenantId },
    select: { lastSyncAt: true, syncStatus: true },
  });

  const periodStart = qboPeriodStart(period);
  const periodLabel = QBO_PERIOD_LABELS[period];

  if (!conn) {
    return {
      connected: false,
      period,
      periodLabel,
      periodStart: periodStart?.toISOString() ?? null,
      entityId: entityId ?? null,
      totalQboRevenue: 0,
      outstandingAR: 0,
      overdueInvoices: 0,
      recentPayments: [],
      lastSyncAt: null,
      syncStatus: 'disconnected',
    };
  }

  const periodInvoiceFilter = periodStart ? { txnDate: { gte: periodStart } } : {};
  const periodPaymentFilter = periodStart ? { txnDate: { gte: periodStart } } : {};
  // Only add the entity constraint if a caller opted in. Passing null = "all entities".
  const entityFilter = entityId ? { entityId } : {};

  const [paidInvoices, openInvoices, overdueCount, recentPayments] = await Promise.all([
    prisma.qboInvoice.aggregate({
      where: { tenantId, status: 'paid', ...periodInvoiceFilter, ...entityFilter },
      _sum: { totalAmt: true },
    }),
    prisma.qboInvoice.aggregate({
      where: { tenantId, status: { in: ['open', 'overdue'] }, ...entityFilter },
      _sum: { balance: true },
    }),
    prisma.qboInvoice.count({
      where: {
        tenantId,
        dueDate: { lt: new Date() },
        balance: { gt: 0 },
        ...entityFilter,
      },
    }),
    prisma.qboPayment.findMany({
      where: { tenantId, ...periodPaymentFilter, ...entityFilter },
      orderBy: { txnDate: 'desc' },
      take: 10,
      select: {
        id: true,
        customerName: true,
        txnDate: true,
        totalAmt: true,
      },
    }),
  ]);

  return {
    connected: true,
    period,
    periodLabel,
    periodStart: periodStart?.toISOString() ?? null,
    entityId: entityId ?? null,
    totalQboRevenue: Number(paidInvoices._sum.totalAmt ?? 0),
    outstandingAR: Number(openInvoices._sum.balance ?? 0),
    overdueInvoices: overdueCount,
    recentPayments: recentPayments.map(p => ({
      id: p.id,
      customerName: p.customerName,
      txnDate: p.txnDate.toISOString(),
      totalAmt: Number(p.totalAmt),
    })),
    lastSyncAt: conn.lastSyncAt?.toISOString() ?? null,
    syncStatus: conn.syncStatus,
  };
}

export async function getQboStatus(tenantId: string): Promise<QboRevenueSummary> {
  const conn = await prisma.qboConnection.findUnique({
    where: { tenantId },
    select: { lastSyncAt: true, syncStatus: true, realmId: true },
  });

  return {
    connected: !!conn,
    lastSyncAt: conn?.lastSyncAt?.toISOString() ?? null,
    syncStatus: conn?.syncStatus ?? 'disconnected',
    realmId: conn?.realmId ?? null,
  };
}
