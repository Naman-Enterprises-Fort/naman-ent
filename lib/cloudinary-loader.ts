import type { ImageLoaderProps } from 'next/image';

/**
 * Default-exported Cloudinary URL transformer for `next/image`.
 *
 * Wired globally via `next.config.ts → images.loader = 'custom'` +
 * `images.loaderFile = './lib/cloudinary-loader.ts'`. Next 16's RSC boundary
 * forbids passing function references (`loader={cloudinaryLoader}`) across
 * server-to-client serialization, so the loader has to live in this
 * default-export shape and be picked up by config rather than per-Image
 * prop. See lib/cloudinary.ts for the named export used by structured-data
 * builders (server-only call sites that compose URLs at render time).
 *
 * Behaviour:
 * - If `src` is a full Cloudinary URL we splice in width / quality / format-auto
 *   transforms after `/upload/`.
 * - If `src` is a bare public ID, build the URL from
 *   `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`.
 * - Any other absolute URL (e.g. seeded Unsplash placeholders) passes through
 *   unchanged.
 */
export default function cloudinaryLoader({ src, width, quality }: ImageLoaderProps): string {
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
