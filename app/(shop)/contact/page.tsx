import { Mail, MapPin, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalArticle, LegalList, LegalSection } from '@/components/legal/legal-article';
import { storeConfig } from '@/lib/content/store-config';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Reach our support team or grievance officer. Email, phone, registered address, and response times.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <LegalArticle
      title="Contact us"
      description="We answer every email. Here is how to reach us, and our grievance redressal details under India's e-commerce rules."
      lastUpdated={storeConfig.policyEffectiveDate}
    >
      <LegalSection id="support" heading="Customer support">
        <ul className="flex flex-col gap-3 rounded-lg border bg-card p-5">
          <li className="flex items-start gap-3">
            <Mail aria-hidden className="mt-0.5 size-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-medium text-foreground">Email</span>
              <a
                className="text-muted-foreground underline-offset-4 hover:underline"
                href={`mailto:${storeConfig.supportEmail}`}
              >
                {storeConfig.supportEmail}
              </a>
              <span className="text-muted-foreground text-xs">
                We reply within one business day.
              </span>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <Phone aria-hidden className="mt-0.5 size-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-medium text-foreground">Phone</span>
              <a
                className="text-muted-foreground underline-offset-4 hover:underline"
                href={`tel:${storeConfig.supportPhone.replace(/\s+/g, '')}`}
              >
                {storeConfig.supportPhone}
              </a>
              <span className="text-muted-foreground text-xs">
                Monday to Saturday, 10 AM to 7 PM IST.
              </span>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <MapPin aria-hidden className="mt-0.5 size-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-medium text-foreground">Registered office</span>
              <span className="text-muted-foreground">{storeConfig.legalName}</span>
              <span className="text-muted-foreground">{storeConfig.registeredAddress}</span>
              {storeConfig.gstin ? (
                <span className="text-muted-foreground text-xs">GSTIN: {storeConfig.gstin}</span>
              ) : null}
              {storeConfig.cin ? (
                <span className="text-muted-foreground text-xs">CIN: {storeConfig.cin}</span>
              ) : null}
            </div>
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="grievance" heading="Grievance Officer">
        <p>
          In line with the Consumer Protection (E-Commerce) Rules, 2020, the Information Technology
          (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, and the Digital
          Personal Data Protection Act, 2023, you can reach our designated{' '}
          {storeConfig.grievanceOfficer.designation} for any complaint about a transaction or about
          how we handle your personal information:
        </p>
        <div className="rounded-lg border-2 bg-muted/30 p-5">
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[140px_1fr]">
            <dt className="text-muted-foreground text-xs uppercase tracking-wider">Name</dt>
            <dd className="font-medium">{storeConfig.grievanceOfficer.name}</dd>
            <dt className="text-muted-foreground text-xs uppercase tracking-wider">Designation</dt>
            <dd className="font-medium">{storeConfig.grievanceOfficer.designation}</dd>
            <dt className="text-muted-foreground text-xs uppercase tracking-wider">Email</dt>
            <dd>
              <a
                className="font-medium underline-offset-4 hover:underline"
                href={`mailto:${storeConfig.grievanceOfficer.email}`}
              >
                {storeConfig.grievanceOfficer.email}
              </a>
            </dd>
            <dt className="text-muted-foreground text-xs uppercase tracking-wider">Address</dt>
            <dd className="font-medium">{storeConfig.registeredAddress}</dd>
          </dl>
        </div>
        <LegalList>
          <li>
            <strong>Acknowledgement:</strong> we will acknowledge your grievance within 48 hours of
            receipt.
          </li>
          <li>
            <strong>Resolution:</strong> we aim to resolve every grievance within 30 days of
            receipt.
          </li>
          <li>
            <strong>Escalation:</strong> if you are not satisfied with the response you may approach
            the National Consumer Helpline at{' '}
            <a className="underline" href="https://consumerhelpline.gov.in/" rel="noreferrer">
              consumerhelpline.gov.in
            </a>{' '}
            or call 1915.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection id="self-serve" heading="Frequently asked">
        <p>You may find what you need faster on:</p>
        <LegalList>
          <li>
            <Link className="underline" href="/account/orders">
              My orders
            </Link>{' '}
            — view, track, or cancel orders.
          </li>
          <li>
            <Link className="underline" href="/returns">
              Returns
            </Link>{' '}
            — start a return or replacement.
          </li>
          <li>
            <Link className="underline" href="/cancellation">
              Cancellation
            </Link>{' '}
            — refund timelines and process.
          </li>
          <li>
            <Link className="underline" href="/shipping">
              Shipping
            </Link>{' '}
            — coverage and timelines.
          </li>
        </LegalList>
      </LegalSection>
    </LegalArticle>
  );
}
