import { render } from '@react-email/render';
import type { ReactElement } from 'react';
import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM_EMAIL ?? 'Naman Electronics <onboarding@resend.dev>';

const resend = apiKey ? new Resend(apiKey) : null;

export interface SendEmailInput {
  to: string;
  subject: string;
  react: ReactElement;
  // Optional plain-text fallback. If omitted, Resend derives one from the HTML.
  text?: string;
}

export async function sendEmail({ to, subject, react, text }: SendEmailInput): Promise<void> {
  if (!resend) {
    // No Resend creds — log to stdout for local dev so the verify/reset link
    // is recoverable. Production must set RESEND_API_KEY.
    const fallbackText = text ?? (await render(react, { plainText: true }));
    console.info('\n[email:dev] →', to, '|', subject, '\n', fallbackText, '\n');
    return;
  }

  const { error } = await resend.emails.send({ from, to, subject, react, text });
  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
}
