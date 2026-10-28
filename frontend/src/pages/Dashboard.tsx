import { Link } from 'react-router-dom';
import { displayDate } from '../lib/utils';
import { STATUS_ORDER, STATUS_LABELS } from '../types';
import StatusBadge from '../components/StatusBadge';
import ErrorState from '../components/ErrorState';
import { StatsSkeleton } from '../components/Skeleton';
import { useStats } from '../lib/queries';

export default function Dashboard() {
  const { data: stats, isPending, isError, error, refetch } = useStats();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">仪表盘</h1>
        <Link
          to="/applications/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
        >
          + 新建申请
        </Link>
      </div>

      {isError ? (
        <ErrorState message={error?.message} onRetry={() => refetch()} />
      ) : isPending || !stats ? (
        <>
          <StatsSkeleton />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-200" />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="text-sm text-slate-500">总申请数</div>
              <div data-testid="stat-total" className="text-3xl font-bold">
                {stats.total}
              </div>
            </div>
            {STATUS_ORDER.map((s) => (
              <div key={s} className="rounded-lg bg-white p-6 shadow">
                <div className="text-sm text-slate-500">{STATUS_LABELS[s]}</div>
                <div data-testid={`stat-${s}`} className="text-3xl font-bold">
                  {stats.counts[s]}
                </div>
              </div>
            ))}
          </div>

          <h2 className="mb-4 text-lg font-semibold">最近申请</h2>
          {stats.recent.length === 0 ? (
            <p className="text-slate-500">还没有申请记录。</p>
          ) : (
            <ul className="space-y-2">
              {stats.recent.map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/applications/${a.id}`}
                    className="flex items-center justify-between rounded-lg bg-white px-4 py-3 shadow hover:bg-slate-50"
                  >
                    <div>
                      <span className="font-medium">{a.company}</span>
                      <span className="ml-2 text-slate-500">{a.position}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-500">{displayDate(a.appliedDate)}</span>
                      <StatusBadge status={a.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
