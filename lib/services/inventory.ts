import 'server-only';
import type { Prisma, StockMovementType } from '@prisma/client';
import { prisma } from '@/lib/db';

/**
 * Inventory audit helpers — write `StockMovement` rows alongside the actual
 * `ProductVariant.stock` decrement/increment that happens elsewhere. The
 * audit row is the durable record; the column is the cached count.
 *
 * All writes are best-effort: if the default warehouse hasn't been seeded
 * yet, we log and continue rather than fail the order pipeline. The order's
 * variant.stock column is still adjusted correctly inside the same TX.
 */

const DEFAULT_WAREHOUSE_CODE = process.env.DEFAULT_WAREHOUSE_CODE ?? 'DEFAULT';

let _cachedWarehouseId: string | null | undefined;

async function getDefaultWarehouseId(
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<string | null> {
  if (_cachedWarehouseId !== undefined) return _cachedWarehouseId;
  const row = await tx.warehouse.findFirst({
    where: { code: DEFAULT_WAREHOUSE_CODE, isActive: true },
    select: { id: true },
  });
  _cachedWarehouseId = row?.id ?? null;
  return _cachedWarehouseId;
}

/** Reset the cache. Used by tests / seed scripts. */
export function _resetWarehouseCache(): void {
  _cachedWarehouseId = undefined;
}

export interface MovementLine {
  variantId: string;
  quantity: number; // always positive — `type` controls direction
}

interface RecordMovementsArgs {
  tx?: Prisma.TransactionClient;
  type: StockMovementType;
  lines: MovementLine[];
  reason?: string;
  refType: 'Order' | 'Return' | 'Manual' | 'Adjustment';
  refId?: string | null;
  createdBy?: string | null;
}

export async function recordStockMovements(args: RecordMovementsArgs): Promise<void> {
  const client = args.tx ?? prisma;
  const warehouseId = await getDefaultWarehouseId(client);
  if (!warehouseId) {
    console.warn(
      '[inventory] no active warehouse with code',
      DEFAULT_WAREHOUSE_CODE,
      '— skipping StockMovement audit. Seed a warehouse via prisma/seed.ts.',
    );
    return;
  }
  if (args.lines.length === 0) return;
  await client.stockMovement.createMany({
    data: args.lines.map((l) => ({
      variantId: l.variantId,
      warehouseId,
      type: args.type,
      quantity: l.quantity,
      reason: args.reason ?? null,
      refType: args.refType,
      refId: args.refId ?? null,
      createdBy: args.createdBy ?? null,
    })),
  });
}
