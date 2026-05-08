import { Button, Hr, Section, Text } from '@react-email/components';
import { EmailLayout, emailStyles } from './_layout';

export type CartReminderTier = 1 | 2 | 3;

export interface CartAbandonedEmailProps {
  name: string | null;
  tier: CartReminderTier;
  itemCount: number;
  totalLabel: string;
  cartUrl: string;
  topItems: Array<{
    name: string;
    quantity: number;
    priceLabel: string;
  }>;
}

const COPY: Record<CartReminderTier, { heading: string; body: string; cta: string }> = {
  1: {
    heading: 'You left something in your cart',
    body: "We've saved your cart for the next time you're back. Pick up where you left off when you're ready.",
    cta: 'Resume checkout',
  },
  2: {
    heading: 'Still thinking it over?',
    body: 'Your cart is waiting. Stock can move quickly on popular items — finish your order to lock it in.',
    cta: 'Complete your order',
  },
  3: {
    heading: 'One last reminder',
    body: 'Your cart is still here, but a few items are running low across the catalogue. If you still want them, now is the moment.',
    cta: 'Check out now',
  },
};

export function CartAbandonedEmail({
  name,
  tier,
  itemCount,
  totalLabel,
  cartUrl,
  topItems,
}: CartAbandonedEmailProps) {
  const copy = COPY[tier];
  return (
    <EmailLayout preview={`${copy.heading} — ${itemCount === 1 ? '1 item' : `${itemCount} items`}`}>
      <Section>
        <Text style={emailStyles.heading}>
          {copy.heading}
          {name ? `, ${name}` : ''}
        </Text>
        <Text style={emailStyles.paragraph}>{copy.body}</Text>
        <Text style={emailStyles.paragraph}>
          <strong>
            {itemCount === 1 ? '1 item' : `${itemCount} items`} · {totalLabel}
          </strong>
        </Text>
        <Button href={cartUrl} style={emailStyles.button}>
          {copy.cta}
        </Button>
      </Section>
      {topItems.length > 0 ? (
        <>
          <Hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '24px 0' }} />
          <Section>
            <Text style={{ ...emailStyles.paragraph, marginBottom: 8 }}>
              <strong>In your cart</strong>
            </Text>
            {topItems.map((item) => (
              <Text key={`${item.name}-${item.quantity}`} style={emailStyles.fineprint}>
                {item.name} × {item.quantity} · {item.priceLabel}
              </Text>
            ))}
          </Section>
        </>
      ) : null}
      <Hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '24px 0' }} />
      <Section>
        <Text style={emailStyles.fineprint}>
          Don't want these reminders? You can{' '}
          <a href={`${cartUrl}#opt-out`} style={{ color: '#0f172a', textDecoration: 'underline' }}>
            unsubscribe
          </a>{' '}
          from cart reminders in your account preferences.
        </Text>
      </Section>
    </EmailLayout>
  );
}

export default CartAbandonedEmail;
