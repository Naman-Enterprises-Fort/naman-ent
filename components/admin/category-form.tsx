'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FieldError, FormError, FormSuccess } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { slugify } from '@/lib/utils/slug';
import { type CreateCategoryInput, createCategorySchema } from '@/lib/validators/category';

type CategoryFormValues = CreateCategoryInput;

export interface CategoryParentOption {
  id: string;
  name: string;
  slug: string;
  /** True if this option would create a cycle (the category being edited or a descendant). */
  forbidden: boolean;
}

export function CategoryForm({
  initial,
  categoryId,
  parentOptions,
}: {
  initial?: Partial<CategoryFormValues> & { id?: string };
  categoryId?: string;
  parentOptions: CategoryParentOption[];
}) {
  const router = useRouter();
  const isEdit = !!categoryId;
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: initial?.name ?? '',
      slug: initial?.slug ?? '',
      parentId: initial?.parentId ?? null,
      image: initial?.image ?? null,
      description: initial?.description ?? null,
      seoTitle: initial?.seoTitle ?? null,
      seoDesc: initial?.seoDesc ?? null,
      position: initial?.position ?? 0,
      isActive: initial?.isActive ?? true,
    },
  });

  const nameValue = watch('name');
  useEffect(() => {
    if (!slugTouched && nameValue) setValue('slug', slugify(nameValue), { shouldDirty: true });
  }, [nameValue, slugTouched, setValue]);

  async function onSubmit(values: CategoryFormValues) {
    setServerError(null);
    setSuccess(null);
    const url = isEdit ? `/api/admin/categories/${categoryId}` : '/api/admin/categories';
    const method = isEdit ? 'PATCH' : 'POST';
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    const data: { error?: string } = await res.json().catch(() => ({}));
    if (!res.ok) {
      setServerError(data.error ?? 'Could not save the category.');
      return;
    }
    setSuccess(isEdit ? 'Category saved.' : 'Category created.');
    router.refresh();
    if (!isEdit) router.push('/admin/categories');
  }

  async function onDelete() {
    if (!categoryId) return;
    if (!window.confirm('Delete this category? This cannot be undone.')) return;
    setServerError(null);
    setDeletePending(true);
    try {
      const res = await fetch(`/api/admin/categories/${categoryId}`, { method: 'DELETE' });
      const data: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        setServerError(data.error ?? 'Could not delete the category.');
        return;
      }
      router.push('/admin/categories');
      router.refresh();
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <form noValidate className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <FormError message={serverError} />
      <FormSuccess message={success} />

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
          <Label htmlFor="parentId">Parent category</Label>
          <select
            id="parentId"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            {...register('parentId', {
              setValueAs: (v) => (typeof v === 'string' && v.trim().length > 0 ? v : null),
            })}
          >
            <option value="">— No parent (top-level) —</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id} disabled={p.forbidden}>
                {p.name} ({p.slug}){p.forbidden ? ' — would create a cycle' : ''}
              </option>
            ))}
          </select>
          <FieldError message={errors.parentId?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="position">Position</Label>
          <Input
            id="position"
            type="number"
            min={0}
            max={9999}
            aria-invalid={!!errors.position}
            {...register('position', { valueAsNumber: true })}
          />
          <p className="text-muted-foreground text-xs">Lower numbers sort first.</p>
          <FieldError message={errors.position?.message} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="image">Image URL</Label>
        <Input
          id="image"
          placeholder="https://res.cloudinary.com/..."
          aria-invalid={!!errors.image}
          {...register('image', {
            setValueAs: (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
          })}
        />
        <FieldError message={errors.image?.message as string | undefined} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-invalid={!!errors.description}
          {...register('description', {
            setValueAs: (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
          })}
        />
        <FieldError message={errors.description?.message} />
      </div>

      <fieldset className="grid gap-5 rounded-lg border p-4 md:grid-cols-2">
        <legend className="px-1 font-medium text-sm">SEO</legend>
        <div className="space-y-1.5">
          <Label htmlFor="seoTitle">SEO title</Label>
          <Input
            id="seoTitle"
            aria-invalid={!!errors.seoTitle}
            {...register('seoTitle', {
              setValueAs: (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
            })}
          />
          <FieldError message={errors.seoTitle?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="seoDesc">SEO description</Label>
          <Input
            id="seoDesc"
            aria-invalid={!!errors.seoDesc}
            {...register('seoDesc', {
              setValueAs: (v) => (typeof v === 'string' && v.trim() === '' ? null : v),
            })}
          />
          <FieldError message={errors.seoDesc?.message} />
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4 rounded border-input" {...register('isActive')} />
        Active (visible to customers)
      </label>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting || (isEdit && !isDirty)}>
          {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create category'}
        </Button>
        {isEdit ? (
          <Button type="button" variant="destructive" disabled={deletePending} onClick={onDelete}>
            {deletePending ? 'Deleting…' : 'Delete'}
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={() => router.push('/admin/categories')}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
