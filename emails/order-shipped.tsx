import { Button, Hr, Section, Text } from '@react-email/components';
import { EmailLayout, emailStyles } from './_layout';

export interface OrderShippedEmailProps {
  name: string | null;
  orderNumber: string;
  itemCount: number;
  trackUrl: string;
  courier?: string | null;
  awb?: string | null;
  estimatedDelivery?: string | null;
  shipping: {
    fullName: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    pincode: string;
  };
}

export function OrderShippedEmail({
  name,
  orderNumber,
  itemCount,
  trackUrl,
  courier,
  awb,
  estimatedDelivery,
  shipping,
}: OrderShippedEmailProps) {
  return (
    <EmailLayout preview={`Order ${orderNumber} is on the way`}>
      <Section>
        <Text style={emailStyles.heading}>Your order is on the way</Text>
        <Text style={emailStyles.paragraph}>
          {name ? `Hi ${name}, ` : 'Hi, '}
          we've handed your order <strong>{orderNumber}</strong> to the courier.{' '}
          {itemCount === 1 ? '1 item' : `${itemCount} items`} are heading your way
          {estimatedDelivery ? `, expected by ${estimatedDelivery}` : ''}.
        </Text>
        {courier || awb ? (
          <Text style={emailStyles.fineprint}>
            {courier ? (
              <>
                Courier: <strong>{courier}</strong>
              </>
            ) : null}
            {courier && awb ? ' · ' : ''}
            {awb ? (
              <>
                Tracking: <span style={emailStyles.code}>{awb}</span>
              </>
            ) : null}
          </Text>
        ) : null}
        <Button href={trackUrl} style={emailStyles.button}>
          Track order
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

export default OrderShippedEmail;
