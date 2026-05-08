import { AddressListSection } from '@/components/account/address-list-section';
import { listAddresses } from '@/lib/services/addresses';
import { requireSession } from '@/lib/services/auth';

export const metadata = { title: 'Addresses' };
export const dynamic = 'force-dynamic';

export default async function AddressesPage() {
  const session = await requireSession();
  const rows = await listAddresses(session.user.id);
  // Map Prisma's Decimal/Date types to plain JSON for the client component.
  const addresses = rows.map((a) => ({
    id: a.id,
    label: a.label,
    fullName: a.fullName,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2,
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    country: a.country,
    isDefault: a.isDefault,
  }));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-semibold text-2xl tracking-tight">Addresses</h1>
        <p className="text-muted-foreground text-sm">
          Saved addresses are auto-filled at checkout. Set one as default to skip a step.
        </p>
      </header>
      <AddressListSection initial={addresses} />
    </div>
  );
}
