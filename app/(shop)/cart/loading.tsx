import { Skeleton } from '@/components/ui/skeleton';

export default function CartLoading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 md:py-10">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholder
            <div key={i} className="flex gap-3 rounded-lg border bg-card p-4">
              <Skeleton className="size-20 rounded-md sm:size-28" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="mt-2 h-8 w-32" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
