/**
 * Local-dev seed.
 *
 * Run with:  pnpm db:seed
 *
 * Catalog focus: printer ink cartridges, toner cartridges, ink bottles,
 * drum units, photo paper, and printers (Inkjet / Laser / All-in-One).
 * Mix of OEM (HP, Canon, Epson, Brother, etc.) and compatible
 * (Print-Rite, G&G, ProDot, Static Control) brands. Built for client demos.
 *
 * Idempotent: re-running upserts on slug.
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

// Theme-keyed Unsplash photo POOLS. Every URL verified via `curl -I` against
// the resolved image URL. Each product's primary image is picked from its
// theme pool by a stable hash of the product slug — so the catalog has visual
// variety across same-category products without needing per-SKU photography.
// Phase-2 polish: commission real cartridge photography via the Cloudinary
// upload widget and store per-product URLs in the admin UI.
const u = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop`;

const IMG = {
  // Ink cartridges + parts — printer-cartridge themed Unsplash search results.
  // SD-card (1657993204179) + film-canister (1659380884984) photos that the
  // search also returned have been pruned as off-theme.
  ink: [
    u('1706895040634-62055892cbbb'),
    u('1715059382493-213b706e95f3'),
    u('1715059448930-9dff21725605'),
    u('1740884730591-8f4878e2cc64'),
  ],
  // Toner cartridges (HP 131A-style + adjacent)
  toner: [
    u('1551971868-1bc03829fd98'),
    u('1715059382493-213b706e95f3'),
    u('1672356203083-a0206308c7ea'),
    u('1553605357-97d8370fc8c4'),
  ],
  // Ink bottles + refill products
  bottle: [
    u('1583162557635-53d9931332c5'),
    u('1551192335-89a2ee84bf34'),
    u('1551127481-43279ba6dec4'),
    u('1719361888629-0d73d1c1bf8f'),
    u('1617826331050-f8acff609ea1'),
  ],
  // Drum units / imaging parts
  drum: [
    u('1715059382493-213b706e95f3'),
    u('1715059448930-9dff21725605'),
    u('1672356203083-a0206308c7ea'),
  ],
  // Printers (inkjet / laser / AIO / office)
  printer: [
    u('1503694978374-8a2fa686963a'),
    u('1693031630369-bd429a57f115'),
    u('1612815154858-60aa4c59eaa6'),
    u('1650094980833-7373de26feb6'),
    u('1613395450289-e560907d9308'),
    u('1776081697017-d843369e4395'),
    u('1676474506722-4bf98059b74a'),
  ],
  // Photo paper + premium paper
  paper: [
    u('1470790376778-a9fbc86d70e2'),
    u('1599652521984-8bebed0580b7'),
    u('1527239441953-caffd968d952'),
    u('1586957960772-3e526c5e7cbd'),
    u('1531845116688-48819b3b68d9'),
    u('1638294620053-f6560f8c726a'),
  ],
  // Combos / multipack boxes (SD-card + Polaroid-box photos pruned).
  combo: [
    u('1740884730591-8f4878e2cc64'),
    u('1715059382493-213b706e95f3'),
    u('1672356203083-a0206308c7ea'),
  ],
  // Cleaning kits / small bottles + sprays
  cleaning: [
    u('1551127481-43279ba6dec4'),
    u('1551192335-89a2ee84bf34'),
    u('1719361888629-0d73d1c1bf8f'),
  ],
  // Generic catch-all (proven-loading office-tech photo)
  fallback: [u('1518770660439-4636190af475')],
} as const;

// Stable per-slug photo picker. Hash the slug, modulo against the pool size,
// pick that index. Same slug always lands on the same photo (so product cards
// never visually flicker between renders).
function pickPhoto(slug: string, pool: readonly string[]): string {
  const fb = IMG.fallback[0] ?? '';
  if (pool.length === 0) return fb;
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  }
  // `pool[i] ?? fb` instead of a non-null assertion — pool.length > 0
  // guarantees the slot exists at runtime, but this keeps `noNonNullAssertion`
  // happy without changing behaviour.
  return pool[Math.abs(hash) % pool.length] ?? fb;
}

// Category photos — curated Unsplash IDs from themed searches
// (printer-cartridge / inkjet-printer / ink-bottle / office-printer /
// photo-paper). Every ID below was verified `200` via `curl -I` before commit.
// Real product photography matches the "shopping site" aesthetic the demo
// targets; swap to commissioned shots via the admin Category edit page once
// the Cloudinary upload widget lands.
const photo = (unsplashId: string) =>
  `https://images.unsplash.com/photo-${unsplashId}?w=800&q=80&auto=format&fit=crop`;

const categories = [
  // Cartridges + consumables (printer-cartridge search results)
  {
    name: 'Ink Cartridges',
    slug: 'ink-cartridges',
    position: 0,
    image: photo('1706895040634-62055892cbbb'),
  },
  {
    name: 'Toner Cartridges',
    slug: 'toner-cartridges',
    position: 1,
    image: photo('1551971868-1bc03829fd98'),
  },
  {
    name: 'Ink Bottles',
    slug: 'ink-bottles',
    position: 2,
    image: photo('1583162557635-53d9931332c5'),
  },
  // Printers
  {
    name: 'Inkjet Printers',
    slug: 'inkjet-printers',
    position: 3,
    image: photo('1503694978374-8a2fa686963a'),
  },
  {
    name: 'Laser Printers',
    slug: 'laser-printers',
    position: 4,
    image: photo('1693031630369-bd429a57f115'),
  },
  {
    name: 'All-in-One Printers',
    slug: 'all-in-one-printers',
    position: 5,
    image: photo('1650094980833-7373de26feb6'),
  },
  // Paper
  {
    name: 'Photo Paper',
    slug: 'photo-paper',
    position: 6,
    image: photo('1470790376778-a9fbc86d70e2'),
  },
  {
    name: 'Premium Paper',
    slug: 'premium-paper',
    position: 7,
    image: photo('1599652521984-8bebed0580b7'),
  },
  // Parts + accessories (more printer-cartridge search results)
  {
    name: 'Drum Units',
    slug: 'drum-units',
    position: 8,
    image: photo('1715059382493-213b706e95f3'),
  },
  {
    name: 'Print Heads',
    slug: 'print-heads',
    position: 9,
    image: photo('1715059448930-9dff21725605'),
  },
  {
    name: 'Multipack & Combos',
    slug: 'multipack-combos',
    position: 10,
    image: photo('1657993204179-97ac04ef0985'),
  },
  {
    name: 'Cleaning Kits',
    slug: 'cleaning-kits',
    position: 11,
    image: photo('1659380884984-ca72073ebbe2'),
  },
  {
    name: 'Refill Kits & Powders',
    slug: 'refill-kits',
    position: 12,
    image: photo('1551192335-89a2ee84bf34'),
  },
  {
    name: 'Printer Ribbons',
    slug: 'printer-ribbons',
    position: 13,
    image: photo('1553605357-97d8370fc8c4'),
  },
  {
    name: 'Cables & Accessories',
    slug: 'cables-accessories',
    position: 14,
    image: photo('1740884730591-8f4878e2cc64'),
  },
  // Specialty printers + maintenance + bundles
  {
    name: 'Photo Printers',
    slug: 'photo-printers',
    position: 15,
    image: photo('1676474506722-4bf98059b74a'),
  },
  {
    name: 'Maintenance Kits',
    slug: 'maintenance-kits',
    position: 16,
    image: photo('1672356203083-a0206308c7ea'),
  },
  {
    name: 'Office Bundles',
    slug: 'office-bundles',
    position: 17,
    image: photo('1612815154858-60aa4c59eaa6'),
  },
] as const;

type CategorySlug = (typeof categories)[number]['slug'];

// Brand logos sourced from two public CDNs:
// 1) SimpleIcons CDN (https://cdn.simpleicons.org/<slug>) — proper SVG wordmark
//    logos in the brand's official color. Best visual quality. Free, MIT.
// 2) Google's favicon API (https://www.google.com/s2/favicons?sz=256&domain=...)
//    — high-res PNG favicons used by the brand itself. Lower visual fidelity
//    than a real wordmark, but renders the brand's recognized logomark and
//    works for brands SimpleIcons doesn't ship (Canon, Brother, Lexmark, Xerox,
//    Ricoh, Pantum, Konica Minolta, Print-Rite, G&G, Static Control as of
//    2026-05). Both sources verified with `curl -I` before commit.
// Brands with neither (OKI, ProDot) fall back to a styled text tile.
const siLogo = (simpleIconsSlug: string) => `https://cdn.simpleicons.org/${simpleIconsSlug}`;
const favicon = (domain: string) => `https://www.google.com/s2/favicons?sz=256&domain=${domain}`;

const brands = [
  // OEM (genuine cartridge manufacturers + printer OEMs)
  { name: 'HP', slug: 'hp', logo: siLogo('hp') },
  { name: 'Canon', slug: 'canon', logo: favicon('canon.com') },
  { name: 'Epson', slug: 'epson', logo: siLogo('epson') },
  { name: 'Brother', slug: 'brother', logo: favicon('brother.com') },
  { name: 'Lexmark', slug: 'lexmark', logo: favicon('lexmark.com') },
  { name: 'Xerox', slug: 'xerox', logo: favicon('xerox.com') },
  { name: 'Samsung', slug: 'samsung', logo: siLogo('samsung') },
  { name: 'Ricoh', slug: 'ricoh', logo: favicon('ricoh.com') },
  { name: 'Pantum', slug: 'pantum', logo: favicon('pantum.com') },
  { name: 'Kyocera', slug: 'kyocera', logo: siLogo('kyocera') },
  { name: 'OKI', slug: 'oki', logo: null as string | null },
  { name: 'Konica Minolta', slug: 'konica-minolta', logo: favicon('konicaminolta.com') },
  { name: 'Dell', slug: 'dell', logo: siLogo('dell') },
  // Compatible / aftermarket (favicons where available).
  { name: 'Print-Rite', slug: 'print-rite', logo: favicon('print-rite.com') },
  { name: 'G&G', slug: 'gg', logo: favicon('ggimage.com') },
  { name: 'ProDot', slug: 'prodot', logo: null as string | null },
  { name: 'Static Control', slug: 'static-control', logo: favicon('staticcontrol.com') },
  // Paper specialist.
  { name: 'Kodak', slug: 'kodak', logo: siLogo('kodak') },
] as const;

type BrandSlug = (typeof brands)[number]['slug'];

type SeedProduct = {
  name: string;
  slug: string;
  brand: BrandSlug;
  categories: CategorySlug[];
  shortDesc: string;
  description: string;
  hsnCode: string;
  warrantyMonths?: number;
  warrantyType?: string;
  imageKey: keyof typeof IMG;
  boxContents: string[];
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

// HSN codes — Indian GST classification for printer consumables.
// 84439990 covers printer cartridges (ink + toner) and parts; ink is 18% GST.
// 32151990 covers loose printing ink (bottles for EcoTank/Smart Tank).
// 48025690 covers photo / coated paper.
// 84433100/84433200 cover inkjet / multifunction printers.
const HSN = {
  cartridge: '84439990',
  inkBottle: '32151990',
  paper: '48025690',
  printer: '84433200',
  ribbon: '84439990',
  cable: '85444299',
} as const;

const oemBoxContents = ['Cartridge × 1', 'Setup guide', 'Warranty card'];
const oemMultiBox = ['Cartridges × 4 (Black + Cyan + Magenta + Yellow)', 'Setup guide'];
const compatBoxContents = ['Cartridge × 1', 'Installation instructions'];
const bottleBox = ['Ink bottle × 1', 'Nozzle cap', 'User manual'];
const printerBox = ['Printer', 'Setup cartridges', 'Power cable', 'USB cable', 'Quick-start guide'];

const products: SeedProduct[] = [
  // ============ INK CARTRIDGES — OEM (8 products) ============
  {
    name: 'HP 67 Black Original Ink Cartridge',
    slug: 'hp-67-black-original',
    brand: 'hp',
    categories: ['ink-cartridges'],
    shortDesc: 'Genuine HP 67 black cartridge for DeskJet 2700 / 4100 series printers.',
    description:
      'HP 67 Black Original ink delivers crisp, fade-resistant text and graphics for the HP DeskJet 2700, 2300, 4100, 4200 series, and HP ENVY 6020, 6400 series. Engineered for reliable performance with Original HP Ink.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    warrantyType: 'Manufacturer',
    imageKey: 'ink',
    boxContents: oemBoxContents,
    variants: [
      {
        sku: 'HP-67-BLK-STD',
        mrp: 1399,
        price: 1149,
        stock: 48,
        attributes: { color: 'Black', yield: 'Standard (120 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Original (OEM)' },
      { group: 'Type', key: 'Technology', value: 'Inkjet' },
      { group: 'Yield', key: 'Page yield', value: '~120 pages (ISO/IEC 24711)' },
      { group: 'Compatibility', key: 'Printers', value: 'DeskJet 2700, 4100; ENVY 6020, 6400' },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },
  {
    name: 'HP 67 Tri-Color Original Ink Cartridge',
    slug: 'hp-67-tri-color-original',
    brand: 'hp',
    categories: ['ink-cartridges'],
    shortDesc: 'Cyan, magenta and yellow inks in a single HP 67 tri-color cartridge.',
    description:
      'HP 67 Tri-Color Original ink lays down vivid cyan, magenta, and yellow for everyday photos and graphics. Pair with HP 67 Black for full-color HP DeskJet and ENVY printing.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    imageKey: 'ink',
    boxContents: oemBoxContents,
    variants: [
      {
        sku: 'HP-67-TRI-STD',
        mrp: 1599,
        price: 1349,
        stock: 42,
        attributes: { color: 'Tri-Color', yield: 'Standard (100 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Original (OEM)' },
      { group: 'Yield', key: 'Page yield', value: '~100 pages' },
      { group: 'Compatibility', key: 'Printers', value: 'DeskJet 2700, 4100; ENVY 6020, 6400' },
      { group: 'Color', key: 'Cartridge color', value: 'Tri-Color (CMY)' },
    ],
  },
  {
    name: 'HP 67XL Black High Yield Cartridge',
    slug: 'hp-67xl-black-high-yield',
    brand: 'hp',
    categories: ['ink-cartridges'],
    shortDesc: 'Up to 240 pages of dark black text — twice the yield of HP 67 standard.',
    description:
      'HP 67XL Black gives you up to 2× the page yield of HP 67 Black for fewer cartridge changes and lower cost per page. Ideal for home offices and frequent printing.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    imageKey: 'ink',
    boxContents: oemBoxContents,
    variants: [
      {
        sku: 'HP-67XL-BLK',
        mrp: 2299,
        price: 1899,
        stock: 30,
        attributes: { color: 'Black', yield: 'XL (240 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Original (OEM)' },
      { group: 'Yield', key: 'Page yield', value: '~240 pages' },
      { group: 'Compatibility', key: 'Printers', value: 'DeskJet 2700, 4100; ENVY 6020, 6400' },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },
  {
    name: 'HP 678 Black Original Ink Cartridge',
    slug: 'hp-678-black-original',
    brand: 'hp',
    categories: ['ink-cartridges'],
    shortDesc: 'India-market favourite — HP 678 black for DeskJet 1018, 2515, 3515 and more.',
    description:
      'HP 678 Black Original Ink Cartridge is engineered for the widely-deployed HP DeskJet Ink Advantage 1015 / 1018 / 2515 / 2545 / 2645 / 3515 / 3545 / 4515 / 4645 — the workhorse of Indian home and small-business printing.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    imageKey: 'ink',
    boxContents: oemBoxContents,
    variants: [
      {
        sku: 'HP-678-BLK',
        mrp: 999,
        price: 779,
        stock: 75,
        attributes: { color: 'Black', yield: 'Standard (480 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Original (OEM)' },
      { group: 'Yield', key: 'Page yield', value: '~480 pages' },
      { group: 'Compatibility', key: 'Printers', value: 'DeskJet IA 2515, 2545, 3515, 4515, 4645' },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },
  {
    name: 'HP 805 Black Original Ink Cartridge',
    slug: 'hp-805-black-original',
    brand: 'hp',
    categories: ['ink-cartridges'],
    shortDesc: 'For the HP DeskJet 1200 / 2300 / 2700 Ink Advantage series.',
    description:
      'HP 805 Black gives you reliable, smudge-resistant prints on the latest HP DeskJet Ink Advantage 1200 / 2300 / 2700 / 4100 series. Built for the budget-conscious Indian home printer market.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    imageKey: 'ink',
    boxContents: oemBoxContents,
    variants: [
      {
        sku: 'HP-805-BLK',
        mrp: 999,
        price: 829,
        stock: 60,
        attributes: { color: 'Black', yield: 'Standard (120 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Original (OEM)' },
      { group: 'Yield', key: 'Page yield', value: '~120 pages' },
      {
        group: 'Compatibility',
        key: 'Printers',
        value: 'DeskJet IA 1200, 2300, 2700, 4100 series',
      },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },
  {
    name: 'Canon PG-47 Black Ink Cartridge',
    slug: 'canon-pg-47-black',
    brand: 'canon',
    categories: ['ink-cartridges'],
    shortDesc: 'Canon PG-47 for PIXMA E400, E410, E480, E3170, E4270 series.',
    description:
      'Canon PG-47 Black is the genuine ink cartridge for Canon PIXMA E-series compact printers — E400, E410, E460, E470, E480, E4270 — delivering sharp text and reliable performance.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    imageKey: 'ink',
    boxContents: oemBoxContents,
    variants: [
      {
        sku: 'CAN-PG47-BLK',
        mrp: 1095,
        price: 875,
        stock: 55,
        attributes: { color: 'Black', yield: 'Standard (400 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Original (OEM)' },
      { group: 'Yield', key: 'Page yield', value: '~400 pages' },
      { group: 'Compatibility', key: 'Printers', value: 'PIXMA E400, E410, E480, E3170, E4270' },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },
  {
    name: 'Canon CL-57 Color Ink Cartridge',
    slug: 'canon-cl-57-color',
    brand: 'canon',
    categories: ['ink-cartridges'],
    shortDesc: 'Tri-colour cartridge for Canon PIXMA E400 / E480 / E3170 / E4270.',
    description:
      'Canon CL-57 delivers cyan, magenta, and yellow inks in a single cartridge for vibrant color prints on the Canon PIXMA E-series. Pair with PG-47 Black for everyday colour printing.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    imageKey: 'ink',
    boxContents: oemBoxContents,
    variants: [
      {
        sku: 'CAN-CL57-CLR',
        mrp: 1295,
        price: 1049,
        stock: 50,
        attributes: { color: 'Tri-Color', yield: 'Standard (180 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Original (OEM)' },
      { group: 'Yield', key: 'Page yield', value: '~180 pages' },
      { group: 'Compatibility', key: 'Printers', value: 'PIXMA E400, E410, E480, E3170, E4270' },
      { group: 'Color', key: 'Cartridge color', value: 'Tri-Color (CMY)' },
    ],
  },
  {
    name: 'Canon PG-745 Black Ink Cartridge',
    slug: 'canon-pg-745-black',
    brand: 'canon',
    categories: ['ink-cartridges'],
    shortDesc: 'Canon PG-745 for PIXMA MG2400, MG2570S, iP2870S, TR4570S.',
    description:
      'Canon PG-745 Black Ink Cartridge is the genuine consumable for the widely-used Canon PIXMA MG2400, MG2570S, iP2870S, TR4570S Indian-market printers.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    imageKey: 'ink',
    boxContents: oemBoxContents,
    variants: [
      {
        sku: 'CAN-PG745-BLK',
        mrp: 950,
        price: 759,
        stock: 65,
        attributes: { color: 'Black', yield: 'Standard (180 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Original (OEM)' },
      { group: 'Yield', key: 'Page yield', value: '~180 pages' },
      { group: 'Compatibility', key: 'Printers', value: 'PIXMA MG2400, MG2570S, iP2870S, TR4570S' },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },

  // ============ INK CARTRIDGES — Compatible (10 products) ============
  {
    name: 'Print-Rite Compatible HP 678 Black Cartridge',
    slug: 'printrite-hp-678-black',
    brand: 'print-rite',
    categories: ['ink-cartridges'],
    shortDesc: 'Quality aftermarket HP 678 black cartridge at ~50% off the OEM price.',
    description:
      'Print-Rite compatible HP 678 Black is built to OEM-equivalent print specs at a fraction of the cost. Plug-and-play with HP DeskJet Ink Advantage 1015 / 2515 / 3515 / 4515 series; passes ISO yield testing.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 6,
    warrantyType: 'Replacement',
    imageKey: 'ink',
    boxContents: compatBoxContents,
    variants: [
      {
        sku: 'PR-HP678-BLK',
        mrp: 599,
        price: 349,
        stock: 120,
        attributes: { color: 'Black', yield: 'Standard (~480 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Compatible (Aftermarket)' },
      { group: 'Yield', key: 'Page yield', value: '~480 pages' },
      { group: 'Compatibility', key: 'Replaces', value: 'HP 678 Black (CZ107AA)' },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },
  {
    name: 'Print-Rite Compatible HP 678 Tri-Color Cartridge',
    slug: 'printrite-hp-678-tri-color',
    brand: 'print-rite',
    categories: ['ink-cartridges'],
    shortDesc: 'Aftermarket HP 678 colour cartridge with full CMY coverage.',
    description:
      'Print-Rite HP 678 Tri-Color compatible cartridge lays down rich CMY inks at a budget price. ISO/IEC 24711 yield-tested, ready to drop into HP DeskJet Ink Advantage 1015 / 2515 / 3515 / 4515.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 6,
    warrantyType: 'Replacement',
    imageKey: 'ink',
    boxContents: compatBoxContents,
    variants: [
      {
        sku: 'PR-HP678-TRI',
        mrp: 699,
        price: 399,
        stock: 110,
        attributes: { color: 'Tri-Color', yield: 'Standard (~150 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Compatible (Aftermarket)' },
      { group: 'Yield', key: 'Page yield', value: '~150 pages' },
      { group: 'Compatibility', key: 'Replaces', value: 'HP 678 Tri-Color (CZ108AA)' },
      { group: 'Color', key: 'Cartridge color', value: 'Tri-Color (CMY)' },
    ],
  },
  {
    name: 'G&G Compatible HP 805 Black Cartridge',
    slug: 'gg-hp-805-black',
    brand: 'gg',
    categories: ['ink-cartridges'],
    shortDesc: 'G&G aftermarket HP 805 black at 60% off — for DeskJet 1200 / 2300 / 2700.',
    description:
      'G&G Compatible HP 805 Black is a Chinese-engineered aftermarket cartridge that matches HP 805 OEM specs in print quality and yield. STMC-certified manufacturing.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 6,
    warrantyType: 'Replacement',
    imageKey: 'ink',
    boxContents: compatBoxContents,
    variants: [
      {
        sku: 'GG-HP805-BLK',
        mrp: 549,
        price: 329,
        stock: 130,
        attributes: { color: 'Black', yield: 'Standard (~120 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Compatible (Aftermarket)' },
      { group: 'Yield', key: 'Page yield', value: '~120 pages' },
      { group: 'Compatibility', key: 'Replaces', value: 'HP 805 Black (BC318AA)' },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },
  {
    name: 'G&G Compatible HP 805 Tri-Color Cartridge',
    slug: 'gg-hp-805-tri-color',
    brand: 'gg',
    categories: ['ink-cartridges'],
    shortDesc: 'Vivid colour prints on HP DeskJet 1200 / 2300 / 2700 — at half the OEM cost.',
    description:
      'G&G HP 805 Tri-Color compatible cartridge delivers bright cyan-magenta-yellow inks for everyday photo and graphics printing on the HP DeskJet 1200 / 2300 / 2700 / 4100 series.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 6,
    warrantyType: 'Replacement',
    imageKey: 'ink',
    boxContents: compatBoxContents,
    variants: [
      {
        sku: 'GG-HP805-TRI',
        mrp: 649,
        price: 379,
        stock: 115,
        attributes: { color: 'Tri-Color', yield: 'Standard (~150 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Compatible (Aftermarket)' },
      { group: 'Yield', key: 'Page yield', value: '~150 pages' },
      { group: 'Compatibility', key: 'Replaces', value: 'HP 805 Tri-Color (6ZA50AA)' },
      { group: 'Color', key: 'Cartridge color', value: 'Tri-Color (CMY)' },
    ],
  },
  {
    name: 'ProDot Compatible Canon PG-47 Black',
    slug: 'prodot-canon-pg-47-black',
    brand: 'prodot',
    categories: ['ink-cartridges'],
    shortDesc: 'India-made aftermarket Canon PG-47 black at competitive INR pricing.',
    description:
      'ProDot Compatible Canon PG-47 Black gives Indian budget-printing customers a domestically-supported aftermarket option. Drop-in replacement for Canon PIXMA E400 / E410 / E480 / E3170 / E4270.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 6,
    warrantyType: 'Replacement',
    imageKey: 'ink',
    boxContents: compatBoxContents,
    variants: [
      {
        sku: 'PD-CAN-PG47-BLK',
        mrp: 599,
        price: 339,
        stock: 95,
        attributes: { color: 'Black', yield: 'Standard (~400 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Compatible (Aftermarket)' },
      { group: 'Yield', key: 'Page yield', value: '~400 pages' },
      { group: 'Compatibility', key: 'Replaces', value: 'Canon PG-47 Black' },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },
  {
    name: 'ProDot Compatible Canon CL-57 Color',
    slug: 'prodot-canon-cl-57-color',
    brand: 'prodot',
    categories: ['ink-cartridges'],
    shortDesc: 'ProDot Indian-made tri-colour cartridge for Canon PIXMA E-series.',
    description:
      'ProDot Compatible Canon CL-57 Color cartridge delivers reliable cyan-magenta-yellow output on Canon PIXMA E400, E410, E480, E3170, E4270 at a budget Indian-market price.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 6,
    warrantyType: 'Replacement',
    imageKey: 'ink',
    boxContents: compatBoxContents,
    variants: [
      {
        sku: 'PD-CAN-CL57-CLR',
        mrp: 699,
        price: 389,
        stock: 85,
        attributes: { color: 'Tri-Color', yield: 'Standard (~180 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Compatible (Aftermarket)' },
      { group: 'Yield', key: 'Page yield', value: '~180 pages' },
      { group: 'Compatibility', key: 'Replaces', value: 'Canon CL-57 Tri-Color' },
      { group: 'Color', key: 'Cartridge color', value: 'Tri-Color (CMY)' },
    ],
  },
  {
    name: 'Static Control Compatible HP 67XL Black',
    slug: 'static-control-hp-67xl-black',
    brand: 'static-control',
    categories: ['ink-cartridges'],
    shortDesc: 'Static Control XL-yield aftermarket HP 67XL black — twice the page count.',
    description:
      'Static Control engineered HP 67XL Black compatible cartridge for the HP DeskJet 2700 / 4100 / ENVY 6020 / 6400 series. XL yield (240 pages) at half the OEM cost — STMC-tested.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    warrantyType: 'Replacement',
    imageKey: 'ink',
    boxContents: compatBoxContents,
    variants: [
      {
        sku: 'SC-HP67XL-BLK',
        mrp: 1199,
        price: 779,
        stock: 65,
        attributes: { color: 'Black', yield: 'XL (~240 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Compatible (Aftermarket)' },
      { group: 'Yield', key: 'Page yield', value: '~240 pages' },
      { group: 'Compatibility', key: 'Replaces', value: 'HP 67XL Black' },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },
  {
    name: 'Print-Rite Compatible Epson 664 Black Bottle',
    slug: 'printrite-epson-664-black',
    brand: 'print-rite',
    categories: ['ink-bottles'],
    shortDesc: 'Aftermarket Epson 664 black ink for EcoTank L130 / L220 / L355 / L555.',
    description:
      'Print-Rite Compatible Epson 664 Black 70 ml ink bottle is engineered as a drop-in replacement for the EcoTank L130, L220, L355, L555, L1300 series — at a fraction of the genuine ink cost.',
    hsnCode: HSN.inkBottle,
    warrantyMonths: 6,
    warrantyType: 'Replacement',
    imageKey: 'bottle',
    boxContents: bottleBox,
    variants: [
      {
        sku: 'PR-EP664-BLK',
        mrp: 449,
        price: 249,
        stock: 140,
        attributes: { color: 'Black', volume: '70 ml' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Compatible (Aftermarket)' },
      { group: 'Volume', key: 'Bottle volume', value: '70 ml' },
      { group: 'Compatibility', key: 'Replaces', value: 'Epson 664 Black (T6641)' },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },
  {
    name: 'G&G Compatible Canon GI-790 4-Color Set',
    slug: 'gg-canon-gi-790-set',
    brand: 'gg',
    categories: ['ink-bottles', 'multipack-combos'],
    shortDesc: 'Full CMYK GI-790 ink bottle set for Canon PIXMA G-series tank printers.',
    description:
      'G&G compatible Canon GI-790 4-color ink bottle set (Black + Cyan + Magenta + Yellow) keeps Canon PIXMA G1000 / G2000 / G3000 / G2010 / G3010 ink tanks running for thousands of pages.',
    hsnCode: HSN.inkBottle,
    warrantyMonths: 6,
    warrantyType: 'Replacement',
    imageKey: 'bottle',
    boxContents: ['Ink bottle × 4 (Black + Cyan + Magenta + Yellow)', 'Nozzle caps', 'User manual'],
    variants: [
      {
        sku: 'GG-CAN-GI790-SET',
        mrp: 1799,
        price: 999,
        stock: 70,
        attributes: { color: 'CMYK Set', volume: '4 × 70 ml' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Compatible (Aftermarket)' },
      { group: 'Volume', key: 'Bottle volume', value: '4 × 70 ml' },
      {
        group: 'Compatibility',
        key: 'Replaces',
        value: 'Canon GI-790 (BK, C, M, Y)',
      },
      { group: 'Color', key: 'Cartridge color', value: 'CMYK Set' },
    ],
  },
  {
    name: 'ProDot Compatible HP 803 Tri-Color',
    slug: 'prodot-hp-803-tri-color',
    brand: 'prodot',
    categories: ['ink-cartridges'],
    shortDesc: 'ProDot India-made aftermarket HP 803 tri-color cartridge.',
    description:
      'ProDot HP 803 Tri-Color compatible cartridge is an Indian-manufactured drop-in replacement for HP DeskJet 1112 / 2131 / 2132 / 2135 / 1115 / 3635 / 3835 / 4535 / 4675.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 6,
    warrantyType: 'Replacement',
    imageKey: 'ink',
    boxContents: compatBoxContents,
    variants: [
      {
        sku: 'PD-HP803-TRI',
        mrp: 599,
        price: 339,
        stock: 105,
        attributes: { color: 'Tri-Color', yield: 'Standard (~165 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Compatible (Aftermarket)' },
      { group: 'Yield', key: 'Page yield', value: '~165 pages' },
      { group: 'Compatibility', key: 'Replaces', value: 'HP 803 Tri-Color (F6V20AA)' },
      { group: 'Color', key: 'Cartridge color', value: 'Tri-Color (CMY)' },
    ],
  },

  // ============ TONER CARTRIDGES — OEM (6 products) ============
  {
    name: 'HP 88A Black Original LaserJet Toner (CC388A)',
    slug: 'hp-88a-black-toner',
    brand: 'hp',
    categories: ['toner-cartridges'],
    shortDesc: 'HP 88A genuine toner for LaserJet Pro P1007 / P1108 / M1136 / M126 / M226.',
    description:
      'HP 88A Black Original LaserJet Toner Cartridge (CC388A) is the genuine consumable for the office-staple HP LaserJet Pro P1007 / P1108 / M1136 / M126 / M202 / M226 series. ~1,500 pages at 5% coverage.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    warrantyType: 'Manufacturer',
    imageKey: 'toner',
    boxContents: oemBoxContents,
    variants: [
      {
        sku: 'HP-88A-BLK',
        mrp: 4799,
        price: 3899,
        stock: 38,
        attributes: { color: 'Black', yield: 'Standard (1,500 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Original (OEM)' },
      { group: 'Yield', key: 'Page yield', value: '~1,500 pages @ 5% coverage' },
      {
        group: 'Compatibility',
        key: 'Printers',
        value: 'LaserJet Pro P1007, P1108, M1136, M126, M202, M226',
      },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },
  {
    name: 'HP 12A Black Original LaserJet Toner (Q2612A)',
    slug: 'hp-12a-black-toner',
    brand: 'hp',
    categories: ['toner-cartridges'],
    shortDesc: 'Genuine HP 12A for LaserJet 1010 / 1020 / 3050 — legacy office workhorse.',
    description:
      'HP 12A Black Original LaserJet Toner (Q2612A) remains the consumable of choice for the long-lived HP LaserJet 1010 / 1020 / 1022 / 3050 / M1005 / M1319 fleet still running in offices worldwide.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    imageKey: 'toner',
    boxContents: oemBoxContents,
    variants: [
      {
        sku: 'HP-12A-BLK',
        mrp: 4499,
        price: 3699,
        stock: 42,
        attributes: { color: 'Black', yield: 'Standard (2,000 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Original (OEM)' },
      { group: 'Yield', key: 'Page yield', value: '~2,000 pages @ 5% coverage' },
      {
        group: 'Compatibility',
        key: 'Printers',
        value: 'LaserJet 1010, 1020, 3050, M1005, M1319',
      },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },
  {
    name: 'Canon 925 Black Toner Cartridge',
    slug: 'canon-925-black-toner',
    brand: 'canon',
    categories: ['toner-cartridges'],
    shortDesc: 'Canon 925 genuine toner for imageCLASS LBP6018, LBP6030, MF3010.',
    description:
      'Canon 925 Black Toner Cartridge is the genuine consumable for the Canon imageCLASS LBP6018, LBP6018B, LBP6018W, LBP6030, MF3010 — a popular monochrome laser line in Indian SME offices.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    imageKey: 'toner',
    boxContents: oemBoxContents,
    variants: [
      {
        sku: 'CAN-925-BLK',
        mrp: 4250,
        price: 3499,
        stock: 35,
        attributes: { color: 'Black', yield: 'Standard (1,600 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Original (OEM)' },
      { group: 'Yield', key: 'Page yield', value: '~1,600 pages @ 5% coverage' },
      {
        group: 'Compatibility',
        key: 'Printers',
        value: 'imageCLASS LBP6018, LBP6030, MF3010',
      },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },
  {
    name: 'Brother TN-2280 Black Toner Cartridge',
    slug: 'brother-tn-2280-black-toner',
    brand: 'brother',
    categories: ['toner-cartridges'],
    shortDesc: 'Brother TN-2280 high-yield toner for HL-2240D / DCP-7060D / MFC-7860DW.',
    description:
      'Brother TN-2280 Black Toner Cartridge is the high-yield genuine consumable for the Brother HL-2240D, HL-2250DN, HL-2270DW, DCP-7060D, DCP-7065DN, MFC-7360N, MFC-7470D, MFC-7860DW series.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    imageKey: 'toner',
    boxContents: oemBoxContents,
    variants: [
      {
        sku: 'BRO-TN2280-BLK',
        mrp: 4099,
        price: 3299,
        stock: 32,
        attributes: { color: 'Black', yield: 'High Yield (2,600 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Original (OEM)' },
      { group: 'Yield', key: 'Page yield', value: '~2,600 pages @ 5% coverage' },
      {
        group: 'Compatibility',
        key: 'Printers',
        value: 'HL-2240D, 2250DN, 2270DW; DCP-7060D, 7065DN; MFC-7470D, 7860DW',
      },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },
  {
    name: 'Samsung MLT-D101S Black Toner',
    slug: 'samsung-mlt-d101s-black-toner',
    brand: 'samsung',
    categories: ['toner-cartridges'],
    shortDesc: 'Samsung MLT-D101S genuine toner for ML-2160 / ML-2165W / SCX-3400.',
    description:
      'Samsung MLT-D101S Black Toner Cartridge is the genuine consumable for the popular Samsung ML-2160, ML-2161, ML-2165, ML-2165W, SCX-3400, SCX-3401, SCX-3405 mono-laser series (HP Print Solutions-stocked).',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    imageKey: 'toner',
    boxContents: oemBoxContents,
    variants: [
      {
        sku: 'SAM-MLT-D101S',
        mrp: 3850,
        price: 3199,
        stock: 28,
        attributes: { color: 'Black', yield: 'Standard (1,500 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Original (OEM)' },
      { group: 'Yield', key: 'Page yield', value: '~1,500 pages @ 5% coverage' },
      {
        group: 'Compatibility',
        key: 'Printers',
        value: 'ML-2160, ML-2165W, SCX-3400, SCX-3405',
      },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },
  {
    name: 'Pantum PA-210 Black Toner Cartridge',
    slug: 'pantum-pa-210-black-toner',
    brand: 'pantum',
    categories: ['toner-cartridges'],
    shortDesc: 'Pantum PA-210 for P2200 / P2207 / P2500W / M6500N / M6550NW.',
    description:
      'Pantum PA-210 Black Toner Cartridge is the genuine consumable for the budget-favourite Pantum P2200, P2207, P2500W, M6500N, M6550NW Indian-market laser printers.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    imageKey: 'toner',
    boxContents: oemBoxContents,
    variants: [
      {
        sku: 'PAN-PA210-BLK',
        mrp: 2199,
        price: 1799,
        stock: 60,
        attributes: { color: 'Black', yield: 'Standard (1,600 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Original (OEM)' },
      { group: 'Yield', key: 'Page yield', value: '~1,600 pages @ 5% coverage' },
      {
        group: 'Compatibility',
        key: 'Printers',
        value: 'P2200, P2207, P2500W, M6500N, M6550NW',
      },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },

  // ============ TONER CARTRIDGES — Compatible (8 products) ============
  {
    name: 'Print-Rite Compatible HP 88A Black Toner',
    slug: 'printrite-hp-88a-black-toner',
    brand: 'print-rite',
    categories: ['toner-cartridges'],
    shortDesc: 'Print-Rite aftermarket HP 88A — same yield, half the cost.',
    description:
      'Print-Rite Compatible HP 88A (CC388A) Black Toner is engineered to OEM yield and quality specifications, STMC-certified manufacturing, drop-in compatible with HP LaserJet Pro P1108 / M1136 / M126 / M226 series.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    warrantyType: 'Replacement',
    imageKey: 'toner',
    boxContents: compatBoxContents,
    variants: [
      {
        sku: 'PR-HP88A-BLK',
        mrp: 2099,
        price: 1399,
        stock: 95,
        attributes: { color: 'Black', yield: 'Standard (~1,500 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Compatible (Aftermarket)' },
      { group: 'Yield', key: 'Page yield', value: '~1,500 pages' },
      { group: 'Compatibility', key: 'Replaces', value: 'HP 88A (CC388A)' },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },
  {
    name: 'G&G Compatible HP 12A Black Toner',
    slug: 'gg-hp-12a-black-toner',
    brand: 'gg',
    categories: ['toner-cartridges'],
    shortDesc: 'G&G aftermarket HP 12A (Q2612A) for the legacy LaserJet 1010 / 1020 fleet.',
    description:
      'G&G Compatible HP 12A (Q2612A) Black Toner Cartridge keeps your aging LaserJet 1010 / 1020 / 1022 / 3050 / M1005 / M1319 fleet running at a fraction of the OEM cost — ISO yield-tested.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    warrantyType: 'Replacement',
    imageKey: 'toner',
    boxContents: compatBoxContents,
    variants: [
      {
        sku: 'GG-HP12A-BLK',
        mrp: 1999,
        price: 1299,
        stock: 110,
        attributes: { color: 'Black', yield: 'Standard (~2,000 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Compatible (Aftermarket)' },
      { group: 'Yield', key: 'Page yield', value: '~2,000 pages' },
      { group: 'Compatibility', key: 'Replaces', value: 'HP 12A (Q2612A)' },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },
  {
    name: 'ProDot Compatible Canon 925 Black Toner',
    slug: 'prodot-canon-925-black-toner',
    brand: 'prodot',
    categories: ['toner-cartridges'],
    shortDesc: 'India-made aftermarket Canon 925 for imageCLASS LBP6018 / MF3010.',
    description:
      'ProDot Compatible Canon 925 Black Toner Cartridge is the budget-friendly Indian-made replacement for genuine Canon 925, fitting the imageCLASS LBP6018 / LBP6030 / MF3010 office laser line.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    warrantyType: 'Replacement',
    imageKey: 'toner',
    boxContents: compatBoxContents,
    variants: [
      {
        sku: 'PD-CAN925-BLK',
        mrp: 1899,
        price: 1199,
        stock: 80,
        attributes: { color: 'Black', yield: 'Standard (~1,600 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Compatible (Aftermarket)' },
      { group: 'Yield', key: 'Page yield', value: '~1,600 pages' },
      { group: 'Compatibility', key: 'Replaces', value: 'Canon 925 (3484B002)' },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },
  {
    name: 'Static Control Compatible HP CF217A Black Toner',
    slug: 'static-control-hp-cf217a-toner',
    brand: 'static-control',
    categories: ['toner-cartridges'],
    shortDesc: 'Static Control 17A aftermarket toner for LaserJet Pro M102 / M130.',
    description:
      'Static Control HP CF217A (17A) Compatible Toner Cartridge is engineered by the worldwide leader in aftermarket toner formulation. Drop-in compatible with HP LaserJet Pro M102a / M102w / M130a / M130fn / M130fw.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    warrantyType: 'Replacement',
    imageKey: 'toner',
    boxContents: compatBoxContents,
    variants: [
      {
        sku: 'SC-HPCF217A-BLK',
        mrp: 2299,
        price: 1499,
        stock: 75,
        attributes: { color: 'Black', yield: 'Standard (~1,600 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Compatible (Aftermarket)' },
      { group: 'Yield', key: 'Page yield', value: '~1,600 pages' },
      { group: 'Compatibility', key: 'Replaces', value: 'HP 17A (CF217A)' },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },
  {
    name: 'Print-Rite Compatible Brother TN-2280 Toner',
    slug: 'printrite-brother-tn-2280-toner',
    brand: 'print-rite',
    categories: ['toner-cartridges'],
    shortDesc: 'High-yield Brother TN-2280 aftermarket toner for HL-2240 / MFC-7860.',
    description:
      'Print-Rite Compatible Brother TN-2280 Black Toner gives the HL-2240D / HL-2250DN / DCP-7060D / MFC-7470D / MFC-7860DW fleet high-yield monochrome printing at a budget price.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    warrantyType: 'Replacement',
    imageKey: 'toner',
    boxContents: compatBoxContents,
    variants: [
      {
        sku: 'PR-BRO-TN2280',
        mrp: 1999,
        price: 1299,
        stock: 90,
        attributes: { color: 'Black', yield: 'High Yield (~2,600 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Compatible (Aftermarket)' },
      { group: 'Yield', key: 'Page yield', value: '~2,600 pages' },
      { group: 'Compatibility', key: 'Replaces', value: 'Brother TN-2280' },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },
  {
    name: 'G&G Compatible Samsung MLT-D101S Toner',
    slug: 'gg-samsung-mlt-d101s-toner',
    brand: 'gg',
    categories: ['toner-cartridges'],
    shortDesc: 'G&G aftermarket Samsung MLT-D101S for ML-2160 / SCX-3400.',
    description:
      'G&G Compatible Samsung MLT-D101S Black Toner Cartridge keeps the Samsung ML-2160 / ML-2165W / SCX-3400 / SCX-3405 fleet running smoothly at a fraction of the genuine cartridge cost.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    warrantyType: 'Replacement',
    imageKey: 'toner',
    boxContents: compatBoxContents,
    variants: [
      {
        sku: 'GG-SAM-D101S',
        mrp: 1799,
        price: 1099,
        stock: 75,
        attributes: { color: 'Black', yield: 'Standard (~1,500 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Compatible (Aftermarket)' },
      { group: 'Yield', key: 'Page yield', value: '~1,500 pages' },
      { group: 'Compatibility', key: 'Replaces', value: 'Samsung MLT-D101S' },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },
  {
    name: 'ProDot Compatible Pantum PA-210 Toner',
    slug: 'prodot-pantum-pa-210-toner',
    brand: 'prodot',
    categories: ['toner-cartridges'],
    shortDesc: 'India-made aftermarket Pantum PA-210 for P2200 / M6500 series.',
    description:
      'ProDot Compatible Pantum PA-210 Black Toner Cartridge is the Indian-manufactured drop-in replacement for the Pantum P2200, P2500W, M6500N, M6550NW SME-favourite laser printers.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    warrantyType: 'Replacement',
    imageKey: 'toner',
    boxContents: compatBoxContents,
    variants: [
      {
        sku: 'PD-PAN-PA210',
        mrp: 1199,
        price: 749,
        stock: 100,
        attributes: { color: 'Black', yield: 'Standard (~1,600 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Compatible (Aftermarket)' },
      { group: 'Yield', key: 'Page yield', value: '~1,600 pages' },
      { group: 'Compatibility', key: 'Replaces', value: 'Pantum PA-210' },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },
  {
    name: 'Static Control Compatible Kyocera TK-1175 Toner',
    slug: 'static-control-kyocera-tk-1175',
    brand: 'static-control',
    categories: ['toner-cartridges'],
    shortDesc: 'Static Control aftermarket Kyocera TK-1175 for M2040 / M2540 / M2640.',
    description:
      'Static Control Compatible Kyocera TK-1175 Black Toner Cartridge for ECOSYS M2040dn / M2540dn / M2540dw / M2640idw. Engineered to OEM yield with STMC-certified manufacturing.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    warrantyType: 'Replacement',
    imageKey: 'toner',
    boxContents: compatBoxContents,
    variants: [
      {
        sku: 'SC-KYO-TK1175',
        mrp: 4499,
        price: 2999,
        stock: 45,
        attributes: { color: 'Black', yield: 'Standard (~7,200 pages)' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Compatible (Aftermarket)' },
      { group: 'Yield', key: 'Page yield', value: '~7,200 pages' },
      { group: 'Compatibility', key: 'Replaces', value: 'Kyocera TK-1175' },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },

  // ============ INK BOTTLES — OEM (4 products) ============
  {
    name: 'Epson 003 Black Ink Bottle (EcoTank)',
    slug: 'epson-003-black-bottle',
    brand: 'epson',
    categories: ['ink-bottles'],
    shortDesc: 'Genuine Epson 003 black ink bottle for L3110 / L3150 / L5190 EcoTank.',
    description:
      'Epson 003 Black 65 ml Original Ink Bottle is the genuine refill for the Epson EcoTank L1110, L3100, L3110, L3150, L3151, L3152, L3156, L4150, L4160, L5190, L6160, L6170, L6190 series. Up to 4,500 pages per bottle.',
    hsnCode: HSN.inkBottle,
    warrantyMonths: 12,
    imageKey: 'bottle',
    boxContents: bottleBox,
    variants: [
      {
        sku: 'EP-003-BLK',
        mrp: 549,
        price: 449,
        stock: 130,
        attributes: { color: 'Black', volume: '65 ml' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Original (OEM)' },
      { group: 'Volume', key: 'Bottle volume', value: '65 ml' },
      { group: 'Yield', key: 'Page yield', value: '~4,500 pages' },
      {
        group: 'Compatibility',
        key: 'Printers',
        value: 'EcoTank L3110, L3150, L4150, L5190, L6170',
      },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },
  {
    name: 'Epson 003 Cyan Ink Bottle',
    slug: 'epson-003-cyan-bottle',
    brand: 'epson',
    categories: ['ink-bottles'],
    shortDesc: 'Genuine Epson 003 cyan refill for EcoTank L3110 / L3150 / L4150 / L5190.',
    description:
      'Epson 003 Cyan 65 ml Original Ink Bottle delivers vibrant cyan refills for the Epson EcoTank L1110 / L3110 / L3150 / L4150 / L5190 / L6170 series. Up to 7,500 colour pages per bottle.',
    hsnCode: HSN.inkBottle,
    warrantyMonths: 12,
    imageKey: 'bottle',
    boxContents: bottleBox,
    variants: [
      {
        sku: 'EP-003-CYN',
        mrp: 549,
        price: 449,
        stock: 110,
        attributes: { color: 'Cyan', volume: '65 ml' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Original (OEM)' },
      { group: 'Volume', key: 'Bottle volume', value: '65 ml' },
      { group: 'Yield', key: 'Page yield', value: '~7,500 pages' },
      {
        group: 'Compatibility',
        key: 'Printers',
        value: 'EcoTank L3110, L3150, L4150, L5190, L6170',
      },
      { group: 'Color', key: 'Cartridge color', value: 'Cyan' },
    ],
  },
  {
    name: 'Canon GI-790 Black Ink Bottle',
    slug: 'canon-gi-790-black-bottle',
    brand: 'canon',
    categories: ['ink-bottles'],
    shortDesc: 'Canon GI-790 genuine black ink for PIXMA G1000 / G2000 / G3000 series.',
    description:
      'Canon GI-790 Black 135 ml Original Ink Bottle is the genuine refill for the Canon PIXMA G1000, G1010, G2000, G2010, G3000, G3010, G4000 ink-tank printers. Up to 6,000 pages per bottle.',
    hsnCode: HSN.inkBottle,
    warrantyMonths: 12,
    imageKey: 'bottle',
    boxContents: bottleBox,
    variants: [
      {
        sku: 'CAN-GI790-BLK',
        mrp: 599,
        price: 489,
        stock: 95,
        attributes: { color: 'Black', volume: '135 ml' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Original (OEM)' },
      { group: 'Volume', key: 'Bottle volume', value: '135 ml' },
      { group: 'Yield', key: 'Page yield', value: '~6,000 pages' },
      { group: 'Compatibility', key: 'Printers', value: 'PIXMA G1000, G2000, G3000, G4000 series' },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },
  {
    name: 'HP GT53 Black Ink Bottle (Smart Tank)',
    slug: 'hp-gt53-black-bottle',
    brand: 'hp',
    categories: ['ink-bottles'],
    shortDesc: 'Genuine HP GT53 black refill for Smart Tank 500 / 615 / 720 series.',
    description:
      'HP GT53 Black 90 ml Original Ink Bottle is the genuine refill for HP Smart Tank 500 / 515 / 615 / 720 / 750, HP Ink Tank 115 / 315 / 319 / 415 / 419 series. Up to 4,000 mono pages per bottle.',
    hsnCode: HSN.inkBottle,
    warrantyMonths: 12,
    imageKey: 'bottle',
    boxContents: bottleBox,
    variants: [
      {
        sku: 'HP-GT53-BLK',
        mrp: 749,
        price: 599,
        stock: 105,
        attributes: { color: 'Black', volume: '90 ml' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Original (OEM)' },
      { group: 'Volume', key: 'Bottle volume', value: '90 ml' },
      { group: 'Yield', key: 'Page yield', value: '~4,000 pages' },
      { group: 'Compatibility', key: 'Printers', value: 'Smart Tank 500, 515, 615, 720, 750' },
      { group: 'Color', key: 'Cartridge color', value: 'Black' },
    ],
  },

  // ============ DRUM UNITS (3 products: 1 OEM + 2 Compatible) ============
  {
    name: 'Brother DR-2255 Drum Unit',
    slug: 'brother-dr-2255-drum',
    brand: 'brother',
    categories: ['drum-units'],
    shortDesc: 'Genuine Brother DR-2255 drum for HL-2130 / DCP-7055 mono lasers.',
    description:
      'Brother DR-2255 Drum Unit is the genuine imaging unit for the Brother HL-2130 / HL-2132 / DCP-7055 / DCP-7057 mono laser printers. ~12,000 page life.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    imageKey: 'drum',
    boxContents: ['Drum unit × 1', 'Installation manual', 'Warranty card'],
    variants: [
      {
        sku: 'BRO-DR2255',
        mrp: 5799,
        price: 4699,
        stock: 25,
        attributes: { type: 'Drum unit', yield: '~12,000 pages' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Component type', value: 'Drum / Imaging unit' },
      { group: 'Type', key: 'Cartridge type', value: 'Original (OEM)' },
      { group: 'Yield', key: 'Drum life', value: '~12,000 pages' },
      { group: 'Compatibility', key: 'Printers', value: 'HL-2130, HL-2132, DCP-7055, DCP-7057' },
    ],
  },
  {
    name: 'Print-Rite Compatible Brother DR-2255 Drum',
    slug: 'printrite-brother-dr-2255-drum',
    brand: 'print-rite',
    categories: ['drum-units'],
    shortDesc: 'Aftermarket DR-2255 drum at 40% of OEM cost.',
    description:
      'Print-Rite Compatible Brother DR-2255 Drum Unit gives the HL-2130 / DCP-7055 mono fleet a budget imaging-unit option. STMC-tested. ~12,000 page life.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    warrantyType: 'Replacement',
    imageKey: 'drum',
    boxContents: ['Drum unit × 1', 'Installation manual'],
    variants: [
      {
        sku: 'PR-BRO-DR2255',
        mrp: 2799,
        price: 1899,
        stock: 55,
        attributes: { type: 'Drum unit', yield: '~12,000 pages' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Component type', value: 'Drum / Imaging unit' },
      { group: 'Type', key: 'Cartridge type', value: 'Compatible (Aftermarket)' },
      { group: 'Yield', key: 'Drum life', value: '~12,000 pages' },
      { group: 'Compatibility', key: 'Replaces', value: 'Brother DR-2255' },
    ],
  },
  {
    name: 'ProDot Compatible HP 12A Drum (Q2612A)',
    slug: 'prodot-hp-12a-drum',
    brand: 'prodot',
    categories: ['drum-units'],
    shortDesc: 'ProDot Indian-made HP 12A drum + toner combo for LaserJet 1010 / 1020.',
    description:
      'ProDot Compatible HP 12A (Q2612A) Drum + Toner integrated cartridge fits the long-lived HP LaserJet 1010 / 1020 / 3050 / M1005 / M1319 fleet — Indian manufactured with full installation support.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    warrantyType: 'Replacement',
    imageKey: 'drum',
    boxContents: ['Drum + Toner × 1', 'Installation manual'],
    variants: [
      {
        sku: 'PD-HP12A-DRUM',
        mrp: 1499,
        price: 999,
        stock: 70,
        attributes: { type: 'Drum + Toner', yield: '~2,000 pages' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Component type', value: 'Drum + Toner (integrated)' },
      { group: 'Type', key: 'Cartridge type', value: 'Compatible (Aftermarket)' },
      { group: 'Yield', key: 'Yield', value: '~2,000 pages' },
      { group: 'Compatibility', key: 'Replaces', value: 'HP 12A (Q2612A)' },
    ],
  },

  // ============ MULTIPACK & COMBOS (4 products) ============
  {
    name: 'HP 678 Black + Tri-Color Combo Pack',
    slug: 'hp-678-combo-pack',
    brand: 'hp',
    categories: ['multipack-combos', 'ink-cartridges'],
    shortDesc: 'Genuine HP 678 Black + Tri-Color combo pack — save vs single-cartridge prices.',
    description:
      'HP 678 Black + Tri-Color Original Combo Pack gives you both cartridges in a single value-priced box for the HP DeskJet Ink Advantage 1015 / 2515 / 3515 / 4515 / 4645 family.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    imageKey: 'combo',
    boxContents: ['HP 678 Black × 1', 'HP 678 Tri-Color × 1', 'Setup guide'],
    variants: [
      {
        sku: 'HP-678-COMBO',
        mrp: 1999,
        price: 1499,
        stock: 60,
        attributes: { color: 'Black + Tri-Color', yield: 'Standard' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Original (OEM)' },
      { group: 'Pack', key: 'Contents', value: 'HP 678 Black + Tri-Color' },
      { group: 'Compatibility', key: 'Printers', value: 'DeskJet IA 2515, 3515, 4515, 4645' },
    ],
  },
  {
    name: 'Epson 003 4-Color Multipack',
    slug: 'epson-003-multipack',
    brand: 'epson',
    categories: ['multipack-combos', 'ink-bottles'],
    shortDesc: 'Full Epson 003 CMYK bottle set — Black + Cyan + Magenta + Yellow.',
    description:
      'Epson 003 4-Color Multipack ships the full Black / Cyan / Magenta / Yellow ink-bottle set for EcoTank L1110 / L3110 / L3150 / L4150 / L5190 / L6170 in one value-priced box.',
    hsnCode: HSN.inkBottle,
    warrantyMonths: 12,
    imageKey: 'combo',
    boxContents: oemMultiBox,
    variants: [
      {
        sku: 'EP-003-MULTI',
        mrp: 2199,
        price: 1799,
        stock: 75,
        attributes: { color: 'CMYK Set', volume: '4 × 65 ml' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Original (OEM)' },
      { group: 'Pack', key: 'Contents', value: 'Epson 003 Black + Cyan + Magenta + Yellow' },
      {
        group: 'Compatibility',
        key: 'Printers',
        value: 'EcoTank L1110, L3110, L3150, L4150, L5190',
      },
    ],
  },
  {
    name: 'Canon PG-47 + CL-57 Combo Pack',
    slug: 'canon-pg47-cl57-combo',
    brand: 'canon',
    categories: ['multipack-combos', 'ink-cartridges'],
    shortDesc: 'Genuine Canon PG-47 Black + CL-57 Color combo for PIXMA E-series.',
    description:
      'Canon PG-47 + CL-57 Combo Pack ships both genuine cartridges in a single box at a value price — fits Canon PIXMA E400 / E410 / E480 / E3170 / E4270 / E477.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    imageKey: 'combo',
    boxContents: ['Canon PG-47 Black × 1', 'Canon CL-57 Color × 1', 'Setup guide'],
    variants: [
      {
        sku: 'CAN-PG47-CL57-COMBO',
        mrp: 2390,
        price: 1849,
        stock: 50,
        attributes: { color: 'Black + Tri-Color', yield: 'Standard' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Original (OEM)' },
      { group: 'Pack', key: 'Contents', value: 'Canon PG-47 Black + CL-57 Tri-Color' },
      { group: 'Compatibility', key: 'Printers', value: 'PIXMA E400, E410, E480, E3170, E4270' },
    ],
  },
  {
    name: 'G&G Compatible HP 678 Combo (Black + Tri-Color)',
    slug: 'gg-hp-678-combo',
    brand: 'gg',
    categories: ['multipack-combos', 'ink-cartridges'],
    shortDesc: 'Aftermarket HP 678 dual-pack — Black + Tri-Color at ~50% off OEM.',
    description:
      'G&G Compatible HP 678 Combo Pack ships both Black and Tri-Color aftermarket cartridges for HP DeskJet IA 2515 / 3515 / 4515 / 4645 at a significant discount versus OEM.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 6,
    warrantyType: 'Replacement',
    imageKey: 'combo',
    boxContents: ['Black cartridge × 1', 'Tri-Color cartridge × 1', 'Installation instructions'],
    variants: [
      {
        sku: 'GG-HP678-COMBO',
        mrp: 1199,
        price: 699,
        stock: 95,
        attributes: { color: 'Black + Tri-Color', yield: 'Standard' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Cartridge type', value: 'Compatible (Aftermarket)' },
      { group: 'Pack', key: 'Contents', value: 'HP 678 Black + Tri-Color (aftermarket)' },
      { group: 'Compatibility', key: 'Replaces', value: 'HP 678 Black + Tri-Color' },
    ],
  },

  // ============ PRINT HEADS (2 products) ============
  {
    name: 'Canon QY6-0073 Print Head',
    slug: 'canon-qy6-0073-print-head',
    brand: 'canon',
    categories: ['print-heads'],
    shortDesc: 'Genuine Canon QY6-0073 print head for PIXMA iP3600 / MP540 / MX870.',
    description:
      'Canon QY6-0073 Print Head is the genuine replacement print-head module for the Canon PIXMA iP3600 / iP3680 / MP540 / MP620 / MP630 / MX860 / MX870 series. Self-installation, full warranty.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    imageKey: 'drum',
    boxContents: ['Print head × 1', 'Installation guide', 'Cleaning swab'],
    variants: [
      {
        sku: 'CAN-QY6-0073',
        mrp: 5499,
        price: 4499,
        stock: 18,
        attributes: { type: 'Print head' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Component type', value: 'Print head module' },
      { group: 'Type', key: 'Cartridge type', value: 'Original (OEM)' },
      {
        group: 'Compatibility',
        key: 'Printers',
        value: 'PIXMA iP3600, MP540, MP620, MX860, MX870',
      },
    ],
  },
  {
    name: 'Epson Print Head for L130 / L220 / L355',
    slug: 'epson-print-head-l-series',
    brand: 'epson',
    categories: ['print-heads'],
    shortDesc: 'Replacement print-head module for Epson EcoTank L130 / L220 / L355 / L555.',
    description:
      'Epson Replacement Print Head Assembly for the EcoTank L130 / L220 / L310 / L355 / L555 / L1300 series. Installs in under 10 minutes — restores nozzle health when cleaning cycles fail to recover.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 6,
    imageKey: 'drum',
    boxContents: ['Print head × 1', 'Installation manual'],
    variants: [
      {
        sku: 'EP-PH-L-SERIES',
        mrp: 4299,
        price: 3499,
        stock: 22,
        attributes: { type: 'Print head' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Component type', value: 'Print head assembly' },
      { group: 'Type', key: 'Cartridge type', value: 'Original (OEM)' },
      { group: 'Compatibility', key: 'Printers', value: 'EcoTank L130, L220, L310, L355, L555' },
    ],
  },

  // ============ PHOTO PAPER & PREMIUM PAPER (4 products) ============
  {
    name: 'HP Premium Photo Paper Glossy A4 — 20 sheets',
    slug: 'hp-photo-paper-glossy-a4',
    brand: 'hp',
    categories: ['photo-paper'],
    shortDesc: 'High-gloss A4 photo paper, 250 gsm — 20 sheets per pack.',
    description:
      'HP Premium Photo Paper Glossy A4 (250 gsm) delivers vivid, lab-quality photographs from any inkjet printer. Smudge-free instant drying, professional gloss finish.',
    hsnCode: HSN.paper,
    imageKey: 'paper',
    boxContents: ['Photo paper × 20 sheets'],
    variants: [
      {
        sku: 'HP-PAPER-A4-GL',
        mrp: 599,
        price: 449,
        stock: 200,
        attributes: { size: 'A4', finish: 'Glossy', sheets: '20' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Specs', key: 'Paper size', value: 'A4 (210 × 297 mm)' },
      { group: 'Specs', key: 'Finish', value: 'Glossy' },
      { group: 'Specs', key: 'GSM', value: '250 gsm' },
      { group: 'Pack', key: 'Sheets per pack', value: '20' },
    ],
  },
  {
    name: 'Kodak Premium Photo Paper 4x6 — 100 sheets',
    slug: 'kodak-photo-paper-4x6',
    brand: 'kodak',
    categories: ['photo-paper'],
    shortDesc: 'Kodak gloss 4×6 photo paper, 230 gsm — 100-sheet bulk pack.',
    description:
      'Kodak Premium Photo Paper 4×6 in a 100-sheet pack — the photographer-favourite gloss finish at 230 gsm. Compatible with all major inkjet printers.',
    hsnCode: HSN.paper,
    imageKey: 'paper',
    boxContents: ['Photo paper × 100 sheets'],
    variants: [
      {
        sku: 'KOD-PAPER-4x6',
        mrp: 999,
        price: 699,
        stock: 150,
        attributes: { size: '4×6 inch', finish: 'Glossy', sheets: '100' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Specs', key: 'Paper size', value: '4 × 6 inch (102 × 152 mm)' },
      { group: 'Specs', key: 'Finish', value: 'Glossy' },
      { group: 'Specs', key: 'GSM', value: '230 gsm' },
      { group: 'Pack', key: 'Sheets per pack', value: '100' },
    ],
  },
  {
    name: 'Canon Premium Matte Photo Paper A4 — 50 sheets',
    slug: 'canon-matte-photo-paper-a4',
    brand: 'canon',
    categories: ['photo-paper', 'premium-paper'],
    shortDesc: 'Heavy-weight Canon matte A4 photo paper, 170 gsm — 50 sheets.',
    description:
      'Canon Premium Matte Photo Paper A4 (170 gsm) — premium photographer-grade matte finish for portraits, archival prints, and gallery presentations.',
    hsnCode: HSN.paper,
    imageKey: 'paper',
    boxContents: ['Photo paper × 50 sheets'],
    variants: [
      {
        sku: 'CAN-PAPER-A4-MT',
        mrp: 799,
        price: 599,
        stock: 110,
        attributes: { size: 'A4', finish: 'Matte', sheets: '50' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Specs', key: 'Paper size', value: 'A4 (210 × 297 mm)' },
      { group: 'Specs', key: 'Finish', value: 'Matte' },
      { group: 'Specs', key: 'GSM', value: '170 gsm' },
      { group: 'Pack', key: 'Sheets per pack', value: '50' },
    ],
  },
  {
    name: 'Kodak Premium A3 Glossy Photo Paper — 20 sheets',
    slug: 'kodak-a3-glossy-photo-paper',
    brand: 'kodak',
    categories: ['premium-paper', 'photo-paper'],
    shortDesc: 'Large-format A3 gloss photo paper, 230 gsm — 20-sheet pack.',
    description:
      'Kodak Premium A3 Glossy Photo Paper (230 gsm, 20 sheets) is built for poster prints, gallery exhibits, and high-detail enlargements on A3-capable inkjet printers.',
    hsnCode: HSN.paper,
    imageKey: 'paper',
    boxContents: ['Photo paper × 20 sheets'],
    variants: [
      {
        sku: 'KOD-PAPER-A3-GL',
        mrp: 1299,
        price: 999,
        stock: 60,
        attributes: { size: 'A3', finish: 'Glossy', sheets: '20' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Specs', key: 'Paper size', value: 'A3 (297 × 420 mm)' },
      { group: 'Specs', key: 'Finish', value: 'Glossy' },
      { group: 'Specs', key: 'GSM', value: '230 gsm' },
      { group: 'Pack', key: 'Sheets per pack', value: '20' },
    ],
  },

  // ============ CLEANING / REFILL / RIBBON / CABLE / MAINT (6 products) ============
  {
    name: 'Print-Rite Universal Print Head Cleaning Kit',
    slug: 'printrite-cleaning-kit',
    brand: 'print-rite',
    categories: ['cleaning-kits', 'maintenance-kits'],
    shortDesc: 'All-in-one nozzle/print-head cleaning solution for inkjet printers.',
    description:
      'Print-Rite Universal Print Head Cleaning Kit revives clogged nozzles and improves print quality on Epson, Canon, HP, and Brother inkjet printers. 100 ml solution + applicator pad + step-by-step instructions.',
    hsnCode: HSN.cartridge,
    imageKey: 'cleaning',
    boxContents: ['100 ml cleaning solution', 'Applicator pad', 'Syringe', 'Instructions'],
    variants: [
      {
        sku: 'PR-CLEAN-KIT',
        mrp: 599,
        price: 399,
        stock: 90,
        attributes: { type: 'Cleaning kit' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Product type', value: 'Print head cleaning solution' },
      { group: 'Volume', key: 'Solution volume', value: '100 ml' },
      { group: 'Compatibility', key: 'Compatible with', value: 'All inkjet printers' },
    ],
  },
  {
    name: 'ProDot Refill Toner Powder (HP/Canon Universal)',
    slug: 'prodot-refill-toner-powder',
    brand: 'prodot',
    categories: ['refill-kits'],
    shortDesc: '100 g universal toner powder for HP & Canon cartridge refills.',
    description:
      'ProDot Refill Toner Powder (100 g jar) is a universal black toner refill for HP 88A / 12A / 17A / 36A and Canon 925 / 337 / 737 cartridges. Comes with full DIY-refill instructions and a funnel.',
    hsnCode: HSN.cartridge,
    imageKey: 'cleaning',
    boxContents: ['Toner powder × 100 g', 'Funnel', 'Drill guide', 'Refill manual'],
    variants: [
      {
        sku: 'PD-TONER-REFILL-100',
        mrp: 399,
        price: 249,
        stock: 110,
        attributes: { type: 'Toner powder', volume: '100 g' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Product type', value: 'Toner refill powder' },
      { group: 'Volume', key: 'Weight', value: '100 g' },
      {
        group: 'Compatibility',
        key: 'Compatible with',
        value: 'HP 88A, 12A, 17A, 36A; Canon 925, 337, 737',
      },
    ],
  },
  {
    name: 'Epson FX-2190 Printer Ribbon (S015329)',
    slug: 'epson-fx-2190-ribbon',
    brand: 'epson',
    categories: ['printer-ribbons'],
    shortDesc: 'Genuine Epson FX-2190 ribbon — dot-matrix workhorse for invoicing & GST.',
    description:
      'Epson FX-2190 Original Ribbon Cartridge (S015329) for the long-running Epson FX-2190 / FX-2175 / FX-2180 dot-matrix invoice printers still ubiquitous in Indian GST billing workflows.',
    hsnCode: HSN.ribbon,
    warrantyMonths: 12,
    imageKey: 'cleaning',
    boxContents: ['Ribbon cartridge × 1'],
    variants: [
      {
        sku: 'EP-FX2190-RIB',
        mrp: 749,
        price: 599,
        stock: 70,
        attributes: { type: 'Ribbon cartridge' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Product type', value: 'Dot-matrix ribbon' },
      { group: 'Type', key: 'Cartridge type', value: 'Original (OEM)' },
      { group: 'Compatibility', key: 'Printers', value: 'Epson FX-2190, FX-2175, FX-2180' },
    ],
  },
  {
    name: 'USB 2.0 A-to-B Printer Cable (1.5m)',
    slug: 'usb-printer-cable-15m',
    brand: 'prodot',
    categories: ['cables-accessories'],
    shortDesc: 'Premium gold-plated USB 2.0 cable for any printer with USB-B port.',
    description:
      'ProDot Premium USB 2.0 A-to-B Printer Cable, 1.5-metre length, gold-plated connectors, foil + braid shielding. Drop-in for any printer with a standard USB-B port — works with all HP, Canon, Epson, Brother, Samsung, Pantum printers.',
    hsnCode: HSN.cable,
    warrantyMonths: 12,
    imageKey: 'cleaning',
    boxContents: ['USB 2.0 cable × 1'],
    variants: [
      {
        sku: 'PD-USB-AB-15',
        mrp: 249,
        price: 149,
        stock: 200,
        attributes: { length: '1.5 m', type: 'USB 2.0 A-to-B' },
        isDefault: true,
      },
      {
        sku: 'PD-USB-AB-30',
        mrp: 399,
        price: 249,
        stock: 130,
        attributes: { length: '3.0 m', type: 'USB 2.0 A-to-B' },
      },
    ],
    specs: [
      { group: 'Specs', key: 'Cable type', value: 'USB 2.0 A-to-B' },
      { group: 'Specs', key: 'Length', value: '1.5 m / 3.0 m' },
      { group: 'Specs', key: 'Connectors', value: 'Gold-plated' },
    ],
  },
  {
    name: 'HP LaserJet Maintenance Kit',
    slug: 'hp-laserjet-maintenance-kit',
    brand: 'hp',
    categories: ['maintenance-kits'],
    shortDesc: 'OEM maintenance + cleaning kit for HP LaserJet office printers.',
    description:
      'HP LaserJet Maintenance Kit ships fuser rollers, pickup rollers, transfer roller, and cleaning supplies for the office HP LaserJet Pro M404 / M428 / M501 / M506 / M507 / M527 series. Recommended every 200,000 pages.',
    hsnCode: HSN.cartridge,
    warrantyMonths: 12,
    imageKey: 'cleaning',
    boxContents: [
      'Fuser',
      'Pickup rollers × 2',
      'Transfer roller',
      'Cleaning swabs',
      'Service manual',
    ],
    variants: [
      {
        sku: 'HP-LJ-MAINT-KIT',
        mrp: 14999,
        price: 11999,
        stock: 12,
        attributes: { type: 'Maintenance kit' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Product type', value: 'Maintenance kit' },
      { group: 'Type', key: 'Cartridge type', value: 'Original (OEM)' },
      {
        group: 'Compatibility',
        key: 'Printers',
        value: 'LaserJet Pro M404, M428, M501, M506, M507, M527',
      },
      { group: 'Service', key: 'Interval', value: 'Every ~200,000 pages' },
    ],
  },
  {
    name: 'G&G Universal Inkjet Refill Kit (CMYK)',
    slug: 'gg-universal-refill-kit',
    brand: 'gg',
    categories: ['refill-kits'],
    shortDesc: 'Universal 4×100 ml CMYK refill set for HP / Canon / Brother inkjet cartridges.',
    description:
      'G&G Universal Inkjet Refill Kit ships 4 × 100 ml CMYK ink bottles plus syringes, plugs, and refill instructions — universal compatibility with HP, Canon, and Brother inkjet cartridges. Best value per ml.',
    hsnCode: HSN.inkBottle,
    imageKey: 'cleaning',
    boxContents: ['Ink × 4 × 100 ml (CMYK)', 'Syringes × 4', 'Cartridge plugs', 'Manual'],
    variants: [
      {
        sku: 'GG-UNIV-REFILL',
        mrp: 999,
        price: 599,
        stock: 100,
        attributes: { color: 'CMYK Set', volume: '4 × 100 ml' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Product type', value: 'Inkjet refill kit' },
      { group: 'Volume', key: 'Total volume', value: '4 × 100 ml' },
      {
        group: 'Compatibility',
        key: 'Compatible with',
        value: 'HP, Canon, Brother inkjet cartridges',
      },
    ],
  },

  // ============ PRINTERS — Inkjet / Laser / All-in-One / Photo (8 products) ============
  {
    name: 'HP DeskJet Ink Advantage 2335 All-in-One',
    slug: 'hp-deskjet-2335',
    brand: 'hp',
    categories: ['inkjet-printers', 'all-in-one-printers'],
    shortDesc: 'Compact AIO — print, scan, copy on the HP DeskJet 2335.',
    description:
      'HP DeskJet Ink Advantage 2335 is a budget-friendly all-in-one inkjet printer for the Indian home — print, scan, and copy from a single compact device. Uses HP 805 ink cartridges.',
    hsnCode: HSN.printer,
    warrantyMonths: 12,
    warrantyType: 'Manufacturer (onsite)',
    imageKey: 'printer',
    boxContents: printerBox,
    variants: [
      {
        sku: 'HP-DJ-2335',
        mrp: 4999,
        price: 4299,
        stock: 28,
        attributes: { type: 'All-in-One Inkjet', connectivity: 'USB 2.0' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Printer type', value: 'All-in-One Inkjet' },
      { group: 'Functions', key: 'Functions', value: 'Print, Scan, Copy' },
      { group: 'Print', key: 'Speed (Black)', value: '7.5 ppm' },
      { group: 'Connectivity', key: 'Interfaces', value: 'USB 2.0' },
      { group: 'Cartridges', key: 'Uses', value: 'HP 805 Black + Tri-Color' },
    ],
  },
  {
    name: 'Canon PIXMA E477 All-in-One',
    slug: 'canon-pixma-e477',
    brand: 'canon',
    categories: ['inkjet-printers', 'all-in-one-printers'],
    shortDesc: 'Wireless AIO inkjet — Wi-Fi printing on the Canon PIXMA E477.',
    description:
      'Canon PIXMA E477 is a wireless all-in-one inkjet printer — print, scan, copy with Wi-Fi support and Canon PRINT app for mobile. Uses Canon PG-47 and CL-57 cartridges.',
    hsnCode: HSN.printer,
    warrantyMonths: 12,
    warrantyType: 'Manufacturer (onsite)',
    imageKey: 'printer',
    boxContents: printerBox,
    variants: [
      {
        sku: 'CAN-E477',
        mrp: 6999,
        price: 5999,
        stock: 22,
        attributes: { type: 'All-in-One Inkjet', connectivity: 'Wi-Fi + USB' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Printer type', value: 'All-in-One Inkjet' },
      { group: 'Functions', key: 'Functions', value: 'Print, Scan, Copy' },
      { group: 'Connectivity', key: 'Interfaces', value: 'Wi-Fi, USB 2.0' },
      { group: 'Cartridges', key: 'Uses', value: 'Canon PG-47, CL-57' },
    ],
  },
  {
    name: 'Epson EcoTank L3250 All-in-One',
    slug: 'epson-ecotank-l3250',
    brand: 'epson',
    categories: ['inkjet-printers', 'all-in-one-printers'],
    shortDesc: 'Refill-tank AIO — 4,500 mono / 7,500 colour pages per bottle.',
    description:
      'Epson EcoTank L3250 is the no-cartridge ink-tank all-in-one printer — Wi-Fi, print, scan, copy. Uses Epson 003 ink bottles for industry-leading cost-per-page on the Indian home market.',
    hsnCode: HSN.printer,
    warrantyMonths: 12,
    warrantyType: 'Manufacturer (onsite)',
    imageKey: 'printer',
    boxContents: [
      'Printer',
      'Setup ink bottles × 4 (Black + CMY)',
      'Power cable',
      'USB cable',
      'Quick-start guide',
    ],
    variants: [
      {
        sku: 'EP-L3250',
        mrp: 14999,
        price: 12499,
        stock: 20,
        attributes: { type: 'All-in-One InkTank', connectivity: 'Wi-Fi + USB' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Printer type', value: 'Ink-tank All-in-One' },
      { group: 'Functions', key: 'Functions', value: 'Print, Scan, Copy' },
      { group: 'Connectivity', key: 'Interfaces', value: 'Wi-Fi, USB 2.0' },
      { group: 'Cartridges', key: 'Uses', value: 'Epson 003 Black + CMY bottles' },
      { group: 'Yield', key: 'Pages per bottle', value: '~4,500 mono / 7,500 colour' },
    ],
  },
  {
    name: 'HP LaserJet Pro M126nw',
    slug: 'hp-laserjet-pro-m126nw',
    brand: 'hp',
    categories: ['laser-printers', 'all-in-one-printers'],
    shortDesc: 'Wireless mono laser AIO — 20 ppm print on the HP LaserJet M126nw.',
    description:
      'HP LaserJet Pro M126nw is a small-office wireless mono-laser all-in-one — 20 ppm print, copy, scan, with Wi-Fi connectivity. Uses HP 88A toner cartridges.',
    hsnCode: HSN.printer,
    warrantyMonths: 12,
    warrantyType: 'Manufacturer (onsite)',
    imageKey: 'printer',
    boxContents: ['Printer', 'Starter toner', 'Power cable', 'USB cable', 'Quick-start guide'],
    variants: [
      {
        sku: 'HP-LJ-M126NW',
        mrp: 19990,
        price: 16990,
        stock: 14,
        attributes: { type: 'Mono Laser AIO', connectivity: 'Wi-Fi + USB' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Printer type', value: 'Mono Laser All-in-One' },
      { group: 'Functions', key: 'Functions', value: 'Print, Scan, Copy' },
      { group: 'Print', key: 'Speed (Mono)', value: '20 ppm' },
      { group: 'Connectivity', key: 'Interfaces', value: 'Wi-Fi, USB 2.0' },
      { group: 'Cartridges', key: 'Uses', value: 'HP 88A (CC388A) Toner' },
    ],
  },
  {
    name: 'Brother HL-B2080DW Mono Laser',
    slug: 'brother-hl-b2080dw',
    brand: 'brother',
    categories: ['laser-printers'],
    shortDesc: 'Wireless duplex mono laser at 34 ppm — Brother HL-B2080DW.',
    description:
      'Brother HL-B2080DW is a single-function mono-laser with automatic duplex printing, Wi-Fi, and 34 ppm speed — Indian-market value-laser favourite. Uses Brother TN-B021 toner.',
    hsnCode: HSN.printer,
    warrantyMonths: 12,
    warrantyType: 'Manufacturer (onsite)',
    imageKey: 'printer',
    boxContents: ['Printer', 'Starter toner', 'Power cable', 'USB cable', 'Quick-start guide'],
    variants: [
      {
        sku: 'BRO-HL-B2080DW',
        mrp: 16999,
        price: 13999,
        stock: 18,
        attributes: { type: 'Mono Laser', connectivity: 'Wi-Fi + USB' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Printer type', value: 'Mono Laser' },
      { group: 'Print', key: 'Speed (Mono)', value: '34 ppm' },
      { group: 'Print', key: 'Duplex', value: 'Automatic' },
      { group: 'Connectivity', key: 'Interfaces', value: 'Wi-Fi, USB 2.0' },
      { group: 'Cartridges', key: 'Uses', value: 'Brother TN-B021 Toner' },
    ],
  },
  {
    name: 'Pantum P2502W Wireless Mono Laser',
    slug: 'pantum-p2502w',
    brand: 'pantum',
    categories: ['laser-printers'],
    shortDesc: 'Budget Wi-Fi mono laser — 23 ppm on the Pantum P2502W.',
    description:
      'Pantum P2502W is a budget-friendly Wi-Fi-enabled mono-laser printer — 23 ppm, mobile printing via Pantum app, ideal for home offices and small SMEs in India. Uses Pantum PA-210 toner.',
    hsnCode: HSN.printer,
    warrantyMonths: 12,
    warrantyType: 'Manufacturer',
    imageKey: 'printer',
    boxContents: ['Printer', 'Starter toner', 'Power cable', 'USB cable', 'Quick-start guide'],
    variants: [
      {
        sku: 'PAN-P2502W',
        mrp: 11999,
        price: 9999,
        stock: 25,
        attributes: { type: 'Mono Laser', connectivity: 'Wi-Fi + USB' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Printer type', value: 'Mono Laser' },
      { group: 'Print', key: 'Speed (Mono)', value: '23 ppm' },
      { group: 'Connectivity', key: 'Interfaces', value: 'Wi-Fi, USB 2.0' },
      { group: 'Cartridges', key: 'Uses', value: 'Pantum PA-210 Toner' },
    ],
  },
  {
    name: 'Canon SELPHY CP1300 Photo Printer',
    slug: 'canon-selphy-cp1300',
    brand: 'canon',
    categories: ['photo-printers'],
    shortDesc: 'Compact dye-sub photo printer for 4×6 lab-quality prints.',
    description:
      'Canon SELPHY CP1300 is a portable dye-sublimation photo printer for instant 4×6 lab-quality photos. Wi-Fi, AirPrint, and a built-in card slot — perfect for events and travel photographers.',
    hsnCode: HSN.printer,
    warrantyMonths: 12,
    imageKey: 'printer',
    boxContents: ['Printer', 'Paper cassette', 'Power adapter', 'Quick-start guide'],
    variants: [
      {
        sku: 'CAN-SELPHY-CP1300',
        mrp: 12999,
        price: 10999,
        stock: 16,
        attributes: { type: 'Photo Printer', connectivity: 'Wi-Fi + USB + Card slot' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Printer type', value: 'Dye-sub Photo Printer' },
      { group: 'Print', key: 'Output size', value: '4 × 6 inch / Card size' },
      { group: 'Connectivity', key: 'Interfaces', value: 'Wi-Fi, USB, SD card' },
    ],
  },
  {
    name: 'Epson PictureMate PM-520 Photo Printer',
    slug: 'epson-picturemate-pm-520',
    brand: 'epson',
    categories: ['photo-printers'],
    shortDesc: 'Wireless 4×6 photo printer — Wi-Fi & SD card, Epson PictureMate PM-520.',
    description:
      'Epson PictureMate PM-520 is a compact 4×6 inkjet photo printer with Wi-Fi and SD-card direct printing. Lab-quality prints in under a minute — great for studios and home photographers.',
    hsnCode: HSN.printer,
    warrantyMonths: 12,
    imageKey: 'printer',
    boxContents: ['Printer', 'Photo cartridge', 'Power adapter', 'Quick-start guide'],
    variants: [
      {
        sku: 'EP-PM520',
        mrp: 17999,
        price: 14999,
        stock: 12,
        attributes: { type: 'Photo Printer', connectivity: 'Wi-Fi + USB + Card slot' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Type', key: 'Printer type', value: 'Inkjet Photo Printer' },
      { group: 'Print', key: 'Output size', value: '4 × 6 inch' },
      { group: 'Connectivity', key: 'Interfaces', value: 'Wi-Fi, USB, SD card' },
    ],
  },

  // ============ OFFICE BUNDLES (2 products) ============
  {
    name: 'HP LaserJet M126nw + 2× HP 88A Toner Office Bundle',
    slug: 'office-bundle-hp-m126nw',
    brand: 'hp',
    categories: ['office-bundles', 'laser-printers'],
    shortDesc: 'Printer + 2 spare toners — full small-office setup at one bundle price.',
    description:
      'Office-ready bundle: HP LaserJet Pro M126nw mono-laser AIO + 2 × HP 88A Original Black Toner cartridges (CC388A). Up to ~4,500 pages of standby print capacity beyond the starter toner. Ideal for new SME setups.',
    hsnCode: HSN.printer,
    warrantyMonths: 12,
    warrantyType: 'Manufacturer (onsite)',
    imageKey: 'printer',
    boxContents: [
      'HP LaserJet Pro M126nw',
      'HP 88A Toner × 2',
      'Power cable',
      'USB cable',
      'Quick-start guide',
    ],
    variants: [
      {
        sku: 'BUNDLE-HP-M126NW',
        mrp: 28999,
        price: 23999,
        stock: 8,
        attributes: { type: 'Office bundle', includes: 'Printer + 2 toners' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Pack', key: 'Contents', value: 'HP LaserJet M126nw + 2× HP 88A Toner' },
      { group: 'Print', key: 'Speed (Mono)', value: '20 ppm' },
      { group: 'Yield', key: 'Standby capacity', value: '~3,000 additional pages' },
    ],
  },
  {
    name: 'Epson L3250 + 2× Epson 003 Multipack Bundle',
    slug: 'office-bundle-epson-l3250',
    brand: 'epson',
    categories: ['office-bundles', 'inkjet-printers'],
    shortDesc: 'EcoTank AIO + 2 full CMYK ink-bottle sets for a year of printing.',
    description:
      'Office-ready bundle: Epson EcoTank L3250 all-in-one printer + 2 × Epson 003 4-Color Multipacks. Approx. 13,500 mono + 22,500 colour pages of additional print capacity — over a year of home-office use.',
    hsnCode: HSN.printer,
    warrantyMonths: 12,
    warrantyType: 'Manufacturer (onsite)',
    imageKey: 'printer',
    boxContents: [
      'Epson EcoTank L3250',
      'Epson 003 Multipack × 2 (8 bottles total)',
      'Cables',
      'Quick-start guide',
    ],
    variants: [
      {
        sku: 'BUNDLE-EP-L3250',
        mrp: 18999,
        price: 15999,
        stock: 10,
        attributes: { type: 'Office bundle', includes: 'Printer + 8 ink bottles' },
        isDefault: true,
      },
    ],
    specs: [
      { group: 'Pack', key: 'Contents', value: 'Epson L3250 + 2× 003 Multipack (8 bottles)' },
      { group: 'Print', key: 'Type', value: 'Ink-tank All-in-One' },
      { group: 'Yield', key: 'Standby capacity', value: '~13,500 mono + 22,500 colour pages' },
    ],
  },
];

// Optional per-product image override (used only if you want a specific photo
// for an individual SKU; otherwise the category-keyed IMG.* fallback wins).
const PRODUCT_IMAGES: Record<string, string> = {};

async function main() {
  console.info('Seeding default warehouse...');
  await prisma.warehouse.upsert({
    where: { code: 'DEFAULT' },
    create: {
      name: 'Naman Enterprises — Mumbai HQ',
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

  // Soft-archive legacy products that are not part of this seed. Hard-deleting
  // them would trip ProductVariant → CartItem / OrderItem foreign keys. The
  // catalog read paths filter on `status: ACTIVE` + `deletedAt: null`, so
  // archived rows disappear from PLP / PDP / Home without losing order history.
  console.info('Archiving previous catalog products...');
  const newSlugs = new Set(products.map((p) => p.slug));
  await prisma.product.updateMany({
    where: { slug: { notIn: [...newSlugs] }, deletedAt: null },
    data: { status: 'ARCHIVED', deletedAt: new Date() },
  });

  console.info('Seeding categories...');
  // Categories no longer in the seed list should be soft-deactivated so the
  // header nav + category index stay accurate after a re-seed.
  const newCategorySlugs = new Set(categories.map((c) => c.slug));
  await prisma.category.updateMany({
    where: { slug: { notIn: [...newCategorySlugs] } },
    data: { isActive: false },
  });
  const categoryRows = await Promise.all(
    categories.map((c) =>
      prisma.category.upsert({
        where: { slug: c.slug },
        create: {
          name: c.name,
          slug: c.slug,
          position: c.position,
          image: c.image,
          isActive: true,
        },
        update: {
          name: c.name,
          position: c.position,
          image: c.image,
          isActive: true,
        },
      }),
    ),
  );
  const categoryBySlug = new Map(categoryRows.map((c) => [c.slug, c.id]));

  console.info('Seeding brands...');
  const newBrandSlugs = new Set(brands.map((b) => b.slug));
  await prisma.brand.updateMany({
    where: { slug: { notIn: [...newBrandSlugs] } },
    data: { isActive: false },
  });
  const brandRows = await Promise.all(
    brands.map((b) =>
      prisma.brand.upsert({
        where: { slug: b.slug },
        create: { name: b.name, slug: b.slug, logo: b.logo, isActive: true },
        update: { name: b.name, logo: b.logo, isActive: true },
      }),
    ),
  );
  const brandBySlug = new Map(brandRows.map((b) => [b.slug, b.id]));

  console.info('Seeding products...');
  for (const p of products) {
    const brandId = brandBySlug.get(p.brand);
    if (!brandId) {
      console.warn(`Skipping ${p.slug}: brand ${p.brand} not seeded.`);
      continue;
    }

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
        boxContents: p.boxContents,
      },
      update: {
        name: p.name,
        brandId,
        description: p.description,
        shortDesc: p.shortDesc,
        status: 'ACTIVE',
        hsnCode: p.hsnCode,
        warrantyMonths: p.warrantyMonths,
        warrantyType: p.warrantyType,
        boxContents: p.boxContents,
      },
    });

    // Categories — replace wholesale so a re-seed picks up moves.
    await prisma.productCategory.deleteMany({ where: { productId: product.id } });
    for (const slug of p.categories) {
      const categoryId = categoryBySlug.get(slug);
      if (!categoryId) {
        console.warn(`Skipping category ${slug} for ${p.slug}: category not seeded.`);
        continue;
      }
      await prisma.productCategory.create({
        data: { productId: product.id, categoryId },
      });
    }

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

    const imageUrl = PRODUCT_IMAGES[p.slug] ?? pickPhoto(p.slug, IMG[p.imageKey] ?? IMG.fallback);
    await prisma.productImage.deleteMany({
      where: { productId: product.id, isPrimary: true },
    });
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: imageUrl,
        alt: p.name,
        isPrimary: true,
        position: 0,
      },
    });

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
