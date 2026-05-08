'use client';

import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { type Facet, FilterSidebar } from './filter-sidebar';

export function MobileFilterSheet({ brandFacets }: { brandFacets: Facet[] }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 lg:hidden">
          <SlidersHorizontal aria-hidden className="size-4" />
          Filters
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto p-0">
        <SheetHeader className="border-b">
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription className="sr-only">
            Refine the product list by brand, price, and availability
          </SheetDescription>
        </SheetHeader>
        <FilterSidebar brandFacets={brandFacets} className="p-4" />
      </SheetContent>
    </Sheet>
  );
}
