import type { ReactNode } from 'react';
import { Breadcrumbs } from '@/components/shop/breadcrumbs';

type Props = {
  title: string;
  description?: string;
  lastUpdated: string;
  breadcrumbLabel?: string;
  children: ReactNode;
};

export function LegalArticle({
  title,
  description,
  lastUpdated,
  breadcrumbLabel,
  children,
}: Props) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6 md:py-12">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: breadcrumbLabel ?? title }]} />
      <header className="flex flex-col gap-3 border-b pb-6">
        <h1 className="font-semibold text-3xl tracking-tight md:text-4xl">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-balance text-muted-foreground">{description}</p>
        ) : null}
        <p className="text-muted-foreground text-xs uppercase tracking-wider">
          Last updated: {lastUpdated}
        </p>
      </header>
      <article className="flex flex-col gap-8 text-foreground/90 text-sm leading-relaxed">
        {children}
      </article>
    </div>
  );
}

export function LegalSection({
  id,
  heading,
  children,
}: {
  id?: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-heading` : undefined}
      className="flex flex-col gap-3"
    >
      <h2
        id={id ? `${id}-heading` : undefined}
        className="font-semibold text-foreground text-xl tracking-tight"
      >
        {heading}
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

export function LegalList({ children }: { children: ReactNode }) {
  return (
    <ul className="ml-5 flex list-disc flex-col gap-2 marker:text-muted-foreground">{children}</ul>
  );
}
