import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalArticle, LegalList, LegalSection } from '@/components/legal/legal-article';
import { storeConfig } from '@/lib/content/store-config';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    "How we collect, use, and protect your personal information when you shop with us — written for India's Digital Personal Data Protection Act, 2023.",
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <LegalArticle
      title="Privacy Policy"
      description={`This policy explains how ${storeConfig.legalName} ("we", "us") handles your personal information when you use ${storeConfig.url}.`}
      lastUpdated={storeConfig.policyEffectiveDate}
    >
      <LegalSection id="scope" heading="1. Scope">
        <p>
          This privacy policy applies to information we collect when you browse our store, place an
          order, register for an account, contact our support team, or otherwise interact with{' '}
          {storeConfig.name}. It is written to align with India's Digital Personal Data Protection
          Act, 2023 (DPDP Act) and the Information Technology (Reasonable Security Practices and
          Procedures and Sensitive Personal Data or Information) Rules, 2011.
        </p>
      </LegalSection>

      <LegalSection id="information" heading="2. Information we collect">
        <p>
          We only collect what we need to operate the store and fulfil your orders. Specifically:
        </p>
        <LegalList>
          <li>
            <strong>Account information:</strong> name, email, phone number, password (stored as a
            one-way bcrypt hash; we never see your plaintext password).
          </li>
          <li>
            <strong>Order information:</strong> shipping and billing addresses, items, prices,
            taxes, GSTIN if you ask for a GST invoice, communications you send our support team.
          </li>
          <li>
            <strong>Payment information:</strong> we never see your card, UPI ID, or net-banking
            credentials. Razorpay handles all payment data inside their PCI DSS-scoped iframe and
            shares only a payment reference and status with us.
          </li>
          <li>
            <strong>Device and log data:</strong> IP address, user agent, pages viewed, timestamps —
            used for fraud prevention and abuse mitigation.
          </li>
          <li>
            <strong>Cookies:</strong> see our{' '}
            <Link className="underline" href="/cookies">
              Cookie Policy
            </Link>{' '}
            for the full list and your controls.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="purpose" heading="3. Why we use it">
        <LegalList>
          <li>To create your account, authenticate you, and keep your session secure.</li>
          <li>To process orders, payments, shipping, returns, refunds, and GST invoicing.</li>
          <li>To respond to your questions and complaints.</li>
          <li>To detect, investigate, and prevent fraud, abuse, and security incidents.</li>
          <li>To meet our legal, tax, and accounting obligations.</li>
          <li>
            To send you transactional notifications (order confirmation, shipping, delivery,
            refund). You cannot opt out of these because they are required to operate your order;
            you can opt out of marketing emails at any time from your account settings.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="sharing" heading="4. Who we share it with">
        <p>
          We share the minimum information needed with carefully chosen processors. We do not sell
          your personal information to anyone.
        </p>
        <LegalList>
          <li>
            <strong>Razorpay</strong> — payment processing. Receives your name, email, phone, and
            transaction details to enable checkout.
          </li>
          <li>
            <strong>Shiprocket and partner courier companies</strong> — shipping and delivery.
            Receive your shipping address, phone, and order contents (label only).
          </li>
          <li>
            <strong>Cloudinary</strong> — image hosting. Does not receive personal information.
          </li>
          <li>
            <strong>Resend and MSG91</strong> — transactional email and SMS. Receive your email or
            phone number and the message body.
          </li>
          <li>
            <strong>Cloud infrastructure</strong> — Vercel for hosting, Neon for database storage,
            Upstash for rate limiting and background jobs. They store the data we record about you,
            encrypted at rest.
          </li>
          <li>
            <strong>Government authorities</strong> — when we are required to disclose information
            by law, court order, or to comply with a legal request that we believe in good faith is
            valid.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="retention" heading="5. How long we keep it">
        <p>
          We retain your account information for as long as your account is active. We retain order
          records, invoices, and tax-related information for at least 8 years to meet our
          obligations under the Companies Act and the GST Act. After that, we either delete or
          anonymise the data.
        </p>
      </LegalSection>

      <LegalSection id="rights" heading="6. Your rights as a Data Principal">
        <p>Under the DPDP Act, you have the right to:</p>
        <LegalList>
          <li>Ask for a summary of the personal information we hold about you.</li>
          <li>Ask us to correct or update incorrect information.</li>
          <li>
            Ask us to erase your personal information (subject to retention required by law — for
            example, tax records).
          </li>
          <li>Withdraw consent you previously gave for marketing communications.</li>
          <li>Nominate another individual to exercise these rights on your behalf.</li>
          <li>
            File a grievance with our Grievance Officer, whose details are on the{' '}
            <Link className="underline" href="/contact">
              Contact
            </Link>{' '}
            page.
          </li>
        </LegalList>
        <p>
          To exercise any of these rights, write to{' '}
          <a className="underline" href={`mailto:${storeConfig.grievanceOfficer.email}`}>
            {storeConfig.grievanceOfficer.email}
          </a>{' '}
          from the email address registered on your account. We will acknowledge your request within
          48 hours and respond within 30 days.
        </p>
      </LegalSection>

      <LegalSection id="security" heading="7. How we protect your information">
        <LegalList>
          <li>TLS 1.3 in transit, AES-256 at rest.</li>
          <li>Passwords stored as bcrypt hashes; we cannot recover them.</li>
          <li>
            Payment data never touches our servers — Razorpay's PCI DSS-compliant iframe handles all
            card and UPI input.
          </li>
          <li>Strict access controls and audit logging on administrative actions.</li>
          <li>Rate limiting and bot mitigation on sensitive endpoints (login, OTP, checkout).</li>
        </LegalList>
        <p>
          No system is impenetrable. If we ever discover a breach affecting your information, we
          will notify you and the Data Protection Board of India in accordance with the DPDP Act.
        </p>
      </LegalSection>

      <LegalSection id="children" heading="8. Children">
        <p>
          {storeConfig.name} is not intended for users under 18. We do not knowingly collect
          information from minors. If you believe a minor has provided us information, write to our
          Grievance Officer and we will delete it.
        </p>
      </LegalSection>

      <LegalSection id="cross-border" heading="9. Cross-border transfers">
        <p>
          Some of our processors (for example Cloudinary and Resend) operate servers outside India.
          When we transfer your information to them we do so under contractual safeguards that
          require equivalent protection to that of the DPDP Act. We will not transfer personal
          information to a country that the Government of India has notified as restricted.
        </p>
      </LegalSection>

      <LegalSection id="changes" heading="10. Changes to this policy">
        <p>
          We may update this policy from time to time. The "Last updated" date at the top of this
          page reflects the current version. Material changes will be communicated to registered
          users by email at least seven days before they take effect.
        </p>
      </LegalSection>

      <LegalSection id="contact" heading="11. Contact us">
        <p>
          For questions, requests, or grievances, write to our{' '}
          <strong>{storeConfig.grievanceOfficer.designation}</strong>,{' '}
          {storeConfig.grievanceOfficer.name}, at{' '}
          <a className="underline" href={`mailto:${storeConfig.grievanceOfficer.email}`}>
            {storeConfig.grievanceOfficer.email}
          </a>
          . You can also reach customer support at{' '}
          <a className="underline" href={`mailto:${storeConfig.supportEmail}`}>
            {storeConfig.supportEmail}
          </a>
          .
        </p>
      </LegalSection>
    </LegalArticle>
  );
}
