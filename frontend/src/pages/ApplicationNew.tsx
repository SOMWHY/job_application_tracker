import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatDate } from '../lib/utils';
import { STATUS_ORDER, STATUS_LABELS } from '../types';
import { applicationSchema, type ApplicationInput } from '../lib/validation';
import { useCreateApplication } from '../lib/queries';

export default function ApplicationNew() {
  const navigate = useNavigate();
  const createMutation = useCreateApplication();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ApplicationInput>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      company: '',
      position: '',
      appliedDate: formatDate(new Date()),
      status: 'PENDING',
      source: '',
      link: '',
    },
  });

  const onSubmit = (values: ApplicationInput) => {
    createMutation.mutate(values, {
      onSuccess: (created) => navigate(`/applications/${created.id}`),
      onError: (err) => {
        setError('root', { message: err instanceof Error ? err.message : '创建失败' });
      },
    });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">新建申请</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-lg bg-white p-6 shadow">
        <div>
          <label className="mb-1 block text-sm font-medium">公司 *</label>
          <input
            data-testid="app-company"
            {...register('company')}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
          {errors.company && <p className="mt-1 text-sm text-red-600">{errors.company.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">职位 *</label>
          <input
            data-testid="app-position"
            {...register('position')}
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
          {errors.position && <p className="mt-1 text-sm text-red-600">{errors.position.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">投递日期 *</label>
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
          <label className="mb-1 block text-sm font-medium">状态</label>
          <select {...register('status')} className="w-full rounded-md border border-slate-300 px-3 py-2">
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">来源</label>
          <input
            {...register('source')}
            placeholder="如 BOSS / 官网 / 内推"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
          {errors.source && <p className="mt-1 text-sm text-red-600">{errors.source.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">链接</label>
          <input
            data-testid="app-link"
            {...register('link')}
            placeholder="https://…"
            className="w-full rounded-md border border-slate-300 px-3 py-2"
          />
          {errors.link && <p className="mt-1 text-sm text-red-600">{errors.link.message}</p>}
        </div>

        {errors.root && <p className="text-sm text-red-600">{errors.root.message}</p>}
        {createMutation.isError && !errors.root && (
          <p className="text-sm text-red-600">{createMutation.error.message}</p>
        )}

        <div className="flex gap-3">
          <button
            data-testid="app-save"
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {createMutation.isPending ? '保存中…' : '保存'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-md border border-slate-300 px-4 py-2 hover:bg-slate-50"
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
