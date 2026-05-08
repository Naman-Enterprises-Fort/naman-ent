'use client';

import { ChevronRight, Menu } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

type Node = {
  id: string;
  name: string;
  slug: string;
  children: Node[];
};

export function MobileMenu({ nav }: { nav: Node[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open navigation menu" className="md:hidden">
          <Menu aria-hidden className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="border-b">
          <SheetTitle>Categories</SheetTitle>
          <SheetDescription className="sr-only">Browse all product categories</SheetDescription>
        </SheetHeader>
        <nav aria-label="Mobile primary navigation" className="flex-1 overflow-y-auto">
          <ul className="divide-y">
            {nav.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/category/${c.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between gap-3 px-4 py-3 font-medium text-sm transition-colors hover:bg-accent"
                >
                  <span>{c.name}</span>
                  <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
                </Link>
                {c.children.length > 0 && (
                  <ul className="border-t bg-muted/30 px-3 pb-2">
                    {c.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={`/category/${child.slug}`}
                          onClick={() => setOpen(false)}
                          className="block rounded-md px-3 py-2 text-muted-foreground text-sm hover:bg-background hover:text-foreground"
                        >
                          {child.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            {nav.length === 0 && (
              <li className="px-4 py-6 text-muted-foreground text-sm">
                Catalog is being prepared. Check back soon.
              </li>
            )}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
