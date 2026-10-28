import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatDate, displayDate, displayDateTime } from '../lib/utils';
import type { Application, InterviewRound, InterviewRoundType, InterviewRoundResult, Note } from '../types';
import { STATUS_LABELS, STATUS_ORDER, INTERVIEW_TYPE_LABELS, INTERVIEW_RESULT_LABELS } from '../types';
import StatusBadge from '../components/StatusBadge';
import ErrorState from '../components/ErrorState';
import { DetailSkeleton } from '../components/Skeleton';
import {
  useApplication,
  useNotes,
  useInterviews,
  useUpdateApplication,
  useUpdateStatus,
  useDeleteApplication,
  useCreateNote,
  useDeleteNote,
  useCreateInterview,
  useDeleteInterview,
} from '../lib/queries';
import {
  applicationUpdateSchema,
  type ApplicationUpdateInput,
  noteSchema,
  type NoteInput,
  interviewRoundSchema,
  type InterviewRoundInput,
} from '../lib/validation';

export default function ApplicationDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);

  const appQuery = useApplication(id);
  const notesQuery = useNotes(id);
  const interviewsQuery = useInterviews(id);
  const updateApplication = useUpdateApplication(id);
  const updateStatus = useUpdateStatus();
  const deleteApplication = useDeleteApplication();
  const createNote = useCreateNote(id);
  const deleteNote = useDeleteNote(id);
  const createInterview = useCreateInterview(id);
  const deleteInterview = useDeleteInterview(id);

  const app = appQuery.data;
  const notes = notesQuery.data ?? [];
  const interviews = interviewsQuery.data ?? [];

  if (appQuery.isError) {
    return <ErrorState message={appQuery.error?.message} onRetry={() => appQuery.refetch()} />;
  }
  if (appQuery.isPending || !app) {
    return <DetailSkeleton />;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/applications" className="text-sm text-slate-500 hover:underline">
        ← 返回列表
      </Link>

      <div className="mt-4 rounded-lg bg-white p-6 shadow">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{app.company}</h1>
            <p className="text-slate-600">{app.position}</p>
          </div>
          <StatusBadge status={app.status} />
        </div>

        <EditForm
          key={app.id}
          app={app}
          editing={editing}
          isSaving={updateApplication.isPending}
          onSubmit={(values) => {
            updateApplication.mutate(values, {
              onSuccess: () => setEditing(false),
            });
          }}
          onCancel={() => setEditing(false)}
        />

        <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
          <span className="mr-1 py-1 text-sm text-slate-500">修改状态：</span>
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              data-testid={`status-${s}`}
              onClick={() => updateStatus.mutate({ id, status: s })}
              disabled={s === app.status}
              className={`rounded-md px-3 py-1 text-sm ${
                s === app.status
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-300 hover:bg-slate-100'
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-2 border-t pt-4">
          <button
            onClick={() => setEditing(true)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
          >
            编辑
          </button>
          <button
            onClick={() => {
              if (!confirm('确定删除这条申请？相关备注与状态历史也会一并删除。')) return;
              deleteApplication.mutate(id, {
                onSuccess: () => navigate('/applications'),
              });
            }}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            删除
          </button>
        </div>
      </div>

      <InterviewSection
        interviews={interviews}
        isError={interviewsQuery.isError}
        errorMessage={interviewsQuery.error?.message}
        onRetry={() => interviewsQuery.refetch()}
        isAdding={createInterview.isPending}
        onAdd={(input) => createInterview.mutate(input)}
        onDelete={(interviewId) => deleteInterview.mutate(interviewId)}
      />

      <NotesSection
        notes={notes}
        isError={notesQuery.isError}
        errorMessage={notesQuery.error?.message}
        onRetry={() => notesQuery.refetch()}
        isAdding={createNote.isPending}
        onAdd={(content) => createNote.mutate(content)}
        onDelete={(noteId) => deleteNote.mutate(noteId)}
      />

      <div className="mt-6 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold">状态历史</h2>
        {app.statusHistory && app.statusHistory.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {app.statusHistory.map((h) => (
              <li key={h.id} className="flex items-center gap-2">
                <StatusBadge status={h.fromStatus} />
                <span className="text-slate-400">→</span>
                <StatusBadge status={h.toStatus} />
                <span className="text-xs text-slate-400">{displayDateTime(h.changedAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">暂无状态变更记录。</p>
        )}
      </div>

      <div className="mt-6 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold">时间线</h2>
        <Timeline
          rounds={interviews}
          history={app.statusHistory ?? []}
        />
      </div>
    </div>
  );
}

function EditForm({
  app,
  editing,
  isSaving,
  onSubmit,
  onCancel,
}: {
  app: Application;
  editing: boolean;
  isSaving: boolean;
  onSubmit: (values: ApplicationUpdateInput) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ApplicationUpdateInput>({
    resolver: zodResolver(applicationUpdateSchema),
  });

  useEffect(() => {
    reset({
      company: app.company,
      position: app.position,
      appliedDate: formatDate(app.appliedDate),
      source: app.source ?? '',
      link: app.link ?? '',
    });
  }, [app, reset]);

  if (!editing) {
    return (
      <dl className="space-y-2 text-sm">
        <Row label="投递日期" value={displayDate(app.appliedDate)} />
        <Row label="来源" value={app.source || '—'} />
        <Row
          label="链接"
          value={
            app.link ? (
              <a className="text-blue-600 underline" href={app.link}>
                {app.link}
              </a>
            ) : (
              '—'
            )
          }
        />
      </dl>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium">公司</label>
        <input
          {...register('company')}
          className="w-full rounded-md border border-slate-300 px-3 py-2"
        />
        {errors.company && <p className="mt-1 text-sm text-red-600">{errors.company.message}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">职位</label>
        <input
          {...register('position')}
          className="w-full rounded-md border border-slate-300 px-3 py-2"
        />
        {errors.position && <p className="mt-1 text-sm text-red-600">{errors.position.message}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">投递日期</label>
        <input
          type="date"
          {...register('appliedDate')}
          className="w-full rounded-md border border-slate-300 px-3 py-2"
        />
        {errors.appliedDate && (
          <p className="mt-1 text-sm text-red-600">{errors.appliedDate.message}</p>
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">来源</label>
        <input
          {...register('source')}
          className="w-full rounded-md border border-slate-300 px-3 py-2"
        />
        {errors.source && <p className="mt-1 text-sm text-red-600">{errors.source.message}</p>}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">链接</label>
        <input
          {...register('link')}
          placeholder="https://…"
          className="w-full rounded-md border border-slate-300 px-3 py-2"
        />
        {errors.link && <p className="mt-1 text-sm text-red-600">{errors.link.message}</p>}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-white disabled:opacity-50"
        >
          {isSaving ? '保存中…' : '保存'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50"
        >
          取消
        </button>
      </div>
    </form>
  );
}

function NotesSection({
  notes,
  isError,
  errorMessage,
  onRetry,
  isAdding,
  onAdd,
  onDelete,
}: {
  notes: Note[];
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  isAdding: boolean;
  onAdd: (content: string) => void;
  onDelete: (noteId: string) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NoteInput>({
    resolver: zodResolver(noteSchema),
    defaultValues: { content: '' },
  });

  return (
    <div className="mt-6 rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 text-lg font-semibold">备注</h2>
      <form
        onSubmit={handleSubmit((values) => {
          onAdd(values.content);
          reset({ content: '' });
        })}
        className="mb-4 flex gap-2"
      >
        <div className="flex-1">
          <input
            data-testid="note-input"
            {...register('content')}
            placeholder="添加一条备注…"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
          {errors.content && (
            <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
          )}
        </div>
        <button
          data-testid="note-add"
          type="submit"
          disabled={isAdding}
          className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {isAdding ? '添加中…' : '添加'}
        </button>
      </form>

      {isError ? (
        <ErrorState message={errorMessage} onRetry={onRetry} />
      ) : notes.length === 0 ? (
        <p className="text-sm text-slate-500">还没有备注。</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-slate-200 p-3">
              <p className="whitespace-pre-wrap text-sm">{n.content}</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs text-slate-400">{displayDateTime(n.createdAt)}</span>
                <button
                  onClick={() => onDelete(n.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InterviewSection({
  interviews,
  isError,
  errorMessage,
  onRetry,
  isAdding,
  onAdd,
  onDelete,
}: {
  interviews: InterviewRound[];
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  isAdding: boolean;
  onAdd: (input: InterviewRoundInput) => void;
  onDelete: (interviewId: string) => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InterviewRoundInput>({
    resolver: zodResolver(interviewRoundSchema),
    defaultValues: { type: 'PHONE', scheduledAt: '', result: 'PENDING', feedback: '' },
  });

  return (
    <div className="mt-6 rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 text-lg font-semibold">面试轮次</h2>
      <form
        onSubmit={handleSubmit((values) => {
          onAdd(values);
          reset({ type: 'PHONE', scheduledAt: '', result: 'PENDING', feedback: '' });
        })}
        className="mb-4 grid gap-3 sm:grid-cols-2"
      >
        <div>
          <label className="mb-1 block text-sm font-medium">类型</label>
          <select
            data-testid="interview-type"
            {...register('type')}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            {(Object.keys(INTERVIEW_TYPE_LABELS) as InterviewRoundType[]).map((t) => (
              <option key={t} value={t}>
                {INTERVIEW_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
          {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">面试时间</label>
          <input
            type="datetime-local"
            data-testid="interview-time"
            {...register('scheduledAt')}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
          {errors.scheduledAt && (
            <p className="mt-1 text-sm text-red-600">{errors.scheduledAt.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">结果</label>
          <select
            data-testid="interview-result"
            {...register('result')}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          >
            {(Object.keys(INTERVIEW_RESULT_LABELS) as InterviewRoundResult[]).map((r) => (
              <option key={r} value={r}>
                {INTERVIEW_RESULT_LABELS[r]}
              </option>
            ))}
          </select>
          {errors.result && <p className="mt-1 text-sm text-red-600">{errors.result.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">复盘备注</label>
          <input
            data-testid="interview-feedback"
            {...register('feedback')}
            placeholder="复盘与反思…（可选）"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
          {errors.feedback && (
            <p className="mt-1 text-sm text-red-600">{errors.feedback.message}</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <button
            data-testid="interview-add"
            type="submit"
            disabled={isAdding}
            className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {isAdding ? '添加中…' : '添加面试轮次'}
          </button>
        </div>
      </form>

      {isError ? (
        <ErrorState message={errorMessage} onRetry={onRetry} />
      ) : interviews.length === 0 ? (
        <p className="text-sm text-slate-500">还没有面试轮次。</p>
      ) : (
        <ul className="space-y-3">
          {interviews.map((r) => (
            <li key={r.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium">
                  {INTERVIEW_TYPE_LABELS[r.type]}
                </span>
                <span className="text-xs text-slate-400">{displayDateTime(r.scheduledAt)}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    r.result === 'PASS'
                      ? 'bg-green-100 text-green-700'
                      : r.result === 'FAIL'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {INTERVIEW_RESULT_LABELS[r.result]}
                </span>
                <span className="ml-auto">
                  <button
                    onClick={() => onDelete(r.id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    删除
                  </button>
                </span>
              </div>
              {r.feedback && <p className="mt-2 whitespace-pre-wrap text-sm">{r.feedback}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Timeline({
  rounds,
  history,
}: {
  rounds: InterviewRound[];
  history: NonNullable<Application['statusHistory']>;
}) {
  type Event = {
    kind: 'interview' | 'status';
    id: string;
    time: string;
    title: string;
    detail?: string;
    badge: React.ReactNode;
  };

  const events: Event[] = [
    ...rounds.map((r) => ({
      kind: 'interview' as const,
      id: r.id,
      time: r.scheduledAt,
      title: `面试 · ${INTERVIEW_TYPE_LABELS[r.type]}`,
      detail: r.feedback ?? undefined,
      badge: (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            r.result === 'PASS'
              ? 'bg-green-100 text-green-700'
              : r.result === 'FAIL'
                ? 'bg-red-100 text-red-700'
                : 'bg-amber-100 text-amber-700'
          }`}
        >
          {INTERVIEW_RESULT_LABELS[r.result]}
        </span>
      ),
    })),
    ...history.map((h) => ({
      kind: 'status' as const,
      id: h.id,
      time: h.changedAt,
      title: '状态变更',
      detail: `${STATUS_LABELS[h.fromStatus]} → ${STATUS_LABELS[h.toStatus]}`,
      badge: <StatusBadge status={h.toStatus} />,
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  if (events.length === 0) {
    return <p className="text-sm text-slate-500">暂无时间线记录。</p>;
  }

  return (
    <ol className="space-y-3 border-l border-slate-200 pl-4">
      {events.map((e) => (
        <li key={`${e.kind}-${e.id}`} className="relative">
          <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-slate-400" />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{e.title}</span>
            {e.badge}
            <span className="text-xs text-slate-400">{displayDateTime(e.time)}</span>
          </div>
          {e.detail && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{e.detail}</p>}
        </li>
      ))}
    </ol>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 text-slate-500">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
