import { Button, Section, Text } from '@react-email/components';
import { EmailLayout, emailStyles } from './_layout';

export interface PasswordResetEmailProps {
  name: string | null;
  resetUrl: string;
}

export function PasswordResetEmail({ name, resetUrl }: PasswordResetEmailProps) {
  return (
    <EmailLayout preview="Reset your password">
      <Section>
        <Text style={emailStyles.heading}>Reset your password</Text>
        <Text style={emailStyles.paragraph}>
          {name ? `Hi ${name},` : 'Hi there,'} we received a request to reset the password on your
          account. Click the button below to choose a new one.
        </Text>
        <Button href={resetUrl} style={emailStyles.button}>
          Reset password
        </Button>
        <Text style={emailStyles.fineprint}>
          Or paste this link into your browser: <span style={emailStyles.code}>{resetUrl}</span>
        </Text>
        <Text style={emailStyles.fineprint}>
          This link expires in 15 minutes. If you didn't request a reset, you can safely ignore this
          email — your password won't change.
        </Text>
      </Section>
    </EmailLayout>
  );
}

export default PasswordResetEmail;
