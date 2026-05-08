import type { ReactNode } from 'react';

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>;
}
