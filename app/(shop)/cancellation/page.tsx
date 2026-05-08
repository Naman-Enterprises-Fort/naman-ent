import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalArticle, LegalList, LegalSection } from '@/components/legal/legal-article';
import { storeConfig } from '@/lib/content/store-config';

export const metadata: Metadata = {
  title: 'Cancellation Policy',
  description: 'When and how you can cancel an order, and how the refund flows.',
  alternates: { canonical: '/cancellation' },
};

export default function CancellationPage() {
  return (
    <LegalArticle
      title="Cancellation Policy"
      description="Plans change. Here is how to cancel an order and what to expect."
      lastUpdated={storeConfig.policyEffectiveDate}
    >
      <LegalSection id="window" heading="1. When you can cancel">
        <p>
          You can cancel an order yourself as long as it is in one of these statuses:{' '}
          <strong>Pending, Confirmed, or Processing</strong>. Once we hand the package to the
          courier (status: Shipped) cancellation is no longer available — please refuse the parcel
          at the doorstep or initiate a return after delivery (see the{' '}
          <Link className="underline" href="/returns">
            Returns Policy
          </Link>
          ).
        </p>
      </LegalSection>

      <LegalSection id="how" heading="2. How to cancel">
        <ol className="ml-5 flex list-decimal flex-col gap-2 marker:text-muted-foreground">
          <li>
            Sign in and open the order at{' '}
            <Link className="underline" href="/account/orders">
              /account/orders
            </Link>
            .
          </li>
          <li>Tap "Cancel order" and pick a reason.</li>
          <li>
            We will email confirmation and start the refund within minutes for online payments and
            within one business day for COD orders that you had not yet paid for.
          </li>
        </ol>
      </LegalSection>

      <LegalSection id="our-cancel" heading="3. Cancellations by us">
        <p>We may cancel an order in part or in full when:</p>
        <LegalList>
          <li>The product becomes unavailable or is mispriced.</li>
          <li>We cannot verify the billing or shipping address.</li>
          <li>
            We detect signs of fraud, abuse of promotional offers, or violation of these terms.
          </li>
          <li>
            The destination pincode is not serviceable for the chosen shipping method or payment
            method.
          </li>
        </LegalList>
        <p>If we cancel the order we will refund any amount you have paid in full.</p>
      </LegalSection>

      <LegalSection id="refunds" heading="4. Refund timelines">
        <LegalList>
          <li>
            <strong>Online payments (UPI, cards, net-banking, wallets):</strong> 5–7 business days
            to reflect, depending on your bank.
          </li>
          <li>
            <strong>Cash on Delivery — order cancelled before pickup:</strong> no refund needed
            because we have not collected any money yet.
          </li>
          <li>
            <strong>Cash on Delivery — order cancelled after partial COD payment:</strong> refunded
            to a bank account you confirm in your account, within 5–7 business days.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="partial" heading="5. Partial cancellations">
        <p>
          You can cancel individual lines from a multi-item order until any line begins processing.
          Once an item is in Processing it must be cancelled (or returned) on its own. Refunds for
          partially cancelled orders are issued for the affected lines only, including a pro-rata
          share of any applicable shipping or COD fee.
        </p>
      </LegalSection>

      <LegalSection id="contact" heading="6. Need help?">
        <p>
          Write to{' '}
          <a className="underline" href={`mailto:${storeConfig.supportEmail}`}>
            {storeConfig.supportEmail}
          </a>{' '}
          with your order number, or visit the{' '}
          <Link className="underline" href="/contact">
            Contact
          </Link>{' '}
          page for grievance redressal.
        </p>
      </LegalSection>
    </LegalArticle>
  );
}
