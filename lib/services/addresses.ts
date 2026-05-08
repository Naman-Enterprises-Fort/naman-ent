import 'server-only';
import { prisma } from '@/lib/db';
import type { CreateAddressInput, UpdateAddressInput } from '@/lib/validators/account';

export async function listAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function getAddress(userId: string, id: string) {
  return prisma.address.findFirst({ where: { id, userId } });
}

export async function createAddress(userId: string, input: CreateAddressInput) {
  // Enforce single-default invariant atomically.
  return prisma.$transaction(async (tx) => {
    const count = await tx.address.count({ where: { userId } });
    const shouldBeDefault = input.isDefault || count === 0;
    if (shouldBeDefault) {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return tx.address.create({
      data: {
        userId,
        label: input.label ?? null,
        fullName: input.fullName,
        phone: input.phone.replace(/^\+91/, ''),
        line1: input.line1,
        line2: input.line2 ?? null,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        country: input.country,
        isDefault: shouldBeDefault,
      },
    });
  });
}

export async function updateAddress(userId: string, input: UpdateAddressInput) {
  const { id, isDefault, phone, ...rest } = input;
  return prisma.$transaction(async (tx) => {
    const existing = await tx.address.findFirst({ where: { id, userId } });
    if (!existing) return null;
    if (isDefault === true) {
      await tx.address.updateMany({
        where: { userId, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }
    return tx.address.update({
      where: { id },
      data: {
        ...rest,
        phone: phone ? phone.replace(/^\+91/, '') : undefined,
        isDefault: isDefault ?? undefined,
      },
    });
  });
}

export async function deleteAddress(userId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.address.findFirst({ where: { id, userId } });
    if (!existing) return false;
    await tx.address.delete({ where: { id } });
    // If we just deleted the default, promote the next-most-recent to default.
    if (existing.isDefault) {
      const nextDefault = await tx.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      if (nextDefault) {
        await tx.address.update({ where: { id: nextDefault.id }, data: { isDefault: true } });
      }
    }
    return true;
  });
}

export async function setDefaultAddress(userId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.address.findFirst({ where: { id, userId } });
    if (!existing) return null;
    await tx.address.updateMany({
      where: { userId, isDefault: true, NOT: { id } },
      data: { isDefault: false },
    });
    return tx.address.update({ where: { id }, data: { isDefault: true } });
  });
}
