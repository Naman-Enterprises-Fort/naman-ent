'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

type Spec = {
  id: string;
  group: string;
  key: string;
  value: string;
};

export function SpecsAccordion({ specs }: { specs: Spec[] }) {
  if (!specs.length) return null;

  const grouped = new Map<string, Spec[]>();
  for (const s of specs) {
    const list = grouped.get(s.group) ?? [];
    list.push(s);
    grouped.set(s.group, list);
  }

  return (
    <section aria-labelledby="specs-heading" className="flex flex-col gap-4">
      <h2 id="specs-heading" className="font-semibold text-xl tracking-tight">
        Specifications
      </h2>
      <Accordion
        type="multiple"
        className="rounded-lg border"
        defaultValue={[Array.from(grouped.keys())[0] ?? '']}
      >
        {Array.from(grouped.entries()).map(([group, rows]) => (
          <AccordionItem key={group} value={group} className="px-4">
            <AccordionTrigger className="font-medium text-sm">{group}</AccordionTrigger>
            <AccordionContent>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {rows.map((r) => (
                  <div key={r.id} className="flex flex-col">
                    <dt className="text-muted-foreground text-xs uppercase tracking-wide">
                      {r.key}
                    </dt>
                    <dd className="text-sm">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
