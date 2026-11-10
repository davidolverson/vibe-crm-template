import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalShell } from '@/components/landing/legal-shell';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Terms governing use of VIBE and example.com, operated by Your Company.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <LegalShell
      eyebrow="Terms of Service"
      title="The rules of the road."
      lastUpdated="April 19, 2026"
    >
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of VIBE
        (the &ldquo;Service&rdquo;) and example.com (the
        &ldquo;Site&rdquo;), both operated by <strong>Your Company, LLC</strong>,
        a [Your State] limited liability company. By accessing or using the Site
        or Service you agree to these Terms and our{' '}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>1. Who can use VIBE</h2>
      <p>
        You must be at least 18 years old and able to form a binding contract.
        You represent that the organization you connect the Service to is one
        you&rsquo;re authorized to bind. You are responsible for keeping your
        login credentials confidential and for all activity under your
        account.
      </p>

      <h2>2. Founding-member access</h2>
      <p>
        The Service is live and currently in its Founding 50 period.
        Founding-member access and any early-access offers are made in the
        company&rsquo;s sole discretion. Pricing, feature scope, and
        availability may change as the product evolves.
      </p>

      <h2>3. Plans, billing, and trials</h2>
      <ul>
        <li>
          Founding-member plan pricing is locked in per the offer you accept
          at sign-up. Non-founding plans are billed at then-current list
          pricing.
        </li>
        <li>
          Billing is processed by Stripe. You authorize recurring charges on
          the card or payment method on file until you cancel.
        </li>
        <li>
          Free trials convert to paid plans at the end of the trial unless
          cancelled. You can cancel any time in Settings → Billing.
        </li>
        <li>
          Refunds are generally not provided for partial months. If you feel
          a refund is warranted, contact us.
        </li>
      </ul>

      <h2>4. Your content</h2>
      <p>
        You own the CRM data you upload, import, or generate on the Service
        (&ldquo;Your Content&rdquo;). You grant us a limited license to host,
        process, display, and transmit Your Content only to the extent
        necessary to operate the Service on your behalf. We do not sell Your
        Content, use it to train AI models, or share it with third parties
        except the sub-processors listed in our{' '}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>5. Acceptable use</h2>
      <p>You agree not to use the Service to:</p>
      <ul>
        <li>
          Send spam, unsolicited bulk email, or messages that violate CAN-SPAM,
          TCPA, or A2P 10DLC rules.
        </li>
        <li>
          Store, process, or transmit content that is illegal, infringing,
          fraudulent, harassing, or threatens violence.
        </li>
        <li>
          Reverse-engineer, scrape, or probe the Service for vulnerabilities
          without prior written consent (responsible disclosure is welcome).
        </li>
        <li>
          Resell, sublicense, or make the Service available to third parties
          as a hosted service without our written consent.
        </li>
        <li>
          Exceed rate limits, usage caps, or plan entitlements through
          circumvention.
        </li>
      </ul>
      <p>
        We may suspend or terminate accounts that violate these rules,
        typically with notice when feasible and always when required by law.
      </p>

      <h2>6. Third-party integrations</h2>
      <p>
        The Service optionally integrates with Twilio, QuickBooks Online,
        Stripe, and other providers. Your use of those services is governed
        by their own terms. You authorize us to transmit Your Content to
        those providers at your direction.
      </p>

      <h2>7. Intellectual property</h2>
      <p>
        All rights in the Service, the Site, and the VIBE brand (including
        the wordmark, the acronym expansion &ldquo;Vertical Integration
        Business Enterprise,&rdquo; logos, UI, and documentation) are owned
        by Your Company, LLC and its licensors. No rights are granted
        except those expressly set forth in these Terms.
      </p>

      <h2>8. Disclaimer</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo;. We disclaim all warranties to the fullest extent
        permitted by law, including fitness for a particular purpose,
        non-infringement, and merchantability. We do not warrant that the
        Service will be uninterrupted, error-free, or free of bugs. You are
        responsible for maintaining your own backups of Your Content.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Your Company&rsquo;s
        aggregate liability for any claim arising out of or related to these
        Terms or the Service is limited to the greater of (a) the amount you
        paid us in the twelve (12) months preceding the claim, or (b) $100.
        In no event will we be liable for indirect, incidental,
        consequential, special, exemplary, or punitive damages, including
        lost profits, revenue, data, or goodwill, even if advised of the
        possibility.
      </p>

      <h2>10. Termination</h2>
      <p>
        You can cancel at any time. We may suspend or terminate your access
        for breach of these Terms. Upon termination, your right to use the
        Service ends. You can export Your Content in a portable format for
        up to 30 days after termination, after which we permanently erase it.
      </p>

      <h2>11. Governing law &amp; disputes</h2>
      <p>
        These Terms are governed by the laws of the State of [Your State],
        United States, without regard to conflict-of-laws principles. Any
        dispute that cannot be resolved informally will be resolved through
        binding arbitration in [Your State] under the rules of the American
        Arbitration Association, except that either party may seek injunctive
        relief in court for intellectual-property or confidentiality matters.
        Class actions and class arbitrations are waived.
      </p>

      <h2>12. Changes</h2>
      <p>
        We may update these Terms from time to time. Material changes will be
        announced by email to account holders and posted here with a new
        &ldquo;last updated&rdquo; date. Continued use after changes
        constitutes acceptance.
      </p>

      <h2>13. Contact</h2>
      <p>
        Your Company, LLC -- [Your State], USA.{' '}
        <Link href="/contact">Send us a message.</Link>
      </p>
    </LegalShell>
  );
}
