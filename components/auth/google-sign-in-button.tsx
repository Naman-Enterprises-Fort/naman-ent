'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function GoogleSignInButton({ callbackUrl = '/account' }: { callbackUrl?: string }) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={pending}
      onClick={() => {
        setPending(true);
        signIn('google', { callbackUrl }).catch(() => setPending(false));
      }}
    >
      <GoogleIcon />
      {pending ? 'Redirecting…' : 'Continue with Google'}
    </Button>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4">
      <title>Google</title>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.5-1.7 4.3-5.5 4.3-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.6 14.6 2.7 12 2.7 6.9 2.7 2.8 6.8 2.8 12s4.1 9.3 9.2 9.3c5.3 0 8.8-3.7 8.8-9 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}
