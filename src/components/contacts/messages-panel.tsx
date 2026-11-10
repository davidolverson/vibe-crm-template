import { prisma } from '@/lib/prisma';
import { ArrowDownLeft, ArrowUpRight, MessageSquare, Mail } from 'lucide-react';

interface MessageBase {
  id: string;
  channel: 'sms' | 'email';
  direction: 'inbound' | 'outbound';
  body: string;
  subject?: string | null;
  status: string;
  createdAt: Date;
}

const SMS_STATUS_CLASS: Record<string, string> = {
  queued: 'text-zinc-400',
  sent: 'text-zinc-300',
  delivered: 'text-emerald-400',
  failed: 'text-red-400',
  undelivered: 'text-red-400',
};

const EMAIL_STATUS_CLASS: Record<string, string> = {
  sent: 'text-zinc-300',
  opened: 'text-sky-400',
  clicked: 'text-emerald-400',
  bounced: 'text-red-400',
  spam_complaint: 'text-red-400',
  failed: 'text-red-400',
};

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

async function loadMessages(tenantId: string, contactId: string): Promise<MessageBase[]> {
  const [sms, emails] = await Promise.all([
    prisma.smsMessage.findMany({
      where: { tenantId, contactId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        direction: true,
        body: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.emailSend.findMany({
      where: { tenantId, contactId },
      orderBy: { sentAt: 'desc' },
      take: 50,
      select: {
        id: true,
        toEmail: true,
        status: true,
        sentAt: true,
        templateId: true,
      },
    }),
  ]);

  // Email templates for subject line lookup
  const templateIds = emails.map((e) => e.templateId).filter((t): t is string => Boolean(t));
  const templates = templateIds.length
    ? await prisma.emailTemplate.findMany({
        where: { id: { in: templateIds } },
        select: { id: true, subject: true },
      })
    : [];
  const subjectByTemplate = new Map(templates.map((t) => [t.id, t.subject]));

  const smsMsgs: MessageBase[] = sms.map((s) => ({
    id: s.id,
    channel: 'sms',
    direction: s.direction as 'inbound' | 'outbound',
    body: s.body,
    status: s.status,
    createdAt: s.createdAt,
  }));

  const emailMsgs: MessageBase[] = emails.map((e) => {
    const subj = e.templateId ? subjectByTemplate.get(e.templateId) ?? null : null;
    const recipient = e.toEmail ? `To ${e.toEmail}` : 'Email sent';
    return {
      id: e.id,
      channel: 'email',
      direction: 'outbound',
      // Prefer a synthetic "To recipient" preview, since we don't store rendered
      // body text on EmailSend. Subject shows above in bold.
      body: recipient,
      subject: subj,
      status: e.status,
      createdAt: e.sentAt,
    };
  });

  return [...smsMsgs, ...emailMsgs]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 50);
}

export async function MessagesPanel({
  tenantId,
  contactId,
}: {
  tenantId: string;
  contactId: string;
}) {
  const messages = await loadMessages(tenantId, contactId);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Messages</h3>
        <span className="text-xs text-muted-foreground">
          {messages.length} message{messages.length === 1 ? '' : 's'}
        </span>
      </div>
      {messages.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
          No SMS or email activity yet.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {messages.map((m) => {
            const ChannelIcon = m.channel === 'sms' ? MessageSquare : Mail;
            const DirIcon = m.direction === 'inbound' ? ArrowDownLeft : ArrowUpRight;
            const statusClass =
              m.channel === 'sms'
                ? SMS_STATUS_CLASS[m.status] ?? 'text-zinc-400'
                : EMAIL_STATUS_CLASS[m.status] ?? 'text-zinc-400';

            return (
              <li key={`${m.channel}-${m.id}`} className="px-4 py-3">
                <div className="flex items-start gap-2.5">
                  <div
                    className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md ${
                      m.direction === 'inbound'
                        ? 'bg-sky-500/10 text-sky-400'
                        : 'bg-[#D4A017]/10 text-[#D4A017]'
                    }`}
                    aria-label={m.direction}
                  >
                    <DirIcon className="size-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs">
                      <ChannelIcon className="size-3 text-muted-foreground" />
                      <span className="font-medium text-foreground capitalize">
                        {m.channel === 'sms' ? 'SMS' : 'Email'}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="capitalize text-muted-foreground">
                        {m.direction}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className={`capitalize ${statusClass}`}>
                        {m.status.replace(/_/g, ' ')}
                      </span>
                      <span className="ml-auto text-muted-foreground">
                        {relativeTime(m.createdAt)}
                      </span>
                    </div>
                    {m.subject ? (
                      <p className="mt-1 text-sm font-medium text-foreground truncate">
                        {m.subject}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-sm text-muted-foreground whitespace-pre-wrap break-words line-clamp-4">
                      {m.body || '(no content)'}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
