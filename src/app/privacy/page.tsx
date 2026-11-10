import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalShell } from '@/components/landing/legal-shell';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How VIBE (operated by Your Company) collects, uses, and protects data for users of example.com and the VIBE platform.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <LegalShell
      eyebrow="Privacy Policy"
      title="Your data. Our rules."
      lastUpdated="April 19, 2026"
    >
      <p>
        This Privacy Policy explains how <strong>VIBE</strong> (a product of
        Your Company, LLC, a [Your State] limited liability company) collects,
        uses, discloses, and safeguards information when you visit
        example.com (the &ldquo;Site&rdquo;), join the waitlist, submit the
        contact form, or use the VIBE platform (the &ldquo;Service&rdquo;).
        By using the Site or Service you agree to this Policy.
      </p>

      <h2>1. What we collect</h2>
      <p>
        We collect only what is necessary to operate VIBE, respond to you, and
        protect the Service from abuse.
      </p>
      <h3>Information you provide</h3>
      <ul>
        <li>
          <strong>Marketing forms:</strong> email address, optional name, the
          context of your submission (waitlist vs. contact), and the content
          of any message you send us.
        </li>
        <li>
          <strong>Account data:</strong> name, email, hashed password (never
          stored in plaintext), organization name, role, and any profile
          fields you add.
        </li>
        <li>
          <strong>CRM data you upload:</strong> contacts, deals, pipelines,
          tasks, emails, SMS logs, call recordings, uploaded files. This is
          your data -- we process it on your behalf under the Service
          agreement.
        </li>
      </ul>
      <h3>Information we collect automatically</h3>
      <ul>
        <li>
          <strong>Technical logs:</strong> IP address, user-agent, request
          timestamp, and referring URL. Used for rate limiting, security
          forensics, and debugging. Logs are retained for up to 30 days.
        </li>
        <li>
          <strong>Session cookies:</strong> strictly necessary cookies for
          authentication (Better Auth). We do not set third-party advertising
          cookies.
        </li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>Operate, maintain, and secure the Site and Service.</li>
        <li>
          Respond to your waitlist or contact form submission -- typically with
          one reply from a human on our team within one business day.
        </li>
        <li>
          Send transactional emails related to your account (password resets,
          billing receipts, security alerts).
        </li>
        <li>
          Send launch updates and founding-member access emails if you joined
          the waitlist. You can unsubscribe at any time.
        </li>
        <li>
          Detect and prevent fraud, abuse, spam, and unauthorized access.
        </li>
      </ul>

      <h2>3. Processors we rely on</h2>
      <p>
        We use a small set of reputable sub-processors. Each has their own
        privacy commitments and is bound by data-processing terms with us.
      </p>
      <ul>
        <li>
          <strong>Neon</strong> -- managed PostgreSQL (US East region) hosts
          your account data, CRM records, and marketing-form submissions.
        </li>
        <li>
          <strong>Vercel</strong> -- application hosting, edge middleware, and
          request logs.
        </li>
        <li>
          <strong>Resend</strong> (primary) and <strong>Postmark</strong>{' '}
          (fallback) -- transactional email delivery.
        </li>
        <li>
          <strong>Stripe</strong> -- subscription billing and payment
          processing. We never receive full card numbers.
        </li>
        <li>
          <strong>Twilio</strong> -- optional SMS and voice features for paid
          tenants.
        </li>
        <li>
          <strong>Intuit / QuickBooks Online</strong> -- optional financial
          sync for paid tenants who enable the integration.
        </li>
      </ul>

      <h2>4. Multi-tenant isolation</h2>
      <p>
        VIBE is multi-tenant by design. Every table in our database carries a{' '}
        <code>tenant_id</code> that is enforced at the ORM layer (Prisma
        middleware) and in our application code. Your CRM data is never
        exposed to another tenant. Platform-level admins at Your Company
        can access metadata (sign-up timestamps, billing status, audit logs)
        for support and abuse investigations, but do not browse tenant CRM
        contents absent a support ticket or legal process.
      </p>

      <h2>5. How long we keep data</h2>
      <ul>
        <li>
          <strong>Marketing-form submissions:</strong> retained until you ask
          us to delete them or indefinitely if you become a customer.
        </li>
        <li>
          <strong>Account + CRM data:</strong> retained while your account is
          active and for up to 30 days after account deletion, after which
          it&rsquo;s permanently erased.
        </li>
        <li>
          <strong>Request logs:</strong> 30 days.
        </li>
        <li>
          <strong>Billing records:</strong> up to 7 years to comply with tax
          and accounting obligations.
        </li>
      </ul>

      <h2>6. Your rights</h2>
      <p>
        Depending on where you live, you may have rights under GDPR (EU/UK),
        CCPA/CPRA (California), or similar state laws (Virginia, Colorado,
        Connecticut, Utah, etc.).
      </p>
      <ul>
        <li>Access the data we hold about you.</li>
        <li>Correct inaccurate data.</li>
        <li>Delete your data (right to erasure).</li>
        <li>Export your data in a portable format.</li>
        <li>
          Opt out of marketing emails (every marketing email includes an
          unsubscribe link).
        </li>
        <li>Object to or restrict certain processing.</li>
      </ul>
      <p>
        To exercise any of these rights, reach out via the{' '}
        <Link href="/contact">contact form</Link> and we&rsquo;ll respond
        within 30 days.
      </p>

      <h2>7. Security</h2>
      <p>
        We use TLS for all traffic, hashed-and-salted passwords, CSRF
        protection on mutating routes, per-IP rate limits, encrypted
        integration tokens, and principle-of-least-privilege access to
        production systems. No system is perfectly secure -- if you discover a
        vulnerability, please email us responsibly before public disclosure.
      </p>

      <h2>8. Children</h2>
      <p>
        VIBE is a business tool and is not directed at children under 13. We
        do not knowingly collect information from children. If you believe we
        have, contact us and we will delete it.
      </p>

      <h2>9. Changes to this policy</h2>
      <p>
        We may update this Policy from time to time. Material changes will be
        announced via email to account holders and posted here with a new
        &ldquo;last updated&rdquo; date.
      </p>

      <h2>10. Contact</h2>
      <p>
        Your Company, LLC -- [Your State], USA.{' '}
        <Link href="/contact">Send us a message.</Link>
      </p>
    </LegalShell>
  );
}
