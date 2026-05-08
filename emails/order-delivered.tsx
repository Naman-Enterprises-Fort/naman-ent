import { Button, Hr, Section, Text } from '@react-email/components';
import { EmailLayout, emailStyles } from './_layout';

export interface OrderDeliveredEmailProps {
  name: string | null;
  orderNumber: string;
  itemCount: number;
  orderUrl: string;
  returnByDate?: string | null;
}

export function OrderDeliveredEmail({
  name,
  orderNumber,
  itemCount,
  orderUrl,
  returnByDate,
}: OrderDeliveredEmailProps) {
  return (
    <EmailLayout preview={`Order ${orderNumber} delivered`}>
      <Section>
        <Text style={emailStyles.heading}>Delivered{name ? `, ${name}` : ''}</Text>
        <Text style={emailStyles.paragraph}>
          Your order <strong>{orderNumber}</strong> has been delivered.{' '}
          {itemCount === 1 ? 'Hope you love it.' : 'Hope you love them.'}
        </Text>
        <Text style={emailStyles.paragraph}>
          A short rating helps other shoppers and helps us improve — when you have a moment, please
          tell us what you think.
        </Text>
        <Button href={orderUrl} style={emailStyles.button}>
          View order
        </Button>
      </Section>
      <Hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '24px 0' }} />
      <Section>
        <Text style={emailStyles.fineprint}>
          Something not right? You can start a return from{' '}
          <a href={orderUrl} style={{ color: '#0f172a', textDecoration: 'underline' }}>
            your order page
          </a>
          {returnByDate ? (
            <>
              {' '}
              until <strong>{returnByDate}</strong>
            </>
          ) : null}
          .
        </Text>
      </Section>
    </EmailLayout>
  );
}

export default OrderDeliveredEmail;
