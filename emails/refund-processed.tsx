import { Button, Hr, Section, Text } from '@react-email/components';
import { EmailLayout, emailStyles } from './_layout';

export interface RefundProcessedEmailProps {
  name: string | null;
  orderNumber: string;
  refundLabel: string;
  paymentMethodLabel: string;
  isPartial: boolean;
  orderUrl: string;
}

export function RefundProcessedEmail({
  name,
  orderNumber,
  refundLabel,
  paymentMethodLabel,
  isPartial,
  orderUrl,
}: RefundProcessedEmailProps) {
  return (
    <EmailLayout preview={`Refund of ${refundLabel} processed`}>
      <Section>
        <Text style={emailStyles.heading}>
          {isPartial ? 'Partial refund processed' : 'Refund processed'}
        </Text>
        <Text style={emailStyles.paragraph}>
          {name ? `Hi ${name}, ` : 'Hi, '}
          we've processed a refund of <strong>{refundLabel}</strong> for order{' '}
          <strong>{orderNumber}</strong>.
        </Text>
        <Text style={emailStyles.paragraph}>
          The amount has been sent back to your original payment method ({paymentMethodLabel}) and
          should reflect in <strong>5–7 business days</strong>, subject to your bank's processing
          time.
        </Text>
        <Button href={orderUrl} style={emailStyles.button}>
          View order
        </Button>
      </Section>
      <Hr style={{ border: 0, borderTop: '1px solid #e2e8f0', margin: '24px 0' }} />
      <Section>
        <Text style={emailStyles.fineprint}>
          Don't see the credit after a week? Reply to this email with your bank statement and we'll
          chase it on your behalf.
        </Text>
      </Section>
    </EmailLayout>
  );
}

export default RefundProcessedEmail;
