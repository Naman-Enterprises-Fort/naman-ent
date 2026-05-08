import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalArticle, LegalList, LegalSection } from '@/components/legal/legal-article';
import { storeConfig } from '@/lib/content/store-config';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: `The legal agreement between you and ${storeConfig.legalName} when you use this website.`,
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <LegalArticle
      title="Terms of Use"
      description={`Please read these terms carefully. By using ${storeConfig.url}, you agree to be bound by them.`}
      lastUpdated={storeConfig.policyEffectiveDate}
    >
      <LegalSection id="acceptance" heading="1. Acceptance">
        <p>
          These Terms of Use form a binding contract between you and {storeConfig.legalName}{' '}
          (referred to as "{storeConfig.name}", "we", "our", "us"). By accessing or using{' '}
          {storeConfig.url} (the "Site") you confirm that you have read, understood, and agreed to
          these terms. If you do not agree, please do not use the Site.
        </p>
      </LegalSection>

      <LegalSection id="eligibility" heading="2. Eligibility">
        <p>
          You must be at least 18 years old, capable of forming a legally binding contract under the
          Indian Contract Act, 1872, and resident in India to place an order. By placing an order
          you confirm that you meet these requirements.
        </p>
      </LegalSection>

      <LegalSection id="account" heading="3. Account and security">
        <LegalList>
          <li>
            You are responsible for keeping your account credentials confidential. Activity on your
            account is treated as authorised by you.
          </li>
          <li>
            You must provide accurate and current information at sign-up and keep it updated. We may
            suspend or terminate accounts with materially false information.
          </li>
          <li>
            You may close your account at any time from{' '}
            <Link className="underline" href="/account/security">
              /account/security
            </Link>
            . We may retain certain records as required by tax law even after your account is
            closed.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="orders" heading="4. Orders, pricing and taxes">
        <LegalList>
          <li>
            All prices are in Indian Rupees (₹) and inclusive of GST. The applicable HSN code, GST
            rate, and split (CGST + SGST or IGST) are computed based on the destination state.
          </li>
          <li>
            We may correct obvious pricing errors and reject or cancel orders affected by them at
            our discretion. If we cancel an order for this reason, we will refund any amount you
            have paid in full.
          </li>
          <li>
            Stock is subject to availability at the time of dispatch. If an item becomes unavailable
            after order placement we will cancel the affected line and refund the amount paid for
            it.
          </li>
          <li>A GST invoice will be issued where you have provided a valid GSTIN at checkout.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="payment" heading="5. Payment">
        <p>
          All online payments are processed by Razorpay. We never see or store your card, UPI, or
          net-banking credentials. Cash on delivery is available at our discretion based on
          serviceability and order value, and includes a convenience fee disclosed at checkout.
        </p>
      </LegalSection>

      <LegalSection id="shipping" heading="6. Shipping">
        <p>
          Delivery times, charges, and serviceability are described in our{' '}
          <Link className="underline" href="/shipping">
            Shipping Policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection id="returns" heading="7. Returns, refunds and cancellations">
        <p>
          Our return and refund process is described in the{' '}
          <Link className="underline" href="/returns">
            Returns Policy
          </Link>
          . Cancellation rules are described in the{' '}
          <Link className="underline" href="/cancellation">
            Cancellation Policy
          </Link>
          . Refunds are issued to the original payment method.
        </p>
      </LegalSection>

      <LegalSection id="warranty" heading="8. Product information and warranty">
        <p>
          We strive to display product specifications, images, and pricing accurately, but minor
          deviations may occur. Manufacturer warranty (if any) is provided directly by the brand
          owner and is independent of {storeConfig.name}'s return policy.
        </p>
      </LegalSection>

      <LegalSection id="ip" heading="9. Intellectual property">
        <p>
          The Site, its design, copy, code, logos, and product imagery are the property of{' '}
          {storeConfig.legalName} or its licensors and are protected by Indian and international
          copyright, trademark, and other intellectual property laws. You may not copy, modify,
          distribute, or create derivative works without prior written permission, except for
          personal non-commercial browsing.
        </p>
      </LegalSection>

      <LegalSection id="user-content" heading="10. User content">
        <p>
          When you submit reviews, ratings, photos, or other content to the Site, you grant us a
          non-exclusive, royalty-free, worldwide licence to use, display, and distribute that
          content in connection with the Site and our marketing, with attribution where reasonable.
          You are responsible for the legality and accuracy of content you submit.
        </p>
      </LegalSection>

      <LegalSection id="prohibited" heading="11. Acceptable use">
        <p>You agree not to:</p>
        <LegalList>
          <li>Use the Site for any unlawful purpose or in violation of any applicable law.</li>
          <li>
            Probe, scan, or test the vulnerability of the Site, or attempt to bypass security or
            authentication measures.
          </li>
          <li>Scrape, crawl, or extract data using automated tools without our written consent.</li>
          <li>Submit false, misleading, infringing, or abusive content.</li>
          <li>Resell purchases for commercial purposes without our written consent.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="disclaimer" heading="12. Disclaimer of warranties">
        <p>
          The Site and its content are provided "as is" without warranties of any kind, express or
          implied, except those that cannot be excluded under the Consumer Protection Act, 2019. Our
          total liability to you for any claim arising from your use of the Site is limited to the
          amount you have paid us in the six months preceding the event giving rise to the claim.
        </p>
      </LegalSection>

      <LegalSection id="indemnity" heading="13. Indemnity">
        <p>
          You agree to indemnify and hold {storeConfig.legalName}, its directors, employees, and
          partners harmless from any claim arising out of your breach of these terms or your
          violation of any law or third-party right.
        </p>
      </LegalSection>

      <LegalSection id="law" heading="14. Governing law and jurisdiction">
        <p>
          These terms are governed by the laws of India. Any dispute will be subject to the
          exclusive jurisdiction of the competent courts in {storeConfig.policyJurisdiction}.
        </p>
      </LegalSection>

      <LegalSection id="changes" heading="15. Changes">
        <p>
          We may update these terms from time to time. The "Last updated" date at the top of this
          page reflects the current version. Continued use of the Site after a change constitutes
          acceptance of the updated terms.
        </p>
      </LegalSection>

      <LegalSection id="contact" heading="16. Contact">
        <p>
          For questions about these terms, write to{' '}
          <a className="underline" href={`mailto:${storeConfig.supportEmail}`}>
            {storeConfig.supportEmail}
          </a>{' '}
          or visit the{' '}
          <Link className="underline" href="/contact">
            Contact
          </Link>{' '}
          page.
        </p>
      </LegalSection>
    </LegalArticle>
  );
}
