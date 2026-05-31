import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import type { ReactNode } from 'react';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME ?? 'Naman Enterprises';

const styles = {
  body: {
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,sans-serif',
    margin: 0,
    padding: 0,
  },
  container: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    margin: '40px auto',
    maxWidth: 560,
    padding: '40px 32px',
  },
  brand: { color: '#0f172a', fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em', margin: 0 },
  hr: { border: 0, borderTop: '1px solid #e2e8f0', margin: '32px 0' },
  footer: { color: '#64748b', fontSize: 12, lineHeight: 1.6, margin: 0 },
  link: { color: '#0f172a', textDecoration: 'underline' },
};

export function EmailLayout({ preview, children }: { preview: string; children: ReactNode }) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section>
            <Text style={styles.brand}>{STORE_NAME}</Text>
          </Section>
          <Hr style={styles.hr} />
          {children}
          <Hr style={styles.hr} />
          <Section>
            <Text style={styles.footer}>
              {STORE_NAME} ·{' '}
              <Link href={APP_URL} style={styles.link}>
                {APP_URL.replace(/^https?:\/\//, '')}
              </Link>
              <br />
              You're receiving this because an action was requested from your account. If it wasn't
              you, you can safely ignore this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const emailStyles = {
  heading: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    lineHeight: 1.3,
    margin: '0 0 16px',
  },
  paragraph: { color: '#334155', fontSize: 15, lineHeight: 1.6, margin: '0 0 16px' },
  button: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    color: '#ffffff',
    display: 'inline-block',
    fontSize: 15,
    fontWeight: 500,
    padding: '12px 24px',
    textDecoration: 'none',
  },
  fineprint: { color: '#64748b', fontSize: 13, lineHeight: 1.6, margin: '16px 0 0' },
  code: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    color: '#0f172a',
    display: 'inline-block',
    fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace',
    fontSize: 14,
    padding: '4px 8px',
    wordBreak: 'break-all' as const,
  },
};
