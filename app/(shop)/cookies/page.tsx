import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalArticle, LegalList, LegalSection } from '@/components/legal/legal-article';
import { storeConfig } from '@/lib/content/store-config';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'The cookies we set, what each one is for, and how to control them.',
  alternates: { canonical: '/cookies' },
};

export default function CookiesPage() {
  return (
    <LegalArticle
      title="Cookie Policy"
      description="A short, plain explanation of the cookies we use."
      lastUpdated={storeConfig.policyEffectiveDate}
    >
      <LegalSection id="what" heading="1. What are cookies?">
        <p>
          Cookies are small text files that a website stores in your browser. They let the site
          remember things across page loads — for example, that you are signed in or that you have
          items in your cart. Some cookies are essential to make the site work; others measure how
          the site is used so we can improve it.
        </p>
      </LegalSection>

      <LegalSection id="essential" heading="2. Essential cookies">
        <p>
          These cookies are required for the site to function. You cannot opt out without breaking
          parts of the site such as login or checkout.
        </p>
        <LegalList>
          <li>
            <strong>authjs.session-token</strong> — keeps you signed in. HTTP-only, Secure,
            SameSite=Lax.
          </li>
          <li>
            <strong>authjs.csrf-token</strong> — protects sign-in forms against cross-site request
            forgery.
          </li>
          <li>
            <strong>naman_cart_id</strong> — links your guest cart to its server-side state so it
            survives reloads.
          </li>
          <li>
            <strong>theme</strong> — remembers your light or dark mode preference.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="analytics" heading="3. Analytics and product cookies">
        <p>
          When enabled in your region, we use the following first- and third-party cookies to
          understand how the site performs and to improve it:
        </p>
        <LegalList>
          <li>
            <strong>Vercel Analytics</strong> — anonymous, cookie-less Web Vitals measurement.
          </li>
          <li>
            <strong>Google Analytics 4</strong> — _ga, _ga_*. Used for aggregated traffic and
            conversion measurement.
          </li>
          <li>
            <strong>PostHog</strong> — ph_* cookies for product analytics, feature flags, and funnel
            measurement.
          </li>
          <li>
            <strong>Microsoft Clarity</strong> — _clck, _clsk for session-level heatmaps and
            replays. Sensitive form fields are masked by default.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="third-party" heading="4. Third-party cookies">
        <LegalList>
          <li>
            <strong>Razorpay</strong> sets cookies inside its checkout iframe to process the payment
            session. We do not have access to those cookies.
          </li>
          <li>
            <strong>Cloudflare Turnstile</strong> may set a short-lived cookie when proving you are
            not a bot during sign-up or password reset.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="control" heading="5. Controlling cookies">
        <p>
          Most browsers let you block, delete, or be notified when cookies are set. You will find
          this under <em>Settings → Privacy</em> in Chrome, Firefox, Safari, or Edge. Blocking
          essential cookies will break sign-in and checkout. Where required by law we will request
          your consent before setting non-essential cookies.
        </p>
      </LegalSection>

      <LegalSection id="contact" heading="6. Questions">
        <p>
          For more about how we handle your data see the{' '}
          <Link className="underline" href="/privacy">
            Privacy Policy
          </Link>{' '}
          or write to{' '}
          <a className="underline" href={`mailto:${storeConfig.supportEmail}`}>
            {storeConfig.supportEmail}
          </a>
          .
        </p>
      </LegalSection>
    </LegalArticle>
  );
}
