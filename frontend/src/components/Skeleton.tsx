export function StatCardSkeleton() {
  return <div className="h-24 animate-pulse rounded-lg bg-slate-200" />;
}

export function StatsSkeleton() {
  return (
    <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4" data-testid="stats-skeleton">
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
      <StatCardSkeleton />
    </div>
  );
}

export function ListRowSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-4 px-4 py-3">
      <div className="h-4 w-32 rounded bg-slate-200" />
      <div className="h-4 w-40 rounded bg-slate-200" />
      <div className="h-4 w-24 rounded bg-slate-200" />
      <div className="h-5 w-16 rounded-full bg-slate-200" />
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow" data-testid="list-skeleton">
      <div className="divide-y divide-slate-200">
        {Array.from({ length: 5 }).map((_, i) => (
          <ListRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function KanbanSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="kanban-skeleton">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg bg-slate-100 p-3">
          <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
          <div className="h-20 animate-pulse rounded-md bg-slate-200" />
          <div className="h-20 animate-pulse rounded-md bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8" data-testid="detail-skeleton">
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="mb-4 h-8 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-64 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 space-y-3">
          <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
