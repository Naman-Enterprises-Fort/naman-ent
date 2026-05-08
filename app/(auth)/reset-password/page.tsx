import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthCard } from '@/components/auth/auth-card';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata = { title: 'Reset password' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token || token.length < 20) redirect('/forgot-password');

  return (
    <AuthCard
      title="Choose a new password"
      description="Pick something you haven't used before. We'll sign you out everywhere else."
      footer={
        <p className="text-muted-foreground">
          Need a new link?{' '}
          <Link href="/forgot-password" className="font-medium text-foreground hover:underline">
            Request another
          </Link>
        </p>
      }
    >
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
