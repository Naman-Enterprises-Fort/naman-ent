import type { Metadata } from 'next';
import { LegalArticle, LegalList, LegalSection } from '@/components/legal/legal-article';
import { storeConfig } from '@/lib/content/store-config';

export const metadata: Metadata = {
  title: 'Shipping Policy',
  description: 'Where we ship, how long it takes, what it costs, and how cash on delivery works.',
  alternates: { canonical: '/shipping' },
};

export default function ShippingPage() {
  return (
    <LegalArticle
      title="Shipping Policy"
      description="Pan-India shipping with transparent timelines and fees."
      lastUpdated={storeConfig.policyEffectiveDate}
    >
      <LegalSection id="coverage" heading="1. Where we ship">
        <p>
          We ship to most pincodes across India. Serviceability is verified at the product page,
          cart, and checkout — please enter your pincode to confirm your address is covered before
          paying. We do not ship internationally at this time.
        </p>
      </LegalSection>

      <LegalSection id="timelines" heading="2. Delivery timelines">
        <LegalList>
          <li>
            <strong>Standard:</strong> 3–6 business days. Available pan-India.
          </li>
          <li>
            <strong>Express:</strong> 2–3 business days. Available on most metro and tier-1 city
            pincodes.
          </li>
          <li>
            <strong>Same-day:</strong> dispatched within 2 hours of order placement and delivered
            the same day for orders placed before 1 PM. Currently available in Delhi, Mumbai,
            Bengaluru, Kolkata, Chennai, and Hyderabad.
          </li>
        </LegalList>
        <p>
          Timelines exclude the day of order, public holidays, and the weekend, and may be longer
          during festive sales or weather disruptions. The dispatch and delivery dates shown at
          checkout are estimates, not guarantees.
        </p>
      </LegalSection>

      <LegalSection id="rates" heading="3. Shipping charges">
        <LegalList>
          <li>
            <strong>Standard:</strong> ₹49. Free for orders ₹999 and above (before any coupon
            discount).
          </li>
          <li>
            <strong>Express:</strong> ₹99 flat.
          </li>
          <li>
            <strong>Same-day:</strong> ₹199 flat (metro pincodes only).
          </li>
        </LegalList>
        <p>
          The applicable shipping fee is shown on the cart and re-confirmed in the "Review your
          order" panel at checkout before you pay.
        </p>
      </LegalSection>

      <LegalSection id="cod" heading="4. Cash on Delivery (COD)">
        <p>
          COD is available on most pincodes for orders below ₹50,000. A flat{' '}
          <strong>₹49 convenience fee</strong> is added at checkout when you choose COD. You will be
          asked to share an OTP with the delivery executive at the time of handover; this is to
          confirm receipt and reduce fraud.
        </p>
      </LegalSection>

      <LegalSection id="tracking" heading="5. Order tracking">
        <p>
          Once your order is dispatched you will receive the courier name, tracking number, and a
          tracking link by email and SMS. You can also track every order in real time at{' '}
          <strong>/account/orders</strong>.
        </p>
      </LegalSection>

      <LegalSection id="failed" heading="6. Failed delivery and re-attempts">
        <p>
          The courier will attempt delivery up to three times. If you are not reachable across all
          attempts the package is returned to our warehouse. We will reach out to confirm a new
          delivery slot or, if you prefer, refund the order minus the to-and-fro shipping cost
          (where applicable).
        </p>
      </LegalSection>

      <LegalSection id="damaged" heading="7. Damaged or tampered packages">
        <p>
          If the outer packaging is visibly tampered or damaged at the time of delivery, please
          refuse delivery and write to us within 24 hours with a photograph. We will arrange a
          replacement or a full refund at no cost to you. See the{' '}
          <a className="underline" href="/returns">
            Returns Policy
          </a>{' '}
          for the full process.
        </p>
      </LegalSection>

      <LegalSection id="contact" heading="8. Questions?">
        <p>
          Write to{' '}
          <a className="underline" href={`mailto:${storeConfig.supportEmail}`}>
            {storeConfig.supportEmail}
          </a>
          .
        </p>
      </LegalSection>
    </LegalArticle>
  );
}
