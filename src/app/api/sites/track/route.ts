export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Truncate + one-way hash visitor IP before persistence. We keep a 10-char
 * prefix of SHA-256 which is enough to cluster same-visitor hits but not
 * reversible to the raw IP, keeping us GDPR-friendlier.
 */
function hashIp(ip: string): string {
  const salt = process.env.ENCRYPTION_KEY ?? 'vibe-tracker-salt';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 10);
}

const bodySchema = z.object({
  siteId: z.string().uuid(),
  pagePath: z.string().max(400),
  anonId: z.string().max(80).optional(),
  utm: z
    .object({
      source: z.string().max(80).nullable().optional(),
      medium: z.string().max(80).nullable().optional(),
      campaign: z.string().max(120).nullable().optional(),
      term: z.string().max(120).nullable().optional(),
      content: z.string().max(120).nullable().optional(),
    })
    .optional(),
  referrer: z.string().max(400).nullable().optional(),
  ts: z.number().optional(),
});

function getIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getIp(req);
  const rl = rateLimit(`sites-track:${ip}`, 120, 60_000);
  if (!rl.success) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  let parsed;
  try {
    const raw = await req.json();
    parsed = bodySchema.safeParse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  }

  const { siteId, pagePath, anonId, utm, referrer } = parsed.data;

  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { tenantId: true, status: true },
  });

  if (!site || site.status !== 'published') {
    return NextResponse.json({ ok: false, error: 'not_published' }, { status: 404 });
  }

  const userAgent = req.headers.get('user-agent')?.slice(0, 500) ?? null;
  const ipHash = ip ? hashIp(ip) : null;

  // Persist the full page-view row. Non-blocking from the tracker's POV --
  // we still return 204 even if the insert fails (logged + swallowed).
  try {
    await prisma.sitePageView.create({
      data: {
        tenantId: site.tenantId,
        siteId,
        pagePath: pagePath.slice(0, 400),
        anonId: anonId?.slice(0, 80) ?? null,
        referrer: referrer?.slice(0, 400) ?? null,
        utmSource: utm?.source ?? null,
        utmMedium: utm?.medium ?? null,
        utmCampaign: utm?.campaign ?? null,
        utmTerm: utm?.term ?? null,
        utmContent: utm?.content ?? null,
        userAgent,
        ip: ipHash,
      },
    });
  } catch (err) {
    console.warn('[sites:track] page-view insert failed', err);
  }

  // Keep the TrackingEvent side-write for tenant-level UTM rollups that older
  // dashboards depend on.
  if (utm && (utm.source || utm.medium || utm.campaign)) {
    try {
      await prisma.trackingEvent.create({
        data: {
          tenantId: site.tenantId,
          utmSource: utm.source ?? null,
          utmMedium: utm.medium ?? null,
          utmCampaign: utm.campaign ?? null,
        },
      });
    } catch (err) {
      console.warn('[sites:track] utm insert failed', err);
    }
  }

  return new NextResponse(null, { status: 204 });
}
