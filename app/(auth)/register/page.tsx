import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata = { title: 'Create an account' };

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Sign up in seconds — we'll email you a link to confirm."
      footer={
        <p className="text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
