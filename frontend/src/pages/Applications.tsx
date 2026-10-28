import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { displayDate } from '../lib/utils';
import type { Application, ApplicationStatus } from '../types';
import { STATUS_ORDER, STATUS_LABELS } from '../types';
import StatusBadge from '../components/StatusBadge';
import ErrorState from '../components/ErrorState';
import { ListSkeleton, KanbanSkeleton } from '../components/Skeleton';
import { useApplications, useUpdateStatus } from '../lib/queries';

type ViewMode = 'list' | 'kanban';

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export default function Applications() {
  const [view, setView] = useState<ViewMode>('list');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');
  const [q, setQ] = useState('');
  const [mutationError, setMutationError] = useState('');

  const debouncedQ = useDebouncedValue(q, 300);

  const { data, isPending, isError, error, refetch } = useApplications({
    status: statusFilter || undefined,
    q: debouncedQ || undefined,
  });

  const updateStatus = useUpdateStatus();

  const runStatusChange = (id: string, status: ApplicationStatus) => {
    setMutationError('');
    updateStatus.mutate(
      { id, status },
      {
        onError: (err) => setMutationError(err instanceof Error ? err.message : '更新状态失败'),
      },
    );
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }
    runStatusChange(draggableId, destination.droppableId as ApplicationStatus);
  };

  const items = data?.items ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">申请列表</h1>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-slate-300">
            <button
              data-testid="view-list"
              onClick={() => setView('list')}
              className={`px-3 py-1.5 text-sm ${view === 'list' ? 'bg-slate-900 text-white' : 'bg-white'}`}
            >
              列表
            </button>
            <button
              data-testid="view-kanban"
              onClick={() => setView('kanban')}
              className={`px-3 py-1.5 text-sm ${view === 'kanban' ? 'bg-slate-900 text-white' : 'bg-white'}`}
            >
              看板
            </button>
          </div>
          <Link
            to="/applications/new"
            className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
          >
            + 新建
          </Link>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <input
          data-testid="search-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索公司/职位"
          className="rounded-md border border-slate-300 px-3 py-2"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | '')}
          className="rounded-md border border-slate-300 px-3 py-2"
        >
          <option value="">全部状态</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {mutationError && <p className="mb-4 text-red-600">{mutationError}</p>}

      {isError ? (
        <ErrorState message={error?.message} onRetry={() => refetch()} />
      ) : isPending ? (
        view === 'list' ? <ListSkeleton /> : <KanbanSkeleton />
      ) : view === 'list' ? (
        <ListView items={items} onStatusChange={runStatusChange} />
      ) : (
        <KanbanView items={items} onStatusChange={runStatusChange} onDragEnd={onDragEnd} />
      )}
    </div>
  );
}

function ListView({
  items,
  onStatusChange,
}: {
  items: Application[];
  onStatusChange: (id: string, status: ApplicationStatus) => void;
}) {
  if (items.length === 0) return <p className="text-slate-500">暂无申请记录。</p>;

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold">公司</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">职位</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">投递日期</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">状态</th>
            <th className="px-4 py-3 text-left text-sm font-semibold">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {items.map((a) => (
            <tr key={a.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link to={`/applications/${a.id}`} className="font-medium hover:underline">
                  {a.company}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-600">{a.position}</td>
              <td className="px-4 py-3 text-slate-600">{displayDate(a.appliedDate)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={a.status} />
              </td>
              <td className="px-4 py-3">
                <select
                  value={a.status}
                  onChange={(e) => onStatusChange(a.id, e.target.value as ApplicationStatus)}
                  className="rounded border border-slate-300 px-2 py-1 text-sm"
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KanbanView({
  items,
  onStatusChange,
  onDragEnd,
}: {
  items: Application[];
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  onDragEnd: (result: DropResult) => void;
}) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATUS_ORDER.map((status) => {
          const cols = items.filter((a) => a.status === status);
          return (
            <div key={status} className="flex flex-col rounded-lg bg-slate-100 p-3">
              <h2 className="mb-3 font-semibold">
                <span data-testid={`kanban-col-${status}`}>
                  {STATUS_LABELS[status]}
                </span>{' '}
                <span className="text-slate-500">({cols.length})</span>
              </h2>
              <Droppable droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    data-testid={`kanban-drop-${status}`}
                    className={`flex-1 space-y-2 rounded-md transition-colors ${
                      snapshot.isDraggingOver ? 'bg-slate-200' : ''
                    }`}
                    style={{ minHeight: '100px' }}
                  >
                    {cols.map((a, index) => (
                      <Draggable key={a.id} draggableId={a.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            data-testid={`kanban-card-${a.id}`}
                            className={`rounded-lg bg-white p-3 shadow transition-shadow ${
                              snapshot.isDragging ? 'shadow-lg ring-2 ring-slate-900 ring-opacity-10' : ''
                            }`}
                          >
                            <Link to={`/applications/${a.id}`} className="font-medium hover:underline">
                              {a.company}
                            </Link>
                            <p className="text-sm text-slate-600">{a.position}</p>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-xs text-slate-500">{displayDate(a.appliedDate)}</span>
                              <select
                                value={a.status}
                                onChange={(e) => onStatusChange(a.id, e.target.value as ApplicationStatus)}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded border border-slate-300 px-1 py-0.5 text-xs"
                              >
                                {STATUS_ORDER.map((s) => (
                                  <option key={s} value={s}>
                                    {STATUS_LABELS[s]}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
