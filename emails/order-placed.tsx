import { Button, Hr, Section, Text } from '@react-email/components';
import { EmailLayout, emailStyles } from './_layout';

export interface OrderPlacedEmailProps {
  name: string | null;
  orderNumber: string;
  totalLabel: string;
  isCod: boolean;
  itemCount: number;
  trackUrl: string;
  shipping: {
    fullName: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pincode: string;
  };
}

export function OrderPlacedEmail({
  name,
  orderNumber,
  totalLabel,
  isCod,
  itemCount,
  trackUrl,
  shipping,
}: OrderPlacedEmailProps) {
  return (
    <EmailLayout preview={`Order ${orderNumber} — confirmed`}>
      <Section>
        <Text style={emailStyles.heading}>Thank you{name ? `, ${name}` : ''}</Text>
        <Text style={emailStyles.paragraph}>
          Your order <strong>{orderNumber}</strong> has been placed.{' '}
          {itemCount === 1 ? '1 item' : `${itemCount} items`} for <strong>{totalLabel}</strong>
          {isCod ? ' — to be collected on delivery' : ' — payment received'}.
        </Text>
        <Button href={trackUrl} style={emailStyles.button}>
          View order
        </Button>
      </Section>
      <Hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '24px 0' }} />
      <Section>
        <Text style={{ ...emailStyles.paragraph, marginBottom: 4 }}>
          <strong>Delivering to</strong>
        </Text>
        <Text style={emailStyles.fineprint}>
          {shipping.fullName}
          <br />
          {shipping.line1}
          {shipping.line2 ? `, ${shipping.line2}` : ''}
          <br />
          {shipping.city}, {shipping.state} {shipping.pincode}
        </Text>
      </Section>
    </EmailLayout>
  );
}

export default OrderPlacedEmail;
