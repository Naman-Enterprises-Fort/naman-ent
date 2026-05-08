import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalArticle, LegalList, LegalSection } from '@/components/legal/legal-article';
import { storeConfig } from '@/lib/content/store-config';

export const metadata: Metadata = {
  title: 'Returns Policy',
  description:
    '7-day no-questions returns on most products. Here is how to return, who is eligible, and when you can expect the refund.',
  alternates: { canonical: '/returns' },
};

export default function ReturnsPage() {
  return (
    <LegalArticle
      title="Returns Policy"
      description="We want you to love what you ordered. If something is not right, here is how to send it back."
      lastUpdated={storeConfig.policyEffectiveDate}
    >
      <LegalSection id="window" heading="1. Return window">
        <p>
          Most products are eligible for return within <strong>7 calendar days of delivery</strong>.
          A few categories carry a different window or are non-returnable for hygiene or safety
          reasons; the eligible window is shown on every product page and on the order details page
          after delivery.
        </p>
      </LegalSection>

      <LegalSection id="eligibility" heading="2. Eligibility">
        <p>For a return to be accepted the item must be:</p>
        <LegalList>
          <li>
            Unused, in the original condition, with all tags, manuals, accessories, free gifts, and
            packaging.
          </li>
          <li>
            Free of physical or liquid damage caused after delivery, and not modified or repaired by
            anyone other than the manufacturer's authorised service centre.
          </li>
          <li>Returned with the original invoice and a copy of the order confirmation email.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="non-returnable" heading="3. Non-returnable items">
        <p>The following are not eligible for return once delivered:</p>
        <LegalList>
          <li>
            Personal care, intimate care, and grooming products where the seal has been broken.
          </li>
          <li>Software, e-vouchers, gift cards, and digital licences once activated.</li>
          <li>Custom-built or made-to-order items.</li>
          <li>Bulk and corporate orders, unless agreed in writing at the time of order.</li>
        </LegalList>
      </LegalSection>

      <LegalSection id="how-to" heading="4. How to start a return">
        <ol className="ml-5 flex list-decimal flex-col gap-2 marker:text-muted-foreground">
          <li>
            Sign in and open the order at{' '}
            <Link className="underline" href="/account/orders">
              /account/orders
            </Link>
            .
          </li>
          <li>Tap "Request return" on the line you want to send back, and pick a reason.</li>
          <li>
            We will schedule a free reverse pickup with our courier partner within 2 business days,
            wherever serviceable. If your pincode is not pickup-eligible, we will share a self-ship
            address and reimburse approved courier charges up to ₹150 per parcel.
          </li>
          <li>
            Pack the item securely, attach the printed return label, and hand it over to the courier
            executive. Please retain the courier receipt until the refund is credited.
          </li>
        </ol>
      </LegalSection>

      <LegalSection id="inspection" heading="5. Inspection and refund">
        <p>
          Once the item reaches our warehouse it goes through a quality check. We will email you the
          outcome within 2 business days. If the return is approved we will issue the refund to the
          original payment method:
        </p>
        <LegalList>
          <li>
            <strong>UPI, cards, net-banking, wallets:</strong> 5–7 business days to reflect in your
            statement (subject to your bank's processing time).
          </li>
          <li>
            <strong>Cash on Delivery:</strong> refunded to a bank account that you confirm in your
            account, within 5–7 business days of approval.
          </li>
        </LegalList>
        <p>
          If a return fails the quality check we will share photographs and ship the product back to
          you at no additional cost.
        </p>
      </LegalSection>

      <LegalSection id="replacement" heading="6. Replacement and exchange">
        <p>
          For damaged-in-transit, defective, or wrong-item-delivered cases we will offer a free
          replacement first. If a replacement is not available we will offer a full refund.
        </p>
      </LegalSection>

      <LegalSection id="warranty" heading="7. Manufacturer warranty">
        <p>
          A manufacturer warranty (if applicable) is provided directly by the brand owner and is
          independent of this returns policy. After the return window you should contact the brand's
          authorised service centre using the warranty card included with the product.
        </p>
      </LegalSection>

      <LegalSection id="contact" heading="8. Need help?">
        <p>
          Write to{' '}
          <a className="underline" href={`mailto:${storeConfig.supportEmail}`}>
            {storeConfig.supportEmail}
          </a>{' '}
          with your order number and we will help. For unresolved grievances please reach out to our{' '}
          <Link className="underline" href="/contact">
            Grievance Officer
          </Link>
          .
        </p>
      </LegalSection>
    </LegalArticle>
  );
}
