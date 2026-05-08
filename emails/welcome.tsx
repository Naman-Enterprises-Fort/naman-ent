import { Button, Section, Text } from '@react-email/components';
import { EmailLayout, emailStyles } from './_layout';

export interface WelcomeEmailProps {
  name: string | null;
  shopUrl: string;
}

export function WelcomeEmail({ name, shopUrl }: WelcomeEmailProps) {
  return (
    <EmailLayout preview="Welcome to Naman Electronics">
      <Section>
        <Text style={emailStyles.heading}>Welcome{name ? `, ${name}` : ''}</Text>
        <Text style={emailStyles.paragraph}>
          Your email is verified and your account is ready. Browse the catalogue, save items to your
          wishlist, and enjoy fast doorstep delivery across India.
        </Text>
        <Button href={shopUrl} style={emailStyles.button}>
          Start shopping
        </Button>
      </Section>
    </EmailLayout>
  );
}

export default WelcomeEmail;
