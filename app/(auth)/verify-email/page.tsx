import { CheckCircle2, MailWarning, XCircle } from 'lucide-react';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { ResendVerificationForm } from '@/components/auth/resend-verification-form';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Verify email' };

type Status = 'success' | 'expired' | 'invalid' | 'pending';

function pickStatus(value: string | undefined): Status {
  if (value === 'success' || value === 'expired' || value === 'invalid') return value;
  return 'pending';
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: rawStatus } = await searchParams;
  const status = pickStatus(rawStatus);

  if (status === 'success') {
    return (
      <AuthCard title="Email verified" description="Your account is ready to go.">
        <div className="flex flex-col items-center gap-4 py-2">
          <CheckCircle2 className="size-10 text-emerald-600" aria-hidden />
          <p className="text-center text-muted-foreground text-sm">
            Thanks for confirming your email. You can sign in now.
          </p>
          <Button asChild className="w-full">
            <Link href="/login?verified=1">Continue to sign in</Link>
          </Button>
        </div>
      </AuthCard>
    );
  }

  if (status === 'expired' || status === 'invalid') {
    return (
      <AuthCard
        title={status === 'expired' ? 'Link expired' : 'Invalid link'}
        description="No problem — request a new verification email and we'll send a fresh link."
      >
        <div className="flex flex-col items-center gap-4 py-2">
          <XCircle className="size-10 text-destructive" aria-hidden />
        </div>
        <ResendVerificationForm />
      </AuthCard>
    );
  }

  // Pending state: arrived here without a token (e.g., after registering).
  return (
    <AuthCard title="Verify your email" description="We've sent a confirmation link to your inbox.">
      <div className="flex flex-col items-center gap-4 py-2">
        <MailWarning className="size-10 text-foreground" aria-hidden />
        <p className="text-center text-muted-foreground text-sm">
          Click the link in the email to activate your account. Didn't get it? Request a fresh one
          below.
        </p>
      </div>
      <ResendVerificationForm />
    </AuthCard>
  );
}
