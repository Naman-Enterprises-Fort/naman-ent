import Link from 'next/link';
import { Suspense } from 'react';
import { AuthCard } from '@/components/auth/auth-card';
import { LoginForm } from '@/components/auth/login-form';

export const metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <AuthCard
      title="Sign in"
      description="Welcome back. Sign in to continue shopping."
      footer={
        <p className="text-muted-foreground">
          New here?{' '}
          <Link href="/register" className="font-medium text-foreground hover:underline">
            Create an account
          </Link>
        </p>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
