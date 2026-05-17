import { Heading, Hr, Section, Text } from '@react-email/components';
import { EmailLayout } from './_layout';

interface ContactInquiryEmailProps {
  name: string;
  email: string;
  phone?: string;
  subjectLabel: string;
  message: string;
  submittedAt: string;
}

/**
 * Internal notification email sent to the support inbox when a customer
 * submits the contact form on `/contact`. The customer's name + email + phone
 * are echoed verbatim so support can hit Reply and reach them directly.
 */
export function ContactInquiryEmail({
  name,
  email,
  phone,
  subjectLabel,
  message,
  submittedAt,
}: ContactInquiryEmailProps) {
  return (
    <EmailLayout preview={`${subjectLabel} from ${name}`}>
      <Heading as="h1" style={{ fontSize: 22, margin: '0 0 12px' }}>
        New contact-form enquiry
      </Heading>
      <Text style={{ margin: '0 0 16px', color: '#475569' }}>
        Received {submittedAt} via the public contact form.
      </Text>

      <Section style={{ backgroundColor: '#f8fafc', padding: 16, borderRadius: 8 }}>
        <Text style={row}>
          <strong style={label}>From</strong> {name}
        </Text>
        <Text style={row}>
          <strong style={label}>Email</strong>{' '}
          <a href={`mailto:${email}`} style={{ color: '#0ea5e9' }}>
            {email}
          </a>
        </Text>
        {phone ? (
          <Text style={row}>
            <strong style={label}>Phone</strong> {phone}
          </Text>
        ) : null}
        <Text style={row}>
          <strong style={label}>Subject</strong> {subjectLabel}
        </Text>
      </Section>

      <Hr style={{ borderColor: '#e2e8f0', margin: '20px 0' }} />

      <Heading as="h2" style={{ fontSize: 16, margin: '0 0 8px' }}>
        Message
      </Heading>
      <Text style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6 }}>{message}</Text>
    </EmailLayout>
  );
}

const row = { margin: '4px 0' };
const label = {
  display: 'inline-block',
  width: 80,
  color: '#475569',
  fontSize: 12,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
};
