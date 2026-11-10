import { randomBytes, createHash } from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const SESSION_COOKIE = 'vibe_partner_session';
const SESSION_DAYS = 7;
const TOKEN_EXPIRY_MINUTES = 15;

// ─────────────────────────────────────────────────────────────────────────────
// Token generation (for magic links)
// ─────────────────────────────────────────────────────────────────────────────

export function generateMagicToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

// ─────────────────────────────────────────────────────────────────────────────
// Magic link: request + verify
// ─────────────────────────────────────────────────────────────────────────────

export async function createMagicLink(email: string): Promise<{ partnerId: string; token: string } | null> {
  // Find partner by email (could be in multiple agreements)
  const partner = await prisma.jvPartner.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
  });
  if (!partner) return null;

  const { raw, hash } = generateMagicToken();

  await prisma.jvPartner.update({
    where: { id: partner.id },
    data: {
      tokenHash: hash,
      tokenExpiresAt: new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000),
    },
  });

  return { partnerId: partner.id, token: raw };
}

export async function verifyMagicToken(token: string): Promise<string | null> {
  const hash = hashToken(token);

  const partner = await prisma.jvPartner.findFirst({
    where: {
      tokenHash: hash,
      tokenExpiresAt: { gt: new Date() },
    },
  });

  if (!partner) return null;

  // Clear the token (one-time use)
  await prisma.jvPartner.update({
    where: { id: partner.id },
    data: { tokenHash: null, tokenExpiresAt: null, lastLoginAt: new Date() },
  });

  // Create a session (store hash, send raw token in cookie)
  const sessionToken = randomBytes(32).toString('hex');
  const sessionHash = createHash('sha256').update(sessionToken).digest('hex');
  await prisma.partnerSession.create({
    data: {
      partnerId: partner.id,
      token: sessionHash,
      expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  // Set cookie
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: '/',
  });

  return partner.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Session management
// ─────────────────────────────────────────────────────────────────────────────

export interface PartnerSessionData {
  partnerId: string;
  tenantId: string;
  name: string;
  email: string;
  agreementId: string;
  agreementName: string;
}

export async function getPartnerSession(): Promise<PartnerSessionData | null> {
  const jar = await cookies();
  const rawToken = jar.get(SESSION_COOKIE)?.value;
  if (!rawToken) return null;

  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const session = await prisma.partnerSession.findUnique({
    where: { token: tokenHash },
    include: {
      partner: {
        include: {
          agreement: { select: { name: true } },
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    // Expired -- clean up
    if (session) {
      await prisma.partnerSession.delete({ where: { id: session.id } });
    }
    return null;
  }

  return {
    partnerId: session.partner.id,
    tenantId: session.partner.tenantId,
    name: session.partner.name,
    email: session.partner.email ?? '',
    agreementId: session.partner.agreementId,
    agreementName: session.partner.agreement.name,
  };
}

export async function clearPartnerSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  if (token) {
    const hash = createHash('sha256').update(token).digest('hex');
    await prisma.partnerSession.deleteMany({ where: { token: hash } });
    jar.delete(SESSION_COOKIE);
  }
}
