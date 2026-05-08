export const metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-16">
      <header className="space-y-2">
        <h1 className="font-semibold text-3xl tracking-tight">Sign in</h1>
        <p className="text-muted-foreground text-sm">
          Authentication ships in Sprint&nbsp;2. This is a Sprint&nbsp;0 placeholder.
        </p>
      </header>
    </main>
  );
}
