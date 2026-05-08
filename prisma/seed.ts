/**
 * Local-dev seed for Sprint 1.
 *
 * Run with:  pnpm prisma db seed
 *
 * Inserts a handful of categories, brands, and products with variants/images/specs
 * so the public catalog (Home / PLP / PDP / search) renders without a real
 * data ingestion pipeline. Idempotent: re-running upserts on slug.
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config({ path: '.env.local' });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL missing — copy .env.example to .env.local first.');
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=1200&q=80';

const categories = [
  { name: 'Smartphones', slug: 'smartphones', position: 0 },
  { name: 'Laptops', slug: 'laptops', position: 1 },
  { name: 'Audio', slug: 'audio', position: 2 },
  { name: 'Wearables', slug: 'wearables', position: 3 },
  { name: 'Smart Home', slug: 'smart-home', position: 4 },
  { name: 'Gaming', slug: 'gaming', position: 5 },
] as const;

const brands = [
  { name: 'Apple', slug: 'apple' },
  { name: 'Samsung', slug: 'samsung' },
  { name: 'Sony', slug: 'sony' },
  { name: 'OnePlus', slug: 'oneplus' },
  { name: 'Boat', slug: 'boat' },
  { name: 'Dell', slug: 'dell' },
] as const;

type SeedProduct = {
  name: string;
  slug: string;
  brand: (typeof brands)[number]['slug'];
  category: (typeof categories)[number]['slug'];
  shortDesc: string;
  description: string;
  hsnCode: string;
  warrantyMonths?: number;
  warrantyType?: string;
  variants: {
    sku: string;
    mrp: number;
    price: number;
    stock: number;
    attributes?: Record<string, string>;
    isDefault?: boolean;
  }[];
  specs: { group: string; key: string; value: string }[];
};

const products: SeedProduct[] = [
  {
    name: 'iPhone 15 Pro',
    slug: 'iphone-15-pro',
    brand: 'apple',
    category: 'smartphones',
    shortDesc: 'A17 Pro chip, titanium design, 48MP camera system.',
    description:
      'iPhone 15 Pro is forged in titanium and features the groundbreaking A17 Pro chip, a customisable Action button, and the most powerful iPhone camera system ever.\n\nCapture stunning images with the new 48MP Main camera, and shoot ProRes video directly to external storage over USB‑C.',
    hsnCode: '85171211',
    warrantyMonths: 12,
    warrantyType: 'Manufacturer',
    variants: [
      {
        sku: 'IP15P-128-NTL',
        mrp: 134900,
        price: 129900,
        stock: 12,
        attributes: { color: 'Natural Titanium', storage: '128GB' },
        isDefault: true,
      },
      {
        sku: 'IP15P-256-NTL',
        mrp: 144900,
        price: 139900,
        stock: 8,
        attributes: { color: 'Natural Titanium', storage: '256GB' },
      },
      {
        sku: 'IP15P-256-BLU',
        mrp: 144900,
        price: 139900,
        stock: 4,
        attributes: { color: 'Blue Titanium', storage: '256GB' },
      },
    ],
    specs: [
      { group: 'Display', key: 'Size', value: '6.1-inch Super Retina XDR' },
      { group: 'Display', key: 'Refresh rate', value: 'ProMotion 120Hz' },
      { group: 'Performance', key: 'Chip', value: 'Apple A17 Pro' },
      { group: 'Camera', key: 'Main', value: '48MP, ƒ/1.78' },
      { group: 'Battery', key: 'Charging', value: 'USB-C, MagSafe wireless' },
    ],
  },
  {
    name: 'Galaxy S24 Ultra',
    slug: 'galaxy-s24-ultra',
    brand: 'samsung',
    category: 'smartphones',
    shortDesc: 'Snapdragon 8 Gen 3, 200MP camera, built-in S Pen.',
    description:
      'Galaxy S24 Ultra brings titanium frame, Galaxy AI, and a 200MP camera with up to 100x Space Zoom — all powered by the Snapdragon 8 Gen 3 for Galaxy.',
    hsnCode: '85171211',
    warrantyMonths: 12,
    warrantyType: 'Manufacturer',
    variants: [
      {
        sku: 'S24U-256-BLK',
        mrp: 134999,
        price: 124999,
        stock: 10,
        attributes: { color: 'Titanium Black', storage: '256GB' },
        isDefault: true,
      },
      {
        sku: 'S24U-512-BLK',
        mrp: 144999,
        price: 134999,
        stock: 6,
        attributes: { color: 'Titanium Black', storage: '512GB' },
      },
    ],
    specs: [
      { group: 'Display', key: 'Size', value: '6.8-inch QHD+ Dynamic AMOLED 2X' },
      { group: 'Performance', key: 'Chip', value: 'Snapdragon 8 Gen 3 for Galaxy' },
      { group: 'Camera', key: 'Main', value: '200MP, OIS' },
      { group: 'Battery', key: 'Capacity', value: '5000mAh' },
    ],
  },
  {
    name: 'OnePlus 12',
    slug: 'oneplus-12',
    brand: 'oneplus',
    category: 'smartphones',
    shortDesc: 'Snapdragon 8 Gen 3, 5400mAh battery, 100W charging.',
    description:
      'OnePlus 12 packs flagship performance with the Snapdragon 8 Gen 3, a 50MP Hasselblad triple camera, and 100W SuperVOOC charging.',
    hsnCode: '85171211',
    warrantyMonths: 12,
    variants: [
      {
        sku: 'OP12-256-BLK',
        mrp: 64999,
        price: 59999,
        stock: 15,
        attributes: { color: 'Silky Black', storage: '256GB' },
        isDefault: true,
      },
      {
        sku: 'OP12-512-EME',
        mrp: 69999,
        price: 64999,
        stock: 9,
        attributes: { color: 'Flowy Emerald', storage: '512GB' },
      },
    ],
    specs: [
      { group: 'Display', key: 'Size', value: '6.82-inch LTPO AMOLED' },
      { group: 'Performance', key: 'Chip', value: 'Snapdragon 8 Gen 3' },
      { group: 'Battery', key: 'Charging', value: '100W wired, 50W wireless' },
    ],
  },
  {
    name: 'Sony WH-1000XM5',
    slug: 'sony-wh-1000xm5',
    brand: 'sony',
    category: 'audio',
    shortDesc: 'Industry-leading noise cancellation, 30-hour battery.',
    description:
      'Sony WH-1000XM5 delivers two processors controlling 8 microphones for unprecedented noise cancellation, plus 30 hours of playback and crystal-clear hands-free calling.',
    hsnCode: '85183000',
    warrantyMonths: 12,
    variants: [
      {
        sku: 'WH1000XM5-BLK',
        mrp: 34990,
        price: 26990,
        stock: 22,
        attributes: { color: 'Black' },
        isDefault: true,
      },
      {
        sku: 'WH1000XM5-SLV',
        mrp: 34990,
        price: 26990,
        stock: 14,
        attributes: { color: 'Silver' },
      },
    ],
    specs: [
      { group: 'Audio', key: 'Driver', value: '30mm' },
      { group: 'Battery', key: 'Playback', value: 'Up to 30 hours' },
      { group: 'Connectivity', key: 'Bluetooth', value: '5.2, multipoint' },
    ],
  },
  {
    name: 'Boat Airdopes 141',
    slug: 'boat-airdopes-141',
    brand: 'boat',
    category: 'audio',
    shortDesc: 'TWS earbuds with 42-hour playback and ENx tech.',
    description:
      'Compact, comfortable, and built for India — Airdopes 141 deliver up to 42 hours of total playback, IPX4 sweat resistance, and ENx-powered calls.',
    hsnCode: '85183000',
    warrantyMonths: 12,
    variants: [
      {
        sku: 'BOAT-141-BLU',
        mrp: 2990,
        price: 1199,
        stock: 60,
        attributes: { color: 'Bold Blue' },
        isDefault: true,
      },
      {
        sku: 'BOAT-141-RED',
        mrp: 2990,
        price: 1199,
        stock: 35,
        attributes: { color: 'Active Red' },
      },
    ],
    specs: [
      { group: 'Audio', key: 'Driver', value: '8mm' },
      { group: 'Battery', key: 'Total playback', value: '42 hours' },
      { group: 'Durability', key: 'Rating', value: 'IPX4' },
    ],
  },
  {
    name: 'Dell XPS 13',
    slug: 'dell-xps-13',
    brand: 'dell',
    category: 'laptops',
    shortDesc: 'Intel Core Ultra 7, 16GB LPDDR5X, 13.4-inch InfinityEdge.',
    description:
      'The Dell XPS 13 is a precision-crafted 13.4-inch laptop with Intel Core Ultra processors, edge-to-edge keyboard, and an immersive InfinityEdge display.',
    hsnCode: '84713010',
    warrantyMonths: 12,
    warrantyType: 'Onsite',
    variants: [
      {
        sku: 'XPS13-U7-512',
        mrp: 159990,
        price: 144990,
        stock: 5,
        attributes: { processor: 'Core Ultra 7', storage: '512GB' },
        isDefault: true,
      },
      {
        sku: 'XPS13-U7-1TB',
        mrp: 174990,
        price: 159990,
        stock: 3,
        attributes: { processor: 'Core Ultra 7', storage: '1TB' },
      },
    ],
    specs: [
      { group: 'Display', key: 'Size', value: '13.4-inch FHD+ InfinityEdge' },
      { group: 'Performance', key: 'CPU', value: 'Intel Core Ultra 7' },
      { group: 'Memory', key: 'RAM', value: '16GB LPDDR5X' },
    ],
  },
  {
    name: 'Apple Watch Series 9',
    slug: 'apple-watch-series-9',
    brand: 'apple',
    category: 'wearables',
    shortDesc: 'S9 SiP, double-tap, brighter Always-On Retina display.',
    description:
      'Apple Watch Series 9 features the powerful S9 SiP, a magical double-tap gesture, and the brightest display ever on Apple Watch.',
    hsnCode: '85176290',
    warrantyMonths: 12,
    variants: [
      {
        sku: 'AW9-41-MID',
        mrp: 41900,
        price: 41900,
        stock: 11,
        attributes: { size: '41mm', color: 'Midnight' },
        isDefault: true,
      },
      {
        sku: 'AW9-45-MID',
        mrp: 44900,
        price: 44900,
        stock: 7,
        attributes: { size: '45mm', color: 'Midnight' },
      },
    ],
    specs: [
      { group: 'Display', key: 'Type', value: 'Always-On Retina LTPO OLED' },
      { group: 'Health', key: 'Sensors', value: 'Heart rate, ECG, Blood Oxygen' },
      { group: 'Battery', key: 'Life', value: 'Up to 18 hours' },
    ],
  },
  {
    name: 'PlayStation 5 Slim',
    slug: 'playstation-5-slim',
    brand: 'sony',
    category: 'gaming',
    shortDesc: 'Slim design, 1TB SSD, 4K UHD Blu-ray.',
    description:
      'PlayStation 5 Slim brings a sleeker design and a 1TB SSD to the next-generation gaming experience, with lightning-fast loading and stunning visuals.',
    hsnCode: '95045000',
    warrantyMonths: 12,
    variants: [
      {
        sku: 'PS5-SLIM-DISC',
        mrp: 54990,
        price: 49990,
        stock: 9,
        attributes: { edition: 'Disc' },
        isDefault: true,
      },
      {
        sku: 'PS5-SLIM-DGTL',
        mrp: 44990,
        price: 41990,
        stock: 12,
        attributes: { edition: 'Digital' },
      },
    ],
    specs: [
      { group: 'Storage', key: 'SSD', value: '1TB custom NVMe' },
      { group: 'Output', key: 'Resolution', value: 'Up to 4K UHD' },
      { group: 'Audio', key: 'Engine', value: 'Tempest 3D AudioTech' },
    ],
  },
];

async function main() {
  console.info('Seeding default warehouse...');
  // Sprint 5C: a single default warehouse anchors the StockMovement audit
  // rows and the Shiprocket pickup location. Match `DEFAULT_WAREHOUSE_CODE`
  // env var (default "DEFAULT").
  await prisma.warehouse.upsert({
    where: { code: 'DEFAULT' },
    create: {
      name: 'Naman Electronics — Mumbai HQ',
      code: 'DEFAULT',
      line1: 'TODO: Warehouse address line 1',
      line2: null,
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'IN',
      isActive: true,
    },
    update: { isActive: true },
  });

  console.info('Seeding categories...');
  const categoryRows = await Promise.all(
    categories.map((c) =>
      prisma.category.upsert({
        where: { slug: c.slug },
        create: {
          name: c.name,
          slug: c.slug,
          position: c.position,
          isActive: true,
        },
        update: {
          name: c.name,
          position: c.position,
          isActive: true,
        },
      }),
    ),
  );
  const categoryBySlug = new Map(categoryRows.map((c) => [c.slug, c.id]));

  console.info('Seeding brands...');
  const brandRows = await Promise.all(
    brands.map((b) =>
      prisma.brand.upsert({
        where: { slug: b.slug },
        create: { name: b.name, slug: b.slug, isActive: true },
        update: { name: b.name, isActive: true },
      }),
    ),
  );
  const brandBySlug = new Map(brandRows.map((b) => [b.slug, b.id]));

  console.info('Seeding products...');
  for (const p of products) {
    const brandId = brandBySlug.get(p.brand);
    const categoryId = categoryBySlug.get(p.category);
    if (!brandId || !categoryId) continue;

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      create: {
        name: p.name,
        slug: p.slug,
        brandId,
        description: p.description,
        shortDesc: p.shortDesc,
        status: 'ACTIVE',
        hsnCode: p.hsnCode,
        countryOfOrigin: 'India',
        warrantyMonths: p.warrantyMonths,
        warrantyType: p.warrantyType,
        boxContents: ['Device', 'Charger', 'Documentation'],
      },
      update: {
        name: p.name,
        description: p.description,
        shortDesc: p.shortDesc,
        status: 'ACTIVE',
        hsnCode: p.hsnCode,
        warrantyMonths: p.warrantyMonths,
        warrantyType: p.warrantyType,
      },
    });

    await prisma.productCategory.upsert({
      where: { productId_categoryId: { productId: product.id, categoryId } },
      create: { productId: product.id, categoryId },
      update: {},
    });

    for (const v of p.variants) {
      await prisma.productVariant.upsert({
        where: { sku: v.sku },
        create: {
          productId: product.id,
          sku: v.sku,
          mrp: v.mrp,
          price: v.price,
          stock: v.stock,
          isDefault: v.isDefault ?? false,
          attributes: v.attributes ?? {},
        },
        update: {
          mrp: v.mrp,
          price: v.price,
          stock: v.stock,
          isDefault: v.isDefault ?? false,
          attributes: v.attributes ?? {},
        },
      });
    }

    const existingImages = await prisma.productImage.count({ where: { productId: product.id } });
    if (existingImages === 0) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: PLACEHOLDER_IMG,
          alt: p.name,
          isPrimary: true,
          position: 0,
        },
      });
    }

    await prisma.productSpec.deleteMany({ where: { productId: product.id } });
    if (p.specs.length) {
      await prisma.productSpec.createMany({
        data: p.specs.map((s, i) => ({
          productId: product.id,
          group: s.group,
          key: s.key,
          value: s.value,
          position: i,
        })),
      });
    }
  }

  console.info(
    `Seeded ${categoryRows.length} categories, ${brandRows.length} brands, ${products.length} products.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
