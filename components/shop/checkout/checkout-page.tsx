'use client';

import { Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useRazorpay } from '@/lib/hooks/use-razorpay';
import { formatINR, fromPaise } from '@/lib/money';
import {
  COD_CONVENIENCE_FEE_PAISE,
  EXPRESS_SHIPPING_PAISE,
  FLAT_SHIPPING_PAISE,
  FREE_SHIPPING_THRESHOLD_PAISE,
  SAME_DAY_SHIPPING_PAISE,
} from '@/lib/pricing-shared';
import type { CartView } from '@/lib/services/cart';

type ShippingMethod = 'STANDARD' | 'EXPRESS' | 'SAME_DAY';
type PaymentMethod = 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET' | 'EMI' | 'PAY_LATER' | 'COD';

interface InitialAddress {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

interface CurrentUser {
  email: string;
  name: string | null;
}

interface InlineAddressDraft {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
}

const EMPTY_INLINE: InlineAddressDraft = {
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
};

const METRO_PIN_PREFIXES = ['110', '400', '560', '700', '600', '500'];

export function CheckoutPageClient({
  initialCart,
  addresses,
  currentUser,
  razorpayConfigured,
}: {
  initialCart: CartView;
  addresses: InitialAddress[];
  currentUser: CurrentUser | null;
  razorpayConfigured: boolean;
}) {
  const router = useRouter();
  const { open: openRazorpay } = useRazorpay();

  const [contactEmail, setContactEmail] = useState(currentUser?.email ?? '');
  const [contactPhone, setContactPhone] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null,
  );
  const [useNewAddress, setUseNewAddress] = useState<boolean>(addresses.length === 0);
  const [inlineAddress, setInlineAddress] = useState<InlineAddressDraft>(EMPTY_INLINE);
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>('STANDARD');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    razorpayConfigured ? 'UPI' : 'COD',
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Derive: is the destination state "metro" (for SAME_DAY eligibility)?
  const destinationPin = useMemo(() => {
    if (useNewAddress) return inlineAddress.pincode;
    return addresses.find((a) => a.id === selectedAddressId)?.pincode ?? '';
  }, [useNewAddress, inlineAddress.pincode, addresses, selectedAddressId]);

  const sameDayEligible = useMemo(
    () => !!destinationPin && METRO_PIN_PREFIXES.some((p) => destinationPin.startsWith(p)),
    [destinationPin],
  );

  // Auto-fill phone number from current user once on mount.
  useEffect(() => {
    if (currentUser && !contactPhone) {
      const fromAddr = addresses.find((a) => a.isDefault)?.phone ?? addresses[0]?.phone ?? '';
      if (fromAddr) setContactPhone(fromAddr);
    }
  }, [currentUser, addresses, contactPhone]);

  // Pincode autofill for the inline address.
  const lastPinLookup = useRef<string | null>(null);
  useEffect(() => {
    if (!useNewAddress) return;
    const pin = inlineAddress.pincode;
    if (!/^[1-9][0-9]{5}$/.test(pin)) return;
    if (lastPinLookup.current === pin) return;
    lastPinLookup.current = pin;
    const ctrl = new AbortController();
    fetch(`/api/serviceability?pincode=${pin}`, { signal: ctrl.signal })
      .then((r) => r.json() as Promise<{ city: string | null; state: string | null }>)
      .then((data) => {
        if (data.city || data.state) {
          setInlineAddress((prev) => ({
            ...prev,
            city: prev.city || (data.city ?? ''),
            state: prev.state || (data.state ?? ''),
          }));
        }
      })
      .catch(() => undefined);
    return () => ctrl.abort();
  }, [useNewAddress, inlineAddress.pincode]);

  // Reset to STANDARD if same-day was selected then pin changed.
  useEffect(() => {
    if (shippingMethod === 'SAME_DAY' && !sameDayEligible) setShippingMethod('STANDARD');
  }, [sameDayEligible, shippingMethod]);

  // -- Local total preview (server recomputes the canonical total on submit)
  const lineTotalPaise = initialCart.totals.subtotalPaise + initialCart.totals.taxPaise;
  const previewShipping = shippingPreview(shippingMethod, lineTotalPaise);
  const previewCod = paymentMethod === 'COD' ? COD_CONVENIENCE_FEE_PAISE : 0;
  const previewTotal = lineTotalPaise + previewShipping + previewCod;

  async function placeOrder() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        contactEmail,
        contactPhone,
        shippingMethod,
        paymentMethod,
        billingSameAsShipping: true,
      };
      if (useNewAddress) {
        payload.shippingAddress = {
          fullName: inlineAddress.fullName,
          phone: inlineAddress.phone || contactPhone,
          line1: inlineAddress.line1,
          line2: inlineAddress.line2 || undefined,
          city: inlineAddress.city,
          state: inlineAddress.state,
          pincode: inlineAddress.pincode,
          country: 'IN',
        };
      } else if (selectedAddressId) {
        payload.shippingAddressId = selectedAddressId;
      } else {
        setSubmitError('Choose a delivery address.');
        setSubmitting(false);
        return;
      }

      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        order?: { orderNumber: string; paymentMethod: string };
        razorpay?: {
          keyId: string;
          orderId: string;
          amountPaise: number;
          currency: string;
          name: string;
          description: string;
          prefill: { email: string; contact: string };
          notes: Record<string, string>;
        };
        redirect?: string;
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        setSubmitError(data.error ?? 'Could not place order.');
        setSubmitting(false);
        return;
      }

      // COD path — server already finalized the order.
      if (data.redirect) {
        router.push(data.redirect);
        return;
      }

      // Online path — open Razorpay Web Checkout.
      const orderNumber = data.order?.orderNumber;
      const rzp = data.razorpay;
      if (!orderNumber || !rzp) {
        setSubmitError('Unexpected response from checkout.');
        setSubmitting(false);
        return;
      }

      try {
        await openRazorpay({
          key: rzp.keyId,
          order_id: rzp.orderId,
          amount: rzp.amountPaise,
          currency: rzp.currency,
          name: rzp.name,
          description: rzp.description,
          prefill: rzp.prefill,
          notes: rzp.notes,
          theme: { color: '#0f172a' },
          modal: {
            ondismiss: () => setSubmitting(false),
            confirm_close: true,
          },
          handler: async (response) => {
            try {
              const verifyRes = await fetch('/api/orders/verify', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  orderNumber,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
              if (!verifyRes.ok) {
                const verifyData = (await verifyRes.json().catch(() => ({}))) as {
                  error?: string;
                };
                setSubmitError(verifyData.error ?? 'Payment verification failed.');
                setSubmitting(false);
                return;
              }
              router.push(`/checkout/success?orderNumber=${encodeURIComponent(orderNumber)}`);
            } catch (e) {
              setSubmitError(e instanceof Error ? e.message : 'Verification failed');
              setSubmitting(false);
            }
          },
        });
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : 'Unable to open payment');
        setSubmitting(false);
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Unexpected error');
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      <div className="flex flex-col gap-5">
        <Section number={1} title="Contact details">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="checkout-email">Email</Label>
              <Input
                id="checkout-email"
                type="email"
                autoComplete="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="checkout-phone">Mobile</Label>
              <Input
                id="checkout-phone"
                inputMode="numeric"
                autoComplete="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
          </div>
        </Section>

        <Section number={2} title="Delivery address">
          {addresses.length > 0 && (
            <div className="space-y-3">
              <RadioGroup
                value={useNewAddress ? '__new__' : (selectedAddressId ?? '')}
                onValueChange={(v) => {
                  if (v === '__new__') {
                    setUseNewAddress(true);
                  } else {
                    setUseNewAddress(false);
                    setSelectedAddressId(v);
                  }
                }}
              >
                {addresses.map((a) => (
                  <label
                    key={a.id}
                    htmlFor={`addr-${a.id}`}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3 hover:bg-accent/30 has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary/40"
                  >
                    <RadioGroupItem value={a.id} id={`addr-${a.id}`} className="mt-1" />
                    <div className="flex flex-col gap-0.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{a.fullName}</span>
                        {a.label ? (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
                            {a.label}
                          </span>
                        ) : null}
                        {a.isDefault ? (
                          <span className="rounded-full border border-emerald-600/40 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                            Default
                          </span>
                        ) : null}
                      </div>
                      <p className="text-muted-foreground">
                        {a.line1}
                        {a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.pincode}
                      </p>
                      <p className="text-muted-foreground text-xs">+91 {a.phone}</p>
                    </div>
                  </label>
                ))}
                <label
                  htmlFor="addr-new"
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-3 text-sm hover:bg-accent/30 has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary/40"
                >
                  <RadioGroupItem value="__new__" id="addr-new" />
                  <span className="font-medium">Use a new address</span>
                </label>
              </RadioGroup>
            </div>
          )}

          {(useNewAddress || addresses.length === 0) && (
            <div className="mt-4 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Full name"
                  id="ia-fullName"
                  value={inlineAddress.fullName}
                  onChange={(v) => setInlineAddress((prev) => ({ ...prev, fullName: v }))}
                  autoComplete="name"
                />
                <Field
                  label="Mobile"
                  id="ia-phone"
                  value={inlineAddress.phone}
                  onChange={(v) => setInlineAddress((prev) => ({ ...prev, phone: v }))}
                  inputMode="numeric"
                  autoComplete="tel"
                />
              </div>
              <Field
                label="Address line 1"
                id="ia-line1"
                value={inlineAddress.line1}
                onChange={(v) => setInlineAddress((prev) => ({ ...prev, line1: v }))}
                autoComplete="address-line1"
              />
              <Field
                label="Address line 2 (optional)"
                id="ia-line2"
                value={inlineAddress.line2}
                onChange={(v) => setInlineAddress((prev) => ({ ...prev, line2: v }))}
                autoComplete="address-line2"
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field
                  label="PIN code"
                  id="ia-pincode"
                  value={inlineAddress.pincode}
                  onChange={(v) => setInlineAddress((prev) => ({ ...prev, pincode: v }))}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={6}
                />
                <Field
                  label="City"
                  id="ia-city"
                  value={inlineAddress.city}
                  onChange={(v) => setInlineAddress((prev) => ({ ...prev, city: v }))}
                  autoComplete="address-level2"
                />
                <Field
                  label="State"
                  id="ia-state"
                  value={inlineAddress.state}
                  onChange={(v) => setInlineAddress((prev) => ({ ...prev, state: v }))}
                  autoComplete="address-level1"
                />
              </div>
            </div>
          )}
        </Section>

        <Section number={3} title="Shipping method">
          <RadioGroup
            value={shippingMethod}
            onValueChange={(v) => setShippingMethod(v as ShippingMethod)}
          >
            <ShippingOption
              value="STANDARD"
              title="Standard delivery"
              description="4–7 business days"
              priceLabel={
                lineTotalPaise >= FREE_SHIPPING_THRESHOLD_PAISE
                  ? 'Free'
                  : formatINR(fromPaise(FLAT_SHIPPING_PAISE))
              }
            />
            <ShippingOption
              value="EXPRESS"
              title="Express delivery"
              description="2–3 business days"
              priceLabel={formatINR(fromPaise(EXPRESS_SHIPPING_PAISE))}
            />
            <ShippingOption
              value="SAME_DAY"
              title="Same-day delivery"
              description={
                sameDayEligible
                  ? 'Order before 12 PM, delivered today'
                  : 'Available only for metro pincodes'
              }
              priceLabel={formatINR(fromPaise(SAME_DAY_SHIPPING_PAISE))}
              disabled={!sameDayEligible}
            />
          </RadioGroup>
        </Section>

        <Section number={4} title="Payment method">
          <RadioGroup
            value={paymentMethod}
            onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
          >
            {razorpayConfigured ? (
              <>
                <PaymentOption value="UPI" title="UPI" description="GPay, PhonePe, Paytm, BHIM" />
                <PaymentOption
                  value="CARD"
                  title="Credit / Debit card"
                  description="Visa, Mastercard, RuPay, Amex"
                />
                <PaymentOption
                  value="NETBANKING"
                  title="Net banking"
                  description="50+ Indian banks"
                />
                <PaymentOption
                  value="WALLET"
                  title="Wallets & Pay Later"
                  description="Paytm, Mobikwik, Simpl, LazyPay"
                />
                <PaymentOption
                  value="EMI"
                  title="EMI"
                  description="No-cost EMI on cards & cardless EMI partners"
                />
              </>
            ) : (
              <p className="rounded-md border border-amber-500/40 bg-amber-50 px-3 py-2 text-amber-800 text-xs dark:bg-amber-950/30 dark:text-amber-400">
                Online payments are not configured in this environment. Choose Cash on Delivery to
                continue.
              </p>
            )}
            <PaymentOption
              value="COD"
              title="Cash on Delivery"
              description={`A small ${formatINR(fromPaise(COD_CONVENIENCE_FEE_PAISE))} convenience fee applies. Pay in cash or UPI on delivery.`}
            />
          </RadioGroup>
        </Section>
      </div>

      <aside className="lg:sticky lg:top-20" aria-label="Order review">
        <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:p-5">
          <h2 className="font-semibold text-base">Review your order</h2>
          <ul className="flex flex-col gap-3" aria-label="Cart items">
            {initialCart.active.map((line) => (
              <li key={line.id} className="flex items-start gap-3">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-md border bg-muted">
                  {line.imageUrl ? (
                    <Image
                      src={line.imageUrl}
                      alt={line.imageAlt ?? line.productName}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col text-sm">
                  <p className="line-clamp-2 leading-tight">{line.productName}</p>
                  <p className="text-muted-foreground text-xs">
                    Qty {line.quantity}
                    {line.variantName ? ` · ${line.variantName}` : ''}
                  </p>
                </div>
                <div className="font-medium text-sm tabular-nums">
                  {formatINR(fromPaise(line.pricing.lineTotalPaise))}
                </div>
              </li>
            ))}
          </ul>

          <dl className="flex flex-col gap-2 border-t pt-3 text-sm">
            <Row
              label={`Subtotal (${initialCart.itemCount} ${initialCart.itemCount === 1 ? 'item' : 'items'})`}
              value={formatINR(fromPaise(lineTotalPaise))}
            />
            <Row
              label={`Shipping · ${labelForShipping(shippingMethod)}`}
              value={previewShipping === 0 ? 'Free' : formatINR(fromPaise(previewShipping))}
              tone={previewShipping === 0 ? 'success' : undefined}
            />
            <Row
              label="GST included"
              value={formatINR(fromPaise(initialCart.totals.taxPaise))}
              muted
            />
            {previewCod > 0 && <Row label="COD fee" value={formatINR(fromPaise(previewCod))} />}
          </dl>

          <div className="flex items-baseline justify-between border-t pt-3">
            <span className="font-semibold text-base">Total payable</span>
            <span className="font-semibold text-lg tabular-nums">
              {formatINR(fromPaise(previewTotal))}
            </span>
          </div>

          {submitError ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-destructive text-sm"
            >
              {submitError}
            </p>
          ) : null}

          <Button
            size="lg"
            className="w-full"
            onClick={placeOrder}
            disabled={submitting || initialCart.active.length === 0}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Processing…
              </>
            ) : paymentMethod === 'COD' ? (
              'Place order'
            ) : (
              `Pay ${formatINR(fromPaise(previewTotal))}`
            )}
          </Button>
          <p className="text-muted-foreground text-xs">
            Card details are entered inside Razorpay's PCI-compliant iframe — they never touch our
            servers.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`section-${number}`} className="rounded-lg border bg-card p-4 sm:p-5">
      <h2 id={`section-${number}`} className="mb-4 flex items-center gap-3 font-semibold text-base">
        <span
          aria-hidden
          className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs"
        >
          {number}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  inputMode,
  autoComplete,
  maxLength,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: 'numeric';
  autoComplete?: string;
  maxLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
      />
    </div>
  );
}

function ShippingOption({
  value,
  title,
  description,
  priceLabel,
  disabled,
}: {
  value: ShippingMethod;
  title: string;
  description: string;
  priceLabel: string;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor={`ship-${value}`}
      className={`flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3 hover:bg-accent/30 has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary/40 ${disabled ? 'pointer-events-none opacity-50' : ''}`}
    >
      <RadioGroupItem id={`ship-${value}`} value={value} disabled={disabled} className="mt-1" />
      <div className="flex flex-1 items-start justify-between gap-3">
        <div className="text-sm">
          <p className="font-medium">{title}</p>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
        <div className="font-medium text-sm tabular-nums">{priceLabel}</div>
      </div>
    </label>
  );
}

function PaymentOption({
  value,
  title,
  description,
}: {
  value: PaymentMethod;
  title: string;
  description: string;
}) {
  return (
    <label
      htmlFor={`pay-${value}`}
      className="flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3 hover:bg-accent/30 has-[:checked]:border-primary has-[:checked]:ring-1 has-[:checked]:ring-primary/40"
    >
      <RadioGroupItem id={`pay-${value}`} value={value} className="mt-1" />
      <div className="text-sm">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
    </label>
  );
}

function Row({
  label,
  value,
  tone,
  muted = false,
}: {
  label: string;
  value: string;
  tone?: 'success';
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={muted ? 'text-muted-foreground' : ''}>{label}</dt>
      <dd
        className={
          tone === 'success'
            ? 'font-medium text-emerald-700 tabular-nums dark:text-emerald-400'
            : muted
              ? 'text-muted-foreground tabular-nums'
              : 'font-medium tabular-nums'
        }
      >
        {value}
      </dd>
    </div>
  );
}

function shippingPreview(method: ShippingMethod, lineTotalPaise: number): number {
  if (method === 'EXPRESS') return EXPRESS_SHIPPING_PAISE;
  if (method === 'SAME_DAY') return SAME_DAY_SHIPPING_PAISE;
  if (lineTotalPaise === 0) return 0;
  if (lineTotalPaise >= FREE_SHIPPING_THRESHOLD_PAISE) return 0;
  return FLAT_SHIPPING_PAISE;
}

function labelForShipping(method: ShippingMethod): string {
  if (method === 'EXPRESS') return 'Express';
  if (method === 'SAME_DAY') return 'Same-day';
  return 'Standard';
}
