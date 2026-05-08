import { Button, Section, Text } from '@react-email/components';
import { EmailLayout, emailStyles } from './_layout';

export interface VerifyEmailProps {
  name: string | null;
  verifyUrl: string;
}

export function VerifyEmail({ name, verifyUrl }: VerifyEmailProps) {
  return (
    <EmailLayout preview="Confirm your email to finish setting up your account">
      <Section>
        <Text style={emailStyles.heading}>Confirm your email</Text>
        <Text style={emailStyles.paragraph}>
          {name ? `Hi ${name},` : 'Hi there,'} thanks for signing up. Click the button below to
          verify your email address and finish setting up your account.
        </Text>
        <Button href={verifyUrl} style={emailStyles.button}>
          Verify email
        </Button>
        <Text style={emailStyles.fineprint}>
          Or paste this link into your browser: <span style={emailStyles.code}>{verifyUrl}</span>
        </Text>
        <Text style={emailStyles.fineprint}>This link expires in 24 hours.</Text>
      </Section>
    </EmailLayout>
  );
}

export default VerifyEmail;
