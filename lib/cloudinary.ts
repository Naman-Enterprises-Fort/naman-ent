import type { ImageLoaderProps } from 'next/image';

/**
 * Cloudinary URL transform loader for `next/image`.
 *
 * Behaviour:
 * - If `src` is a full Cloudinary URL (`https://res.cloudinary.com/<cloud>/image/upload/...`),
 *   we splice in width / quality / format-auto transforms after `/upload/`.
 * - If `src` is a bare public ID (e.g. `products/iphone-15-pro/front`), we build the URL
 *   from `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`.
 * - If `src` is any other absolute URL we return it unchanged so seed data with
 *   placeholder images (e.g. unsplash) still works.
 *
 * Always uses `f_auto,q_auto` so Cloudinary picks AVIF/WebP/JPEG per UA.
 */
export function cloudinaryLoader({ src, width, quality }: ImageLoaderProps): string {
  const q = quality ?? 75;
  const transforms = `f_auto,q_${q},w_${width},c_limit`;

  if (src.startsWith('https://res.cloudinary.com/')) {
    return src.replace(/\/upload\/(?!.*\/upload\/)/, `/upload/${transforms}/`);
  }

  if (/^https?:\/\//.test(src)) {
    return src;
  }

  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloud) return src;

  const cleanId = src.replace(/^\/+/, '');
  return `https://res.cloudinary.com/${cloud}/image/upload/${transforms}/${cleanId}`;
}

/**
 * Build a Cloudinary URL directly (server-side only — for `og:image`, structured data, etc.).
 * Width defaults to 1200 to match a typical OG/Twitter card.
 */
export function cloudinaryUrl(
  publicId: string,
  opts: { width?: number; height?: number; quality?: number } = {},
): string {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloud) return publicId;
  const { width = 1200, height, quality = 80 } = opts;
  const dims = height ? `w_${width},h_${height},c_fill` : `w_${width},c_limit`;
  return `https://res.cloudinary.com/${cloud}/image/upload/f_auto,q_${quality},${dims}/${publicId}`;
}
