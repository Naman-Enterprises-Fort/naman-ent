'use client';

import { Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { FieldError, FormError, FormSuccess } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { slugify } from '@/lib/utils/slug';
import { type CreateProductInput, createProductSchema } from '@/lib/validators/product';

interface BrandOption {
  id: string;
  name: string;
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

/**
 * Form-shape carries `attributesText` per variant (a key=value-per-line
 * textarea) instead of the schema's Record<string,string>. We convert before
 * submit and let the schema validate the converted payload.
 */
type FormVariant = Omit<CreateProductInput['variants'][number], 'attributes' | 'id'> & {
  id?: string;
  attributesText: string;
};

type FormValues = Omit<CreateProductInput, 'variants' | 'hazmatFlags' | 'boxContents'> & {
  variants: FormVariant[];
  hazmatFlagsText: string;
  boxContentsText: string;
};

function recordFromAttributesText(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const k = trimmed.slice(0, eq).trim();
    const v = trimmed.slice(eq + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

function listFromCsv(text: string, max = 10): string[] {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max);
}

const STATUS_OPTIONS: ReadonlyArray<{ value: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'; label: string }> = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export interface ProductFormInitial {
  id?: string;
  name?: string;
  slug?: string;
  brandId?: string | null;
  description?: string;
  shortDesc?: string | null;
  status?: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  modelNumber?: string | null;
  mpn?: string | null;
  gtin?: string | null;
  hsnCode?: string | null;
  countryOfOrigin?: string;
  warrantyType?: string | null;
  warrantyMonths?: number | null;
  warrantyDocUrl?: string | null;
  beeRating?: number | null;
  hazmatFlags?: string[];
  boxContents?: string[];
  seoTitle?: string | null;
  seoDesc?: string | null;
  categoryIds?: string[];
  variants?: FormVariant[];
  images?: CreateProductInput['images'];
  specs?: CreateProductInput['specs'];
}

export function ProductForm({
  initial,
  productId,
  brandOptions,
  categoryOptions,
}: {
  initial?: ProductFormInitial;
  productId?: string;
  brandOptions: BrandOption[];
  categoryOptions: CategoryOption[];
}) {
  const router = useRouter();
  const isEdit = !!productId;
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);

  const defaultValues: FormValues = {
    name: initial?.name ?? '',
    slug: initial?.slug ?? '',
    brandId: initial?.brandId ?? null,
    description: initial?.description ?? '',
    shortDesc: initial?.shortDesc ?? null,
    status: initial?.status ?? 'DRAFT',
    modelNumber: initial?.modelNumber ?? null,
    mpn: initial?.mpn ?? null,
    gtin: initial?.gtin ?? null,
    hsnCode: initial?.hsnCode ?? null,
    countryOfOrigin: initial?.countryOfOrigin ?? 'India',
    warrantyType: initial?.warrantyType ?? null,
    warrantyMonths: initial?.warrantyMonths ?? null,
    warrantyDocUrl: initial?.warrantyDocUrl ?? null,
    beeRating: initial?.beeRating ?? null,
    hazmatFlagsText: (initial?.hazmatFlags ?? []).join(', '),
    boxContentsText: (initial?.boxContents ?? []).join(', '),
    seoTitle: initial?.seoTitle ?? null,
    seoDesc: initial?.seoDesc ?? null,
    categoryIds: initial?.categoryIds ?? [],
    variants: (initial?.variants ?? [
      {
        sku: '',
        name: null,
        attributesText: '',
        mrp: 0,
        price: 0,
        gstRate: 18,
        stock: 0,
        lowStockThreshold: 5,
        backorderAllowed: false,
        isDefault: true,
        position: 0,
      } as FormVariant,
    ]) as FormVariant[],
    images: initial?.images ?? [],
    specs: initial?.specs ?? [],
  };

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ defaultValues });

  const variantsField = useFieldArray({ control, name: 'variants' });
  const imagesField = useFieldArray({ control, name: 'images' });
  const specsField = useFieldArray({ control, name: 'specs' });

  const nameValue = watch('name');
  useEffect(() => {
    if (!slugTouched && nameValue) setValue('slug', slugify(nameValue), { shouldDirty: true });
  }, [nameValue, slugTouched, setValue]);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    setSuccess(null);

    // Convert form-shape into schema-shape.
    const payload: CreateProductInput = {
      name: values.name,
      slug: values.slug,
      brandId: values.brandId ?? null,
      description: values.description,
      shortDesc: values.shortDesc ?? null,
      status: values.status,
      modelNumber: values.modelNumber ?? null,
      mpn: values.mpn ?? null,
      gtin: values.gtin ?? null,
      hsnCode: values.hsnCode ?? null,
      countryOfOrigin: values.countryOfOrigin,
      warrantyType: values.warrantyType ?? null,
      warrantyMonths: values.warrantyMonths ?? null,
      warrantyDocUrl: values.warrantyDocUrl ?? null,
      beeRating: values.beeRating ?? null,
      hazmatFlags: listFromCsv(values.hazmatFlagsText),
      boxContents: listFromCsv(values.boxContentsText, 20),
      seoTitle: values.seoTitle ?? null,
      seoDesc: values.seoDesc ?? null,
      categoryIds: values.categoryIds,
      variants: values.variants.map((v, i) => ({
        ...(v.id ? { id: v.id } : {}),
        sku: v.sku,
        ean: v.ean ?? null,
        name: v.name ?? null,
        attributes: recordFromAttributesText(v.attributesText),
        mrp: Number(v.mrp),
        price: Number(v.price),
        costPrice: v.costPrice == null ? null : Number(v.costPrice),
        gstRate: Number(v.gstRate),
        stock: Number(v.stock),
        lowStockThreshold: Number(v.lowStockThreshold),
        backorderAllowed: v.backorderAllowed,
        weightGrams: v.weightGrams == null ? null : Number(v.weightGrams),
        lengthMm: v.lengthMm == null ? null : Number(v.lengthMm),
        widthMm: v.widthMm == null ? null : Number(v.widthMm),
        heightMm: v.heightMm == null ? null : Number(v.heightMm),
        isDefault: v.isDefault,
        position: v.position ?? i,
      })),
      images: values.images.map((img, i) => ({
        ...(img.id ? { id: img.id } : {}),
        url: img.url,
        alt: img.alt ?? null,
        position: img.position ?? i,
        isPrimary: img.isPrimary,
        variantId: img.variantId ?? null,
      })),
      specs: values.specs.map((s, i) => ({
        ...(s.id ? { id: s.id } : {}),
        group: s.group,
        key: s.key,
        value: s.value,
        position: s.position ?? i,
      })),
    };

    const validation = createProductSchema.safeParse(payload);
    if (!validation.success) {
      const firstIssue = validation.error.issues[0];
      setServerError(
        firstIssue ? `${firstIssue.path.join('.')}: ${firstIssue.message}` : 'Invalid input',
      );
      return;
    }

    const url = isEdit ? `/api/admin/products/${productId}` : '/api/admin/products';
    const method = isEdit ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validation.data),
    });
    const data: { error?: string } = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerError(data.error ?? 'Could not save the product.');
      return;
    }
    setSuccess(isEdit ? 'Product saved.' : 'Product created.');
    router.refresh();
    if (!isEdit) router.push('/admin/products');
  }

  async function onDelete() {
    if (!productId) return;
    if (
      !window.confirm(
        'Archive this product? It will be hidden from customers but kept for order history.',
      )
    )
      return;
    setServerError(null);
    setDeletePending(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, { method: 'DELETE' });
      const data: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        setServerError(data.error ?? 'Could not archive the product.');
        return;
      }
      router.push('/admin/products');
      router.refresh();
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <form noValidate className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
      <FormError message={serverError} />
      <FormSuccess message={success} />

      {/* Basics */}
      <section className="space-y-5 rounded-lg border bg-card p-5">
        <h2 className="font-semibold text-base">Basics</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" autoFocus aria-invalid={!!errors.name} {...register('name')} />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              aria-invalid={!!errors.slug}
              {...register('slug', { onChange: () => setSlugTouched(true) })}
            />
            <FieldError message={errors.slug?.message} />
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="brandId">Brand</Label>
            <select
              id="brandId"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              {...register('brandId', {
                setValueAs: (v) => (typeof v === 'string' && v.trim().length > 0 ? v : null),
              })}
            >
              <option value="">— No brand —</option>
              {brandOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <FieldError message={errors.brandId?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              {...register('status')}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <FieldError message={errors.status?.message} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="shortDesc">Short description</Label>
          <Input
            id="shortDesc"
            placeholder="One-line tagline shown on cards"
            aria-invalid={!!errors.shortDesc}
            {...register('shortDesc', {
              setValueAs: (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
            })}
          />
          <FieldError message={errors.shortDesc?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            rows={6}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-invalid={!!errors.description}
            {...register('description')}
          />
          <p className="text-muted-foreground text-xs">
            Supports paragraphs separated by blank lines.
          </p>
          <FieldError message={errors.description?.message} />
        </div>
      </section>

      {/* Categories */}
      <section className="space-y-3 rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-base">Categories</h2>
          <p className="text-muted-foreground text-xs">Pick at least one (max 8).</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {categoryOptions.map((c) => (
            <label
              key={c.id}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                value={c.id}
                className="size-4 rounded border-input"
                {...register('categoryIds')}
              />
              <span className="line-clamp-1">{c.name}</span>
            </label>
          ))}
        </div>
        <FieldError message={errors.categoryIds?.message as string | undefined} />
      </section>

      {/* Tax + origin + warranty + extras */}
      <section className="space-y-5 rounded-lg border bg-card p-5">
        <h2 className="font-semibold text-base">Tax, origin & warranty</h2>
        <div className="grid gap-5 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="hsnCode">HSN code</Label>
            <Input
              id="hsnCode"
              placeholder="85171211"
              aria-invalid={!!errors.hsnCode}
              {...register('hsnCode', {
                setValueAs: (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
              })}
            />
            <FieldError message={errors.hsnCode?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="countryOfOrigin">Country of origin</Label>
            <Input id="countryOfOrigin" {...register('countryOfOrigin')} />
            <FieldError message={errors.countryOfOrigin?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="beeRating">BEE rating (1–5)</Label>
            <Input
              id="beeRating"
              type="number"
              min={1}
              max={5}
              {...register('beeRating', {
                setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
              })}
            />
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="warrantyMonths">Warranty (months)</Label>
            <Input
              id="warrantyMonths"
              type="number"
              min={0}
              max={120}
              {...register('warrantyMonths', {
                setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
              })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="warrantyType">Warranty type</Label>
            <Input
              id="warrantyType"
              placeholder="Manufacturer / Onsite / Limited"
              {...register('warrantyType', {
                setValueAs: (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
              })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="warrantyDocUrl">Warranty doc URL</Label>
            <Input
              id="warrantyDocUrl"
              type="url"
              {...register('warrantyDocUrl', {
                setValueAs: (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
              })}
            />
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="modelNumber">Model number</Label>
            <Input
              id="modelNumber"
              {...register('modelNumber', {
                setValueAs: (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
              })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mpn">MPN</Label>
            <Input
              id="mpn"
              {...register('mpn', {
                setValueAs: (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
              })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gtin">GTIN</Label>
            <Input
              id="gtin"
              {...register('gtin', {
                setValueAs: (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
              })}
            />
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="hazmatFlagsText">Hazmat flags</Label>
            <Input
              id="hazmatFlagsText"
              placeholder="lithium-battery, fragile"
              {...register('hazmatFlagsText')}
            />
            <p className="text-muted-foreground text-xs">Comma-separated.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="boxContentsText">In the box</Label>
            <Input
              id="boxContentsText"
              placeholder="Device, Charger, Manual"
              {...register('boxContentsText')}
            />
            <p className="text-muted-foreground text-xs">Comma-separated; up to 20 items.</p>
          </div>
        </div>
      </section>

      {/* Variants */}
      <section className="space-y-3 rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-base">Variants</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              variantsField.append({
                sku: '',
                name: null,
                attributesText: '',
                mrp: 0,
                price: 0,
                gstRate: 18,
                stock: 0,
                lowStockThreshold: 5,
                backorderAllowed: false,
                isDefault: variantsField.fields.length === 0,
                position: variantsField.fields.length,
              })
            }
          >
            <Plus aria-hidden className="size-3.5" />
            Add variant
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Need at least one variant. Mark exactly one as default. Selling price must not exceed MRP.
          Removing a variant that has carts/orders will be rejected — archive the product instead.
        </p>
        <ul className="flex flex-col gap-4">
          {variantsField.fields.map((field, idx) => (
            <li key={field.id} className="rounded-md border bg-background p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="font-medium text-sm">Variant {idx + 1}</p>
                {variantsField.fields.length > 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => variantsField.remove(idx)}
                  >
                    <X aria-hidden className="size-3.5" />
                    Remove
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`variants.${idx}.sku`}>SKU</Label>
                  <Input id={`variants.${idx}.sku`} {...register(`variants.${idx}.sku`)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`variants.${idx}.name`}>Variant name</Label>
                  <Input
                    id={`variants.${idx}.name`}
                    placeholder="Optional, e.g. Black 256GB"
                    {...register(`variants.${idx}.name`, {
                      setValueAs: (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
                    })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`variants.${idx}.position`}>Position</Label>
                  <Input
                    id={`variants.${idx}.position`}
                    type="number"
                    min={0}
                    {...register(`variants.${idx}.position`, { valueAsNumber: true })}
                  />
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor={`variants.${idx}.mrp`}>MRP (₹)</Label>
                  <Input
                    id={`variants.${idx}.mrp`}
                    type="number"
                    step="0.01"
                    min={0}
                    {...register(`variants.${idx}.mrp`, { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`variants.${idx}.price`}>Selling price (₹)</Label>
                  <Input
                    id={`variants.${idx}.price`}
                    type="number"
                    step="0.01"
                    min={0}
                    {...register(`variants.${idx}.price`, { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`variants.${idx}.gstRate`}>GST %</Label>
                  <Input
                    id={`variants.${idx}.gstRate`}
                    type="number"
                    step="0.01"
                    min={0}
                    max={28}
                    {...register(`variants.${idx}.gstRate`, { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`variants.${idx}.stock`}>Stock</Label>
                  <Input
                    id={`variants.${idx}.stock`}
                    type="number"
                    min={0}
                    {...register(`variants.${idx}.stock`, { valueAsNumber: true })}
                  />
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor={`variants.${idx}.weightGrams`}>Weight (g)</Label>
                  <Input
                    id={`variants.${idx}.weightGrams`}
                    type="number"
                    min={1}
                    {...register(`variants.${idx}.weightGrams`, {
                      setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
                    })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`variants.${idx}.lengthMm`}>Length (mm)</Label>
                  <Input
                    id={`variants.${idx}.lengthMm`}
                    type="number"
                    min={1}
                    {...register(`variants.${idx}.lengthMm`, {
                      setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
                    })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`variants.${idx}.widthMm`}>Width (mm)</Label>
                  <Input
                    id={`variants.${idx}.widthMm`}
                    type="number"
                    min={1}
                    {...register(`variants.${idx}.widthMm`, {
                      setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
                    })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`variants.${idx}.heightMm`}>Height (mm)</Label>
                  <Input
                    id={`variants.${idx}.heightMm`}
                    type="number"
                    min={1}
                    {...register(`variants.${idx}.heightMm`, {
                      setValueAs: (v) => (v === '' || v == null ? null : Number(v)),
                    })}
                  />
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                <Label htmlFor={`variants.${idx}.attributesText`}>
                  Attributes (one <code className="font-mono text-xs">key=value</code> per line)
                </Label>
                <textarea
                  id={`variants.${idx}.attributesText`}
                  rows={3}
                  placeholder={`color=Natural Titanium\nstorage=128GB`}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  {...register(`variants.${idx}.attributesText`)}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-input"
                    {...register(`variants.${idx}.isDefault`)}
                  />
                  Default variant
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-input"
                    {...register(`variants.${idx}.backorderAllowed`)}
                  />
                  Allow backorder
                </label>
                <span className="text-muted-foreground text-xs">
                  Low-stock alert at:{' '}
                  <Input
                    type="number"
                    min={0}
                    className="ml-2 inline-flex h-7 w-20 px-2 text-xs"
                    {...register(`variants.${idx}.lowStockThreshold`, { valueAsNumber: true })}
                  />
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Images */}
      <section className="space-y-3 rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-base">Images</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              imagesField.append({
                url: '',
                alt: null,
                position: imagesField.fields.length,
                isPrimary: imagesField.fields.length === 0,
              })
            }
          >
            <Plus aria-hidden className="size-3.5" />
            Add image
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Paste a URL (Cloudinary or any HTTPS image). Mark exactly one as primary. Cloudinary
          upload widget is Phase-2 polish.
        </p>
        <ul className="flex flex-col gap-3">
          {imagesField.fields.map((field, idx) => (
            <li
              key={field.id}
              className="grid gap-3 rounded-md border bg-background p-4 md:grid-cols-[1fr_200px_120px_auto]"
            >
              <div className="space-y-1.5">
                <Label htmlFor={`images.${idx}.url`}>URL</Label>
                <Input id={`images.${idx}.url`} type="url" {...register(`images.${idx}.url`)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`images.${idx}.alt`}>Alt</Label>
                <Input
                  id={`images.${idx}.alt`}
                  {...register(`images.${idx}.alt`, {
                    setValueAs: (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
                  })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`images.${idx}.position`}>Position</Label>
                <Input
                  id={`images.${idx}.position`}
                  type="number"
                  min={0}
                  {...register(`images.${idx}.position`, { valueAsNumber: true })}
                />
              </div>
              <div className="flex items-end justify-between gap-2 pb-1">
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-input"
                    {...register(`images.${idx}.isPrimary`)}
                  />
                  Primary
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => imagesField.remove(idx)}
                >
                  <X aria-hidden className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Specs */}
      <section className="space-y-3 rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold text-base">Specs</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              specsField.append({
                group: '',
                key: '',
                value: '',
                position: specsField.fields.length,
              })
            }
          >
            <Plus aria-hidden className="size-3.5" />
            Add spec
          </Button>
        </div>
        <ul className="flex flex-col gap-3">
          {specsField.fields.map((field, idx) => (
            <li
              key={field.id}
              className="grid gap-3 rounded-md border bg-background p-4 md:grid-cols-[180px_180px_1fr_120px_auto]"
            >
              <div className="space-y-1.5">
                <Label htmlFor={`specs.${idx}.group`}>Group</Label>
                <Input
                  id={`specs.${idx}.group`}
                  placeholder="Display"
                  {...register(`specs.${idx}.group`)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`specs.${idx}.key`}>Key</Label>
                <Input
                  id={`specs.${idx}.key`}
                  placeholder="Size"
                  {...register(`specs.${idx}.key`)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`specs.${idx}.value`}>Value</Label>
                <Input
                  id={`specs.${idx}.value`}
                  placeholder="6.1-inch Super Retina XDR"
                  {...register(`specs.${idx}.value`)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`specs.${idx}.position`}>Position</Label>
                <Input
                  id={`specs.${idx}.position`}
                  type="number"
                  min={0}
                  {...register(`specs.${idx}.position`, { valueAsNumber: true })}
                />
              </div>
              <div className="flex items-end pb-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => specsField.remove(idx)}
                >
                  <X aria-hidden className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* SEO */}
      <section className="space-y-5 rounded-lg border bg-card p-5">
        <h2 className="font-semibold text-base">SEO</h2>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="seoTitle">SEO title</Label>
            <Input
              id="seoTitle"
              {...register('seoTitle', {
                setValueAs: (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
              })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seoDesc">SEO description</Label>
            <Input
              id="seoDesc"
              {...register('seoDesc', {
                setValueAs: (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
              })}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting || (isEdit && !isDirty)}>
          {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create product'}
        </Button>
        {isEdit ? (
          <Button type="button" variant="destructive" disabled={deletePending} onClick={onDelete}>
            {deletePending ? 'Archiving…' : 'Archive product'}
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={() => router.push('/admin/products')}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
